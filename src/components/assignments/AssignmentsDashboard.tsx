import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  ChevronRight,
  BookOpen,
  User,
  GraduationCap
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
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Organization, 
  UserProfile, 
  Assignment, 
  AssignmentSubmission,
  ClassSection 
} from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import AssignmentDetails from './AssignmentDetails';
import StudentAssignments from '../student/StudentAssignments';

interface AssignmentsDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function AssignmentsDashboard({ organization, userProfile }: AssignmentsDashboardProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAssignment, setIsAddingAssignment] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'closed'>('all');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classSectionId: '',
    dueDate: '',
    maxScore: 100,
    status: 'published' as 'published' | 'draft' | 'closed'
  });

  useEffect(() => {
    if (userProfile?.role === 'student') return;

    let assignmentsQuery = query(
      collection(db, 'organizations', organization.id, 'assignments')
    );

    if (userProfile?.role === 'teacher') {
      const teacherIdToFetch = userProfile.entityId || userProfile.uid;
      assignmentsQuery = query(
        collection(db, 'organizations', organization.id, 'assignments'),
        where('teacherId', '==', teacherIdToFetch)
      );
    }

    const unsubscribeAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const assignmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assignment[];
      
      // Sort client-side to avoid index requirement
      assignmentsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setAssignments(assignmentsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'assignments');
      setLoading(false);
    });

    const classesQuery = query(
      collection(db, 'organizations', organization.id, 'class_sections'),
      where('status', '==', 'active')
    );

    const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
      const classesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClassSection[];
      setClasses(classesData);
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeClasses();
    };
  }, [organization.id, userProfile?.role]);

  if (userProfile?.role === 'student') {
    return <StudentAssignments organization={organization} userProfile={userProfile} />;
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAssignment) {
        await updateDoc(doc(db, 'organizations', organization.id, 'assignments', editingAssignment.id), {
          ...formData,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const teacherIdToUse = userProfile.entityId || userProfile.uid;
        await addDoc(collection(db, 'organizations', organization.id, 'assignments'), {
          ...formData,
          organizationId: organization.id,
          teacherId: teacherIdToUse,
          createdAt: new Date().toISOString(),
        });
      }
      setIsAddingAssignment(false);
      setEditingAssignment(null);
      setFormData({
        title: '',
        description: '',
        classSectionId: '',
        dueDate: '',
        maxScore: 100,
        status: 'published'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'assignments');
    }
  };

  const handleEditClick = (e: React.MouseEvent, assignment: Assignment) => {
    e.stopPropagation();
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      classSectionId: assignment.classSectionId,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore,
      status: assignment.status
    });
    setIsAddingAssignment(true);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || assignment.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'closed': return 'bg-red-100 text-red-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a]">Assignments</h1>
          <p className="text-[#9e9e9e] mt-2 text-lg font-medium">Manage coursework, submissions, and grading.</p>
        </div>
        {(userProfile.role === 'teacher' || userProfile.role === 'school_admin' || userProfile.role === 'super_admin') && (
          <button
            onClick={() => setIsAddingAssignment(true)}
            className="flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all active:scale-95 shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" />
            Create Assignment
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#e5e5e5] rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>
        <div className="flex gap-2 p-1 bg-white border border-[#e5e5e5] rounded-2xl overflow-x-auto">
          {(['all', 'published', 'draft', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                filterStatus === status 
                  ? 'bg-black text-white shadow-md' 
                  : 'text-[#9e9e9e] hover:text-[#1a1a1a] hover:bg-[#f5f5f5]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssignments.map((assignment) => (
          <motion.div
            key={assignment.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedAssignmentId(assignment.id)}
            className="group bg-white border border-[#e5e5e5] rounded-[32px] p-6 hover:shadow-xl hover:shadow-black/5 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(assignment.status)}`}>
                {assignment.status}
              </span>
              {(userProfile.role === 'teacher' || userProfile.role === 'school_admin' || userProfile.role === 'super_admin') && (
                <button 
                  onClick={(e) => handleEditClick(e, assignment)}
                  className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#9e9e9e] hover:text-black"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              )}
            </div>

            <h3 className="text-xl font-black text-[#1a1a1a] mb-2 group-hover:text-blue-600 transition-colors line-clamp-1">
              {assignment.title}
            </h3>
            <p className="text-[#9e9e9e] text-sm line-clamp-2 mb-6">
              {assignment.description || 'No description provided.'}
            </p>

            <div className="space-y-3 pt-4 border-t border-[#f5f5f5]">
              <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium">
                  {classes.find(c => c.id === assignment.classSectionId)?.sectionName || 'Unknown Class'}
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
              <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium">Max Score: {assignment.maxScore}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-[#f5f5f5] flex items-center justify-center overflow-hidden">
                    <User className="w-4 h-4 text-[#9e9e9e]" />
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-white bg-black text-white text-[10px] font-bold flex items-center justify-center">
                  +12
                </div>
              </div>
              <div className="flex items-center gap-1 text-blue-600 font-bold text-sm">
                View Details
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </motion.div>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="col-span-full bg-white border border-[#e5e5e5] rounded-[40px] p-12 text-center">
            <div className="w-20 h-20 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-[#9e9e9e]" />
            </div>
            <h3 className="text-2xl font-black text-[#1a1a1a] mb-2">No assignments found</h3>
            <p className="text-[#9e9e9e] max-w-md mx-auto">
              {searchQuery || filterStatus !== 'all' 
                ? "Try adjusting your search or filters to find what you're looking for."
                : "Get started by creating your first assignment for your students."}
            </p>
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      <AnimatePresence>
        {isAddingAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingAssignment(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-[#e5e5e5] rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                    {editingAssignment ? 'Edit Assignment' : 'New Assignment'}
                  </h2>
                  <p className="text-[#9e9e9e] font-medium">
                    {editingAssignment ? 'Update the task details.' : 'Set up a new task for your students.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAddingAssignment(false);
                    setEditingAssignment(null);
                  }}
                  className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors"
                >
                  <MoreVertical className="w-6 h-6 text-[#9e9e9e]" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Title</label>
                    <input
                      required
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all text-lg font-bold"
                      placeholder="e.g. Mid-term Research Project"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all min-h-[120px]"
                      placeholder="Provide instructions and requirements..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Class Section</label>
                    <select
                      required
                      value={formData.classSectionId}
                      onChange={(e) => setFormData({ ...formData, classSectionId: e.target.value })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.sectionName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Due Date</label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Max Score</label>
                    <input
                      required
                      type="number"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#4a4a4a] mb-2 uppercase tracking-widest">Status</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-black/5 transition-all font-bold"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAssignment(false);
                      setEditingAssignment(null);
                    }}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#ebebeb] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95 shadow-xl shadow-black/10"
                  >
                    {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
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
