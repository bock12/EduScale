import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamSession, ReportCard, Student, ClassSection, ExamResult, ExamSubject } from '../../types';
import { FileText, Search, Download, Printer, Eye, Filter, ChevronRight, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportCardsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function ReportCards({ organization, userProfile }: ReportCardsProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
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

        const sectionsSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
        let sectionsData = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection));
        
        if (userProfile?.role === 'teacher') {
          const teacherId = userProfile.entityId || userProfile.uid;
          const ctSnap = await getDocs(query(
            collection(db, 'organizations', organization.id, 'class_teachers'),
            where('teacherId', '==', teacherId)
          ));
          const assignedSectionIds = ctSnap.docs.map(d => d.data().sectionId);
          sectionsData = sectionsData.filter(s => assignedSectionIds.includes(s.id));
        }
        
        setSections(sectionsData);
        
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_report_cards_data');
      }
    };

    fetchData();
  }, [organization.id]);

  useEffect(() => {
    if (!selectedSessionId || !selectedSectionId) {
      setStudents([]);
      setReportCards([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch students in this section
        const enrollmentsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'class_students'),
          where('sectionId', '==', selectedSectionId),
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

        // Fetch existing report cards
        const unsubscribe = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'report_cards'),
          where('sessionId', '==', selectedSessionId)
        ), (snapshot) => {
          let cards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReportCard));
          if (userProfile?.role === 'teacher') {
            cards = cards.filter(c => c.status === 'published');
          }
          setReportCards(cards);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_report_cards');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSessionId, selectedSectionId, organization.id]);

  const generateReportCards = async () => {
    if (!selectedSessionId || !selectedSectionId) return;
    setGenerating(true);
    try {
      // 1. Get all subjects for this session and section
      const subjectsSnap = await getDocs(query(
        collection(db, 'organizations', organization.id, 'exam_subjects'),
        where('sessionId', '==', selectedSessionId),
        where('classSectionId', '==', selectedSectionId)
      ));
      const subjects = subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubject));

      if (subjects.length === 0) {
        alert('No exam subjects found for this session and class.');
        setGenerating(false);
        return;
      }

      // 2. Get all results for these subjects
      const resultsSnap = await getDocs(query(
        collection(db, 'organizations', organization.id, 'exam_results'),
        where('examSubjectId', 'in', subjects.map(s => s.id))
      ));
      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamResult));

      // 3. Calculate scores per student and create report cards
      const batch = students.map(async (student) => {
        const studentResults = results.filter(r => r.studentId === student.id);
        const totalScore = studentResults.reduce((sum, r) => sum + r.score, 0);
        const averageScore = studentResults.length > 0 ? totalScore / studentResults.length : 0;

        const existingCard = reportCards.find(rc => rc.studentId === student.id);
        const data = {
          organizationId: organization.id,
          sessionId: selectedSessionId,
          studentId: student.id,
          totalScore,
          averageScore,
          status: 'draft' as const,
          generatedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        };

        if (existingCard) {
          await updateDoc(doc(db, 'organizations', organization.id, 'report_cards', existingCard.id), data);
        } else {
          await addDoc(collection(db, 'organizations', organization.id, 'report_cards'), {
            ...data,
            createdAt: serverTimestamp()
          });
        }
      });

      await Promise.all(batch);
      alert('Report cards generated successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'generate_report_cards');
    } finally {
      setGenerating(false);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Class Section</label>
          <select
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
            className="w-full bg-white border border-black/10 rounded-2xl py-4 px-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
          >
            <option value="">Select Class</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.sectionName} ({s.gradeLevel})</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          {(userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin') && (
            <button
              onClick={generateReportCards}
              disabled={generating || !selectedSessionId || !selectedSectionId}
              className="w-full bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
            >
              {generating ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <FileText className="w-5 h-5" />}
              <span>Generate Report Cards</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-black/5 rounded-xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Generated</p>
            <p className="text-lg font-black text-black">{reportCards.length} / {students.length}</p>
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

      {/* Report Cards List */}
      {!selectedSectionId ? (
        <div className="bg-white border border-black/10 rounded-[32px] p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
            <Filter className="w-8 h-8 text-black/20" />
          </div>
          <h3 className="text-xl font-black text-black">Select Class</h3>
          <p className="text-black/40 font-bold max-w-sm mx-auto">Please select a class section to view and manage report cards.</p>
        </div>
      ) : (
        <div className="bg-white border border-black/10 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-bottom border-black/5">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Student</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">ID</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 text-center">Avg Score</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filteredStudents.map((student) => {
                  const card = reportCards.find(rc => rc.studentId === student.id);

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
                        <div className="text-center">
                          {card ? (
                            <span className="font-black text-black">{(card.averageScore || 0).toFixed(1)}%</span>
                          ) : (
                            <span className="text-black/20 font-bold">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {card ? (
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            card.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {card.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {card.status}
                          </div>
                        ) : (
                          <span className="text-black/20 font-bold uppercase text-[10px] tracking-widest">Not Generated</span>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={!card}
                            className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all disabled:opacity-20"
                            title="View Report Card"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            disabled={!card}
                            className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all disabled:opacity-20"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            disabled={!card}
                            className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all disabled:opacity-20"
                            title="Print"
                          >
                            <Printer className="w-5 h-5" />
                          </button>
                        </div>
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
