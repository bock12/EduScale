import React from 'react';
import { 
  Calendar, 
  Users, 
  GraduationCap, 
  FileText,
  Clock,
  Layout,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  BookOpen
} from 'lucide-react';
import { UserProfile, Organization } from '../../types';
import { UpcomingEvents } from '../announcements/UpcomingEvents';

interface ExamOfficerDashboardProps {
  userProfile: UserProfile;
  organization: Organization;
}

export default function ExamOfficerDashboard({ userProfile, organization }: ExamOfficerDashboardProps) {
  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Exam Office Dashboard</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Manage admissions, timetables, and academic activities.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" />
            New Admission
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-blue-500">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Term 2
            </span>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">New Admissions</h3>
          <p className="text-2xl font-bold tracking-tight">42</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-purple-500">
              <Calendar className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Active Timetables</h3>
          <p className="text-2xl font-bold tracking-tight">12</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-green-500">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Grades Processed</h3>
          <p className="text-2xl font-bold tracking-tight">85%</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-orange-500">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h3 className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">Pending Questions</h3>
          <p className="text-2xl font-bold tracking-tight">18</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                Timetable Management
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9e9e9e] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search class..." 
                    className="pl-9 pr-4 py-1.5 rounded-lg border border-[#e5e5e5] text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { class: 'Grade 10A', teacher: 'Mr. Smith', status: 'Active', rooms: 'Room 101' },
                { class: 'Grade 11B', teacher: 'Ms. Johnson', status: 'Draft', rooms: 'Room 204' },
                { class: 'Grade 12C', teacher: 'Dr. Wilson', status: 'Active', rooms: 'Lab 1' },
                { class: 'Grade 9D', teacher: 'Mr. Brown', status: 'Active', rooms: 'Room 105' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0] hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{item.class}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${item.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#9e9e9e] flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      {item.teacher}
                    </p>
                    <p className="text-xs text-[#9e9e9e] flex items-center gap-2">
                      <Layout className="w-3 h-3" />
                      {item.rooms}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-secondary" />
              Exam Question Submissions
            </h3>
            <div className="space-y-4">
              {[
                { subject: 'Mathematics', teacher: 'Mr. Smith', status: 'Submitted', time: '1h ago' },
                { subject: 'Physics', teacher: 'Dr. Wilson', status: 'Pending', time: 'Due tomorrow' },
                { subject: 'English Literature', teacher: 'Ms. Johnson', status: 'Approved', time: '2d ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0]">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${item.status === 'Approved' ? 'bg-green-100 text-green-600' : item.status === 'Submitted' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{item.subject}</h4>
                      <p className="text-xs text-[#9e9e9e]">{item.teacher} • {item.time}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${item.status === 'Approved' ? 'bg-green-50 text-green-600' : item.status === 'Submitted' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Upcoming Exams
            </h3>
            <div className="space-y-4">
              {[
                { title: 'Mid-Term Maths', date: 'April 15', time: '09:00 AM', room: 'Hall A' },
                { title: 'Physics Practical', date: 'April 16', time: '10:30 AM', room: 'Lab 1' },
                { title: 'History Paper 1', date: 'April 18', time: '02:00 PM', room: 'Hall B' },
              ].map((exam, i) => (
                <div key={i} className="p-4 rounded-2xl bg-orange-50/50 border border-orange-100">
                  <h4 className="font-bold text-sm text-[#1a1a1a] mb-2">{exam.title}</h4>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-[#9e9e9e] font-medium">
                      <Calendar className="w-3 h-3" />
                      {exam.date}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#9e9e9e] font-medium">
                      <Clock className="w-3 h-3" />
                      {exam.time}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#9e9e9e] font-medium">
                      <Layout className="w-3 h-3" />
                      {exam.room}
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
