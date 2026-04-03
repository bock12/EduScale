import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, Class, Assignment, AssignmentSubmission } from '../../types';
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, ChevronRight, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import AssignmentDetails from '../assignments/AssignmentDetails';

interface StudentAssignmentsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentAssignments({ organization, userProfile }: StudentAssignmentsProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  useEffect(() => {
    if (!organization?.id || !userProfile?.uid) return;

    const classesQ = query(collection(db, 'organizations', organization.id, 'class_sections'));
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    const assignmentsQ = query(
      collection(db, 'organizations', organization.id, 'assignments'),
      where('status', '==', 'published')
    );
    const unsubAssignments = onSnapshot(assignmentsQ, (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });

    const submissionsQ = query(
      collection(db, 'organizations', organization.id, 'assignment_submissions'),
      where('studentId', '==', userProfile.uid)
    );
    const unsubSubmissions = onSnapshot(submissionsQ, (snap) => {
      setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentSubmission)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'assignment_submissions');
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubAssignments();
      unsubSubmissions();
    };
  }, [organization.id, userProfile.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedAssignmentId) {
    return (
      <AssignmentDetails 
        organization={organization}
        userProfile={userProfile}
        assignmentId={selectedAssignmentId}
        onBack={() => setSelectedAssignmentId(null)}
      />
    );
  }

  const getSubmissionStatus = (assignmentId: string) => {
    const submission = submissions.find(s => s.assignmentId === assignmentId);
    if (!submission) {
      const assignment = assignments.find(a => a.id === assignmentId);
      if (assignment && new Date(assignment.dueDate) < new Date()) {
        return 'late';
      }
      return 'pending';
    }
    return submission.status;
  };

  const filteredAssignments = assignments.filter(assignment => {
    const status = getSubmissionStatus(assignment.id);
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return status === 'pending' || status === 'late';
    return status === filterStatus;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'graded': return 'bg-green-100 text-green-700';
      case 'late': return 'bg-red-100 text-red-700';
      default: return 'bg-orange-100 text-orange-700';
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a] mb-2">My Assignments</h2>
        <p className="text-[#9e9e9e] text-lg font-medium">View and submit your coursework.</p>
      </header>

      {/* Filters */}
      <div className="flex gap-2 p-1 bg-white border border-[#e5e5e5] rounded-2xl overflow-x-auto w-fit">
        {(['all', 'pending', 'submitted', 'graded'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-6 py-3 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${
              filterStatus === status 
                ? 'bg-black text-white shadow-md' 
                : 'text-[#9e9e9e] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((assignment) => {
          const status = getSubmissionStatus(assignment.id);
          const assignmentClass = classes.find(c => c.id === assignment.classSectionId);
          
          return (
            <motion.div
              key={assignment.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedAssignmentId(assignment.id)}
              className="group bg-white border border-[#e5e5e5] rounded-[32px] p-6 hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer relative overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>

              <h3 className="text-xl font-black text-[#1a1a1a] mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                {assignment.title}
              </h3>
              <p className="text-[#9e9e9e] text-sm line-clamp-2 mb-6 flex-1">
                {assignment.description || 'No description provided.'}
              </p>

              <div className="space-y-3 pt-4 border-t border-[#f5f5f5]">
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium truncate">
                    {assignmentClass?.name || 'General Class'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="font-medium">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end">
                <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredAssignments.length === 0 && (
          <div className="col-span-full bg-white border border-[#e5e5e5] rounded-[40px] p-12 text-center">
            <div className="w-20 h-20 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-[#9e9e9e]" />
            </div>
            <h3 className="text-2xl font-black text-[#1a1a1a] mb-2">No assignments found</h3>
            <p className="text-[#9e9e9e] max-w-md mx-auto">
              You don't have any {filterStatus !== 'all' ? filterStatus : ''} assignments at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
