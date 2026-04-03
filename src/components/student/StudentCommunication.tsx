import React, { useState, useEffect } from 'react';
import { Organization, UserProfile } from '../../types';
import { MessageSquare, Bell, Search, Star, Clock, User } from 'lucide-react';
import AnnouncementsHub from '../announcements/AnnouncementsHub';

interface StudentCommunicationProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentCommunication({ organization, userProfile }: StudentCommunicationProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements'>('messages');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 h-[calc(100vh-8rem)] flex flex-col">
      <header className="shrink-0">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Communication</h2>
        <p className="text-[#9e9e9e]">Messages and announcements from your teachers and school.</p>
      </header>

      <div className="flex gap-2 p-1 bg-black/5 rounded-2xl w-fit shrink-0">
        <button
          onClick={() => setActiveTab('messages')}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200
            ${activeTab === 'messages' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-black/40 hover:text-black hover:bg-black/5'}
          `}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-bold">Messages</span>
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-200
            ${activeTab === 'announcements' 
              ? 'bg-white text-black shadow-sm' 
              : 'text-black/40 hover:text-black hover:bg-black/5'}
          `}
        >
          <Bell className="w-5 h-5" />
          <span className="font-bold">Announcements</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-3xl border border-[#e5e5e5] overflow-hidden flex flex-col md:flex-row">
        {activeTab === 'messages' ? (
          <>
            {/* Messages Sidebar */}
            <div className={`w-full md:w-1/3 border-r border-[#e5e5e5] flex flex-col ${activeTab === 'messages' ? 'block' : 'hidden md:block'}`}>
              <div className="p-4 border-b border-[#e5e5e5]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
                  <input
                    type="text"
                    placeholder="Search messages..."
                    className="w-full pl-10 pr-4 py-2 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {[
                  { name: 'Mr. Smith', subject: 'Math Homework', time: '10:30 AM', unread: true },
                  { name: 'Mrs. Johnson', subject: 'Science Project', time: 'Yesterday', unread: false },
                  { name: 'Ms. Davis', subject: 'Reading Assignment', time: 'Mon', unread: false },
                ].map((msg, idx) => (
                  <button key={idx} className={`w-full text-left p-4 border-b border-[#e5e5e5] hover:bg-[#f8fafc] transition-colors ${msg.unread ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-bold ${msg.unread ? 'text-[#1a1a1a]' : 'text-[#4a4a4a]'}`}>{msg.name}</span>
                      <span className="text-xs text-[#9e9e9e]">{msg.time}</span>
                    </div>
                    <p className={`text-sm truncate ${msg.unread ? 'font-semibold text-[#1a1a1a]' : 'text-[#9e9e9e]'}`}>{msg.subject}</p>
                  </button>
                ))}
              </div>
            </div>
            {/* Message Content */}
            <div className="hidden md:flex flex-1 flex-col">
              <div className="p-6 border-b border-[#e5e5e5] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Mr. Smith</h3>
                    <p className="text-sm text-[#9e9e9e]">Mathematics Teacher</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-[#9e9e9e] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-lg transition-colors">
                    <Star className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-[#f5f5f5] p-4 rounded-2xl rounded-tl-none max-w-[80%]">
                    <p className="text-[#1a1a1a]">Hi, don't forget that the algebra assignment is due tomorrow. Let me know if you have any questions!</p>
                    <span className="text-xs text-[#9e9e9e] mt-2 block">10:30 AM</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-[#e5e5e5]">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 bg-[#f5f5f5] border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    Send
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnnouncementsHub organization={organization} userProfile={userProfile} hideHeader />
          </div>
        )}
      </div>
    </div>
  );
}
