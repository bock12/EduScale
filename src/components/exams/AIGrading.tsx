import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamSession, ExamSubject, AIGradingJob } from '../../types';
import { BrainCircuit, Play, Search, AlertCircle, CheckCircle2, Clock, XCircle, FileText, Settings, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AIGradingProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function AIGrading({ organization, userProfile }: AIGradingProps) {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [jobs, setJobs] = useState<AIGradingJob[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
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
        setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamSubject)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_subjects');
      }
    };

    const unsubscribeJobs = onSnapshot(query(
      collection(db, 'organizations', organization.id, 'ai_grading_jobs'),
      where('organizationId', '==', organization.id)
    ), (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AIGradingJob)));
    });

    fetchSubjects();
    return () => unsubscribeJobs();
  }, [selectedSessionId, organization.id]);

  const startGradingJob = async (examSubjectId: string) => {
    setIsStarting(true);
    try {
      const newJob = {
        organizationId: organization.id,
        examId: examSubjectId, // Using examSubjectId as examId for now
        status: 'pending',
        createdAt: serverTimestamp(),
        createdBy: userProfile.uid
      };
      await addDoc(collection(db, 'organizations', organization.id, 'ai_grading_jobs'), newJob);
      alert('AI Grading job started successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'start_ai_grading_job');
    } finally {
      setIsStarting(false);
    }
  };

  const filteredSubjects = subjects.filter(s => 
    s.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Search Subject</label>
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Subjects List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-black text-black flex items-center gap-2">
            <FileText className="w-5 h-5 text-black/20" />
            Available Subjects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSubjects.map((subject) => {
              const activeJob = jobs.find(j => j.examId === subject.id && (j.status === 'pending' || j.status === 'processing'));
              const completedJob = jobs.find(j => j.examId === subject.id && j.status === 'completed');

              return (
                <div key={subject.id} className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 shadow-sm hover:border-black/20 transition-all">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-black">{subject.subject}</h4>
                    {activeJob ? (
                      <div className="flex items-center gap-2 text-amber-500">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Processing</span>
                      </div>
                    ) : completedJob ? (
                      <div className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Completed</span>
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs font-bold text-black/40">Max Score: {subject.maxScore} | Passing: {subject.passingScore}</p>
                  <button
                    onClick={() => startGradingJob(subject.id)}
                    disabled={isStarting || !!activeJob}
                    className="w-full py-3 bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start AI Grading</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Job History */}
        <div className="space-y-4">
          <h3 className="text-xl font-black text-black flex items-center gap-2">
            <History className="w-5 h-5 text-black/20" />
            Recent Jobs
          </h3>
          <div className="bg-white border border-black/10 rounded-[32px] overflow-hidden shadow-sm">
            <div className="divide-y divide-black/5">
              {jobs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds).slice(0, 5).map((job) => (
                <div key={job.id} className="p-4 hover:bg-black/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-black truncate max-w-[120px]">
                      {subjects.find(s => s.id === job.examId)?.subject || 'Unknown Exam'}
                    </span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      job.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                      job.status === 'failed' ? 'bg-red-500/10 text-red-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-black/40">
                    {job.id.slice(0, 8)}... • {new Date((job as any).createdAt?.seconds * 1000).toLocaleTimeString()}
                  </p>
                </div>
              ))}
              {jobs.length === 0 && (
                <div className="p-8 text-center text-black/20 font-bold text-sm">No recent jobs</div>
              )}
            </div>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/10 p-6 rounded-[32px] space-y-3">
            <div className="flex items-center gap-3 text-purple-600">
              <BrainCircuit className="w-5 h-5" />
              <h4 className="font-black text-sm uppercase tracking-widest">AI Model Status</h4>
            </div>
            <p className="text-xs font-medium text-purple-900/60 leading-relaxed">
              Using Gemini 2.5 Flash for high-precision grading and feedback generation.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Active & Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
