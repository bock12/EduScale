import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Organization } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserX, 
  Mail,
  Calendar,
  LayoutDashboard,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface SchoolAdminUsersProps {
  organization: Organization;
}

export default function SchoolAdminUsers({ organization }: SchoolAdminUsersProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('organizationId', '==', organization.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        userData.push({ id: doc.id, ...doc.data() } as UserProfile);
      });
      setUsers(userData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user account? This will only remove their login access.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">User Accounts</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Manage login accounts for your school.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span>{users.length} Total Accounts</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#9e9e9e] ml-2" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white border border-[#e5e5e5] rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
          >
            <option value="all">All Roles</option>
            <option value="school_admin">School Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-[#e5e5e5] overflow-hidden shadow-sm">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9] border-b border-[#e5e5e5]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#9e9e9e]">User</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#9e9e9e]">Role</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#9e9e9e]">Joined</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-[#9e9e9e] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user) => (
                  <motion.tr
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={user.id}
                    className="hover:bg-[#fcfcfc] transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-[#e5e5e5]">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Users className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1a1a]">{user.displayName || 'Anonymous'}</p>
                          <p className="text-xs text-[#9e9e9e] flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        user.role === 'school_admin' ? 'bg-blue-100 text-blue-700' :
                        user.role === 'teacher' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#4a4a4a]">
                        <Calendar className="w-4 h-4 text-[#9e9e9e]" />
                        <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end">
                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id!)}
                            className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-all"
                          >
                            <MoreVertical className="w-5 h-5 text-[#9e9e9e]" />
                          </button>
                          
                          <AnimatePresence>
                            {activeDropdown === user.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setActiveDropdown(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] z-20 overflow-hidden"
                                >
                                  <div className="p-2">
                                    <button
                                      onClick={() => {
                                        handleDeleteUser(user.id!);
                                        setActiveDropdown(null);
                                      }}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                      <UserX className="w-4 h-4" />
                                      Delete Account
                                    </button>
                                  </div>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#e5e5e5]">
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((user) => (
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                key={user.id}
                className="p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-[#e5e5e5]">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Users className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-[#1a1a1a]">{user.displayName || 'Anonymous'}</p>
                      <p className="text-xs text-[#9e9e9e]">{user.email}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id!)}
                      className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-all"
                    >
                      <MoreVertical className="w-5 h-5 text-[#9e9e9e]" />
                    </button>
                    <AnimatePresence>
                      {activeDropdown === user.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setActiveDropdown(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#e5e5e5] z-20 overflow-hidden"
                          >
                            <div className="p-2">
                              <button
                                onClick={() => {
                                  handleDeleteUser(user.id!);
                                  setActiveDropdown(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              >
                                <UserX className="w-4 h-4" />
                                Delete Account
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#f9f9f9] p-3 rounded-2xl">
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Role</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      user.role === 'school_admin' ? 'bg-blue-100 text-blue-700' :
                      user.role === 'teacher' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-[#f9f9f9] p-3 rounded-2xl">
                    <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Joined</p>
                    <p className="text-xs font-bold">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f5f5f5] mb-4">
              <Users className="w-8 h-8 text-[#9e9e9e]" />
            </div>
            <h3 className="text-xl font-bold mb-2">No accounts found</h3>
            <p className="text-[#9e9e9e]">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
