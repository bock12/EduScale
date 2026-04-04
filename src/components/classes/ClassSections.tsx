import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, ClassSection, Teacher, Student } from '../../types';
import { Plus, Users, GraduationCap, Trash2, Edit2, X, Check, ChevronRight, Search, Filter, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClassStudents from './ClassStudents';
import ClassTeachers from './ClassTeachers';
import { UserProfile } from '../../types';

interface ClassSectionsProps {
  organization: Organization;
  userProfile?: UserProfile | null;
}

export default function ClassSections({ organization, userProfile }: ClassSectionsProps) {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ClassSection | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'students' | 'teachers'>('students');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    sectionName: '',
    classId: 'general',
    academicYear: organization.setupConfig?.academicYear.name || '2025-2026',
    gradeLevel: 'SS1',
    stream: 'Science',
    sectionNumber: 1,
    capacity: 30,
    status: 'active' as const,
    classroomId: ''
  });

  useEffect(() => {
    const fetchSections = async () => {
      try {
        let sectionsData: ClassSection[] = [];
        
        if (userProfile?.role === 'teacher') {
          const teacherIdToFetch = userProfile.entityId || userProfile.uid;
          // Fetch class_teachers where teacherId == teacherIdToFetch
          const ctQuery = query(
            collection(db, 'organizations', organization.id, 'class_teachers'),
            where('teacherId', '==', teacherIdToFetch)
          );
          
          const unsubscribeCt = onSnapshot(ctQuery, (ctSnapshot) => {
            const sectionIds = ctSnapshot.docs.map(d => d.data().sectionId);
            if (sectionIds.length === 0) {
              setSections([]);
              setLoading(false);
              return;
            }
            
            // Now fetch those sections
            // Note: Firestore 'in' query is limited to 10 items.
            // For a robust solution, we might need to fetch all and filter, or chunk the query.
            // Fetching all and filtering client-side for simplicity here.
            const q = query(
              collection(db, 'organizations', organization.id, 'class_sections'),
              where('organizationId', '==', organization.id)
            );
            
            onSnapshot(q, (snapshot) => {
              const allSections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection));
              setSections(allSections.filter(s => sectionIds.includes(s.id)));
              setLoading(false);
            });
          });
          
          return () => unsubscribeCt();
        } else {
          const q = query(
            collection(db, 'organizations', organization.id, 'class_sections'),
            where('organizationId', '==', organization.id)
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            sectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection));
            setSections(sectionsData);
            setLoading(false);
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/class_sections`);
            setLoading(false);
          });
          
          return () => unsubscribe();
        }
      } catch (err) {
        console.error("Error fetching sections", err);
        setLoading(false);
      }
    };
    
    const unsubSections = fetchSections();

    // Fetch teachers for dropdowns
    const teachersQ = query(
      collection(db, 'organizations', organization.id, 'teachers'),
      where('status', '==', 'active')
    );
    const unsubscribeTeachers = onSnapshot(teachersQ, (snapshot) => {
      setTeachers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
    });

    const classroomsQ = query(collection(db, 'organizations', organization.id, 'classrooms'));
    const unsubscribeClassrooms = onSnapshot(classroomsQ, (snapshot) => {
      setClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSections.then(unsub => { if (unsub) unsub(); });
      unsubscribeTeachers();
      unsubscribeClassrooms();
    };
  }, [organization.id, userProfile?.role, userProfile?.entityId, userProfile?.uid]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const name = `${formData.gradeLevel} ${formData.stream} ${formData.sectionNumber}`;
      await addDoc(collection(db, 'organizations', organization.id, 'class_sections'), {
        ...formData,
        sectionName: name,
        organizationId: organization.id
      });
      setIsAdding(false);
      setFormData({
        sectionName: '',
        classId: 'general',
        academicYear: organization.setupConfig?.academicYear.name || '2025-2026',
        gradeLevel: 'SS1',
        stream: 'Science',
        sectionNumber: 1,
        capacity: 30,
        status: 'active',
        classroomId: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/class_sections`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class section?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'class_sections', id));
      if (selectedSection?.id === id) setSelectedSection(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/class_sections/${id}`);
    }
  };

  const filteredSections = sections.filter(s => 
    s.sectionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.gradeLevel.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canManageSections = userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin';

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Sections List */}
      <div className={`${selectedSection ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-4`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
            <input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-2xl py-3 pl-12 pr-4 text-[#1a1a1a] placeholder:text-black/20 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>
          {canManageSections && (
            <button
              onClick={() => setIsAdding(true)}
              className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Section</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredSections.map((section) => (
              <motion.div
                layout
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedSection(section)}
                className={`
                  group relative p-6 rounded-[32px] border transition-all cursor-pointer
                  ${selectedSection?.id === section.id 
                    ? 'bg-black border-black shadow-xl scale-[1.02] z-10' 
                    : 'bg-white border-black/10 hover:border-black/20 hover:shadow-md'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className={`text-xs font-black uppercase tracking-widest ${selectedSection?.id === section.id ? 'text-white/40' : 'text-black/40'}`}>
                      Grade {section.gradeLevel}
                    </div>
                    <h3 className={`text-2xl font-black tracking-tight ${selectedSection?.id === section.id ? 'text-white' : 'text-[#1a1a1a]'}`}>
                      {section.sectionName}
                    </h3>
                    <div className={`flex items-center gap-4 mt-2 ${selectedSection?.id === section.id ? 'text-white/60' : 'text-black/60'}`}>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4" />
                        <span>Max {section.capacity}</span>
                      </div>
                      {section.classroomId && (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span>{classrooms.find(r => r.id === section.classroomId)?.name || 'Unknown Room'}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm">
                        <Check className={`w-4 h-4 ${section.status === 'active' ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="capitalize">{section.status}</span>
                      </div>
                    </div>
                  </div>
                  {canManageSections && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(section.id);
                      }}
                      className={`p-2 rounded-xl transition-colors ${selectedSection?.id === section.id ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Column: Section Details */}
      <AnimatePresence>
        {selectedSection && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-8 space-y-6"
          >
            <div className="bg-white border border-black/10 rounded-[40px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">{selectedSection.sectionName}</h2>
                  <p className="text-black/40">Management portal for this section</p>
                </div>
                <button 
                  onClick={() => setSelectedSection(null)}
                  className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl text-[#1a1a1a] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-4 mb-8 border-b border-black/10 pb-4">
                <button
                  onClick={() => setActiveSubTab('students')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeSubTab === 'students' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
                >
                  <GraduationCap className="w-5 h-5" />
                  <span className="font-bold">Students</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('teachers')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeSubTab === 'teachers' ? 'bg-black text-white' : 'text-black/60 hover:text-black'}`}
                >
                  <Users className="w-5 h-5" />
                  <span className="font-bold">Teachers</span>
                </button>
              </div>

              <div className="min-h-[400px]">
                {activeSubTab === 'students' ? (
                  <ClassStudents organization={organization} section={selectedSection} userProfile={userProfile} />
                ) : (
                  <ClassTeachers organization={organization} section={selectedSection} userProfile={userProfile} />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a] mb-6">New Class Section</h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Level</label>
                      <select
                        required
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({ ...formData, gradeLevel: e.target.value })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="SS1">SS1</option>
                        <option value="SS2">SS2</option>
                        <option value="SS3">SS3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Stream</label>
                      <select
                        required
                        value={formData.stream}
                        onChange={(e) => setFormData({ ...formData, stream: e.target.value })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="Science">Science</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Arts">Arts</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Section Number</label>
                      <select
                        required
                        value={formData.sectionNumber}
                        onChange={(e) => setFormData({ ...formData, sectionNumber: parseInt(e.target.value) })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Capacity</label>
                      <input
                        required
                        type="number"
                        value={isNaN(formData.capacity) ? '' : formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Assigned Classroom</label>
                    <select
                      required
                      value={formData.classroomId}
                      onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Classroom</option>
                      {classrooms.map(room => (
                        <option key={room.id} value={room.id}>{room.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95"
                  >
                    Create Section
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
