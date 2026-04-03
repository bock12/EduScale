import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ClassSection, Lesson, LessonMaterial } from '../../types';
import { BookOpen, Video, FileText, Plus, X, Link as LinkIcon, Image as ImageIcon, File, ChevronDown, ChevronUp, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LMSDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function LMSDashboard({ organization, userProfile }: LMSDashboardProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateLessonModalOpen, setIsCreateLessonModalOpen] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  // New Lesson State
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [newLessonClassId, setNewLessonClassId] = useState('');
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);

  // New Material State
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'document' | 'link' | 'image' | 'video'>('document');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  useEffect(() => {
    if (!organization?.id) return;

    const sectionsQ = query(collection(db, 'organizations', organization.id, 'class_sections'));
    const unsubSections = onSnapshot(sectionsQ, (snap) => {
      setSections(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection)));
    });

    const lessonsQ = query(collection(db, 'organizations', organization.id, 'lessons'));
    const unsubLessons = onSnapshot(lessonsQ, async (snap) => {
      let fetchedLessons = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
      
      if (userProfile.role === 'teacher') {
        const teacherId = userProfile.entityId || userProfile.uid;
        
        // Fetch class master assignments
        const ctSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'class_teachers'),
          where('teacherId', '==', teacherId),
          where('role', '==', 'primary')
        ));
        const classMasterSectionIds = ctSnap.docs.map(d => d.data().sectionId);
        
        fetchedLessons = fetchedLessons.filter(l => 
          l.teacherId === teacherId || classMasterSectionIds.includes(l.classId)
        );
      }
      
      // Sort by creation date descending
      fetchedLessons.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setLessons(fetchedLessons);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'lessons'));

    const materialsQ = query(collection(db, 'organizations', organization.id, 'lesson_materials'));
    const unsubMaterials = onSnapshot(materialsQ, (snap) => {
      setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as LessonMaterial)));
    });

    return () => {
      unsubSections();
      unsubLessons();
      unsubMaterials();
    };
  }, [organization.id, userProfile.uid, userProfile.role]);

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonTitle.trim() || !newLessonClassId) return;

    setIsCreatingLesson(true);
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'lessons'), {
        organizationId: organization.id,
        classId: newLessonClassId,
        title: newLessonTitle,
        description: newLessonDesc,
        teacherId: userProfile.entityId || userProfile.uid,
        createdAt: new Date().toISOString()
      });
      
      setIsCreateLessonModalOpen(false);
      setNewLessonTitle('');
      setNewLessonDesc('');
      setNewLessonClassId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lessons');
    } finally {
      setIsCreatingLesson(false);
    }
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLessonId || !newMaterialTitle.trim() || !newMaterialUrl.trim()) return;

    setIsAddingMaterial(true);
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'lesson_materials'), {
        organizationId: organization.id,
        lessonId: selectedLessonId,
        title: newMaterialTitle,
        type: newMaterialType,
        url: newMaterialUrl
      });
      
      setIsAddMaterialModalOpen(false);
      setNewMaterialTitle('');
      setNewMaterialUrl('');
      setNewMaterialType('document');
      setSelectedLessonId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'lesson_materials');
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'lesson_materials', materialId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'lesson_materials');
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-purple-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-green-500" />;
      case 'link': return <LinkIcon className="w-5 h-5 text-blue-500" />;
      default: return <FileText className="w-5 h-5 text-orange-500" />;
    }
  };

  const toggleLessonExpand = (lessonId: string) => {
    setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Learning Management</h1>
          <p className="text-[#9e9e9e] text-lg">Manage lessons, materials, videos, and student progress.</p>
        </div>
        {(userProfile.role === 'teacher' || userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
          <button
            onClick={() => setIsCreateLessonModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            Create Lesson
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{lessons.length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Active Lessons</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Video className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{materials.filter(m => m.type === 'video').length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Video Lectures</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{materials.filter(m => m.type === 'document').length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Documents</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <LinkIcon className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{materials.filter(m => m.type === 'link').length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">External Links</p>
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Course Lessons</h2>
        
        {lessons.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Lessons Found</h3>
            <p className="text-[#9e9e9e]">Get started by creating your first lesson.</p>
          </div>
        ) : (
          lessons.map(lesson => {
            const lessonMaterials = materials.filter(m => m.lessonId === lesson.id);
            const isExpanded = expandedLessonId === lesson.id;
            const lessonSection = sections.find(c => c.id === lesson.classId);

            return (
              <div key={lesson.id} className="bg-white rounded-3xl border border-[#e5e5e5] overflow-hidden transition-all shadow-sm">
                <div 
                  className="p-6 cursor-pointer hover:bg-[#f9f9f9] flex items-start justify-between"
                  onClick={() => toggleLessonExpand(lesson.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{lesson.title}</h3>
                      <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest">
                        {lessonSection?.sectionName || 'Unknown Class'}
                      </span>
                    </div>
                    <p className="text-[#4a4a4a] text-sm line-clamp-2">{lesson.description}</p>
                    <div className="flex items-center gap-4 mt-4 text-xs text-[#9e9e9e] font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(lesson.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <File className="w-4 h-4" />
                        {lessonMaterials.length} Materials
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 p-2 bg-[#f5f5f5] rounded-full text-[#4a4a4a]">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-[#e5e5e5] bg-[#f9f9f9]"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-[#1a1a1a]">Lesson Materials</h4>
                          {(userProfile.role === 'teacher' || userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLessonId(lesson.id);
                                setIsAddMaterialModalOpen(true);
                              }}
                              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" /> Add Material
                            </button>
                          )}
                        </div>

                        {lessonMaterials.length === 0 ? (
                          <p className="text-sm text-[#9e9e9e] italic">No materials uploaded yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {lessonMaterials.map(material => (
                              <div key={material.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#e5e5e5]">
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div className="p-2 bg-[#f5f5f5] rounded-xl shrink-0">
                                    {getMaterialIcon(material.type)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-sm truncate">{material.title}</p>
                                    <a 
                                      href={material.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline truncate block"
                                    >
                                      {material.url}
                                    </a>
                                  </div>
                                </div>
                                {(userProfile.role === 'teacher' || userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
                                  <button
                                    onClick={() => handleDeleteMaterial(material.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Create Lesson Modal */}
      {isCreateLessonModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative">
            <button 
              onClick={() => setIsCreateLessonModalOpen(false)}
              className="absolute right-4 top-4 p-2 text-[#9e9e9e] hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Create New Lesson</h2>
            
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">Lesson Title *</label>
                <input
                  type="text"
                  required
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Introduction to Algebra"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">Class Section *</label>
                <select
                  required
                  value={newLessonClassId}
                  onChange={(e) => setNewLessonClassId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a class section</option>
                  {sections.map(c => (
                    <option key={c.id} value={c.id}>{c.sectionName} ({c.gradeLevel})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">Description</label>
                <textarea
                  value={newLessonDesc}
                  onChange={(e) => setNewLessonDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="What will students learn in this lesson?"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingLesson || !newLessonTitle.trim() || !newLessonClassId}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4"
              >
                {isCreatingLesson ? 'Creating...' : 'Create Lesson'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {isAddMaterialModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md relative">
            <button 
              onClick={() => {
                setIsAddMaterialModalOpen(false);
                setSelectedLessonId(null);
              }}
              className="absolute right-4 top-4 p-2 text-[#9e9e9e] hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-2xl font-bold mb-6">Add Material</h2>
            
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">Material Title *</label>
                <input
                  type="text"
                  required
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Chapter 1 PDF"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">Type *</label>
                <select
                  required
                  value={newMaterialType}
                  onChange={(e) => setNewMaterialType(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="document">Document (PDF, Doc)</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                  <option value="link">External Link</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-1">URL / Link *</label>
                <input
                  type="url"
                  required
                  value={newMaterialUrl}
                  onChange={(e) => setNewMaterialUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>

              <button
                type="submit"
                disabled={isAddingMaterial || !newMaterialTitle.trim() || !newMaterialUrl.trim()}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mt-4"
              >
                {isAddingMaterial ? 'Adding...' : 'Add Material'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
