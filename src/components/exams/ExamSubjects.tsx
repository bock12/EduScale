import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamSession, ExamSubject, ClassSection, Teacher, Subject } from '../../types';
import { Plus, Search, BookOpen, User, Calendar, MoreVertical, Trash2, Edit2, X, Save, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamSubjectsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function ExamSubjects({ organization, userProfile }: ExamSubjectsProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingSubject, setEditingSubject] = useState<ExamSubject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeSessions = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'exam_sessions'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSession));
          setSessions(sessionsData);
          if (sessionsData.length > 0 && !selectedSessionId) {
            setSelectedSessionId(sessionsData[0].id);
          }
        });

        const sectionsSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
        setSections(sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection)));

        const teachersSnap = await getDocs(collection(db, 'organizations', organization.id, 'teachers'));
        setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));

        const subjectsSnap = await getDocs(collection(db, 'organizations', organization.id, 'subjects'));
        setAvailableSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));

        setLoading(false);
        return () => unsubscribeSessions();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_exam_subjects_data');
      }
    };

    fetchData();
  }, [organization.id]);

  useEffect(() => {
    if (!selectedSessionId) return;

    const unsubscribeSubjects = onSnapshot(query(
      collection(db, 'organizations', organization.id, 'exam_subjects'),
      where('sessionId', '==', selectedSessionId)
    ), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubject)));
    });

    return () => unsubscribeSubjects();
  }, [selectedSessionId, organization.id]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const newSubject = {
        organizationId: organization.id,
        sessionId: selectedSessionId,
        classSectionId: formData.get('classSectionId') as string,
        subject: formData.get('subject') as string,
        date: formData.get('date') as string,
        maxScore: parseFloat(formData.get('maxScore') as string) || 100,
        passingScore: parseFloat(formData.get('passingScore') as string) || 40,
        teacherId: formData.get('teacherId') as string,
        questionsUrl: formData.get('questionsUrl') as string || '',
        markingSchemeUrl: formData.get('markingSchemeUrl') as string || '',
        status: 'draft',
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'organizations', organization.id, 'exam_subjects'), newSubject);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'add_exam_subject');
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const updateData: any = {
        questionsUrl: formData.get('questionsUrl') as string,
        markingSchemeUrl: formData.get('markingSchemeUrl') as string,
        updatedAt: serverTimestamp()
      };

      if (canManageSubjects) {
        updateData.classSectionId = formData.get('classSectionId') as string;
        updateData.subject = formData.get('subject') as string;
        updateData.date = formData.get('date') as string;
        updateData.maxScore = parseFloat(formData.get('maxScore') as string) || 100;
        updateData.passingScore = parseFloat(formData.get('passingScore') as string) || 40;
        updateData.teacherId = formData.get('teacherId') as string;
      }

      await updateDoc(doc(db, 'organizations', organization.id, 'exam_subjects', editingSubject.id), updateData);
      setEditingSubject(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'update_exam_subject');
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam subject?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'exam_subjects', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'delete_exam_subject');
    }
  };

  const filteredSubjects = subjects.filter(s => {
    // Role-based filtering
    if (userProfile?.role === 'teacher') {
      const teacherId = userProfile.entityId || userProfile.uid;
      if (s.teacherId !== teacherId) return false;
    }

    const section = sections.find(sec => sec.id === s.classSectionId);
    const searchStr = `${s.subject} ${section?.sectionName}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const canManageSubjects = userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-64">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full bg-black/5 border border-black/10 rounded-2xl py-3 px-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5"
            >
              <option value="">Select Session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
            />
          </div>
        </div>
        {canManageSubjects && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={!selectedSessionId}
            className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            <span>Add Subject</span>
          </button>
        )}
      </div>

      {!selectedSessionId ? (
        <div className="bg-white border border-black/10 rounded-[32px] p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-black/20" />
          </div>
          <h3 className="text-xl font-black text-black">No Session Selected</h3>
          <p className="text-black/40 font-bold max-w-sm mx-auto">Please select an exam session to manage subjects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => {
            const section = sections.find(s => s.id === subject.classSectionId);
            const teacher = teachers.find(t => t.id === subject.teacherId);

            return (
              <motion.div
                key={subject.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest text-black/40">
                    {section?.sectionName || 'Unknown Class'}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingSubject(subject)}
                      className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {canManageSubjects && (
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-2 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-black">{subject.subject}</h3>
                  <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">Max Score: {subject.maxScore} | Pass: {subject.passingScore}</p>
                </div>

                <div className="space-y-2 pt-4 border-t border-black/5">
                  <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    <span>{subject.date ? new Date(subject.date).toLocaleString() : 'Date not set'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                    <User className="w-4 h-4" />
                    <span>{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'No teacher assigned'}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingSubject) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAdding(false); setEditingSubject(null); }}
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
                  {editingSubject ? 'Edit Subject' : 'Add Exam Subject'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingSubject(null); }} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingSubject ? handleUpdateSubject : handleAddSubject} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Class Section</label>
                      <select
                        name="classSectionId"
                        defaultValue={editingSubject?.classSectionId}
                        required
                        disabled={!canManageSubjects}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                      >
                        <option value="">Select Class</option>
                        {sections.map(s => (
                          <option key={s.id} value={s.id}>{s.sectionName} ({s.gradeLevel})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Subject</label>
                      <select
                        name="subject"
                        defaultValue={editingSubject?.subject}
                        required
                        disabled={!canManageSubjects}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                      >
                        <option value="">Select Subject</option>
                        {availableSubjects.map(s => (
                          <option key={s.id} value={s.name}>
                            {s.name} ({s.category || 'General'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Exam Date & Time</label>
                    <input
                      name="date"
                      type="datetime-local"
                      defaultValue={editingSubject?.date}
                      disabled={!canManageSubjects}
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Max Score</label>
                      <input
                        name="maxScore"
                        type="number"
                        defaultValue={editingSubject?.maxScore || 100}
                        required
                        disabled={!canManageSubjects}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Passing Score</label>
                      <input
                        name="passingScore"
                        type="number"
                        defaultValue={editingSubject?.passingScore || 40}
                        required
                        disabled={!canManageSubjects}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Assigned Teacher</label>
                    <select
                      name="teacherId"
                      defaultValue={editingSubject?.teacherId}
                      disabled={!canManageSubjects}
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold disabled:opacity-50"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Teacher Upload Fields */}
                  <div className="grid grid-cols-1 gap-4 pt-4 border-t border-black/10">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Questions URL</label>
                      <input
                        name="questionsUrl"
                        type="url"
                        defaultValue={editingSubject?.questionsUrl}
                        placeholder="Link to exam questions document"
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Marking Scheme URL</label>
                      <input
                        name="markingSchemeUrl"
                        type="url"
                        defaultValue={editingSubject?.markingSchemeUrl}
                        placeholder="Link to marking scheme document"
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setEditingSubject(null); }} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">
                    {editingSubject ? 'Update' : 'Add Subject'}
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
