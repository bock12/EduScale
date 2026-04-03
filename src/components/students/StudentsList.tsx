import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, orderBy, writeBatch, doc, serverTimestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Student, StudentTag, StudentProfile, UserProfile } from '../../types';
import { Search, Plus, Filter, MoreVertical, ChevronRight, UserCircle, CheckSquare, Square, Trash2, Tag, UserCheck, UserMinus, GraduationCap, X, Edit, CreditCard, AlertCircle, UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddStudentModal from './AddStudentModal';
import FilterModal from './FilterModal';
import EditStudentModal from './EditStudentModal';
import IdCardModal from './IdCardModal';
import CreateAccountModal from '../CreateAccountModal';

interface StudentsListProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentsList({ organization, userProfile }: StudentsListProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Record<string, StudentProfile>>({});
  const [tags, setTags] = useState<Record<string, StudentTag[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState({ status: '', gradeLevel: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchActionLoading, setBatchActionLoading] = useState(false);
  
  // Action menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToIdCard, setStudentToIdCard] = useState<Student | null>(null);
  const [studentToCreateAccount, setStudentToCreateAccount] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch students
      const studentsRef = collection(db, 'organizations', organization.id, 'students');
      const q = query(studentsRef, orderBy('lastName', 'asc'));
      const snapshot = await getDocs(q);
      
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsData);

      // Fetch profiles for photos
      const profilesRef = collection(db, 'organizations', organization.id, 'student_profiles');
      const profilesSnapshot = await getDocs(profilesRef);
      const profilesMap: Record<string, StudentProfile> = {};
      profilesSnapshot.docs.forEach(doc => {
        const profile = { id: doc.id, ...doc.data() } as StudentProfile;
        profilesMap[profile.studentId] = profile;
      });
      setProfiles(profilesMap);

      // Fetch tags for all students
      const tagsRef = collection(db, 'organizations', organization.id, 'student_tags');
      const tagsSnapshot = await getDocs(tagsRef);
      
      const tagsMap: Record<string, StudentTag[]> = {};
      tagsSnapshot.docs.forEach(doc => {
        const tag = { id: doc.id, ...doc.data() } as StudentTag;
        if (!tagsMap[tag.studentId]) {
          tagsMap[tag.studentId] = [];
        }
        tagsMap[tag.studentId].push(tag);
      });
      
      setTags(tagsMap);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/students`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [organization.id]);

  const handleAddSuccess = (studentId: string) => {
    fetchStudents();
    navigate(`/students/${studentId}`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchStatusUpdate = async (status: Student['status']) => {
    if (selectedIds.length === 0) return;
    setBatchActionLoading(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        const studentRef = doc(db, 'organizations', organization.id, 'students', id);
        batch.update(studentRef, { 
          status,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      setSelectedIds([]);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/students/batch`);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchTagAssign = async () => {
    const tagName = prompt('Enter tag name to assign to selected students:');
    if (!tagName) return;

    setBatchActionLoading(true);
    try {
      const promises = selectedIds.map(id => 
        addDoc(collection(db, 'organizations', organization.id, 'student_tags'), {
          studentId: id,
          organizationId: organization.id,
          name: tagName,
          category: 'other',
          color: '#3b82f6',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      setSelectedIds([]);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/student_tags/batch`);
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'students', studentToDelete.id));
      setStudentToDelete(null);
      fetchStudents();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `organizations/${organization.id}/students/${studentToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status ? student.status === filters.status : true;
    const matchesGrade = filters.gradeLevel ? student.gradeLevel === filters.gradeLevel : true;

    return matchesSearch && matchesStatus && matchesGrade;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const isAdmin = userProfile.role === 'school_admin' || userProfile.role === 'super_admin';

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Students</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Manage student records, profiles, and enrollment.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shrink-0 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            Add Student
          </button>
        )}
      </header>

      {/* Batch Actions Bar */}
      {isAdmin && selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-40 bg-[#1a1a1a] text-white px-4 md:px-6 py-4 rounded-2xl shadow-2xl flex flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 border-r border-white/20 pr-4 md:pr-6">
            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-sm font-bold hidden sm:inline">Selected</span>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => handleBatchStatusUpdate('active')}
              disabled={batchActionLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-bold disabled:opacity-50 whitespace-nowrap"
            >
              <UserCheck className="w-4 h-4 text-green-400" />
              <span className="hidden lg:inline">Active</span>
            </button>
            <button 
              onClick={() => handleBatchStatusUpdate('inactive')}
              disabled={batchActionLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-bold disabled:opacity-50 whitespace-nowrap"
            >
              <UserMinus className="w-4 h-4 text-red-400" />
              <span className="hidden lg:inline">Inactive</span>
            </button>
            <button 
              onClick={() => handleBatchStatusUpdate('graduated')}
              disabled={batchActionLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-bold disabled:opacity-50 whitespace-nowrap"
            >
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span className="hidden lg:inline">Graduate</span>
            </button>
            <button 
              onClick={handleBatchTagAssign}
              disabled={batchActionLoading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm font-bold disabled:opacity-50 whitespace-nowrap"
            >
              <Tag className="w-4 h-4 text-pink-400" />
              <span className="hidden lg:inline">Tag</span>
            </button>
          </div>
          
          <button 
            onClick={() => setSelectedIds([])}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button 
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center justify-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-all shrink-0 ${
              filters.status || filters.gradeLevel 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-[#f5f5f5] text-[#1a1a1a] hover:bg-[#e5e5e5]'
            }`}
          >
            <Filter className="w-5 h-5" />
            Filters {(filters.status || filters.gradeLevel) && '(Active)'}
          </button>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#e5e5e5]">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-[#9e9e9e]">
              <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No students found.</p>
            </div>
          ) : (
            paginatedStudents.map(student => {
              const isSelected = selectedIds.includes(student.id);
              const profile = profiles[student.id];
              return (
                <div 
                  key={student.id} 
                  className={`p-4 flex items-center gap-4 hover:bg-[#f9f9f9] transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  {isAdmin && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleSelect(student.id); }}
                      className={`p-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-[#9e9e9e]'}`}
                    >
                      {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                    </button>
                  )}
                  
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={student.firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{student.firstName[0]}{student.lastName[0]}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1a1a1a] truncate">{student.lastName}, {student.firstName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#9e9e9e]">{student.gradeLevel}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        student.status === 'active' ? 'bg-green-100 text-green-700' :
                        student.status === 'inactive' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {student.status}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-[#9e9e9e]" />
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-[#9e9e9e]">
              <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No students found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
                  {isAdmin && (
                    <th className="p-4 w-12">
                      <button 
                        onClick={toggleSelectAll}
                        className="p-1 text-[#9e9e9e] hover:text-blue-600 transition-colors"
                      >
                        {selectedIds.length === filteredStudents.length && filteredStudents.length > 0 ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Student</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">ID</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Grade</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Tags</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {paginatedStudents.map(student => {
                  const isSelected = selectedIds.includes(student.id);
                  const profile = profiles[student.id];
                  
                  return (
                    <tr 
                      key={student.id} 
                      className={`hover:bg-[#f9f9f9] transition-colors cursor-pointer group ${isSelected ? 'bg-blue-50/50' : ''}`}
                      onClick={() => navigate(`/students/${student.id}`)}
                    >
                      {isAdmin && (
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => toggleSelect(student.id)}
                            className={`p-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-[#9e9e9e] hover:text-blue-600'}`}
                          >
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            {profile?.photoURL ? (
                              <img 
                                src={profile.photoURL} 
                                alt={student.firstName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{student.firstName[0]}{student.lastName[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#1a1a1a]">{student.lastName}, {student.firstName}</p>
                            <p className="text-xs text-[#9e9e9e]">Enrolled {new Date(student.enrollmentDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-[#4a4a4a]">{student.studentId}</td>
                      <td className="p-4 font-medium">{student.gradeLevel}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          student.status === 'active' ? 'bg-green-100 text-green-700' :
                          student.status === 'inactive' ? 'bg-red-100 text-red-700' :
                          student.status === 'graduated' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {tags[student.id]?.slice(0, 2).map(tag => (
                            <span key={tag.id} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
                              {tag.name}
                            </span>
                          ))}
                          {tags[student.id]?.length > 2 && (
                            <span className="px-2 py-0.5 rounded bg-[#f0f0f0] text-[#9e9e9e] text-[10px] font-bold">
                              +{tags[student.id].length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <>
                            <button 
                              className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] rounded-lg hover:bg-[#e5e5e5] transition-colors" 
                              onClick={() => setActiveDropdown(activeDropdown === student.id ? null : student.id)}
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            
                            {activeDropdown === student.id && (
                              <div 
                                ref={dropdownRef}
                                className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white rounded-xl shadow-lg border border-[#e5e5e5] py-2 z-10 animate-in fade-in slide-in-from-top-2"
                              >
                                <button
                                  onClick={() => {
                                    setStudentToEdit(student);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-blue-600 transition-colors flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Student
                                </button>
                                <button
                                  onClick={() => {
                                    setStudentToCreateAccount(student);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-blue-600 transition-colors flex items-center gap-2"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Create Login
                                </button>
                                <button
                                  onClick={() => {
                                    setStudentToIdCard(student);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-blue-600 transition-colors flex items-center gap-2"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  Generate ID Card
                                </button>
                                <div className="h-px bg-[#e5e5e5] my-1" />
                                <button
                                  onClick={() => {
                                    setStudentToDelete(student);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Student
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <ChevronRight className="w-5 h-5 text-[#9e9e9e] group-hover:text-blue-600 transition-colors" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <div className="p-4 border-t border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
            <p className="text-sm text-[#9e9e9e]">
              Showing <span className="font-bold text-[#1a1a1a]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-[#1a1a1a]">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</span> of <span className="font-bold text-[#1a1a1a]">{filteredStudents.length}</span> students
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-[#e5e5e5] text-sm font-bold text-[#4a4a4a] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white' 
                        : 'text-[#4a4a4a] hover:bg-[#e5e5e5]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#e5e5e5] text-sm font-bold text-[#4a4a4a] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <AddStudentModal 
        organization={organization}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        currentFilters={filters}
      />

      {studentToEdit && (
        <EditStudentModal
          organization={organization}
          student={studentToEdit}
          isOpen={!!studentToEdit}
          onClose={() => setStudentToEdit(null)}
          onSuccess={() => {
            setStudentToEdit(null);
            fetchStudents();
          }}
        />
      )}

      {studentToIdCard && (
        <IdCardModal
          organization={organization}
          student={studentToIdCard}
          profile={profiles[studentToIdCard.id] || null}
          isOpen={!!studentToIdCard}
          onClose={() => setStudentToIdCard(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delete Student?</h2>
              <p className="text-[#4a4a4a] mb-6">
                Are you sure you want to delete <strong>{studentToDelete.firstName} {studentToDelete.lastName}</strong>? This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setStudentToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {studentToCreateAccount && (
        <CreateAccountModal
          isOpen={!!studentToCreateAccount}
          onClose={() => setStudentToCreateAccount(null)}
          organizationId={organization.id}
          defaultEmail={studentToCreateAccount.email || ''}
          defaultName={`${studentToCreateAccount.firstName} ${studentToCreateAccount.lastName}`}
          role="student"
          entityId={studentToCreateAccount.id}
        />
      )}
    </div>
  );
}
