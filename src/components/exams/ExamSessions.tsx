import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamSession, AcademicYear } from '../../types';
import { Plus, Search, Calendar, MoreVertical, Trash2, Edit2, CheckCircle2, Clock, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamSessionsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function ExamSessions({ organization, userProfile }: ExamSessionsProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSession, setEditingSession] = useState<ExamSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeSessions = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'exam_sessions'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSession)));
        });

        const yearsSnap = await getDocs(collection(db, 'organizations', organization.id, 'academic_years'));
        setAcademicYears(yearsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AcademicYear)));

        setLoading(false);
        return () => unsubscribeSessions();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_exam_sessions');
      }
    };

    fetchData();
  }, [organization.id]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const newSession = {
        organizationId: organization.id,
        name: formData.get('name') as string,
        academicYear: formData.get('academicYear') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        status: 'draft',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'organizations', organization.id, 'exam_sessions'), newSession);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'add_exam_session');
    }
  };

  const handleUpdateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'exam_sessions', editingSession.id), {
        name: formData.get('name') as string,
        academicYear: formData.get('academicYear') as string,
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
        status: formData.get('status') as any,
        updatedAt: serverTimestamp()
      });
      setEditingSession(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'update_exam_session');
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this session? This will delete all associated exams and results.')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'exam_sessions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'delete_exam_session');
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.academicYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <input
            type="text"
            placeholder="Search sessions..."
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
          <span>New Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <motion.div
            key={session.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                session.status === 'published' ? 'bg-green-500/10 text-green-600' :
                session.status === 'completed' ? 'bg-blue-500/10 text-blue-600' :
                'bg-amber-500/10 text-amber-600'
              }`}>
                {session.status}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingSession(session)}
                  className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="p-2 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-black">{session.name}</h3>
              <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">{session.academicYear}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-black/5">
              <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                <span>{session.startDate || 'No start date'} - {session.endDate || 'No end date'}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingSession) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAdding(false); setEditingSession(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                  {editingSession ? 'Edit Session' : 'New Exam Session'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingSession(null); }} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingSession ? handleUpdateSession : handleAddSession} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Session Name</label>
                    <input
                      name="name"
                      defaultValue={editingSession?.name}
                      required
                      placeholder="e.g. First Term Exams 2026"
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Academic Year</label>
                    <select
                      name="academicYear"
                      defaultValue={editingSession?.academicYear}
                      required
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                    >
                      <option value="">Select Year</option>
                      {academicYears.map(y => (
                        <option key={y.id} value={y.name}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Start Date</label>
                      <input
                        name="startDate"
                        type="date"
                        defaultValue={editingSession?.startDate}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">End Date</label>
                      <input
                        name="endDate"
                        type="date"
                        defaultValue={editingSession?.endDate}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      />
                    </div>
                  </div>
                  {editingSession && (
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Status</label>
                      <select
                        name="status"
                        defaultValue={editingSession.status}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setEditingSession(null); }} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">
                    {editingSession ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
