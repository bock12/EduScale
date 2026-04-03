import React, { useState, useEffect } from 'react';
import { Organization, UserProfile } from '../../types';
import { Calendar, Settings, Shield, History, Plus, Search, Filter, LayoutGrid, Sparkles, X, Check, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import TimetableList from './TimetableList';
import TimetableTemplates from './TimetableTemplates';
import TimetableRules from './TimetableRules';
import StudentTimetable from '../student/StudentTimetable';
import TeacherTimetable from '../teacher/TeacherTimetable';

interface TimetableDashboardProps {
  organization: Organization;
  userProfile?: UserProfile | null;
}

type Tab = 'timetables' | 'templates' | 'rules';

interface AISettings {
  strictness: 'relaxed' | 'balanced' | 'strict';
  maxIterations: number;
  prioritizeTeacherAvailability: boolean;
  prioritizeRoomCapacity: boolean;
  allowConsecutiveSubjects: boolean;
  optimizationGoal: 'balance' | 'compact' | 'spread';
}

const DEFAULT_SETTINGS: AISettings = {
  strictness: 'balanced',
  maxIterations: 1000,
  prioritizeTeacherAvailability: true,
  prioritizeRoomCapacity: true,
  allowConsecutiveSubjects: false,
  optimizationGoal: 'balance'
};

export default function TimetableDashboard({ organization, userProfile }: TimetableDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('timetables');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'student') return;

    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'organizations', organization.id, 'settings', 'timetable_ai'));
        if (settingsDoc.exists()) {
          setAiSettings(settingsDoc.data() as AISettings);
        }
      } catch (err) {
        console.error('Error fetching AI settings:', err);
      }
    };
    fetchSettings();
  }, [organization.id, userProfile?.role]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'organizations', organization.id, 'settings', 'timetable_ai'), aiSettings);
      setIsSettingsOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/settings/timetable_ai`);
    } finally {
      setSaving(false);
    }
  };

  if (userProfile?.role === 'student') {
    return <StudentTimetable organization={organization} userProfile={userProfile} />;
  }

  if (userProfile?.role === 'teacher') {
    return <TeacherTimetable organization={organization} userProfile={userProfile} />;
  }

  const tabs = [
    { id: 'timetables', label: 'Timetables', icon: Calendar },
    { id: 'templates', label: 'Templates', icon: LayoutGrid },
    { id: 'rules', label: 'Rules & Constraints', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1a1a1a] mb-2">AI Timetable Generator</h1>
          <p className="text-[#9e9e9e] text-base sm:text-lg max-w-2xl">
            Generate conflict-free schedules using AI. Define templates, set rules, and publish optimized timetables.
          </p>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-4 bg-black/5 hover:bg-black/10 rounded-2xl text-black font-black transition-all active:scale-95 w-full md:w-auto"
        >
          <Settings className="w-5 h-5" />
          <span>Generation Settings</span>
        </button>
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
        {activeTab === 'timetables' && <TimetableList organization={organization} />}
        {activeTab === 'templates' && <TimetableTemplates organization={organization} />}
        {activeTab === 'rules' && <TimetableRules organization={organization} />}
      </div>

      {/* AI Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-black">AI Generation Settings</h2>
                    <p className="text-black/40 text-sm font-bold uppercase tracking-widest">Configure AI Engine Constraints</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl text-black transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Strictness */}
                <div className="space-y-4">
                  <label className="block text-sm font-black text-black/40 uppercase tracking-widest">Generation Strictness</label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['relaxed', 'balanced', 'strict'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setAiSettings({ ...aiSettings, strictness: s })}
                        className={`p-4 rounded-2xl border transition-all text-center ${
                          aiSettings.strictness === s
                            ? 'bg-black border-black text-white shadow-lg scale-105'
                            : 'bg-black/5 border-black/10 text-black/60 hover:border-black/20'
                        }`}
                      >
                        <div className="font-black capitalize">{s}</div>
                        <div className={`text-[10px] mt-1 ${aiSettings.strictness === s ? 'text-white/40' : 'text-black/20'}`}>
                          {s === 'relaxed' ? 'Prioritize speed' : s === 'strict' ? 'No conflicts' : 'Best of both'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Constraints */}
                <div className="space-y-4">
                  <label className="block text-sm font-black text-black/40 uppercase tracking-widest">Active Constraints</label>
                  <div className="space-y-3">
                    {[
                      { id: 'prioritizeTeacherAvailability', label: 'Teacher Availability', desc: 'Ensure teachers are not double-booked and respect their off-hours' },
                      { id: 'prioritizeRoomCapacity', label: 'Classroom Capacity', desc: 'Never assign a class that exceeds the room capacity' },
                      { id: 'allowConsecutiveSubjects', label: 'Subject Sequencing', desc: 'Avoid scheduling the same subject back-to-back' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setAiSettings({ ...aiSettings, [c.id]: !aiSettings[c.id as keyof AISettings] })}
                        className="w-full flex items-center justify-between p-6 bg-black/5 border border-black/10 rounded-3xl hover:border-black/20 transition-all group"
                      >
                        <div className="text-left">
                          <div className="font-black text-black group-hover:text-blue-600 transition-colors">{c.label}</div>
                          <div className="text-sm text-black/40">{c.desc}</div>
                        </div>
                        <div className={`w-12 h-6 rounded-full transition-all relative ${aiSettings[c.id as keyof AISettings] ? 'bg-blue-600' : 'bg-black/10'}`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${aiSettings[c.id as keyof AISettings] ? 'left-7' : 'left-1'}`} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optimization Goal */}
                <div className="space-y-4">
                  <label className="block text-sm font-black text-black/40 uppercase tracking-widest">Optimization Goal</label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'balance', label: 'Balanced', desc: 'Even distribution' },
                      { id: 'compact', label: 'Compact', desc: 'Minimize gaps' },
                      { id: 'spread', label: 'Spread', desc: 'Maximize breaks' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setAiSettings({ ...aiSettings, optimizationGoal: g.id as any })}
                        className={`p-4 rounded-2xl border transition-all text-center ${
                          aiSettings.optimizationGoal === g.id
                            ? 'bg-black border-black text-white shadow-lg scale-105'
                            : 'bg-black/5 border-black/10 text-black/60 hover:border-black/20'
                        }`}
                      >
                        <div className="font-black capitalize">{g.label}</div>
                        <div className={`text-[10px] mt-1 ${aiSettings.optimizationGoal === g.id ? 'text-white/40' : 'text-black/20'}`}>
                          {g.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-black bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
