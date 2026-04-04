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
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'subjects'>('assignments');

  // Form states
  const [multiSubjectForm, setMultiSubjectForm] = useState<{ category: 'science' | 'arts' | 'commercial' | 'general'; names: string[] }>({ 
    category: 'general',
    names: ['']
  });
  const [multiAssignmentForm, setMultiAssignmentForm] = useState<{ classSectionId: string; assignments: { subjectId: string; teacherId: string }[] }>({ 
    classSectionId: '', 
    assignments: [{ subjectId: '', teacherId: '' }]
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

  const handleAddSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const promises = multiSubjectForm.names
        .filter(name => name.trim() !== '')
        .map(name => addDoc(collection(db, 'organizations', organization.id, 'subjects'), {
          name: name.trim(),
          category: multiSubjectForm.category,
          organizationId: organization.id
        }));
      
      await Promise.all(promises);
      setMultiSubjectForm({ category: 'general', names: [''] });
      setIsAddingSubject(false);
    } catch (err) {
      console.error('Error adding subjects:', err);
    }
  };

  const handleUpdateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'subjects', editingSubject.id), {
        name: editingSubject.name,
        category: editingSubject.category,
        description: editingSubject.description || ''
      });
      setEditingSubject(null);
    } catch (err) {
      console.error('Error updating subject:', err);
    }
  };

  const handleAssignSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const academicYear = new Date().getFullYear().toString();
      const promises = multiAssignmentForm.assignments
        .filter(a => a.subjectId && a.teacherId)
        .map(a => addDoc(collection(db, 'organizations', organization.id, 'class_subjects'), {
          classSectionId: multiAssignmentForm.classSectionId,
          subjectId: a.subjectId,
          teacherId: a.teacherId,
          academicYear,
          organizationId: organization.id
        }));
      
      await Promise.all(promises);
      setMultiAssignmentForm({ classSectionId: '', assignments: [{ subjectId: '', teacherId: '' }] });
      setIsAssigning(false);
    } catch (err) {
      console.error('Error assigning subjects:', err);
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
    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
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
              <div 
                key={subject.id} 
                onClick={() => setEditingSubject(subject)}
                className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleting({ id: subject.id, type: 'subject' });
                    }}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-xl font-black mb-1">{subject.name}</h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                    subject.category === 'science' ? 'bg-blue-100 text-blue-600' :
                    subject.category === 'arts' ? 'bg-purple-100 text-purple-600' :
                    subject.category === 'commercial' ? 'bg-green-100 text-green-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {subject.category}
                  </span>
                </div>
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
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black mb-6">Create New Subjects</h3>
            <form onSubmit={handleAddSubjects} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Category</label>
                <select 
                  required
                  value={multiSubjectForm.category}
                  onChange={(e) => setMultiSubjectForm({ ...multiSubjectForm, category: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="general">General</option>
                  <option value="science">Science</option>
                  <option value="arts">Arts</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Subject Names</label>
                {multiSubjectForm.names.map((name, index) => (
                  <div key={index} className="flex gap-2">
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => {
                        const newNames = [...multiSubjectForm.names];
                        newNames[index] = e.target.value;
                        setMultiSubjectForm({ ...multiSubjectForm, names: newNames });
                      }}
                      className="flex-1 px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      placeholder="e.g. Mathematics"
                    />
                    {multiSubjectForm.names.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newNames = multiSubjectForm.names.filter((_, i) => i !== index);
                          setMultiSubjectForm({ ...multiSubjectForm, names: newNames });
                        }}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setMultiSubjectForm({ ...multiSubjectForm, names: [...multiSubjectForm.names, ''] })}
                  className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:text-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Subject
                </button>
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
                  Create Subjects
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingSubject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Edit Subject</h3>
            <form onSubmit={handleUpdateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Subject Name</label>
                <input 
                  type="text"
                  required
                  value={editingSubject.name}
                  onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Category</label>
                <select 
                  required
                  value={editingSubject.category}
                  onChange={(e) => setEditingSubject({ ...editingSubject, category: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="general">General</option>
                  <option value="science">Science</option>
                  <option value="arts">Arts</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={editingSubject.description || ''}
                  onChange={(e) => setEditingSubject({ ...editingSubject, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium h-24 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssigning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-black mb-6">Assign Subjects to Class</h3>
            <form onSubmit={handleAssignSubjects} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Select Class Section</label>
                <select 
                  required
                  value={multiAssignmentForm.classSectionId}
                  onChange={(e) => setMultiAssignmentForm({ ...multiAssignmentForm, classSectionId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white"
                >
                  <option value="">Choose a class...</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.sectionName}</option>)}
                </select>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Subject & Teacher Assignments</label>
                {multiAssignmentForm.assignments.map((a, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-[#f9f9f9] rounded-2xl relative group/item">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase mb-1">Subject</label>
                      <select 
                        required
                        value={a.subjectId}
                        onChange={(e) => {
                          const newAssignments = [...multiAssignmentForm.assignments];
                          newAssignments[index].subjectId = e.target.value;
                          setMultiAssignmentForm({ ...multiAssignmentForm, assignments: newAssignments });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white text-sm"
                      >
                        <option value="">Choose subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase mb-1">Teacher</label>
                      <select 
                        required
                        value={a.teacherId}
                        onChange={(e) => {
                          const newAssignments = [...multiAssignmentForm.assignments];
                          newAssignments[index].teacherId = e.target.value;
                          setMultiAssignmentForm({ ...multiAssignmentForm, assignments: newAssignments });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white text-sm"
                      >
                        <option value="">Choose teacher...</option>
                        {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                      </select>
                    </div>
                    {multiAssignmentForm.assignments.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => {
                          const newAssignments = multiAssignmentForm.assignments.filter((_, i) => i !== index);
                          setMultiAssignmentForm({ ...multiAssignmentForm, assignments: newAssignments });
                        }}
                        className="sm:self-end p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button"
                  onClick={() => setMultiAssignmentForm({ 
                    ...multiAssignmentForm, 
                    assignments: [...multiAssignmentForm.assignments, { subjectId: '', teacherId: '' }] 
                  })}
                  className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:text-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Assignment
                </button>
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
                  Assign Subjects
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
