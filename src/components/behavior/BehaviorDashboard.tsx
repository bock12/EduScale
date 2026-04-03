import React from 'react';
import { Organization } from '../../types';
import { ShieldAlert, AlertTriangle, Award, TrendingUp } from 'lucide-react';

interface BehaviorDashboardProps {
  organization: Organization;
}

export default function BehaviorDashboard({ organization }: BehaviorDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Behavior & Discipline</h1>
        <p className="text-[#9e9e9e] text-lg">Manage student conduct, disciplinary actions, and positive reinforcement.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">12</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Active Cases</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">5</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Pending Actions</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">1,240</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Positive Points</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">+15%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Behavior Score</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
        <h2 className="text-2xl font-black tracking-tight mb-4">Module Under Construction</h2>
        <p className="text-[#9e9e9e] text-lg">The full Behavior & Discipline module is being rolled out.</p>
      </div>
    </div>
  );
}
