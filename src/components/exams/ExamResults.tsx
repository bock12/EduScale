import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamSession, ExamSubject, ExamResult, Student, ClassStudent } from '../../types';
import { Search, User, Save, AlertCircle, ChevronRight, BookOpen, Filter, CheckCircle2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamResultsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function ExamResults({ organization, userProfile }: ExamResultsProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessionsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'exam_sessions'),
          where('organizationId', '==', organization.id)
        ));
        const sessionsData = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSession));
        setSessions(sessionsData);
        if (sessionsData.length > 0) {
          setSelectedSessionId(sessionsData[0].id);
        }
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_sessions');
      }
    };

    fetchSessions();
  }, [organization.id]);

  useEffect(() => {
    if (!selectedSessionId) return;

    const fetchSubjects = async () => {
      try {
        const subjectsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'exam_subjects'),
          where('sessionId', '==', selectedSessionId)
        ));
        let subjectsData = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubject));
        
        if (userProfile?.role === 'teacher') {
          const teacherId = userProfile.entityId || userProfile.uid;
          subjectsData = subjectsData.filter(s => s.teacherId === teacherId);
        }
        
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setSelectedSubjectId(subjectsData[0].id);
        } else {
          setSelectedSubjectId('');
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_subjects');
      }
    };

    fetchSubjects();
  }, [selectedSessionId, organization.id]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setStudents([]);
      setResults([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const subject = subjects.find(s => s.id === selectedSubjectId);
        if (!subject) return;

        // Fetch students in this section
        const enrollmentsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'class_students'),
          where('sectionId', '==', subject.classSectionId),
          where('status', '==', 'active')
        ));
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);

        if (studentIds.length > 0) {
          const studentsSnap = await getDocs(collection(db, 'organizations', organization.id, 'students'));
          const allStudents = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          setStudents(allStudents.filter(s => studentIds.includes(s.id)));
        } else {
          setStudents([]);
        }

        // Fetch existing results
        const unsubscribe = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'exam_results'),
          where('examSubjectId', '==', selectedSubjectId)
        ), (snapshot) => {
          setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult)));
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_results_data');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSubjectId, organization.id, subjects]);

  const handleScoreChange = (studentId: string, score: string) => {
    const numScore = parseFloat(score) || 0;
    const existingResult = results.find(r => r.studentId === studentId);
    
    const newResult = {
      ...(existingResult || {
        id: '',
        organizationId: organization.id,
        examSubjectId: selectedSubjectId,
        studentId,
        score: 0,
        markedBy: userProfile.uid
      }),
      score: numScore
    };

    if (existingResult) {
      setResults(results.map(r => r.studentId === studentId ? newResult : r));
    } else {
      setResults([...results, newResult]);
    }
  };

  const handleSave = async () => {
    if (!selectedSubjectId) return;
    setSaving(true);
    try {
      const batch = results.map(async (result) => {
        const data = {
          ...result,
          updatedAt: serverTimestamp()
        };

        if (result.id) {
          const { id, ...updateData } = data;
          await updateDoc(doc(db, 'organizations', organization.id, 'exam_results', id), updateData);
        } else {
          const { id, ...addData } = data;
          await addDoc(collection(db, 'organizations', organization.id, 'exam_results'), {
            ...addData,
            createdAt: serverTimestamp()
          });
        }
      });

      await Promise.all(batch);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'save_results');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToOffice = async () => {
    if (!selectedSubjectId) return;
    if (!window.confirm('Are you sure you want to submit these results to the exam office? You will not be able to edit them after submission.')) return;
    
    setSaving(true);
    try {
      await handleSave(); // Save first
      await updateDoc(doc(db, 'organizations', organization.id, 'exam_subjects', selectedSubjectId), {
        status: 'submitted',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'submit_results');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveResults = async () => {
    if (!selectedSubjectId) return;
    if (!window.confirm('Are you sure you want to approve these results? They will be published to students.')) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'exam_subjects', selectedSubjectId), {
        status: 'approved',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'approve_results');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentSubject = subjects.find(s => s.id === selectedSubjectId);
  const isTeacher = userProfile?.role === 'teacher';
  const canEdit = !currentSubject?.status || currentSubject.status === 'draft' || !isTeacher;
  const canApprove = (userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin') && currentSubject?.status === 'submitted';

  return (
    <div className="space-y-8">
      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Exam Session</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-2xl py-4 px-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Exam Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-2xl py-4 px-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.subject}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !selectedSubjectId}
              className="flex-1 bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              <span>Save</span>
            </button>
          )}
          {canEdit && isTeacher && (
            <button
              onClick={handleSubmitToOffice}
              disabled={saving || !selectedSubjectId}
              className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <span>Submit</span>
            </button>
          )}
          {canApprove && (
            <button
              onClick={handleApproveResults}
              disabled={saving || !selectedSubjectId}
              className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-700 transition-all disabled:opacity-50"
            >
              <span>Approve</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-black/5 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Total Students</p>
            <p className="text-lg font-black text-black">{students.length}</p>
          </div>
          <div className="px-4 py-2 bg-black/5 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Max Score</p>
            <p className="text-lg font-black text-black">{currentSubject?.maxScore || 100}</p>
          </div>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/5 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-sm"
          />
        </div>
      </div>

      {/* Results Table */}
      {!selectedSubjectId ? (
        <div className="bg-white border border-black/10 rounded-[32px] p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-black/20" />
          </div>
          <h3 className="text-xl font-black text-black">No Subject Selected</h3>
          <p className="text-black/40 font-bold max-w-sm mx-auto">Please select an exam subject to record results.</p>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-black/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Student</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">ID</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 text-center">Score</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Grade / Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredStudents.map((student) => {
                  const result = results.find(r => r.studentId === student.id);
                  const score = result?.score || 0;
                  const isPassing = score >= (currentSubject?.passingScore || 40);

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-black/[0.02] transition-colors"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-black text-black/40">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <p className="font-black text-black">{student.firstName} {student.lastName}</p>
                            <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{student.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-mono text-xs font-bold text-black/40">{student.studentId}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            value={score || ''}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            max={currentSubject?.maxScore}
                            min={0}
                            disabled={!canEdit}
                            className={`w-20 text-center py-2 rounded-xl font-black focus:outline-none focus:ring-2 focus:ring-black/5 transition-all disabled:opacity-50 ${
                              isPassing ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                            }`}
                          />
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            isPassing ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {isPassing ? 'Pass' : 'Fail'}
                          </div>
                          {result?.isAIGraded && (
                            <div className="p-1 bg-purple-500/10 text-purple-600 rounded-lg" title="AI Graded">
                              <BrainCircuit className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <input
                          type="text"
                          placeholder="Add remarks..."
                          value={result?.remarks || ''}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const newResults = [...results];
                            const idx = newResults.findIndex(r => r.studentId === student.id);
                            if (idx >= 0) {
                              newResults[idx] = { ...newResults[idx], remarks: e.target.value };
                            } else {
                              newResults.push({ 
                                organizationId: organization.id,
                                examSubjectId: selectedSubjectId,
                                studentId: student.id, 
                                score: 0, 
                                remarks: e.target.value,
                                markedBy: userProfile.uid,
                                id: ''
                              });
                            }
                            setResults(newResults);
                          }}
                          className="w-full bg-black/5 border border-transparent rounded-xl py-2 px-4 text-sm font-medium focus:bg-white focus:border-black/10 focus:outline-none transition-all disabled:opacity-50"
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
