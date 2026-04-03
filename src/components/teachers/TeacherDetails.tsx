import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherProfile } from '../../types';
import { ArrowLeft, User, BookOpen, Award, Calendar, Clock, CreditCard, CheckCircle2 } from 'lucide-react';
import TeacherProfileTab from './TeacherProfileTab';
import TeacherDepartmentsTab from './TeacherDepartmentsTab';
import TeacherQualificationsTab from './TeacherQualificationsTab';
import TeacherScheduleTab from './TeacherScheduleTab';
import TeacherWorkloadTab from './TeacherWorkloadTab';
import IdCardModal from './IdCardModal';
import CreateAccountModal from '../CreateAccountModal';
import { UserPlus } from 'lucide-react';

interface TeacherDetailsProps {
  organization: Organization;
}

type TabType = 'profile' | 'departments' | 'qualifications' | 'schedule' | 'workload';

export default function TeacherDetails({ organization }: TeacherDetailsProps) {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [userAccount, setUserAccount] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(true);
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!teacherId) return;
      
      try {
        setLoading(true);
        const teacherDoc = await getDoc(doc(db, 'organizations', organization.id, 'teachers', teacherId));
        
        if (teacherDoc.exists()) {
          setTeacher({ id: teacherDoc.id, ...teacherDoc.data() } as Teacher);
          
          // Fetch profile for ID card
          const profilesRef = collection(db, 'organizations', organization.id, 'teacher_profiles');
          const profileQ = query(profilesRef, where('teacherId', '==', teacherId));
          const profileSnapshot = await getDocs(profileQ);
          if (!profileSnapshot.empty) {
            setProfile({ id: profileSnapshot.docs[0].id, ...profileSnapshot.docs[0].data() } as TeacherProfile);
          }

          // Check for existing user account
          const userQ = query(collection(db, 'users'), where('entityId', '==', teacherId));
          const userSnap = await getDocs(userQ);
          if (!userSnap.empty) {
            setUserAccount({ id: userSnap.docs[0].id, ...userSnap.docs[0].data() });
          } else {
            setUserAccount(null);
          }
        } else {
          navigate('/teachers');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teachers/${teacherId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacher();
  }, [organization.id, teacherId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-[#9e9e9e]">Teacher not found.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'departments', label: 'Departments', icon: BookOpen },
    { id: 'qualifications', label: 'Qualifications', icon: Award },
    { id: 'schedule', label: 'Schedule Prefs', icon: Calendar },
    { id: 'workload', label: 'Workload', icon: Clock },
  ] as const;

  return (
    <div className="space-y-6 md:space-y-8 pb-12 max-w-6xl mx-auto px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/teachers')}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a] shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Teacher Photo */}
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-[#f5f5f5] border-2 border-white shadow-sm flex items-center justify-center shrink-0">
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={`${teacher.firstName} ${teacher.lastName}`} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-purple-100 text-purple-600 flex items-center justify-center text-2xl font-bold">
                {teacher.firstName[0]}{teacher.lastName[0]}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-xl md:text-3xl font-bold tracking-tight truncate">{teacher.firstName} {teacher.lastName}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="font-mono text-xs md:text-sm text-[#9e9e9e]">{teacher.teacherId}</span>
              <span className="text-[#e5e5e5] hidden md:inline">•</span>
              <span className="text-[#4a4a4a] text-xs md:text-sm font-medium capitalize">{teacher.status.replace('_', ' ')}</span>
              <span className="text-[#e5e5e5] hidden md:inline">•</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                teacher.status === 'active' ? 'bg-green-100 text-green-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {teacher.status}
              </span>
            </div>
          </div>
        </div>

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
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-600 font-bold px-4 py-2.5 rounded-xl hover:bg-purple-100 transition-all text-sm shadow-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span className="whitespace-nowrap">ID Card</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap lg:w-full ${
                  isActive 
                    ? 'bg-purple-50 text-purple-600 shadow-sm' 
                    : 'text-[#4a4a4a] hover:bg-[#f5f5f5]'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-purple-600' : 'text-[#9e9e9e]'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3 bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm p-6 md:p-8 min-h-[500px]">
          {activeTab === 'profile' && <TeacherProfileTab organization={organization} teacher={teacher} />}
          {activeTab === 'departments' && <TeacherDepartmentsTab organization={organization} teacher={teacher} />}
          {activeTab === 'qualifications' && <TeacherQualificationsTab organization={organization} teacher={teacher} />}
          {activeTab === 'schedule' && <TeacherScheduleTab organization={organization} teacher={teacher} />}
          {activeTab === 'workload' && <TeacherWorkloadTab organization={organization} teacher={teacher} />}
        </div>
      </div>

      <IdCardModal
        organization={organization}
        teacher={teacher}
        profile={profile}
        isOpen={isIdCardModalOpen}
        onClose={() => setIsIdCardModalOpen(false)}
      />

      {teacher && (
        <CreateAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => setIsCreateAccountModalOpen(false)}
          organizationId={organization.id}
          defaultEmail={teacher.email}
          defaultName={`${teacher.firstName} ${teacher.lastName}`}
          role="teacher"
          entityId={teacher.id}
        />
      )}
    </div>
  );
}
