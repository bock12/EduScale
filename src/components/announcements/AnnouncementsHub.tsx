import React, { useState } from 'react';
import { Megaphone, Send, List, LayoutDashboard, Bell, Settings, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnnouncementForm } from './AnnouncementForm';
import { AnnouncementList } from './AnnouncementList';
import { UserProfile, Organization } from '../../types';

interface AnnouncementsHubProps {
  organization: Organization;
  userProfile: UserProfile;
  hideHeader?: boolean;
}

const AnnouncementsHub: React.FC<AnnouncementsHubProps> = ({ organization, userProfile, hideHeader }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('manage');

  return (
    <div className="space-y-8 pb-12">
      {!hideHeader && (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
              <Megaphone className="w-10 h-10 text-primary" />
              Announcements Hub
            </h1>
            <p className="text-[#9e9e9e] text-lg max-w-2xl">
              Create, manage, and broadcast school-wide communications to students, parents, and staff.
            </p>
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-[#e5e5e5] shadow-sm">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                ${activeTab === 'manage' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#9e9e9e] hover:bg-[#f9f9f9]'}
              `}
            >
              <List className="w-4 h-4" />
              Manage Log
            </button>
            {(userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
              <button
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                  ${activeTab === 'create' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#9e9e9e] hover:bg-[#f9f9f9]'}
                `}
              >
                <Send className="w-4 h-4" />
                Broadcast New
              </button>
            )}
          </div>
        </header>
      )}

      {hideHeader && (userProfile.role === 'super_admin' || userProfile.role === 'school_admin') && (
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-[#e5e5e5] shadow-sm">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                ${activeTab === 'manage' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#9e9e9e] hover:bg-[#f9f9f9]'}
              `}
            >
              <List className="w-4 h-4" />
              Manage Log
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all
                ${activeTab === 'create' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-[#9e9e9e] hover:bg-[#f9f9f9]'}
              `}
            >
              <Send className="w-4 h-4" />
              Broadcast New
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <AnimatePresence mode="wait">
          {activeTab === 'create' ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-5"
            >
              <AnnouncementForm 
                organizationId={organization.id} 
                userProfile={userProfile}
                onSuccess={() => setActiveTab('manage')}
              />
            </motion.div>
          ) : (
            <motion.div
              key="manage"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:col-span-12"
            >
              <AnnouncementList 
                organizationId={organization.id} 
                userProfile={userProfile}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 space-y-6"
          >
            <div className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500" />
                Broadcast Best Practices
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Visual Notices</h4>
                    <p className="text-xs text-[#9e9e9e] leading-relaxed">
                      Use the "Notice" display type for important visual updates. These will appear with images on the dashboard notice board.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Calendar Integration</h4>
                    <p className="text-xs text-[#9e9e9e] leading-relaxed">
                      Select "Event" to automatically add the announcement to the school calendar and dashboard event list.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">Urgent Alerts</h4>
                    <p className="text-xs text-[#9e9e9e] leading-relaxed">
                      Mark critical information as "Urgent" to highlight it with a red badge across all user dashboards.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary p-8 rounded-[32px] text-white overflow-hidden relative">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Multi-Channel Broadcasting</h3>
                <p className="text-sm text-white/80 leading-relaxed mb-6">
                  Your announcements are automatically synchronized across the web platform, mobile app, and email notifications.
                </p>
                <div className="flex items-center gap-4">
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest">
                    Web Push
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest">
                    Email
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-xl backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest">
                    Dashboard
                  </div>
                </div>
              </div>
              <Megaphone className="w-48 h-48 absolute -bottom-12 -right-12 text-white/5 rotate-12" />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsHub;
