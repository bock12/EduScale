import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  MoreHorizontal, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  Eye, 
  Star, 
  Calendar, 
  ImageIcon,
  Search,
  Filter,
  Users,
  School,
  BookOpen,
  Clock,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, limit, where, getDocs, updateDoc, arrayUnion, addDoc } from 'firebase/firestore';
import { Announcement } from '../../types/announcements';
import { UserProfile, ClassStudent, ClassTeacher } from '../../types';

interface AnnouncementListProps {
  organizationId: string;
  userProfile: UserProfile;
}

export const AnnouncementList: React.FC<AnnouncementListProps> = ({ organizationId, userProfile }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [userAssignments, setUserAssignments] = useState<{
    sectionIds: string[];
    subjectIds: string[];
  }>({ sectionIds: [], subjectIds: [] });

  useEffect(() => {
    const fetchUserAssignments = async () => {
      if (userProfile.role === 'student' && userProfile.entityId) {
        const q = query(
          collection(db, 'organizations', organizationId, 'class_students'),
          where('studentId', '==', userProfile.entityId)
        );
        const snap = await getDocs(q);
        const sectionIds = snap.docs.map(d => (d.data() as ClassStudent).sectionId);
        setUserAssignments({ sectionIds, subjectIds: [] });
      } else if (userProfile.role === 'teacher' && userProfile.entityId) {
        const q = query(
          collection(db, 'organizations', organizationId, 'class_teachers'),
          where('teacherId', '==', userProfile.entityId)
        );
        const snap = await getDocs(q);
        const sectionIds = snap.docs.map(d => (d.data() as ClassTeacher).sectionId);
        setUserAssignments({ sectionIds, subjectIds: [] });
      }
    };

    fetchUserAssignments();
  }, [organizationId, userProfile]);

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organizationId, 'announcements'),
      orderBy('postedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'organizations', organizationId, 'announcements', id));
    } catch (err) {
      console.error("Error deleting announcement:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleTrackView = async (announcement: Announcement) => {
    if (!auth.currentUser) return;
    
    // Only track if not already viewed by this user
    if (announcement.viewedBy?.includes(auth.currentUser.uid)) return;

    try {
      const announcementRef = doc(db, 'organizations', organizationId, 'announcements', announcement.id);
      await updateDoc(announcementRef, {
        viewedBy: arrayUnion(auth.currentUser.uid),
        viewCount: (announcement.viewCount || 0) + 1
      });
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  const handleSetReminder = async (announcement: Announcement) => {
    if (!auth.currentUser) return;
    
    setRemindingId(announcement.id);
    try {
      await addDoc(collection(db, 'organizations', organizationId, 'reminders'), {
        userId: auth.currentUser.uid,
        announcementId: announcement.id,
        title: `Reminder: ${announcement.title}`,
        dueDate: announcement.dueDate || announcement.eventDate || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      alert("Reminder set successfully!");
    } catch (err) {
      console.error("Error setting reminder:", err);
      alert("Failed to set reminder.");
    } finally {
      setRemindingId(null);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'ALL' || a.category === filterCategory;
    
    if (!matchesSearch || !matchesCategory) return false;

    // Admin can see everything
    if (userProfile.role === 'super_admin' || userProfile.role === 'school_admin') return true;

    // Filter based on audience
    if (a.audience === 'ALL') return true;
    
    if (userProfile.role === 'student') {
      if (a.audience === 'STUDENTS') return true;
      if (a.audience === 'CLASS' && a.targetId && userAssignments.sectionIds.includes(a.targetId)) return true;
      // For subjects, we'd need to check which subjects the student is enrolled in
      // For now, let's assume they see all subject announcements if they are a student, 
      // or we could further refine this if we had a ClassSubject mapping.
      if (a.audience === 'SUBJECT') return true; 
    }
    
    if (userProfile.role === 'teacher' || userProfile.role === 'exam_officer') {
      if (a.audience === 'STAFF') return true;
      if (a.createdBy === userProfile.uid) return true;
      if (a.audience === 'CLASS' && a.targetId && userAssignments.sectionIds.includes(a.targetId)) return true;
    }

    if (userProfile.role === 'parent') {
      if (a.audience === 'PARENTS') return true;
    }

    return false;
  });

  const formatViews = (views: number): string => {
    if (views >= 1000) return (views / 1000).toFixed(1) + 'k';
    return views.toString();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'URGENT': return 'bg-red-100 text-red-600';
      case 'EXAMS': return 'bg-purple-100 text-purple-600';
      case 'EVENTS': return 'bg-blue-100 text-blue-600';
      case 'ACTIVITIES': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-[#e5e5e5] shadow-sm h-full flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-[#f0f0f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Announcement Log
          </h3>
          <p className="text-xs text-[#9e9e9e] mt-1">A log of all past communications.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9e9e9e]" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#f9f9f9] border border-[#f0f0f0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-full md:w-48"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-[#f9f9f9] border border-[#f0f0f0] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="ALL">All Categories</option>
            <option value="GENERAL">General</option>
            <option value="EVENTS">Events</option>
            <option value="EXAMS">Exams</option>
            <option value="ACTIVITIES">Activities</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="divide-y divide-[#f0f0f0]">
          <AnimatePresence mode="popLayout">
            {filteredAnnouncements.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 hover:bg-[#fcfcfc] transition-colors group"
              >
                <div 
                  className="flex items-start gap-4"
                  onClick={() => handleTrackView(item)}
                >
                  {item.imageUrl ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-[#f0f0f0]">
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(item.category)} bg-opacity-10`}>
                      <Megaphone className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-bold text-sm truncate">{item.title}</h4>
                        {item.isFeatured && (
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.displayType !== 'ANNOUNCEMENT' && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[#9e9e9e] text-[8px] font-bold uppercase tracking-wider">
                            {item.displayType}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#666] line-clamp-2 mb-3 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        {item.eventDate && (
                          <span className="flex items-center gap-1 text-purple-600">
                            <Calendar className="w-3 h-3" />
                            {new Date(item.eventDate).toLocaleDateString()}
                          </span>
                        )}
                        {item.dueDate && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Clock className="w-3 h-3" />
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-primary">{item.audience}</span>
                        {item.targetName && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Users className="w-3 h-3" />
                            {item.targetName}
                          </span>
                        )}
                        {item.viewCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {formatViews(item.viewCount)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {auth.currentUser && item.viewedBy?.includes(auth.currentUser.uid) && (
                          <div className="flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase tracking-widest">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Viewed
                          </div>
                        )}
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetReminder(item);
                          }}
                          disabled={remindingId === item.id}
                          className="p-1.5 text-[#9e9e9e] hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          title="Set Reminder"
                        >
                          {remindingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {(userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
                            disabled={deletingId === item.id}
                            className="p-1.5 text-[#9e9e9e] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredAnnouncements.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-sm font-bold text-[#1a1a1a]">No announcements found</h4>
              <p className="text-xs text-[#9e9e9e] mt-1">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
