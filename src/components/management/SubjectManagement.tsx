import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Organization, Subject, ClassSection, Teacher, ClassSubject } from '../../types';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Users, 
  GraduationCap,
  Layout,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

interface SubjectManagementProps {
  organization: Organization;
}

export default function SubjectManagement({ organization }: SubjectManagementProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState<'assignments' | 'subjects'>('assignments');

  // Form states
  const [newSubject, setNewSubject] = useState({ name: '', description: '', departmentId: '' });
  const [assignment, setAssignment] = useState({ 
    classSectionId: '', 
    subjectId: '', 
    teacherId: '', 
    academicYear: new Date().getFullYear().toString() 
  });

  const [isDeleting, setIsDeleting] = useState<{ id: string, type: 'assignment' | 'subject' } | null>(null);

  useEffect(() => {
    if (!organization?.id) return;

    const unsubSubjects = onSnapshot(collection(db, 'organizations', organization.id, 'subjects'), (snap) => {
      setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Subject)));
    });

    const unsubSections = onSnapshot(collection(db, 'organizations', organization.id, 'class_sections'), (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection)));
    });

    const unsubTeachers = onSnapshot(collection(db, 'organizations', organization.id, 'teachers'), (snap) => {
      setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Teacher)));
    });

    const unsubClassSubjects = onSnapshot(collection(db, 'organizations', organization.id, 'class_subjects'), (snap) => {
      setClassSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSubject)));
      setLoading(false);
    });

    return () => {
      unsubSubjects();
      unsubSections();
      unsubTeachers();
      unsubClassSubjects();
    };
  }, [organization.id]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'subjects'), {
        ...newSubject,
        organizationId: organization.id
      });
      setNewSubject({ name: '', description: '', departmentId: '' });
      setIsAddingSubject(false);
    } catch (err) {
      console.error('Error adding subject:', err);
    }
  };

  const handleAssignSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'class_subjects'), {
        ...assignment,
        organizationId: organization.id
      });
      setAssignment({ classSectionId: '', subjectId: '', teacherId: '', academicYear: new Date().getFullYear().toString() });
      setIsAssigning(false);
    } catch (err) {
      console.error('Error assigning subject:', err);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'class_subjects', id));
      setIsDeleting(null);
    } catch (err) {
      console.error('Error deleting assignment:', err);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      // First delete all assignments for this subject
      const relatedAssignments = classSubjects.filter(cs => cs.subjectId === id);
      for (const assignment of relatedAssignments) {
        await deleteDoc(doc(db, 'organizations', organization.id, 'class_subjects', assignment.id));
      }
      // Then delete the subject itself
      await deleteDoc(doc(db, 'organizations', organization.id, 'subjects', id));
      setIsDeleting(null);
    } catch (err) {
      console.error('Error deleting subject:', err);
    }
  };

  const filteredAssignments = classSubjects.filter(cs => {
    const subject = subjects.find(s => s.id === cs.subjectId);
    const teacher = teachers.find(t => t.id === cs.teacherId);
    const section = sections.find(s => s.id === cs.classSectionId);
    
    const searchStr = `${subject?.name} ${teacher?.firstName} ${teacher?.lastName} ${section?.sectionName}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  const filteredSubjects = subjects.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Subject Management</h2>
          <p className="text-[#9e9e9e] font-medium">Create subjects and assign them to classes and teachers.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAddingSubject(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-2xl font-bold hover:bg-[#f9f9f9] transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Subject
          </button>
          <button 
            onClick={() => setIsAssigning(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
          >
            <Layout className="w-5 h-5" />
            Assign Subject
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-white p-2 rounded-[20px] border border-[#e5e5e5] shadow-sm flex gap-1">
          <button 
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'assignments' ? 'bg-[#1a1a1a] text-white' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
          >
            Assignments
          </button>
          <button 
            onClick={() => setActiveTab('subjects')}
            className={`px-6 py-2 rounded-xl font-bold transition-all ${activeTab === 'subjects' ? 'bg-[#1a1a1a] text-white' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
          >
            All Subjects
          </button>
        </div>
        
        <div className="bg-white p-2 rounded-[20px] border border-[#e5e5e5] shadow-sm flex-1 w-full">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
            <input 
              type="text"
              placeholder={activeTab === 'assignments' ? "Search by subject, teacher, or class..." : "Search subjects..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {activeTab === 'assignments' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((cs) => {
            const subject = subjects.find(s => s.id === cs.subjectId);
            const teacher = teachers.find(t => t.id === cs.teacherId);
            const section = sections.find(s => s.id === cs.classSectionId);

            return (
              <div key={cs.id} className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => setIsDeleting({ id: cs.id, type: 'assignment' })}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-black mb-1">{subject?.name || 'Unknown Subject'}</h3>
                <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-4">{cs.academicYear} Academic Year</p>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm font-medium text-[#4a4a4a]">
                    <Users className="w-4 h-4 text-[#9e9e9e]" />
                    <span>Teacher: {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm font-medium text-[#4a4a4a]">
                    <GraduationCap className="w-4 h-4 text-[#9e9e9e]" />
                    <span>Class: {section?.sectionName || 'Unknown Class'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => {
            const assignmentCount = classSubjects.filter(cs => cs.subjectId === subject.id).length;
            return (
              <div key={subject.id} className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => setIsDeleting({ id: subject.id, type: 'subject' })}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-black mb-1">{subject.name}</h3>
                <p className="text-[#9e9e9e] text-sm font-medium mb-4 line-clamp-2">{subject.description || 'No description provided.'}</p>
                
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
                  <Users className="w-3 h-3" />
                  {assignmentCount} Active Assignments
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black mb-2">Are you sure?</h3>
            <p className="text-[#9e9e9e] font-medium mb-8">
              {isDeleting.type === 'subject' 
                ? "This will permanently delete the subject and all its class assignments. This action cannot be undone."
                : "This will remove the subject assignment from this class. This action cannot be undone."}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleting(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => isDeleting.type === 'subject' ? handleDeleteSubject(isDeleting.id) : handleDeleteAssignment(isDeleting.id)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Create New Subject</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  type="text"
                  required
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="e.g. Advanced Mathematics"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium h-24 resize-none"
                  placeholder="Subject details..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAddingSubject(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssigning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Assign Subject</h3>
            <form onSubmit={handleAssignSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Select Subject</label>
                <select 
                  required
                  value={assignment.subjectId}
                  onChange={(e) => setAssignment({ ...assignment, subjectId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="">Choose a subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Select Class Section</label>
                <select 
                  required
                  value={assignment.classSectionId}
                  onChange={(e) => setAssignment({ ...assignment, classSectionId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="">Choose a class...</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.sectionName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Select Teacher</label>
                <select 
                  required
                  value={assignment.teacherId}
                  onChange={(e) => setAssignment({ ...assignment, teacherId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAssigning(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
