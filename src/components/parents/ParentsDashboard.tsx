import React from 'react';
import { Organization } from '../../types';
import { Users, FileCheck, CalendarClock, ShieldCheck } from 'lucide-react';

interface ParentsDashboardProps {
  organization: Organization;
}

export default function ParentsDashboard({ organization }: ParentsDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Parent Portal</h1>
        <p className="text-[#9e9e9e] text-lg">Manage parent accounts, permissions, and meeting requests.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">840</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Registered Parents</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">156</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Pending Permissions</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">32</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Meeting Requests</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">98%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Verified Accounts</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
        <h2 className="text-2xl font-black tracking-tight mb-4">Module Under Construction</h2>
        <p className="text-[#9e9e9e] text-lg">The full Parent Portal module is being rolled out.</p>
      </div>
    </div>
  );
}
