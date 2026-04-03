import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut,
  School,
  ShieldCheck,
  ArrowLeft,
  CreditCard,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Ruler,
  User as UserIcon,
  ChevronDown,
  UserCircle,
  UserCheck,
  ShieldAlert,
  Laptop,
  MessageSquare,
  Heart,
  DollarSign,
  BrainCircuit,
  LifeBuoy,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Megaphone
} from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { updateDoc, doc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Organization, UserProfile } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  userRole?: string;
  userProfile?: UserProfile | null;
  organization?: Organization | null;
  setActiveOrgId?: (id: string | null) => void;
}

export default function Layout({ children, userRole, userProfile, organization, setActiveOrgId }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  useEffect(() => {
    if (userProfile?.requiresPasswordChange) {
      setShowPasswordChange(true);
    }
  }, [userProfile]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsChanging(true);
    setPasswordError(null);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user found");

      // Re-authenticate first to ensure we can update password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password in Auth
      await updatePassword(user, newPassword);
      
      // Update flag in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        requiresPasswordChange: false
      });

      setShowPasswordChange(false);
      // We can use a toast or just let the modal close
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError("Current password is incorrect");
      } else {
        setPasswordError(err.message || "An error occurred");
      }
    } finally {
      setIsChanging(false);
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const getNavItems = (role?: string) => {
    const items = [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    ];

    if (role === 'super_admin') {
      items.push(
        { icon: ShieldCheck, label: 'Approvals', path: '/admin/approvals' },
        { icon: School, label: 'Schools', path: '/schools' },
        { icon: ShieldAlert, label: 'Claims', path: '/admin/claims' },
        { icon: Users, label: 'Users', path: '/users' },
        { icon: LifeBuoy, label: 'Support', path: '/support' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      );
    } else if (role === 'school_admin') {
      items.push(
        { icon: GraduationCap, label: 'Students', path: '/students' },
        { icon: Users, label: 'Teachers', path: '/teachers' },
        { icon: School, label: 'Classes', path: '/classes' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: BookOpen, label: 'Assignments', path: '/assignments' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: UserCheck, label: 'Face Attendance', path: '/attendance/face' },
        { icon: UserCheck, label: 'Identity', path: '/identity' },
        { icon: ShieldAlert, label: 'Behavior', path: '/behavior' },
        { icon: Laptop, label: 'LMS', path: '/lms' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' },
        { icon: Heart, label: 'Parents', path: '/parents' },
        { icon: Ruler, label: 'Grading', path: '/grading' },
        { icon: FileText, label: 'Exams', path: '/exams' },
        { icon: DollarSign, label: 'Finance', path: '/finance' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: BrainCircuit, label: 'AI Prediction', path: '/ai-prediction' },
        { icon: CreditCard, label: 'Billing', path: '/billing' },
        { icon: LifeBuoy, label: 'Support', path: '/support' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      );
    } else if (role === 'principal' || role === 'vice_principal') {
      items.push(
        { icon: GraduationCap, label: 'Students', path: '/students' },
        { icon: Users, label: 'Teachers', path: '/teachers' },
        { icon: School, label: 'Classes', path: '/classes' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' },
        { icon: FileText, label: 'Exams', path: '/exams' },
        { icon: DollarSign, label: 'Finance', path: '/finance' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: Settings, label: 'Settings', path: '/settings' }
      );
    } else if (role === 'exam_officer') {
      items.push(
        { icon: GraduationCap, label: 'Admissions', path: '/students' },
        { icon: School, label: 'Classes', path: '/classes' },
        { icon: BookOpen, label: 'Subjects', path: '/subjects' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: FileText, label: 'Exams', path: '/exams' },
        { icon: Ruler, label: 'Grading', path: '/grading' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' }
      );
    } else if (role === 'hod') {
      items.push(
        { icon: Users, label: 'Teachers', path: '/teachers' },
        { icon: BookOpen, label: 'Syllabus', path: '/syllabus' },
        { icon: FileText, label: 'Lesson Notes', path: '/lesson-notes' },
        { icon: BarChart3, label: 'Performance', path: '/analytics' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' }
      );
    } else if (role === 'teacher') {
      items.push(
        { icon: GraduationCap, label: 'Students', path: '/students' },
        { icon: School, label: 'My Classes', path: '/classes' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: BookOpen, label: 'Assignments', path: '/assignments' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: UserCheck, label: 'Face Attendance', path: '/attendance/face' },
        { icon: ShieldAlert, label: 'Behavior', path: '/behavior' },
        { icon: Laptop, label: 'LMS', path: '/lms' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' },
        { icon: Ruler, label: 'Grading', path: '/grading' },
        { icon: FileText, label: 'Exams', path: '/exams' },
        { icon: LifeBuoy, label: 'Support', path: '/support' }
      );
    } else if (role === 'student') {
      items.push(
        { icon: School, label: 'My Classes', path: '/classes' },
        { icon: Calendar, label: 'Timetable', path: '/timetable' },
        { icon: Laptop, label: 'LMS', path: '/lms' },
        { icon: BookOpen, label: 'Assignments', path: '/assignments' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/attendance' },
        { icon: Ruler, label: 'Grades', path: '/grading' },
        { icon: FileText, label: 'Exams', path: '/exams' },
        { icon: MessageSquare, label: 'Communication', path: '/communication' },
        { icon: LifeBuoy, label: 'Support', path: '/support' }
      );
    }

    return items;
  };

  const effectiveRole = (userRole === 'super_admin' && organization) ? 'school_admin' : userRole;
  const navItems = getNavItems(effectiveRole);

  return (
    <div className="flex h-screen bg-[#f5f5f5] font-sans text-[#1a1a1a] overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#e5e5e5] p-4 z-20 absolute top-0 w-full">
        <div className="flex items-center gap-3">
          {organization?.logoUrl ? (
            <img src={organization.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" referrerPolicy="no-referrer" />
          ) : (
            <School className="w-6 h-6 text-primary" />
          )}
          <span className="font-bold truncate">{organization?.name || 'EduScale'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-8 h-8 rounded-lg bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center overflow-hidden"
          >
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-4 h-4 text-[#9e9e9e]" />
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-[#4a4a4a]">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-[#e5e5e5] flex flex-col transition-all duration-300 z-40",
          "fixed md:relative h-full",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("p-6 border-b border-[#e5e5e5] flex items-center h-[88px]", isCollapsed ? "justify-center px-0" : "justify-between")}>
          <div className={cn("flex items-center gap-3", isCollapsed && "hidden")}>
            {organization?.logoUrl ? (
              <img src={organization.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" referrerPolicy="no-referrer" />
            ) : (
              <School className="w-6 h-6 text-primary" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">{organization?.name || 'EduScale'}</h1>
              <p className="text-xs text-[#9e9e9e] mt-1 uppercase tracking-widest font-medium truncate">
                {userRole?.replace('_', ' ') || 'Loading...'}
              </p>
            </div>
          </div>
          {isCollapsed && (
            organization?.logoUrl ? (
              <img src={organization.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain" referrerPolicy="no-referrer" />
            ) : (
              <School className="w-6 h-6 text-primary" />
            )
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200 text-sm font-medium",
                  isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5",
                  isActive
                    ? "text-white shadow-lg shadow-black/5 bg-primary"
                    : "text-[#4a4a4a] hover:bg-[#f0f0f0]"
                )}
              >
                <item.icon className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#e5e5e5] space-y-2">
          {userRole === 'super_admin' && organization && setActiveOrgId && (
            <button
              onClick={() => setActiveOrgId(null)}
              title={isCollapsed ? "Exit Portal" : undefined}
              className={cn(
                "flex items-center rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors",
                isCollapsed ? "justify-center p-3 w-full" : "gap-3 px-4 py-2.5 w-full"
              )}
            >
              <ArrowLeft className={cn("shrink-0", isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!isCollapsed && <span className="truncate">Exit Portal</span>}
            </button>
          )}
          
          {/* Collapse Toggle (Desktop Only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex items-center justify-center w-full p-2 mt-2 text-[#9e9e9e] hover:bg-[#f0f0f0] rounded-xl transition-colors"
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-end h-[88px] px-8 bg-white border-b border-[#e5e5e5] z-10 shrink-0">
          <div className="relative">
            <button 
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 p-2 hover:bg-[#f5f5f5] rounded-2xl transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center overflow-hidden shrink-0">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-5 h-5 text-[#9e9e9e]" />
                )}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-bold truncate max-w-[150px]">{userProfile?.displayName || 'User'}</p>
                <p className="text-[10px] text-[#9e9e9e] uppercase tracking-widest font-bold truncate">
                  {userRole?.replace('_', ' ')}
                </p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-[#9e9e9e] transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isUserMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setIsUserMenuOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#e5e5e5] shadow-xl z-30 overflow-hidden"
                  >
                    <div className="p-4 border-b border-[#e5e5e5] bg-[#f9f9f9]">
                      <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Signed in as</p>
                      <p className="text-sm font-bold truncate">{userProfile?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] rounded-xl transition-colors"
                      >
                        <UserCircle className="w-4 h-4" />
                        Account Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#4a4a4a] hover:bg-[#f5f5f5] rounded-xl transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        System Settings
                      </Link>
                    </div>
                    <div className="p-2 border-t border-[#e5e5e5]">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          auth.signOut();
                        }}
                        className="flex items-center gap-3 px-3 py-2 w-full text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pt-24 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-8 md:p-12 w-full max-w-lg shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-purple-600" />
              
              <div className="mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Secure Your Account</h2>
                <p className="text-[#9e9e9e]">You are using a temporary password. Please set a new secure password to continue.</p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-5">
                {passwordError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{passwordError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-[#e5e5e5] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="Enter current password"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#1a1a1a]"
                    >
                      {showCurrentPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-[#e5e5e5] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                      placeholder="Minimum 6 characters"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9e9e9e] hover:text-[#1a1a1a]"
                    >
                      {showNewPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-[#e5e5e5] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="Repeat new password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChanging}
                  className="w-full bg-[#1a1a1a] text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl shadow-black/10 disabled:opacity-50 mt-4"
                >
                  {isChanging ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Updating...
                    </div>
                  ) : "Update Password"}
                </button>
                
                <p className="text-center text-[10px] text-[#9e9e9e] uppercase tracking-widest font-bold">
                  Security policy: Password change is required for first-time login
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
