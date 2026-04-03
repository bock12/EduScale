import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { 
  Organization, 
  Student, 
  StudentProfile, 
  StudentGuardian, 
  StudentMedicalRecord, 
  StudentAddress, 
  StudentEnrollmentHistory, 
  StudentDocument, 
  StudentTag,
  UserProfile,
  ExamResult,
  AttendanceRecord,
  ClassTeacher,
  ClassStudent,
  Teacher,
  ExamSubject
} from '../../types';
import { 
  ArrowLeft, 
  UserCircle, 
  Users, 
  HeartPulse, 
  MapPin, 
  History, 
  FileText, 
  Tags,
  Edit2,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  AlertCircle,
  ExternalLink,
  Printer,
  Trash2,
  BookOpen,
  CheckCircle,
  Clock
} from 'lucide-react';
import EditStudentModal from './EditStudentModal';
import EditProfileModal from './EditProfileModal';
import AddGuardianModal from './AddGuardianModal';
import EditMedicalModal from './EditMedicalModal';
import AddAddressModal from './AddAddressModal';
import AddEnrollmentModal from './AddEnrollmentModal';
import AddDocumentModal from './AddDocumentModal';
import AddTagModal from './AddTagModal';
import IdCardModal from './IdCardModal';
import CreateAccountModal from '../CreateAccountModal';
import StudentProgressTracking from '../student/StudentProgressTracking';
import { UserPlus, CheckCircle2, TrendingUp } from 'lucide-react';

interface StudentDetailsProps {
  organization: Organization;
  userProfile: UserProfile;
}

type TabType = 'profile' | 'guardians' | 'medical' | 'addresses' | 'enrollment' | 'documents' | 'tags' | 'academic' | 'progress';

