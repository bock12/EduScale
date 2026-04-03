import React, { useState, useEffect } from 'react';
import { Organization, UserProfile } from '../../types';
import { Calendar, FileText, Award, BarChart3, Settings, BrainCircuit, ChevronRight, BookOpen, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ExamSessions from './ExamSessions';
import ExamSubjects from './ExamSubjects';
import ExamResults from './ExamResults';
import GradingRules from './GradingRules';
import ReportCards from './ReportCards';
import AIGrading from './AIGrading';
import StudentExams from '../student/StudentExams';

interface ExamsDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

type Tab = 'sessions' | 'subjects' | 'results' | 'grading' | 'reports' | 'ai';

export default function ExamsDashboard({ organization, userProfile }: ExamsDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('sessions');

  if (userProfile?.role === 'student') {
    return <StudentExams organization={organization} userProfile={userProfile} />;
  }

  const allTabs = [
    { id: 'sessions', label: 'Sessions', icon: Calendar, description: 'Manage exam terms' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, description: 'Define exam subjects' },
    { id: 'results', label: 'Results', icon: UserCheck, description: 'Record student scores' },
    { id: 'grading', label: 'Grading', icon: Settings, description: 'Configure grading rules' },
    { id: 'reports', label: 'Reports', icon: BarChart3, description: 'Generate report cards' },
    { id: 'ai', label: 'AI Grading', icon: BrainCircuit, description: 'AI-powered assessment' },
  ];

  const tabs = userProfile?.role === 'teacher' 
    ? allTabs.filter(t => ['subjects', 'results', 'reports'].includes(t.id))
    : allTabs;

  // Ensure active tab is valid for role
  useEffect(() => {
    if (userProfile?.role === 'teacher' && !['subjects', 'results', 'reports'].includes(activeTab)) {
      setActiveTab('subjects');
    }
  }, [userProfile?.role, activeTab]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-black">Exams & Grading</h1>
          <p className="text-black/40 font-bold uppercase tracking-widest text-xs mt-2">Manage assessments, scores, and report cards</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-1.5 bg-black/5 rounded-[32px]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex flex-col items-center gap-2 px-4 py-4 rounded-[24px] font-black transition-all ${
              activeTab === tab.id
                ? 'bg-white text-black shadow-sm'
                : 'text-black/40 hover:text-black hover:bg-white/50'
            }`}
          >
            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-black' : 'text-black/20'}`} />
            <span className="text-[10px] uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'sessions' && <ExamSessions organization={organization} userProfile={userProfile} />}
            {activeTab === 'subjects' && <ExamSubjects organization={organization} userProfile={userProfile} />}
            {activeTab === 'results' && <ExamResults organization={organization} userProfile={userProfile} />}
            {activeTab === 'grading' && <GradingRules organization={organization} userProfile={userProfile} />}
            {activeTab === 'reports' && <ReportCards organization={organization} userProfile={userProfile} />}
            {activeTab === 'ai' && <AIGrading organization={organization} userProfile={userProfile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
