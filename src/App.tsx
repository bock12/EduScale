import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, Organization } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import Onboarding from './components/Onboarding';
import PendingApproval from './components/PendingApproval';
import SuperAdminApprovals from './components/SuperAdminApprovals';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import SuperAdminUsers from './components/SuperAdminUsers';
import SchoolAdminUsers from './components/SchoolAdminUsers';
import SuperAdminSchools from './components/SuperAdminSchools';
import SuperAdminSettings from './components/SuperAdminSettings';
import SuperAdminClaims from './components/SuperAdminClaims';
import SupportDesk from './components/SupportDesk';
import GradingDashboard from './components/grading/GradingDashboard';
import Settings from './components/Settings';
import Billing from './components/Billing';
import IdentityDashboard from './components/Identity/IdentityDashboard';
import VerificationPortal from './components/Identity/VerificationPortal';
import StudentsList from './components/students/StudentsList';
import StudentDetails from './components/students/StudentDetails';
import TeachersList from './components/teachers/TeachersList';
import TeacherDetails from './components/teachers/TeacherDetails';
import ClassesDashboard from './components/classes/ClassesDashboard';
import TimetableDashboard from './components/timetable/TimetableDashboard';
import AttendanceDashboard from './components/attendance/AttendanceDashboard';
import ExamsDashboard from './components/exams/ExamsDashboard';
import AssignmentsDashboard from './components/assignments/AssignmentsDashboard';
import BehaviorDashboard from './components/behavior/BehaviorDashboard';
import LMSDashboard from './components/lms/LMSDashboard';
import CommunicationDashboard from './components/communication/CommunicationDashboard';
import ParentsDashboard from './components/parents/ParentsDashboard';
import FinanceDashboard from './components/finance/FinanceDashboard';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import AIPredictionDashboard from './components/ai-prediction/AIPredictionDashboard';
import AnnouncementsHub from './components/announcements/AnnouncementsHub';

import SubjectManagement from './components/management/SubjectManagement';
import FaceRecognitionAttendance from './components/attendance/FaceRecognitionAttendance';

// Placeholder components for other routes
const Placeholder = ({ title }: { title: string }) => (
  <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
    <h2 className="text-4xl font-black tracking-tight mb-4">{title}</h2>
    <p className="text-[#9e9e9e] text-lg">This module is currently being optimized for national-scale deployment.</p>
    <div className="mt-8 flex justify-center gap-4">
      <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" />
      <div className="w-3 h-3 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-3 h-3 rounded-full bg-green-600 animate-bounce [animation-delay:-0.3s]" />
    </div>
  </div>
);