export default function StudentDetails({ organization, userProfile }: StudentDetailsProps) {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabType>('academic');
  const [loading, setLoading] = useState(true);
  const [isFormalMaster, setIsFormalMaster] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isAddGuardianModalOpen, setIsAddGuardianModalOpen] = useState(false);
  const [isEditMedicalModalOpen, setIsEditMedicalModalOpen] = useState(false);
  const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
  const [isAddEnrollmentModalOpen, setIsAddEnrollmentModalOpen] = useState(false);
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [student, setStudent] = useState<Student | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [guardians, setGuardians] = useState<StudentGuardian[]>([]);
  const [medical, setMedical] = useState<StudentMedicalRecord | null>(null);
  const [addresses, setAddresses] = useState<StudentAddress[]>([]);
  const [enrollment, setEnrollment] = useState<StudentEnrollmentHistory[]>([]);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [tags, setTags] = useState<StudentTag[]>([]);
  const [userAccount, setUserAccount] = useState<any | null>(null);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [examSubjects, setExamSubjects] = useState<Map<string, ExamSubject>>(new Map());
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const fetchStudentData = async () => {
    if (!studentId) return;
    
    try {
      setLoading(true);
      
      // Fetch core student doc
      const studentDoc = await getDoc(doc(db, 'organizations', organization.id, 'students', studentId));
      if (!studentDoc.exists()) {
        navigate('/students');
        return;
      }
      const studentData = { id: studentDoc.id, ...studentDoc.data() } as Student;
      setStudent(studentData);

      // Fetch teacher data if user is a teacher
      let currentTeacher: Teacher | null = null;
      if (userProfile.role === 'teacher') {
        const teacherIdToFetch = userProfile.entityId || userProfile.uid;
        const teacherDoc = await getDoc(doc(db, 'organizations', organization.id, 'teachers', teacherIdToFetch));
        if (teacherDoc.exists()) {
          currentTeacher = { id: teacherDoc.id, ...teacherDoc.data() } as Teacher;
          setTeacher(currentTeacher);
        }
      }

      // Check if user is a formal master for this student
      let isPrimary = false;
      if (userProfile.role === 'teacher') {
        const teacherIdToFetch = userProfile.entityId || userProfile.uid;
        const enrollmentsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'class_students'),
          where('studentId', '==', studentId)
        ));
        
        const sectionIds = enrollmentsSnap.docs.map(d => (d.data() as ClassStudent).sectionId);
        
        if (sectionIds.length > 0) {
          const teachersSnap = await getDocs(query(
            collection(db, 'organizations', organization.id, 'class_teachers'),
            where('teacherId', '==', teacherIdToFetch),
            where('role', '==', 'primary')
          ));
          
          isPrimary = teachersSnap.docs.some(d => sectionIds.includes((d.data() as ClassTeacher).sectionId));
          setIsFormalMaster(isPrimary);
          
          // Default tab for teachers who are not formal masters should be 'academic'
          if (!isPrimary) {
            setActiveTab('academic');
          }
        } else {
          setActiveTab('academic');
        }
      }

      const canReadSensitive = userProfile.role === 'super_admin' || userProfile.role === 'school_admin';

      // Fetch related data in parallel
      const [
        profileSnap,
        enrollmentSnap,
        tagsSnap,
        examResultsSnap,
        attendanceSnap
      ] = await Promise.all([
        getDocs(query(collection(db, 'organizations', organization.id, 'student_profiles'), where('studentId', '==', studentId))),
        getDocs(query(collection(db, 'organizations', organization.id, 'student_enrollment_history'), where('studentId', '==', studentId))),
        getDocs(query(collection(db, 'organizations', organization.id, 'student_tags'), where('studentId', '==', studentId))),
        getDocs(query(collection(db, 'organizations', organization.id, 'exam_results'), where('studentId', '==', studentId))),
        getDocs(query(collection(db, 'organizations', organization.id, 'attendance_records'), where('studentId', '==', studentId)))
      ]);

      let guardiansSnap, medicalSnap, addressesSnap, documentsSnap;
      if (canReadSensitive) {
        [guardiansSnap, medicalSnap, addressesSnap, documentsSnap] = await Promise.all([
          getDocs(query(collection(db, 'organizations', organization.id, 'student_guardians'), where('studentId', '==', studentId))),
          getDocs(query(collection(db, 'organizations', organization.id, 'student_medical_records'), where('studentId', '==', studentId))),
          getDocs(query(collection(db, 'organizations', organization.id, 'student_addresses'), where('studentId', '==', studentId))),
          getDocs(query(collection(db, 'organizations', organization.id, 'student_documents'), where('studentId', '==', studentId)))
        ]);
      }

      setProfile(profileSnap.docs[0] ? { id: profileSnap.docs[0].id, ...profileSnap.docs[0].data() } as StudentProfile : null);
      setEnrollment(enrollmentSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentEnrollmentHistory)));
      setTags(tagsSnap.docs.map(d => ({ id: d.id, ...d.data() } as StudentTag)));
      
      if (canReadSensitive) {
        setGuardians(guardiansSnap!.docs.map(d => ({ id: d.id, ...d.data() } as StudentGuardian)));
        setMedical(medicalSnap!.docs[0] ? { id: medicalSnap!.docs[0].id, ...medicalSnap!.docs[0].data() } as StudentMedicalRecord : null);
        setAddresses(addressesSnap!.docs.map(d => ({ id: d.id, ...d.data() } as StudentAddress)));
        setDocuments(documentsSnap!.docs.map(d => ({ id: d.id, ...d.data() } as StudentDocument)));
      } else {
        setGuardians([]);
        setMedical(null);
        setAddresses([]);
        setDocuments([]);
      }
      
      // Fetch exam subjects to filter results by teacher's subjects
      const examSubjectsSnap = await getDocs(collection(db, 'organizations', organization.id, 'exam_subjects'));
      const examSubjectsMap = new Map(examSubjectsSnap.docs.map(d => [d.id, d.data() as ExamSubject]));
      setExamSubjects(examSubjectsMap);

      let results = examResultsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ExamResult));
      
      // Filter results if user is a teacher and NOT a formal master
      if (userProfile.role === 'teacher' && !isPrimary && currentTeacher) {
        results = results.filter(result => {
          const examSubject = examSubjectsMap.get(result.examSubjectId);
          return examSubject && currentTeacher?.subjects?.includes(examSubject.subject);
        });
      }
      
      setExamResults(results);
      setAttendanceRecords(attendanceSnap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));

      // Check for existing user account if authorized
      if (canReadSensitive) {
        const userQ = query(collection(db, 'users'), where('entityId', '==', studentId));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          setUserAccount({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
        } else {
          setUserAccount(null);
        }
      } else {
        setUserAccount(null);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/students/${studentId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [studentId, organization.id, navigate]);

  const handleDeleteStudent = async () => {
    if (!studentId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'students', studentId));
      navigate('/students');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `organizations/${organization.id}/students/${studentId}`);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) return null;

  const tabs = [
    { id: 'academic', label: 'Academic', icon: GraduationCap, restricted: false },
    { id: 'progress', label: 'Progress', icon: TrendingUp, restricted: false },
    { id: 'profile', label: 'Profile', icon: UserCircle, restricted: true },
    { id: 'guardians', label: 'Guardians', icon: Users, restricted: true },
    { id: 'medical', label: 'Medical', icon: HeartPulse, restricted: true },
    { id: 'addresses', label: 'Addresses', icon: MapPin, restricted: true },
    { id: 'enrollment', label: 'Enrollment', icon: History, restricted: true },
    { id: 'documents', label: 'Documents', icon: FileText, restricted: true },
    { id: 'tags', label: 'Tags', icon: Tags, restricted: true },
  ] as const;

  const isTeacher = userProfile.role === 'teacher';
  const canSeeDetails = !isTeacher;

  const visibleTabs = tabs.filter(tab => !tab.restricted || canSeeDetails);

  return (
    <div className="space-y-6 md:space-y-8 pb-12 max-w-6xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/students')}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a] shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Student Photo */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-[#f5f5f5] border-2 border-white shadow-sm flex items-center justify-center shrink-0">
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={`${student.firstName} ${student.lastName}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold">
                {student.firstName[0]}{student.lastName[0]}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-xl md:text-3xl font-bold tracking-tight truncate">{student.firstName} {student.lastName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-xs md:text-sm text-[#9e9e9e]">{student.studentId}</span>
              <span className="text-[#e5e5e5] hidden md:inline">•</span>
              <span className="text-[#4a4a4a] text-xs md:text-sm font-medium">Grade {student.gradeLevel}</span>
              <span className="text-[#e5e5e5] hidden md:inline">•</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                student.status === 'active' ? 'bg-green-100 text-green-700' :
                student.status === 'inactive' ? 'bg-red-100 text-red-700' :
                student.status === 'graduated' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {student.status}
              </span>
              {isTeacher && isFormalMaster && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Formal Master
                </span>
              )}
            </div>
          </div>
        </div>

        {(userProfile.role === 'school_admin' || userProfile.role === 'super_admin') && (
          <div className="flex flex-wrap items-center gap-2 md:ml-auto">
            {userAccount ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl font-bold border border-green-100 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Login Active
              </div>
            ) : (
              <button 
                onClick={() => setIsCreateAccountModalOpen(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-[#e5e5e5] text-[#4a4a4a] font-bold px-4 py-2.5 rounded-xl hover:bg-[#f9f9f9] transition-all text-sm shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="whitespace-nowrap">Create Login</span>
              </button>
            )}
            <button 
              onClick={() => setIsIdCardModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 font-bold px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-all text-sm shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span className="whitespace-nowrap">ID Card</span>
            </button>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold px-4 py-2.5 rounded-xl hover:bg-[#e5e5e5] transition-all text-sm shadow-sm"
            >
              <Edit2 className="w-4 h-4" />
              <span className="whitespace-nowrap">Edit</span>
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold px-4 py-2.5 rounded-xl hover:bg-red-100 transition-all text-sm shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="whitespace-nowrap">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:w-full ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 shadow-sm' 
                    : 'text-[#4a4a4a] hover:bg-[#f5f5f5]'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-[#9e9e9e]'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3 bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm p-6 md:p-8 min-h-[500px]">
          
          {activeTab === 'progress' && (
            <StudentProgressTracking studentId={studentId!} organization={organization} />
          )}

          {activeTab === 'academic' && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-blue-600" />
                  Academic Records
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Summary */}
                <div className="bg-[#f9f9f9] p-6 rounded-2xl border border-[#e5e5e5]">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Attendance Summary
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#4a4a4a]">Present</span>
                      <span className="font-bold text-green-600">{attendanceRecords.filter(r => r.status === 'present').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#4a4a4a]">Absent</span>
                      <span className="font-bold text-red-600">{attendanceRecords.filter(r => r.status === 'absent').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#4a4a4a]">Late</span>
                      <span className="font-bold text-amber-600">{attendanceRecords.filter(r => r.status === 'late').length}</span>
                    </div>
                  </div>
                </div>

                {/* Exam Results */}
                <div className="bg-[#f9f9f9] p-6 rounded-2xl border border-[#e5e5e5]">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    Recent Exam Results
                  </h4>
                  <div className="space-y-3">
                    {examResults.length === 0 ? (
                      <p className="text-sm text-[#9e9e9e] text-center py-4">No exam results found.</p>
                    ) : (
                      examResults.slice(0, 5).map(result => {
                        const subject = examSubjects.get(result.examSubjectId);
                        return (
                          <div key={result.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#e5e5e5]">
                            <div>
                              <p className="text-sm font-bold truncate max-w-[150px]">{subject ? subject.subject : `Exam ${result.examSubjectId.slice(0, 5)}`}</p>
                              <p className="text-[10px] text-[#9e9e9e] uppercase font-bold tracking-widest">Score: {result.score}</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">
                              {result.grade || 'N/A'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Activities Section for Formal Masters */}
              {isFormalMaster && profile && (
                <div className="space-y-6 pt-6 border-t border-[#e5e5e5]">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <Tags className="w-5 h-5 text-pink-500" />
                    Activities & Interests
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#f9f9f9] p-5 rounded-2xl border border-[#e5e5e5]">
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-3">Hobbies</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.hobbies?.length ? profile.hobbies.map((hobby, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-[#e5e5e5] rounded-full text-xs font-medium">{hobby}</span>
                        )) : <span className="text-xs text-[#9e9e9e]">None listed</span>}
                      </div>
                    </div>
                    <div className="bg-[#f9f9f9] p-5 rounded-2xl border border-[#e5e5e5]">
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-3">Extracurriculars</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.extracurriculars?.length ? profile.extracurriculars.map((activity, i) => (
                          <span key={i} className="px-3 py-1 bg-white border border-[#e5e5e5] rounded-full text-xs font-medium">{activity}</span>
                        )) : <span className="text-xs text-[#9e9e9e]">None listed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && canSeeDetails && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserCircle className="w-6 h-6 text-blue-600" />
                  Student Profile
                </h3>
                <button 
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Edit Profile
                </button>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8">
                {/* Large Profile Photo */}
                <div className="w-full md:w-48 h-48 rounded-[32px] overflow-hidden bg-[#f5f5f5] border-4 border-white shadow-lg flex items-center justify-center shrink-0">
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt={`${student.firstName} ${student.lastName}`} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 text-blue-600 flex items-center justify-center text-5xl font-bold">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Basic Info</p>
                      <div className="space-y-3 bg-[#f9f9f9] p-4 rounded-2xl border border-[#e5e5e5]">
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-4 h-4 text-[#9e9e9e]" />
                          <span className="text-[#4a4a4a] w-24">DOB:</span>
                          <span className="font-medium">{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <UserCircle className="w-4 h-4 text-[#9e9e9e]" />
                          <span className="text-[#4a4a4a] w-24">Gender:</span>
                          <span className="font-medium capitalize">{student.gender || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <GraduationCap className="w-4 h-4 text-[#9e9e9e]" />
                          <span className="text-[#4a4a4a] w-24">Enrolled:</span>
                          <span className="font-medium">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Demographics</p>
                      <div className="space-y-3 bg-[#f9f9f9] p-4 rounded-2xl border border-[#e5e5e5]">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-[#4a4a4a] w-24">Language:</span>
                          <span className="font-medium">{profile?.primaryLanguage || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-[#4a4a4a] w-24">Nationality:</span>
                          <span className="font-medium">{profile?.nationality || 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Biography</p>
                      <div className="bg-[#f9f9f9] p-4 rounded-2xl border border-[#e5e5e5] text-sm text-[#4a4a4a] leading-relaxed min-h-[100px]">
                        {profile?.bio || 'No biography provided.'}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Interests & Activities</p>
                      <div className="bg-[#f9f9f9] p-4 rounded-2xl border border-[#e5e5e5] space-y-4">
                        <div>
                          <p className="text-xs font-bold text-[#1a1a1a] mb-2">Hobbies</p>
                          <div className="flex flex-wrap gap-2">
                            {profile?.hobbies?.length ? profile.hobbies.map((hobby, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-[#e5e5e5] rounded-lg text-xs font-medium">{hobby}</span>
                            )) : <span className="text-xs text-[#9e9e9e]">None listed</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#1a1a1a] mb-2">Extracurriculars</p>
                          <div className="flex flex-wrap gap-2">
                            {profile?.extracurriculars?.length ? profile.extracurriculars.map((activity, i) => (
                              <span key={i} className="px-2 py-1 bg-white border border-[#e5e5e5] rounded-lg text-xs font-medium">{activity}</span>
                            )) : <span className="text-xs text-[#9e9e9e]">None listed</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guardians' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  Guardians & Contacts
                </h3>
                <button 
                  onClick={() => setIsAddGuardianModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Add Guardian
                </button>
              </div>
              
              {guardians.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e]">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No guardians registered.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guardians.map(guardian => (
                    <div key={guardian.id} className="border border-[#e5e5e5] rounded-2xl p-5 relative bg-[#f9f9f9]">
                      {guardian.isPrimary && (
                        <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full">Primary</span>
                      )}
                      {guardian.isEmergencyContact && (
                        <span className="absolute top-4 right-4 bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full mt-6">Emergency</span>
                      )}
                      
                      <h4 className="font-bold text-lg mb-1">{guardian.firstName} {guardian.lastName}</h4>
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-4">{guardian.relationship}</p>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-4 h-4 text-[#9e9e9e]" />
                          <span className="font-medium">{guardian.phone}</span>
                        </div>
                        {guardian.email && (
                          <div className="flex items-center gap-3 text-sm">
                            <Mail className="w-4 h-4 text-[#9e9e9e]" />
                            <span className="font-medium">{guardian.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'medical' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <HeartPulse className="w-6 h-6 text-red-600" />
                  Medical Records
                </h3>
                <button 
                  onClick={() => setIsEditMedicalModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Edit Medical Info
                </button>
              </div>
              
              {!medical ? (
                <div className="text-center py-12 text-[#9e9e9e]">
                  <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No medical records found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 bg-red-50 p-4 rounded-2xl border border-red-100">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-600 font-black text-xl shadow-sm">
                      {medical.bloodType || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-800 uppercase tracking-widest">Blood Type</p>
                      <p className="text-sm text-red-600">Ensure this is verified by a medical professional.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#f9f9f9] p-5 rounded-2xl border border-[#e5e5e5]">
                      <h4 className="font-bold mb-4 flex items-center gap-2 text-[#1a1a1a]">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Allergies
                      </h4>
                      {medical.allergies?.length ? (
                        <ul className="list-disc list-inside space-y-1 text-sm text-[#4a4a4a]">
                          {medical.allergies.map((allergy, i) => <li key={i}>{allergy}</li>)}
                        </ul>
                      ) : <p className="text-sm text-[#9e9e9e]">No known allergies.</p>}
                    </div>

                    <div className="bg-[#f9f9f9] p-5 rounded-2xl border border-[#e5e5e5]">
                      <h4 className="font-bold mb-4 flex items-center gap-2 text-[#1a1a1a]">
                        <HeartPulse className="w-4 h-4 text-blue-500" />
                        Conditions & Medications
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Conditions</p>
                          {medical.conditions?.length ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-[#4a4a4a]">
                              {medical.conditions.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                          ) : <p className="text-sm text-[#9e9e9e]">None reported.</p>}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Medications</p>
                          {medical.medications?.length ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-[#4a4a4a]">
                              {medical.medications.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                          ) : <p className="text-sm text-[#9e9e9e]">None reported.</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#f9f9f9] p-5 rounded-2xl border border-[#e5e5e5]">
                    <h4 className="font-bold mb-3 text-[#1a1a1a]">Primary Physician</h4>
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Doctor Name</p>
                        <p className="font-medium text-sm">{medical.doctorName || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Contact</p>
                        <p className="font-medium text-sm">{medical.doctorPhone || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-green-600" />
                  Addresses
                </h3>
                <button 
                  onClick={() => setIsAddAddressModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Add Address
                </button>
              </div>
              
              {addresses.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] border-dashed">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No addresses found.</p>
                  <p className="text-sm mt-1">Add an address to keep student records complete.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((address) => (
                    <div key={address.id} className="bg-white p-5 rounded-2xl border border-[#e5e5e5] hover:shadow-md transition-shadow relative group">
                      {address.isPrimary && (
                        <span className="absolute top-4 right-4 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                      
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-[#1a1a1a] capitalize mb-1">
                            {address.type} Address
                          </h4>
                          <div className="text-sm text-[#4a4a4a] space-y-1">
                            <p>{address.street1}</p>
                            {address.street2 && <p>{address.street2}</p>}
                            <p>{address.city}, {address.state} {address.zipCode}</p>
                            <p>{address.country}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'enrollment' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-6 h-6 text-indigo-600" />
                  Enrollment History
                </h3>
                <button 
                  onClick={() => setIsAddEnrollmentModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Add Record
                </button>
              </div>
              
              {enrollment.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] border-dashed">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No enrollment records found.</p>
                  <p className="text-sm mt-1">Add an enrollment record to track student history.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {enrollment.map((record) => (
                    <div key={record.id} className="bg-white p-5 rounded-2xl border border-[#e5e5e5] hover:shadow-md transition-shadow flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg text-[#1a1a1a]">
                            {record.academicYear} - {record.gradeLevel}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-[#4a4a4a] mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(record.enrollmentDate).toLocaleDateString()}
                            </span>
                            {record.notes && (
                              <span className="flex items-center gap-1 text-[#9e9e9e]">
                                • {record.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        record.status === 'enrolled' ? 'bg-green-100 text-green-800' :
                        record.status === 'withdrawn' ? 'bg-red-100 text-red-800' :
                        record.status === 'graduated' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-orange-600" />
                  Documents
                </h3>
                <button 
                  onClick={() => setIsAddDocumentModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Add Document
                </button>
              </div>
              
              {documents.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] border-dashed">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No documents found.</p>
                  <p className="text-sm mt-1">Upload documents to keep student records complete.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="bg-white p-5 rounded-2xl border border-[#e5e5e5] hover:shadow-md transition-shadow flex items-start justify-between group">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-[#1a1a1a] mb-1">{doc.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-[#4a4a4a] mb-2">
                            <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">{doc.type.replace('_', ' ')}</span>
                            <span className="text-[#9e9e9e]">•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                          {doc.notes && <p className="text-sm text-[#4a4a4a]">{doc.notes}</p>}
                        </div>
                      </div>
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                        title="View Document"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Tags className="w-6 h-6 text-pink-600" />
                  Tags
                </h3>
                <button 
                  onClick={() => setIsAddTagModalOpen(true)}
                  className="text-blue-600 text-sm font-bold hover:underline"
                >
                  Add Tag
                </button>
              </div>
              
              {tags.length === 0 ? (
                <div className="text-center py-12 text-[#9e9e9e] bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] border-dashed">
                  <Tags className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No tags found.</p>
                  <p className="text-sm mt-1">Add tags to categorize and organize student records.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {tags.map((tag) => (
                    <div 
                      key={tag.id} 
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e5e5e5] bg-white shadow-sm"
                    >
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium text-[#1a1a1a]">{tag.name}</span>
                      <span className="text-xs text-[#9e9e9e] uppercase tracking-wider ml-1">
                        {tag.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      <EditStudentModal 
        organization={organization}
        student={student}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <EditProfileModal
        organization={organization}
        profile={profile}
        studentId={student.id}
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <AddGuardianModal
        organization={organization}
        studentId={student.id}
        isOpen={isAddGuardianModalOpen}
        onClose={() => setIsAddGuardianModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <EditMedicalModal
        organization={organization}
        medical={medical}
        studentId={student.id}
        isOpen={isEditMedicalModalOpen}
        onClose={() => setIsEditMedicalModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <AddAddressModal
        organization={organization}
        studentId={student.id}
        isOpen={isAddAddressModalOpen}
        onClose={() => setIsAddAddressModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <AddEnrollmentModal
        organization={organization}
        studentId={student.id}
        isOpen={isAddEnrollmentModalOpen}
        onClose={() => setIsAddEnrollmentModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <AddDocumentModal
        organization={organization}
        studentId={student.id}
        isOpen={isAddDocumentModalOpen}
        onClose={() => setIsAddDocumentModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <AddTagModal
        organization={organization}
        studentId={student.id}
        isOpen={isAddTagModalOpen}
        onClose={() => setIsAddTagModalOpen(false)}
        onSuccess={fetchStudentData}
      />

      <IdCardModal
        organization={organization}
        student={student}
        profile={profile}
        isOpen={isIdCardModalOpen}
        onClose={() => setIsIdCardModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delete Student?</h2>
              <p className="text-[#4a4a4a] mb-6">
                Are you sure you want to delete <strong>{student.firstName} {student.lastName}</strong>? This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
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
      {student && (
        <CreateAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          organizationId={organization.id}
          defaultEmail={student.email || ''}
          defaultName={`${student.firstName} ${student.lastName}`}
          role="student"
          entityId={student.id}
        />
      )}
    </div>
  );
}
