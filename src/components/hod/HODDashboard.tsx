import React from 'react';
import { 
  Users, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText,
  TrendingUp,
  Search,
  Plus
} from 'lucide-react';
import { UserProfile, Organization } from '../../types';
import { UpcomingEvents } from '../announcements/UpcomingEvents';

interface HODDashboardProps {
  userProfile: UserProfile;
  organization: Organization;
}

export default function HODDashboard({ userProfile, organization }: HODDashboardProps) {
  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">HOD Dashboard</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Oversee department operations, performance, and approvals.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-[#e5e5e5] shadow-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Science Department</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-primary">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Department Teachers</h3>
          <p className="text-2xl font-bold tracking-tight">14</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-secondary">
              <FileText className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Lesson Notes Pending</h3>
          <p className="text-2xl font-bold tracking-tight">6</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-green-600">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Avg. Dept Performance</h3>
          <p className="text-2xl font-bold tracking-tight">78.5%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-orange-500">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Syllabus Coverage</h3>
          <p className="text-2xl font-bold tracking-tight">65%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Lesson Notes Approval
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9e9e9e] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search teacher..." 
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-[#e5e5e5] text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Week 8: Chemical Reactions', teacher: 'Mr. Smith', class: 'Grade 10A', time: '2h ago' },
                { title: 'Week 8: Genetics & Heredity', teacher: 'Dr. Wilson', class: 'Grade 12C', time: '5h ago' },
                { title: 'Week 9: Thermodynamics Intro', teacher: 'Mr. Brown', class: 'Grade 11B', time: '1d ago' },
              ].map((note, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0]">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{note.title}</h4>
                      <p className="text-xs text-[#9e9e9e]">{note.teacher} • {note.class} • {note.time}</p>
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

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Teacher Performance Overview
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Mr. Smith', subjects: 'Math, Physics', performance: 82, attendance: 95 },
                { name: 'Dr. Wilson', subjects: 'Biology, Chem', performance: 88, attendance: 92 },
                { name: 'Ms. Johnson', subjects: 'English', performance: 75, attendance: 98 },
              ].map((teacher, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-sm">{teacher.name}</h4>
                      <p className="text-xs text-[#9e9e9e]">{teacher.subjects}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{teacher.performance}% Perf.</p>
                      <p className="text-[10px] text-[#9e9e9e]">{teacher.attendance}% Att.</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[#e5e5e5] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ width: `${teacher.performance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Department Meetings
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Curriculum Review', date: 'April 8', time: '02:00 PM', room: 'Staff Room' },
                { title: 'Lab Safety Audit', date: 'April 12', time: '10:00 AM', room: 'Science Lab' },
              ].map((meeting, i) => (
                <div key={i} className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                  <h4 className="font-bold text-sm text-[#1a1a1a] mb-2">{meeting.title}</h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-[#9e9e9e] font-medium">
                      <Clock className="w-3 h-3" />
                      {meeting.date} • {meeting.time}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#9e9e9e] font-medium">
                      <Users className="w-3 h-3" />
                      {meeting.room}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <UpcomingEvents organizationId={organization.id} userProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}
