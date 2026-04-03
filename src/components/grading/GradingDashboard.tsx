import React, { useState } from 'react';
import { Organization, UserProfile } from '../../types';
import GradingScales from './GradingScales';
import StudentGrades from '../student/StudentGrades';
import { Settings, Ruler } from 'lucide-react';

interface GradingDashboardProps {
  organization: Organization;
  userProfile: UserProfile | null;
}

export default function GradingDashboard({ organization, userProfile }: GradingDashboardProps) {
  const [activeTab, setActiveTab] = useState<'scales'>('scales');

  if (userProfile?.role === 'student') {
    return <StudentGrades organization={organization} userProfile={userProfile} />;
  }

  const isAdmin = userProfile?.role === 'school_admin' || userProfile?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-[#9e9e9e]">Only administrators can manage grading settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Grading Management</h2>
          <p className="text-[#9e9e9e]">Define and manage custom grading scales, GPA values, and score ranges.</p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-[#e5e5e5]">
        <button
          onClick={() => setActiveTab('scales')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'scales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-[#9e9e9e] hover:text-[#1a1a1a]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4" />
            Grading Scales
          </div>
        </button>
      </div>

      <div className="mt-6">
        {activeTab === 'scales' && <GradingScales organization={organization} />}
      </div>
    </div>
  );
}
