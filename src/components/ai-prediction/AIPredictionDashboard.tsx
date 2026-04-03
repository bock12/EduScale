import React from 'react';
import { Organization } from '../../types';
import { BrainCircuit, AlertTriangle, Target, Lightbulb } from 'lucide-react';

interface AIPredictionDashboardProps {
  organization: Organization;
}

export default function AIPredictionDashboard({ organization }: AIPredictionDashboardProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-2">AI Prediction Engine</h1>
        <p className="text-[#9e9e9e] text-lg">Advanced machine learning models for risk prediction and intervention recommendations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">4</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Active Models</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">12</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">At-Risk Students</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">89%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Prediction Accuracy</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <Lightbulb className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">45</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Interventions Suggested</p>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[40px] border border-[#e5e5e5] text-center">
        <h2 className="text-2xl font-black tracking-tight mb-4">Module Under Construction</h2>
        <p className="text-[#9e9e9e] text-lg">The full AI Prediction engine is being rolled out.</p>
      </div>
    </div>
  );
}
