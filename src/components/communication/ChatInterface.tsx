import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDocs, limit, or } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Channel, Message, User } from '../../types/chat';
import { Organization, UserProfile, ClassSection } from '../../types';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import { Search, X, Plus, Users, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatInterfaceProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function ChatInterface({ organization, userProfile }: ChatInterfaceProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);

  // Fetch departments and class sections for filtering
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const deptSnap = await getDocs(collection(db, 'organizations', organization.id, 'departments'));
        setDepartments(deptSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const sectionSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
        setClassSections(sectionSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection)));
      } catch (err) {
        console.error("Error fetching chat metadata:", err);
      }
    };

    fetchMetadata();
  }, [organization.id]);

  const currentUser: User = {
    id: userProfile.uid,
    name: userProfile.displayName,
    email: userProfile.email,
    role: userProfile.role,
    profileImage: userProfile.photoURL
  };

  // Fetch channels
  useEffect(() => {
    if (!userProfile.uid) return;

    const q = query(
      collection(db, 'channels'),
      where('organizationId', '==', organization.id),
      where('participantIds', 'array-contains', userProfile.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const channelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Channel[];
      setChannels(channelsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile.uid, organization.id]);

  // Fetch messages for active channel
  useEffect(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'channels', activeChannelId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);

      // Mark messages as read
      messagesData.forEach(async (msg) => {
        if (msg.fromUserId !== userProfile.uid && !msg.read) {
          try {
            await updateDoc(doc(db, 'channels', activeChannelId, 'messages', msg.id), {
              read: true
            });
          } catch (err) {
            console.error("Error marking message as read:", err);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [activeChannelId, userProfile.uid]);

  // Fetch available users for new chat
  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(
        collection(db, 'users'),
        where('organizationId', '==', organization.id),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.uid !== userProfile.uid);
      setAvailableUsers(users);
    };

    if (showNewMessageModal || showNewChannelModal) {
      fetchUsers();
    }
  }, [showNewMessageModal, showNewChannelModal, organization.id, userProfile.uid]);

  const handleSendMessage = async (content: string, attachment?: any) => {
    if (!activeChannelId) return;

    const messageData = {
      channelId: activeChannelId,
      fromUserId: userProfile.uid,
      sender: currentUser,
      content,
      attachment: attachment || null,
      createdAt: new Date().toISOString(),
      read: false
    };

    try {
      await addDoc(collection(db, 'channels', activeChannelId, 'messages'), messageData);
      
      // Update channel's last message
      await updateDoc(doc(db, 'channels', activeChannelId), {
        lastMessage: {
          id: 'temp', // Firestore will generate real ID
          content: attachment ? `Sent an attachment: ${attachment.name}` : content,
          createdAt: new Date().toISOString(),
          fromUserId: userProfile.uid
        },
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const startDirectMessage = async (targetUser: UserProfile) => {
    // Check if DM already exists
    const existingChannel = channels.find(c => 
      c.type === 'direct' && 
      c.participantIds?.includes(targetUser.uid) && 
      c.participantIds?.includes(userProfile.uid)
    );

    if (existingChannel) {
      setActiveChannelId(existingChannel.id);
      setShowNewMessageModal(false);
      return;
    }

    // Create new DM channel
    const participants: User[] = [
      currentUser,
      {
        id: targetUser.uid,
        name: targetUser.displayName,
        email: targetUser.email,
        role: targetUser.role,
        profileImage: targetUser.photoURL
      }
    ];

    const newChannelData = {
      type: 'direct',
      organizationId: organization.id,
      participantIds: [userProfile.uid, targetUser.uid],
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userProfile.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'channels'), newChannelData);
      setActiveChannelId(docRef.id);
      setShowNewMessageModal(false);
    } catch (err) {
      console.error("Error creating DM:", err);
    }
  };

  const createGroupChannel = async (name: string, selectedUserIds: string[]) => {
    const participants: User[] = availableUsers
      .filter(u => selectedUserIds.includes(u.uid))
      .map(u => ({
        id: u.uid,
        name: u.displayName,
        email: u.email,
        role: u.role,
        profileImage: u.photoURL
      }));

    participants.push(currentUser);

    const newChannelData = {
      name,
      type: 'group',
      organizationId: organization.id,
      participantIds: [...selectedUserIds, userProfile.uid],
      participants,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userProfile.uid
    };

    try {
      const docRef = await addDoc(collection(db, 'channels'), newChannelData);
      setActiveChannelId(docRef.id);
      setShowNewChannelModal(false);
    } catch (err) {
      console.error("Error creating group:", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[700px] bg-white rounded-[40px] border border-[#e5e5e5] shadow-xl overflow-hidden">
      <div className={`${activeChannelId ? 'hidden md:block' : 'block'} w-full md:w-auto`}>
        <ChatSidebar 
          channels={channels}
          activeChannelId={activeChannelId}
          onSelectChannel={setActiveChannelId}
          onNewMessage={() => setShowNewMessageModal(true)}
          onNewChannel={() => setShowNewChannelModal(true)}
          currentUser={currentUser}
        />
      </div>
      
      <div className={`${!activeChannelId ? 'hidden md:block' : 'block'} flex-1`}>
        <ChatWindow 
          channel={channels.find(c => c.id === activeChannelId) || null}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUser={currentUser}
          onClose={() => setActiveChannelId(null)}
        />
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-[#e5e5e5]"
            >
              <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
                <h3 className="text-xl font-black tracking-tight">New Message</h3>
                <button onClick={() => setShowNewMessageModal(false)} className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                  {availableUsers.map(user => (
                    <button
                      key={user.uid}
                      onClick={() => startDirectMessage(user)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-[#f9f9f9] transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          user.displayName.charAt(0)
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{user.displayName}</h4>
                        <p className="text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">{user.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewChannelModal && (
          <NewChannelModal 
            users={availableUsers}
            departments={departments}
            classSections={classSections}
            onCreate={createGroupChannel}
            onClose={() => setShowNewChannelModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NewChannelModal({ users, departments, classSections, onCreate, onClose }: { 
  users: UserProfile[], 
  departments: any[],
  classSections: ClassSection[],
  onCreate: (name: string, userIds: string[]) => void, 
  onClose: () => void 
}) {
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'students' | 'staff'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [studentFilters, setStudentFilters] = useState({
    level: '',
    department: '',
    class: ''
  });

  const toggleUser = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Tab filter
    if (activeTab === 'students' && user.role !== 'student') return false;
    if (activeTab === 'staff' && !['teacher', 'school_admin', 'exam_officer'].includes(user.role)) return false;

    // Student specific filters
    if (activeTab === 'students') {
      // Note: UserProfile doesn't directly have level/department/class. 
      // In a real app, we'd need to join with Student record or have these on UserProfile.
      // For now, we'll assume they might be present or we'll filter if they exist.
      if (studentFilters.level && (user as any).gradeLevel !== studentFilters.level) return false;
      if (studentFilters.department && (user as any).department !== studentFilters.department) return false;
      if (studentFilters.class && (user as any).classSectionId !== studentFilters.class) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden border border-[#e5e5e5]"
      >
        <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Create Group</h3>
              <p className="text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">Collaborate with your team</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
          {/* Left Side: Group Info */}
          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Group Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Science Faculty"
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
              />
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
              <h4 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Selected Members</h4>
              <div className="flex flex-wrap gap-2">
                {selectedIds.length === 0 ? (
                  <p className="text-[10px] text-blue-400 italic">No members selected yet</p>
                ) : (
                  selectedIds.map(id => {
                    const user = users.find(u => u.uid === id);
                    return (
                      <div key={id} className="px-2 py-1 bg-white rounded-lg border border-blue-200 text-[10px] font-bold flex items-center gap-1">
                        {user?.displayName}
                        <button onClick={() => toggleUser(id)} className="hover:text-red-500">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              onClick={() => onCreate(name, selectedIds)}
              disabled={!name.trim() || selectedIds.length === 0}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:bg-[#e5e5e5] disabled:shadow-none transition-all"
            >
              Create Group
            </button>
          </div>

          {/* Right Side: Member Selection */}
          <div className="flex flex-col h-[400px]">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-[#f5f5f5] rounded-xl mb-4">
              {(['all', 'students', 'staff'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                    activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e]" />
                <input 
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                />
              </div>

              {activeTab === 'students' && (
                <div className="grid grid-cols-3 gap-2">
                  <select 
                    value={studentFilters.level}
                    onChange={(e) => setStudentFilters(prev => ({ ...prev, level: e.target.value }))}
                    className="px-2 py-2 rounded-lg border border-[#e5e5e5] text-[10px] font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="">All Levels</option>
                    <option value="JSS 1">JSS 1</option>
                    <option value="JSS 2">JSS 2</option>
                    <option value="JSS 3">JSS 3</option>
                    <option value="SSS 1">SSS 1</option>
                    <option value="SSS 2">SSS 2</option>
                    <option value="SSS 3">SSS 3</option>
                  </select>
                  <select 
                    value={studentFilters.department}
                    onChange={(e) => setStudentFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="px-2 py-2 rounded-lg border border-[#e5e5e5] text-[10px] font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="">All Depts</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select 
                    value={studentFilters.class}
                    onChange={(e) => setStudentFilters(prev => ({ ...prev, class: e.target.value }))}
                    className="px-2 py-2 rounded-lg border border-[#e5e5e5] text-[10px] font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  >
                    <option value="">All Classes</option>
                    {classSections.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <Search className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-xs font-bold text-[#1a1a1a]">No members found</p>
                  <p className="text-[10px] text-[#9e9e9e]">Try adjusting your filters or search term</p>
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => toggleUser(user.uid)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border ${
                      selectedIds.includes(user.uid) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'hover:bg-[#f9f9f9] border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs overflow-hidden">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.displayName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs truncate">{user.displayName}</h4>
                      <p className="text-[9px] text-[#9e9e9e] font-bold uppercase tracking-widest">{user.role}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIds.includes(user.uid) ? 'bg-blue-600 border-blue-600' : 'border-[#e5e5e5]'
                    }`}>
                      {selectedIds.includes(user.uid) && <Plus className="w-3 h-3 text-white rotate-45" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
