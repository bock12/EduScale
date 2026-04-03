import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  User,
  GraduationCap,
  Download,
  Send,
  MessageSquare,
  Trophy
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Organization, 
  UserProfile, 
  Assignment, 
  AssignmentSubmission,
  AssignmentGrade,
  AssignmentFeedback,
  Student
} from '../../types';
import { motion, AnimatePresence } from 'motion/react';

interface AssignmentDetailsProps {
  organization: Organization;
  userProfile: UserProfile;
  assignmentId: string;
  onBack: () => void;
}

export default function AssignmentDetails({ organization, userProfile, assignmentId, onBack }: AssignmentDetailsProps) {
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradingData, setGradingData] = useState({
    score: 0,
    comment: ''
  });
  const [submissionContent, setSubmissionContent] = useState('');

  useEffect(() => {
    const assignmentRef = doc(db, 'organizations', organization.id, 'assignments', assignmentId);
    const unsubscribeAssignment = onSnapshot(assignmentRef, (doc) => {
      if (doc.exists()) {
        setAssignment({ id: doc.id, ...doc.data() } as Assignment);
      }
      setLoading(false);
    });

    const submissionsQuery = query(
      collection(db, 'organizations', organization.id, 'assignment_submissions'),
      where('assignmentId', '==', assignmentId)
    );

    const unsubscribeSubmissions = onSnapshot(submissionsQuery, (snapshot) => {
      const submissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AssignmentSubmission[];
      setSubmissions(submissionsData);
    });

    return () => {
      unsubscribeAssignment();
      unsubscribeSubmissions();
    };
  }, [organization.id, assignmentId]);

  useEffect(() => {
    // Fetch students in the class
    const fetchStudents = async () => {
      if (assignment?.classSectionId) {
        try {
          const studentsQuery = query(
            collection(db, 'organizations', organization.id, 'students'),
            where('classSectionId', '==', assignment.classSectionId)
          );
          const snapshot = await getDocs(studentsQuery);
          setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        } catch (error) {
          console.error('Error fetching students:', error);
        }
      }
    };

    if (assignment?.classSectionId) {
      fetchStudents();
    }
  }, [organization.id, assignment?.classSectionId]);

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      // Add grade
      await addDoc(collection(db, 'organizations', organization.id, 'assignment_grades'), {
        organizationId: organization.id,
        submissionId: selectedSubmission.id,
        assignmentId: assignmentId,
        studentId: selectedSubmission.studentId,
        score: gradingData.score,
        gradedBy: userProfile.uid,
        gradedAt: new Date().toISOString()
      });

      // Add feedback
      if (gradingData.comment) {
        await addDoc(collection(db, 'organizations', organization.id, 'assignment_feedback'), {
          organizationId: organization.id,
          submissionId: selectedSubmission.id,
          assignmentId: assignmentId,
          studentId: selectedSubmission.studentId,
          comment: gradingData.comment,
          feedbackBy: userProfile.uid,
          feedbackAt: new Date().toISOString()
        });
      }

      // Update submission status
      await updateDoc(doc(db, 'organizations', organization.id, 'assignment_submissions', selectedSubmission.id), {
        status: 'graded'
      });

      setSelectedSubmission(null);
      setGradingData({ score: 0, comment: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'grading');
    }
  };

  const handlePublishAssignment = async () => {
    if (!assignment) return;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'assignments', assignmentId), {
        status: 'published',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'assignments');
    }
  };

  if (loading || !assignment) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  const isTeacher = userProfile.role === 'teacher' || userProfile.role === 'school_admin' || userProfile.role === 'super_admin';
  const isStudent = userProfile.role === 'student';
  const mySubmission = submissions.find(s => s.studentId === userProfile.uid);

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'assignment_submissions'), {
        organizationId: organization.id,
        assignmentId: assignmentId,
        studentId: userProfile.uid,
        contentUrl: submissionContent,
        submittedAt: new Date().toISOString(),
        status: 'submitted'
      });
      setSubmissionContent('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'submission');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-[#e5e5e5] shadow-sm"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-[#1a1a1a]">{assignment.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              assignment.status === 'published' ? 'bg-green-100 text-green-700' : 
              assignment.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
            }`}>
              {assignment.status}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-[#9e9e9e] font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Max Score: {assignment.maxScore}
            </span>
          </div>
        </div>
        {isTeacher && assignment.status === 'draft' && (
          <button
            onClick={handlePublishAssignment}
            className="ml-auto flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-black/10"
          >
            <Send className="w-4 h-4" />
            Publish Assignment
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Assignment Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-[#e5e5e5] rounded-[32px] p-8">
            <h3 className="text-xl font-black text-[#1a1a1a] mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Instructions
            </h3>
            <p className="text-[#4a4a4a] leading-relaxed whitespace-pre-wrap">
              {assignment.description || 'No instructions provided.'}
            </p>
          </div>

          <div className="bg-white border border-[#e5e5e5] rounded-[32px] p-8">
            <h3 className="text-xl font-black text-[#1a1a1a] mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#f5f5f5] rounded-2xl">
                <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Submissions</p>
                <p className="text-2xl font-black text-[#1a1a1a]">{submissions.length} / {students.length}</p>
              </div>
              <div className="p-4 bg-[#f5f5f5] rounded-2xl">
                <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Graded</p>
                <p className="text-2xl font-black text-[#1a1a1a]">
                  {submissions.filter(s => s.status === 'graded').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions List / Submission Form */}
        <div className="lg:col-span-2">
          {isStudent ? (
            <div className="space-y-6">
              {mySubmission ? (
                <div className="bg-white border border-[#e5e5e5] rounded-[32px] p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-[#1a1a1a]">Your Submission</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      mySubmission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {mySubmission.status}
                    </span>
                  </div>
                  <div className="p-6 bg-[#f5f5f5] rounded-2xl mb-6">
                    <p className="text-sm font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Submitted Link/Content</p>
                    <a 
                      href={mySubmission.contentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 font-bold hover:underline break-all"
                    >
                      {mySubmission.contentUrl}
                    </a>
                  </div>
                  <p className="text-xs text-[#9e9e9e] font-medium">
                    Submitted on {new Date(mySubmission.submittedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-[#e5e5e5] rounded-[32px] p-8">
                  <h3 className="text-xl font-black text-[#1a1a1a] mb-6">Submit Your Work</h3>
                  <form onSubmit={handleSubmitAssignment} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Submission Link (e.g. Google Drive, GitHub)</label>
                      <input
                        required
                        type="url"
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                        placeholder="https://docs.google.com/..."
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full px-8 py-4 bg-black text-white rounded-2xl font-black hover:scale-[1.02] transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                      Submit Assignment
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#e5e5e5] rounded-[32px] overflow-hidden">
              <div className="p-8 border-b border-[#f5f5f5] flex items-center justify-between">
                <h3 className="text-xl font-black text-[#1a1a1a]">Student Submissions</h3>
                <div className="flex items-center gap-2 text-sm text-[#9e9e9e] font-bold uppercase tracking-widest">
                  <GraduationCap className="w-4 h-4" />
                  {submissions.length} Submissions
                </div>
              </div>

              <div className="divide-y divide-[#f5f5f5]">
                {submissions.map((submission) => {
                  const student = students.find(s => s.id === submission.studentId);
                  return (
                    <div 
                      key={submission.id}
                      className="p-6 hover:bg-[#fcfcfc] transition-colors flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
                          <User className="w-6 h-6 text-[#9e9e9e]" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1a1a1a]">{student?.firstName} {student?.lastName}</h4>
                          <p className="text-xs text-[#9e9e9e] font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            Submitted {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          submission.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {submission.status}
                        </span>
                        {isTeacher && (
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-black/5"
                          >
                            Grade
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {submissions.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-[#9e9e9e]" />
                    </div>
                    <h4 className="text-lg font-bold text-[#1a1a1a]">No submissions yet</h4>
                    <p className="text-[#9e9e9e] text-sm">Students haven't submitted their work for this assignment.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grading Modal */}
      <AnimatePresence>
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubmission(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-white border border-[#e5e5e5] rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Grade Submission</h2>
                  <p className="text-[#9e9e9e] font-medium">Review and provide feedback for the student.</p>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors"
                >
                  <MoreVertical className="w-6 h-6 text-[#9e9e9e]" />
                </button>
              </div>

              <div className="mb-8 p-6 bg-[#f5f5f5] rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span className="font-bold text-[#1a1a1a]">Submission Content</span>
                </div>
                {selectedSubmission.contentUrl && (
                  <a 
                    href={selectedSubmission.contentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 font-bold hover:underline"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </a>
                )}
              </div>

              <form onSubmit={handleGradeSubmission} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Score (Max {assignment.maxScore})</label>
                  <div className="relative">
                    <input
                      required
                      type="number"
                      max={assignment.maxScore}
                      min={0}
                      value={gradingData.score}
                      onChange={(e) => setGradingData({ ...gradingData, score: parseInt(e.target.value) })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all text-2xl font-black"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#9e9e9e] font-bold">/ {assignment.maxScore}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Feedback & Comments</label>
                  <textarea
                    value={gradingData.comment}
                    onChange={(e) => setGradingData({ ...gradingData, comment: e.target.value })}
                    className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all min-h-[120px]"
                    placeholder="Well done! Great research on the topic..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#ebebeb] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95 shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                  >
                    <Send className="w-5 h-5" />
                    Submit Grade
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
