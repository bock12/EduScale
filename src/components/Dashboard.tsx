import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  AlertCircle,
  Calendar as CalendarIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Users,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { UserProfile, Organization } from '../types';
import StudentDashboard from './student/StudentDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';
import SchoolManagementDashboard from './management/SchoolManagementDashboard';
import ExamOfficerDashboard from './exam/ExamOfficerDashboard';
import HODDashboard from './hod/HODDashboard';
import { UpcomingEvents } from './announcements/UpcomingEvents';

interface DashboardProps {
  userProfile?: UserProfile | null;
  organization?: Organization | null;
}

const data = [
  { name: 'Mon', attendance: 92, performance: 78 },
  { name: 'Tue', attendance: 95, performance: 82 },
  { name: 'Wed', attendance: 88, performance: 85 },
  { name: 'Thu', attendance: 94, performance: 80 },
  { name: 'Fri', attendance: 91, performance: 88 },
];

const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
          +{trend}%
        </span>
      )}
    </div>
    <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">{label}</h3>
    <p className="text-2xl font-bold tracking-tight">{value}</p>
  </div>
);

export default function Dashboard({ userProfile, organization }: DashboardProps) {
  if (!organization) return null;

  if (userProfile?.role === 'student') {
    return <StudentDashboard organization={organization} userProfile={userProfile} />;
  }

  if (userProfile?.role === 'teacher') {
    return <TeacherDashboard organization={organization} userProfile={userProfile} />;
  }

  if ((userProfile?.role === 'principal' || userProfile?.role === 'vice_principal') && organization) {
    return <SchoolManagementDashboard organization={organization} userProfile={userProfile} />;
  }

  if (userProfile?.role === 'exam_officer' && organization) {
    return <ExamOfficerDashboard organization={organization} userProfile={userProfile} />;
  }

  if (userProfile?.role === 'hod' && organization) {
    return <HODDashboard organization={organization} userProfile={userProfile} />;
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">School Overview</h2>
        <p className="text-[#9e9e9e] text-sm md:text-base">Real-time analytics and performance metrics for your institution.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={GraduationCap} 
          label="Total Students" 
          value="1,248" 
          trend="12" 
          color="bg-primary" 
        />
        <StatCard 
          icon={Users} 
          label="Total Teachers" 
          value="84" 
          trend="4" 
          color="bg-secondary" 
        />
        <StatCard 
          icon={TrendingUp} 
          label="Avg. Performance" 
          value="84.2%" 
          trend="2.4" 
          color="bg-green-600" 
        />
        <StatCard 
          icon={AlertCircle} 
          label="At Risk Students" 
          value="12" 
          color="bg-red-600" 
        />
      </div>

      {organization && userProfile && (
        <UpcomingEvents organizationId={organization.id} userProfile={userProfile} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm min-w-0">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Attendance Trends
          </h3>
          <div className="h-[250px] md:h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--org-primary-color, #2563eb)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--org-primary-color, #2563eb)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="attendance" stroke="var(--org-primary-color, #2563eb)" fillOpacity={1} fill="url(#colorAttendance)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-500" />
            Upcoming Events
          </h3>
          <div className="space-y-4">
            {[
              { title: 'Parent-Teacher Meeting', date: 'April 5, 2026', time: '09:00 AM', type: 'Meeting' },
              { title: 'Annual Sports Day', date: 'April 12, 2026', time: '08:30 AM', type: 'Event' },
              { title: 'Board of Governors', date: 'April 15, 2026', time: '02:00 PM', type: 'Admin' },
              { title: 'Spring Break Starts', date: 'April 20, 2026', time: 'All Day', type: 'Holiday' },
            ].map((event, i) => (
              <div key={i} className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-sm text-[#1a1a1a]">{event.title}</h4>
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase">{event.type}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-[#9e9e9e] font-medium">
                  <span>{event.date}</span>
                  <span>•</span>
                  <span>{event.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm min-w-0">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financial Overview
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-green-50 border border-green-100">
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Revenue (MTD)</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">$42,500</span>
                <ArrowUpRight className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest mb-1">Expenses (MTD)</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">$18,200</span>
                <ArrowDownRight className="w-4 h-4 text-red-600" />
              </div>
            </div>
          </div>
          <div className="h-[200px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <Tooltip 
                  cursor={{fill: '#f8f8f8'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="performance" fill="#16a34a" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm min-w-0">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-secondary" />
            Academic Performance
          </h3>
          <div className="h-[250px] md:h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9e9e9e'}} />
                <Tooltip 
                  cursor={{fill: '#f8f8f8'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="performance" fill="var(--org-secondary-color, #9333ea)" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
        <h3 className="text-lg font-bold mb-6">Recent AI Grading Tasks</h3>
        <div className="space-y-4">
          {[
            { exam: 'Advanced Calculus Midterm', teacher: 'Dr. Sarah Wilson', status: 'Completed', time: '2h ago' },
            { exam: 'World History Essay', teacher: 'Prof. James Miller', status: 'Processing', time: '15m ago' },
            { exam: 'Physics Lab Report', teacher: 'Dr. Sarah Wilson', status: 'Completed', time: '5h ago' },
          ].map((task, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0] gap-4 sm:gap-0">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full shrink-0 ${task.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  {task.status === 'Completed' ? <CheckCircle2 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 animate-pulse" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm">{task.exam}</h4>
                  <p className="text-xs text-[#9e9e9e]">{task.teacher}</p>
                </div>
              </div>
              <div className="flex sm:block items-center justify-between sm:text-right">
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${task.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  {task.status}
                </span>
                <p className="text-[10px] text-[#9e9e9e] sm:mt-1">{task.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}