export default function App() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteId, setInviteId] = useState<string | null>(null);

  useEffect(() => {
    // Check for invite in URL
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteId(invite);
      sessionStorage.setItem('pendingInviteId', invite);
    } else {
      const storedInvite = sessionStorage.getItem('pendingInviteId');
      if (storedInvite) setInviteId(storedInvite);
    }
  }, []);

  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthUser(firebaseUser);
      
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = undefined;
      }

      if (!firebaseUser) {
        setDbUser(null);
        setOrganization(null);
        setActiveOrgId(null);
        setLoading(false);
        return;
      }

      // Listen to user document
      unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
        if (userDoc.exists()) {
          const userData = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
          
          // Override role for the specific super admin email
          if (firebaseUser.email === 'sahrbsesay@gmail.com') {
            userData.role = 'super_admin';
          }
          
          setDbUser(userData);

          // For non-super admins, automatically set their active organization
          if (userData.role !== 'super_admin' && userData.organizationId) {
            setActiveOrgId(userData.organizationId);
          } else {
            // Super admin, or user without organization
            setLoading(false);
          }
        } else {
          // If user doc doesn't exist by UID, try searching by email
          // This handles cases where an admin created the account but the user logs in with a different method (e.g. Google)
          if (firebaseUser.email) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const existingDoc = querySnapshot.docs[0];
                const existingData = existingDoc.data();
                
                // Migrate document to new UID
                if (existingDoc.id !== firebaseUser.uid) {
                  try {
                    await setDoc(doc(db, 'users', firebaseUser.uid), existingData);
                    await deleteDoc(doc(db, 'users', existingDoc.id));
                  } catch (migrationErr) {
                    console.error("Error migrating user document:", migrationErr);
                  }
                }

                const userData = { uid: firebaseUser.uid, ...existingData } as UserProfile;
                
                // Use the found data so they can access their dashboard
                setDbUser(userData);
                if (userData.organizationId) setActiveOrgId(userData.organizationId);
                setLoading(false);
                return;
              }
            } catch (err) {
              console.error("Error searching user by email:", err);
            }
          }

          // If user doc doesn't exist but it's the super admin email, create a temporary profile in state
          if (firebaseUser.email === 'sahrbsesay@gmail.com') {
             const superAdminData: UserProfile = {
               uid: firebaseUser.uid,
               email: firebaseUser.email,
               displayName: firebaseUser.displayName || 'Super Admin',
               role: 'super_admin',
               organizationId: ''
             };
             setDbUser(superAdminData);
             setLoading(false);
          } else {
            setDbUser(null);
            setOrganization(null);
            setActiveOrgId(null);
            setLoading(false);
          }
        }
      }, (err) => {
        console.error('Error in users listener:', err);
        if (firebaseUser.email === 'sahrbsesay@gmail.com') {
          setDbUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName || 'Super Admin',
            role: 'super_admin',
            organizationId: ''
          });
        }
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
      unsubscribeAuth();
    };
  }, []);

  // Listen to active organization
  useEffect(() => {
    if (!activeOrgId) {
      setOrganization(null);
      return;
    }

    setLoading(true);

    const unsubscribeOrg = onSnapshot(doc(db, 'organizations', activeOrgId), (orgDoc) => {
      if (orgDoc.exists()) {
        const orgData = { id: orgDoc.id, ...orgDoc.data() } as Organization;
        setOrganization(orgData);
        
        // Apply branding colors
        document.documentElement.style.setProperty('--org-primary-color', orgData.primaryColor || '#2563eb');
        document.documentElement.style.setProperty('--org-secondary-color', orgData.secondaryColor || '#9333ea');
      }
      setLoading(false);
    }, (err) => {
      console.error('Error in organization listener:', err);
      setLoading(false);
    });

    return () => unsubscribeOrg();
  }, [activeOrgId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // 1. Not logged in via Google
  if (!authUser) {
    return <Login />;
  }

  // 2. Logged in via Google, but no user profile in DB -> Onboarding Wizard
  if (!dbUser) {
    return <Onboarding authUser={authUser} inviteId={inviteId} />;
  }

  // 3. User profile exists, but organization is pending approval
  if (dbUser.role !== 'super_admin' && organization?.status === 'pending') {
    return <PendingApproval />;
  }

  // 4. Super Admin without an active organization -> Super Dashboard
  if (dbUser.role === 'super_admin' && !activeOrgId) {
    return (
      <ErrorBoundary>
        <Layout userRole={dbUser.role} userProfile={dbUser} setActiveOrgId={setActiveOrgId}>
          <Routes>
            <Route path="/" element={<SuperAdminDashboard onEnterPortal={setActiveOrgId} />} />
            <Route path="/admin/approvals" element={<SuperAdminApprovals />} />
            <Route path="/schools" element={<SuperAdminSchools />} />
            <Route path="/admin/claims" element={<SuperAdminClaims />} />
            <Route path="/users" element={<SuperAdminUsers setActiveOrgId={setActiveOrgId} />} />
            <Route path="/settings" element={<SuperAdminSettings />} />
            <Route path="/support" element={<SupportDesk userProfile={dbUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
    );
  }

  // 5. Fully approved or Super Admin impersonating an org -> Main App
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/verify/student/:studentId" element={<VerificationPortal />} />
        <Route path="*" element={
          <Layout userRole={dbUser.role} userProfile={dbUser} organization={organization} setActiveOrgId={setActiveOrgId}>
            <Routes>
              <Route path="/" element={<Dashboard userProfile={dbUser} organization={organization} />} />
              {dbUser.role === 'super_admin' && (
                <>
                  <Route path="/admin/approvals" element={<SuperAdminApprovals />} />
                  <Route path="/schools" element={<SuperAdminSchools />} />
                  <Route path="/users" element={<SuperAdminUsers setActiveOrgId={setActiveOrgId} />} />
                  <Route path="/settings" element={<SuperAdminSettings />} />
                </>
              )}
              {dbUser.role === 'school_admin' && (
                <Route path="/users" element={organization ? <SchoolAdminUsers organization={organization} /> : <Placeholder title="User Management" />} />
              )}
              <Route path="/students" element={organization ? <StudentsList organization={organization} userProfile={dbUser} /> : <Placeholder title="Student Management" />} />
              <Route path="/students/:studentId" element={organization ? <StudentDetails organization={organization} userProfile={dbUser} /> : <Placeholder title="Student Details" />} />
              <Route path="/teachers" element={organization ? <TeachersList organization={organization} /> : <Placeholder title="Teacher Directory" />} />
              <Route path="/teachers/:teacherId" element={organization ? <TeacherDetails organization={organization} /> : <Placeholder title="Teacher Details" />} />
              <Route path="/classes" element={organization ? <ClassesDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Class Scheduling" />} />
              <Route path="/timetable" element={organization ? <TimetableDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="AI Timetable Generator" />} />
              <Route path="/assignments" element={organization ? <AssignmentsDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Assignments" />} />
              <Route path="/attendance" element={organization ? <AttendanceDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Attendance Tracking" />} />
              <Route path="/attendance/face" element={organization ? <FaceRecognitionAttendance organization={organization} /> : <Placeholder title="Face Recognition Attendance" />} />
              <Route path="/subjects" element={organization ? <SubjectManagement organization={organization} /> : <Placeholder title="Subject Management" />} />
              <Route path="/exams" element={organization ? <ExamsDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Exams & AI Grading" />} />
              <Route path="/identity" element={organization ? <IdentityDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Identity System" />} />
              <Route path="/behavior" element={organization ? <BehaviorDashboard organization={organization} /> : <Placeholder title="Behavior & Discipline" />} />
              <Route path="/lms" element={organization ? <LMSDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Learning Management" />} />
              <Route path="/communication" element={organization ? <CommunicationDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Communication" />} />
              <Route path="/parents" element={organization ? <ParentsDashboard organization={organization} /> : <Placeholder title="Parent Portal" />} />
              <Route path="/finance" element={organization ? <FinanceDashboard organization={organization} /> : <Placeholder title="Finance" />} />
              <Route path="/analytics" element={organization ? <AnalyticsDashboard organization={organization} /> : <Placeholder title="National Analytics" />} />
              <Route path="/ai-prediction" element={organization ? <AIPredictionDashboard organization={organization} /> : <Placeholder title="AI Prediction" />} />
              <Route path="/billing" element={organization ? <Billing organization={organization} /> : <Placeholder title="Billing & Subscription" />} />
              <Route path="/grading" element={organization ? <GradingDashboard organization={organization} userProfile={dbUser} /> : <Placeholder title="Grading Management" />} />
              <Route path="/support" element={<SupportDesk userProfile={dbUser} />} />
              <Route path="/settings" element={organization ? <Settings organization={organization} userProfile={dbUser} /> : <Placeholder title="System Settings" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </ErrorBoundary>
  );
}
