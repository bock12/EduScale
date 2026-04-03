import React from 'react';
import { Organization } from '../../types';
import { BarChart3, PieChart, LineChart, TrendingUp } from 'lucide-react';

interface AnalyticsDashboardProps {
  organization: Organization;
}

export default function AnalyticsDashboard({ organization }: AnalyticsDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">Analytics & Reporting</h1>
        <p className="text-[#9e9e9e] text-lg">Comprehensive metrics for student performance, attendance, and school operations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">8.4</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Avg GPA</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <PieChart className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">94%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Attendance Rate</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <LineChart className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">12%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Growth YoY</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">98%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Teacher Retention</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
        <h2 className="text-2xl font-black tracking-tight mb-4">Module Under Construction</h2>
        <p className="text-[#9e9e9e] text-lg">The full Analytics dashboard is being rolled out.</p>
      </div>
    </div>
  );
}
