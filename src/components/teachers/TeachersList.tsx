import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherProfile } from '../../types';
import { Search, Plus, MoreVertical, UserCircle, Edit, Trash2, AlertCircle, CreditCard, UserPlus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddTeacherModal from './AddTeacherModal';
import EditTeacherModal from './EditTeacherModal';
import IdCardModal from './IdCardModal';
import CreateAccountModal from '../CreateAccountModal';

interface TeachersListProps {
  organization: Organization;
}

export default function TeachersList({ organization }: TeachersListProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [profiles, setProfiles] = useState<Record<string, TeacherProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Action menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [teacherToIdCard, setTeacherToIdCard] = useState<Teacher | null>(null);
  const [teacherToCreateAccount, setTeacherToCreateAccount] = useState<Teacher | null>(null);
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

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      // Fetch teachers
      const teachersRef = collection(db, 'organizations', organization.id, 'teachers');
      const q = query(teachersRef, orderBy('lastName', 'asc'));
      const snapshot = await getDocs(q);
      
      const teachersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teacher[];
      
      setTeachers(teachersData);

      // Fetch profiles for photos
      const profilesRef = collection(db, 'organizations', organization.id, 'teacher_profiles');
      const profilesSnapshot = await getDocs(profilesRef);
      const profilesMap: Record<string, TeacherProfile> = {};
      profilesSnapshot.docs.forEach(doc => {
        const profile = { id: doc.id, ...doc.data() } as TeacherProfile;
        profilesMap[profile.teacherId] = profile;
      });
      setProfiles(profilesMap);

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teachers`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [organization.id]);

  const handleAddSuccess = (teacherId: string) => {
    fetchTeachers();
    setIsAddModalOpen(false);
    navigate(`/teachers/${teacherId}`);
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'teachers', teacherToDelete.id));
      setTeacherToDelete(null);
      fetchTeachers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `organizations/${organization.id}/teachers/${teacherToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const paginatedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] tracking-tight">Teachers</h1>
          <p className="text-[#4a4a4a] mt-1">Manage teaching staff and profiles</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-all shrink-0 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          Add Teacher
        </button>
      </header>

      <div className="bg-white rounded-2xl md:rounded-[32px] shadow-sm border border-[#e5e5e5] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 border-b border-[#e5e5e5] flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
            <input
              type="text"
              placeholder="Search teachers by name, ID, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-[#e5e5e5]">
          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-[#9e9e9e]">
              <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No teachers found.</p>
            </div>
          ) : (
            paginatedTeachers.map(teacher => {
              const profile = profiles[teacher.id];
              return (
                <div 
                  key={teacher.id} 
                  className="p-4 flex items-center gap-4 hover:bg-[#f9f9f9] transition-colors cursor-pointer"
                  onClick={() => navigate(`/teachers/${teacher.id}`)}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={teacher.firstName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{teacher.firstName[0]}{teacher.lastName[0]}</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#1a1a1a] truncate">{teacher.lastName}, {teacher.firstName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#9e9e9e]">{teacher.department}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        teacher.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {teacher.status}
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
            <div className="p-8 text-center text-[#9e9e9e]">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Loading teachers...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-8 text-center text-[#9e9e9e]">
              <UserCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium text-[#4a4a4a]">No teachers found</p>
              <p>Try adjusting your search criteria</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Teacher</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">ID</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Email / Phone</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {paginatedTeachers.map(teacher => {
                  const profile = profiles[teacher.id];
                  
                  return (
                    <tr 
                      key={teacher.id} 
                      className="hover:bg-[#f9f9f9] transition-colors cursor-pointer group"
                      onClick={() => navigate(`/teachers/${teacher.id}`)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
                            {profile?.photoURL ? (
                              <img 
                                src={profile.photoURL} 
                                alt={teacher.firstName} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span>{teacher.firstName[0]}{teacher.lastName[0]}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[#1a1a1a]">{teacher.lastName}, {teacher.firstName}</p>
                            <p className="text-xs text-[#9e9e9e]">Hired {new Date(teacher.hireDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-sm text-[#4a4a4a]">{teacher.teacherId}</td>
                      <td className="p-4">
                        <p className="text-sm text-[#1a1a1a]">{teacher.email}</p>
                        {teacher.phone && <p className="text-xs text-[#9e9e9e]">{teacher.phone}</p>}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                          teacher.status === 'active' ? 'bg-green-100 text-green-700' :
                          teacher.status === 'inactive' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {teacher.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] rounded-lg hover:bg-[#e5e5e5] transition-colors" 
                          onClick={() => setActiveDropdown(activeDropdown === teacher.id ? null : teacher.id)}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {activeDropdown === teacher.id && (
                          <div 
                            ref={dropdownRef}
                            className="absolute right-8 top-1/2 -translate-y-1/2 w-48 bg-white rounded-xl shadow-lg border border-[#e5e5e5] py-2 z-10 animate-in fade-in slide-in-from-top-2"
                          >
                            <button
                              onClick={() => {
                                setTeacherToCreateAccount(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-blue-600 transition-colors flex items-center gap-2"
                            >
                              <UserPlus className="w-4 h-4" />
                              Create Login
                            </button>
                            <button
                              onClick={() => {
                                setTeacherToIdCard(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-purple-600 transition-colors flex items-center gap-2"
                            >
                              <CreditCard className="w-4 h-4" />
                              ID Card
                            </button>
                            <button
                              onClick={() => {
                                setTeacherToEdit(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] hover:text-blue-600 transition-colors flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit Teacher
                            </button>
                            <div className="h-px bg-[#e5e5e5] my-1" />
                            <button
                              onClick={() => {
                                setTeacherToDelete(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Teacher
                            </button>
                          </div>
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
        {!loading && filteredTeachers.length > 0 && (
          <div className="p-4 border-t border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
            <p className="text-sm text-[#9e9e9e]">
              Showing <span className="font-bold text-[#1a1a1a]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-[#1a1a1a]">{Math.min(currentPage * itemsPerPage, filteredTeachers.length)}</span> of <span className="font-bold text-[#1a1a1a]">{filteredTeachers.length}</span> teachers
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

      <AddTeacherModal 
        organization={organization}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />

      {teacherToEdit && (
        <EditTeacherModal
          organization={organization}
          teacher={teacherToEdit}
          isOpen={!!teacherToEdit}
          onClose={() => setTeacherToEdit(null)}
          onSuccess={() => {
            setTeacherToEdit(null);
            fetchTeachers();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delete Teacher?</h2>
              <p className="text-[#4a4a4a] mb-6">
                Are you sure you want to delete <strong>{teacherToDelete.firstName} {teacherToDelete.lastName}</strong>? This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTeacherToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTeacher}
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
      {teacherToIdCard && (
        <IdCardModal
          organization={organization}
          teacher={teacherToIdCard}
          profile={profiles[teacherToIdCard.id] || null}
          isOpen={!!teacherToIdCard}
          onClose={() => setTeacherToIdCard(null)}
        />
      )}

      {teacherToCreateAccount && (
        <CreateAccountModal
          isOpen={!!teacherToCreateAccount}
          onClose={() => setTeacherToCreateAccount(null)}
          organizationId={organization.id}
          defaultEmail={teacherToCreateAccount.email}
          defaultName={`${teacherToCreateAccount.firstName} ${teacherToCreateAccount.lastName}`}
          role="teacher"
          entityId={teacherToCreateAccount.id}
        />
      )}
    </div>
  );
}
