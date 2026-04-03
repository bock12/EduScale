import React, { useState } from 'react';
import { Organization, UserProfile } from '../../types';
import ClassSections from './ClassSections';
import Classrooms from './Classrooms';
import { LayoutGrid, Users, GraduationCap, School, Package } from 'lucide-react';
import StudentClasses from '../student/StudentClasses';

interface ClassesDashboardProps {
  organization: Organization;
  userProfile?: UserProfile | null;
}

type Tab = 'sections' | 'classrooms';

export default function ClassesDashboard({ organization, userProfile }: ClassesDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('sections');

  if (userProfile?.role === 'student') {
    return <StudentClasses organization={organization} userProfile={userProfile} />;
  }

  const tabs = [
    { id: 'sections', label: 'Class Sections', icon: LayoutGrid },
    { id: 'classrooms', label: 'Classrooms', icon: School },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tight text-[#1a1a1a] mb-2">Classes & Spaces</h1>
          <p className="text-[#9e9e9e] text-lg max-w-2xl">
            Manage your academic structure, assign teachers, and optimize classroom utilization.
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-black/5 rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200 whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-black text-white shadow-lg scale-105' 
                : 'text-black/40 hover:text-black hover:bg-black/5'}
            `}
          >
            <tab.icon className="w-5 h-5" />
            <span className="font-bold">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'sections' && <ClassSections organization={organization} userProfile={userProfile} />}
        {activeTab === 'classrooms' && <Classrooms organization={organization} />}
      </div>
    </div>
  );
}
