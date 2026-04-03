import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, ClassSection, ClassTeacher, Teacher, UserProfile } from '../../types';
import { Plus, Trash2, Search, Users, UserPlus, X, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClassTeachersProps {
  organization: Organization;
  section: ClassSection;
  userProfile?: UserProfile | null;
}

export default function ClassTeachers({ organization, section, userProfile }: ClassTeachersProps) {
  const [assignments, setAssignments] = useState<ClassTeacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const canManageTeachers = userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'class_teachers'),
      where('sectionId', '==', section.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassTeacher)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/class_teachers`);
    });

    // Fetch all teachers to allow adding them
    const fetchTeachers = async () => {
      const teachersSnapshot = await getDocs(collection(db, 'organizations', organization.id, 'teachers'));
      setAllTeachers(teachersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    };
    fetchTeachers();

    return () => unsubscribe();
  }, [organization.id, section.id]);

  const handleAssign = async (teacherId: string, role: 'primary' | 'assistant' | 'substitute' = 'primary') => {
    try {
      // Check if already assigned
      if (assignments.some(a => a.teacherId === teacherId)) {
        alert('Teacher is already assigned to this section.');
        return;
      }

      await addDoc(collection(db, 'organizations', organization.id, 'class_teachers'), {
        organizationId: organization.id,
        sectionId: section.id,
        teacherId,
        role,
        startDate: new Date().toISOString().split('T')[0],
      });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/class_teachers`);
    }
  };

  const handleUnassign = async (id: string) => {
    if (!confirm('Are you sure you want to remove this teacher from the section?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'class_teachers', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/class_teachers/${id}`);
    }
  };

  const assignedTeacherIds = new Set(assignments.map(a => a.teacherId));
  const availableTeachers = allTeachers.filter(t => !assignedTeacherIds.has(t.id));
  
  const filteredAvailable = availableTeachers.filter(t => 
    `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.teacherId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'primary': return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'assistant': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'substitute': return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          Assigned Teachers ({assignments.length})
        </h3>
        {canManageTeachers && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 text-[#1a1a1a] rounded-xl transition-all font-bold"
          >
            <UserPlus className="w-4 h-4" />
            Assign Teacher
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {assignments.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-black/10">
            <p className="text-black/40">No teachers assigned to this section yet.</p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const teacher = allTeachers.find(t => t.id === assignment.teacherId);
            return (
              <div key={assignment.id} className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-2xl group hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 font-black">
                    {teacher ? `${teacher.firstName[0]}${teacher.lastName[0]}` : '?'}
                  </div>
                  <div>
                    <div className="font-bold text-[#1a1a1a] flex items-center gap-2">
                      {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown Teacher'}
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-black/5 rounded-lg text-[10px] font-black uppercase tracking-widest text-black/40">
                        {getRoleIcon(assignment.role)}
                        {assignment.role}
                      </div>
                    </div>
                    <div className="text-xs text-black/40 uppercase tracking-widest font-black">
                      ID: {teacher?.teacherId || 'N/A'}
                    </div>
                  </div>
                </div>
                {canManageTeachers && (
                  <button
                    onClick={() => handleUnassign(assignment.id)}
                    className="p-2 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Assign Teacher Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Assign Teacher</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 pl-12 pr-4 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-12 text-black/40">No matching teachers found.</div>
                ) : (
                  filteredAvailable.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="w-full flex items-center justify-between p-4 bg-white border border-black/10 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[#1a1a1a] font-black group-hover:bg-black group-hover:text-white transition-all">
                          {teacher.firstName[0]}{teacher.lastName[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-[#1a1a1a]">{teacher.firstName} {teacher.lastName}</div>
                          <div className="text-xs text-black/40 uppercase tracking-widest">ID: {teacher.teacherId}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAssign(teacher.id, 'primary')}
                          className="px-3 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Primary
                        </button>
                        <button
                          onClick={() => handleAssign(teacher.id, 'assistant')}
                          className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Assistant
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
