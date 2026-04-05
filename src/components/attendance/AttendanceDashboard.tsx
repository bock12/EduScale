import React, { useState } from 'react';
import { Organization, UserProfile } from '../../types';
import { Calendar, Users, AlertCircle, FileText, ChevronRight, Clock, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import AttendanceSessions from './AttendanceSessions';
import AttendanceExceptions from './AttendanceExceptions';
import AttendanceReports from './AttendanceReports';
import DailyAttendance from './DailyAttendance';
import StudentAttendance from '../student/StudentAttendance';
import OfflineSyncIndicator from './OfflineSyncIndicator';

interface AttendanceDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

type Tab = 'daily' | 'sessions' | 'exceptions' | 'reports';

export default function AttendanceDashboard({ organization, userProfile }: AttendanceDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('daily');

  if (userProfile?.role === 'student') {
    return <StudentAttendance organization={organization} userProfile={userProfile} />;
  }

  const tabs = [
    { id: 'daily', label: 'Daily Attendance', icon: Users },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'exceptions', label: 'Exceptions', icon: AlertCircle },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black">Attendance</h1>
          <p className="text-black/40 font-bold uppercase tracking-widest text-xs mt-2">Manage daily attendance and records</p>
        </div>
        <div className="flex items-center gap-4">
          <OfflineSyncIndicator organizationId={organization.id} />
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-black/5 rounded-[24px] w-full overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-[20px] font-black transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-black shadow-sm'
                  : 'text-black/40 hover:text-black hover:bg-white/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'daily' && <DailyAttendance organization={organization} userProfile={userProfile} />}
        {activeTab === 'sessions' && <AttendanceSessions organization={organization} userProfile={userProfile} />}
        {activeTab === 'exceptions' && <AttendanceExceptions organization={organization} userProfile={userProfile} />}
        {activeTab === 'reports' && <AttendanceReports organization={organization} userProfile={userProfile} />}
      </div>
    </div>
  );
}
