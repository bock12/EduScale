import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, AttendanceException, Student, UserProfile } from '../../types';
import { Plus, Search, Calendar, User, CheckCircle2, XCircle, AlertCircle, Clock, Filter, MoreVertical, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceExceptionsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function AttendanceExceptions({ organization, userProfile }: AttendanceExceptionsProps) {
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeExceptions = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'attendance_exceptions'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          setExceptions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceException)));
        });

        const studentsSnap = await getDocs(collection(db, 'organizations', organization.id, 'students'));
        setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));

        setLoading(false);
        return () => unsubscribeExceptions();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'attendance_exceptions_data');
      }
    };

    fetchData();
  }, [organization.id]);

  const canApprove = userProfile.role === 'school_admin' || userProfile.role === 'super_admin';

  const handleStatusChange = async (id: string, status: AttendanceException['status']) => {
    if (!canApprove) return;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'attendance_exceptions', id), {
        status,
        approvedBy: userProfile.uid
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_exception_status');
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const newException = {
        organizationId: organization.id,
        studentId: formData.get('studentId') as string,
        type: formData.get('type') as any,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        reason: formData.get('reason') as string,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await addDoc(collection(db, 'organizations', organization.id, 'attendance_exceptions'), newException);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_exception_create');
    }
  };

  const filteredExceptions = exceptions.filter(e => {
    const student = students.find(s => s.id === e.studentId);
    const searchStr = `${student?.firstName} ${student?.lastName} ${e.reason}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <input
            type="text"
            placeholder="Search exceptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Exception</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExceptions.map((exception) => {
          const student = students.find(s => s.id === exception.studentId);
          
          return (
            <motion.div
              key={exception.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  exception.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                  exception.status === 'rejected' ? 'bg-red-500/10 text-red-600' :
                  'bg-amber-500/10 text-amber-600'
                }`}>
                  {exception.status}
                </div>
                <div className="flex items-center gap-1">
                  {exception.status === 'pending' && canApprove && (
                    <>
                      <button
                        onClick={() => handleStatusChange(exception.id, 'approved')}
                        className="p-2 text-green-600 hover:bg-green-500/10 rounded-xl transition-all"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStatusChange(exception.id, 'rejected')}
                        className="p-2 text-red-600 hover:bg-red-500/10 rounded-xl transition-all"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-black">{student?.firstName} {student?.lastName}</h3>
                <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">{exception.type} Leave</p>
              </div>

              <div className="p-4 bg-black/5 rounded-2xl text-sm text-black/60 font-medium leading-relaxed italic">
                "{exception.reason}"
              </div>

              <div className="space-y-2 pt-4 border-t border-black/5">
                <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>{exception.startDate} to {exception.endDate}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* New Exception Modal */}
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
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">New Exception</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddException} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Student</label>
                    <select name="studentId" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      <option value="">Select Student</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Exception Type</label>
                    <select name="type" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      <option value="medical">Medical</option>
                      <option value="personal">Personal</option>
                      <option value="bereavement">Bereavement</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Start Date</label>
                      <input name="startDate" type="date" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">End Date</label>
                      <input name="endDate" type="date" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Reason</label>
                    <textarea
                      name="reason"
                      required
                      rows={3}
                      placeholder="Explain the reason for this exception..."
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">Submit</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
