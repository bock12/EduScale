import React, { useState } from 'react';
import { Organization, UserProfile } from '../../types';
import { MessageSquare, Bell, Mail, Smartphone, Plus } from 'lucide-react';
import StudentCommunication from '../student/StudentCommunication';
import ChatInterface from './ChatInterface';
import AnnouncementsHub from '../announcements/AnnouncementsHub';

interface CommunicationDashboardProps {
  organization: Organization;
  userProfile?: UserProfile | null;
}

export default function CommunicationDashboard({ organization, userProfile }: CommunicationDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'messaging' | 'announcements' | 'email' | 'sms'>('overview');

  if (userProfile?.role === 'student') {
    return <StudentCommunication organization={organization} userProfile={userProfile} />;
  }

  if (!userProfile) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2">Communication</h1>
          <p className="text-[#9e9e9e] text-lg">Manage messages, announcements, emails, and SMS notifications.</p>
        </div>
        <div className="flex overflow-x-auto no-scrollbar bg-white p-1.5 rounded-2xl border border-[#e5e5e5] shadow-sm max-w-full">
          <div className="flex gap-2 min-w-max">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('messaging')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'messaging' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
            >
              Internal Messaging
            </button>
            <button 
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'announcements' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
            >
              Announcements
            </button>
            <button 
              onClick={() => setActiveTab('email')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'email' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
            >
              Email
            </button>
            <button 
              onClick={() => setActiveTab('sms')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'sms' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
            >
              SMS
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black mb-1">1,450</h3>
              <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Messages Sent</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black mb-1">24</h3>
              <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Announcements</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black mb-1">8,200</h3>
              <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Emails Delivered</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black mb-1">3,100</h3>
              <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">SMS Sent</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black tracking-tight">Recent Announcements</h3>
                <button className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { title: 'School Closed - Public Holiday', date: '2 hours ago', type: 'Holiday' },
                  { title: 'New Grading Policy for Term 2', date: 'Yesterday', type: 'Academic' },
                  { title: 'Annual Sports Day Registration', date: '2 days ago', type: 'Event' }
                ].map((ann, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-[#f9f9f9] transition-all border border-transparent hover:border-[#e5e5e5]">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{ann.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">{ann.type}</span>
                        <span className="text-[10px] text-[#9e9e9e] font-bold">{ann.date}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-[#e5e5e5]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black tracking-tight">Quick Actions</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setActiveTab('messaging')}
                  className="p-6 rounded-3xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-left group"
                >
                  <MessageSquare className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-black text-sm mb-1">New Message</h4>
                  <p className="text-xs text-blue-600/60 font-bold">Direct or group chat</p>
                </button>
                <button className="p-6 rounded-3xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-all text-left group">
                  <Bell className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-black text-sm mb-1">Broadcast</h4>
                  <p className="text-xs text-purple-600/60 font-bold">Post announcement</p>
                </button>
                <button className="p-6 rounded-3xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all text-left group">
                  <Mail className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-black text-sm mb-1">Email Blast</h4>
                  <p className="text-xs text-orange-600/60 font-bold">Send to all parents</p>
                </button>
                <button className="p-6 rounded-3xl bg-green-50 text-green-600 hover:bg-green-100 transition-all text-left group">
                  <Smartphone className="w-8 h-8 mb-4 group-hover:scale-110 transition-transform" />
                  <h4 className="font-black text-sm mb-1">SMS Alert</h4>
                  <p className="text-xs text-green-600/60 font-bold">Urgent notifications</p>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'messaging' && (
        <ChatInterface organization={organization} userProfile={userProfile} />
      )}

      {activeTab === 'announcements' && (
        <AnnouncementsHub organization={organization} userProfile={userProfile!} hideHeader />
      )}

      {(activeTab === 'email' || activeTab === 'sms') && (
        <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
          <h2 className="text-2xl font-black tracking-tight mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module Under Construction</h2>
          <p className="text-[#9e9e9e] text-lg">This specific communication channel is being integrated.</p>
        </div>
      )}
    </div>
  );
}
