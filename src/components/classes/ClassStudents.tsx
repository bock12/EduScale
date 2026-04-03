import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, ClassSection, ClassStudent, Student } from '../../types';
import { Plus, Trash2, Search, GraduationCap, UserPlus, X, MoveHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import ConfirmModal from '../ui/ConfirmModal';
import { UserProfile } from '../../types';

interface ClassStudentsProps {
  organization: Organization;
  section: ClassSection;
  userProfile?: UserProfile | null;
}

export default function ClassStudents({ organization, section, userProfile }: ClassStudentsProps) {
  const [enrollments, setEnrollments] = useState<ClassStudent[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isTransferring, setIsTransferring] = useState<ClassStudent | null>(null);
  const [otherSections, setOtherSections] = useState<ClassSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const canManageStudents = userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'class_students'),
      where('sectionId', '==', section.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEnrollments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassStudent)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/class_students`);
    });

    // Fetch all students to allow adding them
    const fetchStudents = async () => {
      const studentsSnapshot = await getDocs(collection(db, 'organizations', organization.id, 'students'));
      setAllStudents(studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    };
    fetchStudents();

    // Fetch other sections for transfer
    const fetchSections = async () => {
      const sectionsSnapshot = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
      setOtherSections(sectionsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ClassSection))
        .filter(s => s.id !== section.id)
      );
    };
    fetchSections();

    return () => unsubscribe();
  }, [organization.id, section.id]);

  const handleEnroll = async (studentId: string) => {
    try {
      // Check if already enrolled in ANY section in this organization
      const q = query(
        collection(db, 'organizations', organization.id, 'class_students'),
        where('studentId', '==', studentId),
        where('status', '==', 'active')
      );
      const existingEnrollments = await getDocs(q);

      if (!existingEnrollments.empty) {
        const existing = existingEnrollments.docs[0].data() as ClassStudent;
        const existingSection = (await getDocs(query(collection(db, 'organizations', organization.id, 'class_sections')))).docs
          .find(d => d.id === existing.sectionId)?.data() as ClassSection;
        
        alert(`Student is already enrolled in section: ${existingSection?.sectionName || 'another section'}. Please unenroll them first.`);
        return;
      }

      await addDoc(collection(db, 'organizations', organization.id, 'class_students'), {
        organizationId: organization.id,
        sectionId: section.id,
        studentId,
        enrollmentDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/class_students`);
    }
  };

  const handleUnenroll = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'class_students', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/class_students/${id}`);
    }
  };

  const handleTransfer = async (enrollmentId: string, targetSectionId: string) => {
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'class_students', enrollmentId), {
        sectionId: targetSectionId
      });
      setIsTransferring(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/class_students/${enrollmentId}`);
    }
  };

  const enrolledStudentIds = new Set(enrollments.map(e => e.studentId));
  const availableStudents = allStudents.filter(s => !enrolledStudentIds.has(s.id));
  
  const filteredAvailable = availableStudents.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-500" />
          Enrolled Students ({enrollments.length}/{section.capacity})
        </h3>
        {canManageStudents && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-black/10 text-[#1a1a1a] rounded-xl transition-all font-bold"
          >
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {enrollments.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-black/10">
            <p className="text-black/40">No students enrolled in this section yet.</p>
          </div>
        ) : (
          enrollments.map((enrollment) => {
            const student = allStudents.find(s => s.id === enrollment.studentId);
            return (
              <div key={enrollment.id} className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-2xl group hover:bg-gray-50 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-black">
                    {student ? `${student.firstName[0]}${student.lastName[0]}` : '?'}
                  </div>
                  <div>
                    <div className="font-bold text-[#1a1a1a]">
                      {student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'}
                    </div>
                    <div className="text-xs text-black/40 uppercase tracking-widest font-black">
                      ID: {student?.studentId || 'N/A'}
                    </div>
                  </div>
                </div>
                {canManageStudents && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsTransferring(enrollment)}
                      className="p-2 text-black/20 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                      title="Transfer Student"
                    >
                      <MoveHorizontal className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(enrollment.id)}
                      className="p-2 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Remove Student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Student Modal */}
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
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Enroll Student</h2>
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
                  <div className="text-center py-12 text-black/40">No matching students found.</div>
                ) : (
                  filteredAvailable.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleEnroll(student.id)}
                      className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-black/10 rounded-2xl transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-[#1a1a1a] font-black group-hover:bg-black group-hover:text-white transition-all">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-[#1a1a1a]">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-black/40 uppercase tracking-widest">ID: {student.studentId}</div>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-black/5 rounded-xl text-xs font-black uppercase tracking-widest text-[#1a1a1a] group-hover:bg-black group-hover:text-white transition-all">
                        Enroll
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Transfer Student Modal */}
      <AnimatePresence>
        {isTransferring && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransferring(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Transfer Student</h2>
                <button onClick={() => setIsTransferring(null)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                  <p className="text-sm text-blue-600 font-bold">
                    Transferring {allStudents.find(s => s.id === isTransferring.studentId)?.firstName} {allStudents.find(s => s.id === isTransferring.studentId)?.lastName} to a different section.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-black/40 uppercase tracking-widest">Select Target Section</label>
                  <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {otherSections.length === 0 ? (
                      <div className="text-center py-8 text-black/40">No other sections available.</div>
                    ) : (
                      otherSections.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => handleTransfer(isTransferring.id, s.id)}
                          className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 border border-black/10 rounded-2xl transition-all group"
                        >
                          <div className="text-left">
                            <div className="font-bold text-[#1a1a1a]">{s.sectionName}</div>
                            <div className="text-xs text-black/40 uppercase tracking-widest">Capacity: {s.capacity}</div>
                          </div>
                          <div className="px-4 py-2 bg-black/5 rounded-xl text-xs font-black uppercase tracking-widest text-[#1a1a1a] group-hover:bg-black group-hover:text-white transition-all">
                            Transfer
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setIsTransferring(null)}
                  className="w-full px-8 py-4 rounded-2xl font-bold text-black bg-black/5 hover:bg-black/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleUnenroll(deleteConfirm)}
        title="Remove Student"
        message="Are you sure you want to remove this student from the section?"
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
