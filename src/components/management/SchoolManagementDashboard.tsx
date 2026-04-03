import React from 'react';
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  AlertCircle,
  Calendar as CalendarIcon,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { UserProfile, Organization } from '../../types';
import { UpcomingEvents } from '../announcements/UpcomingEvents';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface SchoolManagementDashboardProps {
  userProfile: UserProfile;
  organization: Organization;
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

export default function SchoolManagementDashboard({ userProfile, organization }: SchoolManagementDashboardProps) {
  const roleTitle = userProfile.role === 'principal' ? 'Principal' : 'Vice Principal';

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{roleTitle} Dashboard</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Welcome back, {userProfile.displayName}. Here's the school's performance overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-[#e5e5e5] shadow-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Term 2, Week 8</span>
          </div>
        </div>
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
          label="Total Staff" 
          value="112" 
          trend="2" 
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
          label="Pending Approvals" 
          value="8" 
          color="bg-orange-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              School Attendance & Performance
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                Pending Approvals
              </h3>
              <button className="text-xs font-bold text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {[
                { title: 'New Student Admission - John Doe', type: 'Admission', requester: 'Registrar', time: '2h ago' },
                { title: 'Class Master Assignment: Grade 10A', type: 'Assignment', requester: 'Exam Office', time: '5h ago' },
                { title: 'Budget Request: Science Lab Equipment', type: 'Finance', requester: 'HOD Science', time: '1d ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0]">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-secondary/10 text-secondary">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{item.title}</h4>
                      <p className="text-xs text-[#9e9e9e]">{item.requester} • {item.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Financial Status
            </h3>
            <div className="space-y-4 mb-6">
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
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{fill: '#f8f8f8'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="performance" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <UpcomingEvents organizationId={organization.id} userProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}
