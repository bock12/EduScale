import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile } from '../../types';
import { FileText, Award, Calendar, BarChart3, Download } from 'lucide-react';

interface StudentExamsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentExams({ organization, userProfile }: StudentExamsProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock loading time
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
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
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-2">My Exams & Results</h2>
        <p className="text-[#9e9e9e]">View your academic performance and report cards.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Term Overview */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Current Term Performance</h3>
                <p className="text-sm text-[#9e9e9e]">Fall Semester 2026</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-blue-600">A-</div>
              <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Average</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { subject: 'Mathematics', score: 92, grade: 'A', trend: '+2%' },
              { subject: 'Science', score: 88, grade: 'B+', trend: '-1%' },
              { subject: 'English', score: 95, grade: 'A+', trend: '+5%' },
              { subject: 'History', score: 85, grade: 'B', trend: '0%' },
            ].map((result, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] border border-[#e5e5e5]">
                <div className="font-bold">{result.subject}</div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-bold">{result.score}%</div>
                    <div className={`text-xs font-bold ${result.trend.startsWith('+') ? 'text-green-600' : result.trend.startsWith('-') ? 'text-red-600' : 'text-[#9e9e9e]'}`}>
                      {result.trend}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center font-black text-blue-600">
                    {result.grade}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg">Upcoming Exams</h3>
          </div>

          <div className="space-y-4">
            {[
              { subject: 'Mathematics Midterm', date: 'Oct 15, 2026', time: '09:00 AM' },
              { subject: 'Science Quiz', date: 'Oct 18, 2026', time: '11:00 AM' },
              { subject: 'History Essay', date: 'Oct 22, 2026', time: '02:00 PM' },
            ].map((exam, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-[#e5e5e5] hover:border-blue-200 transition-colors">
                <h4 className="font-bold mb-2">{exam.subject}</h4>
                <div className="flex items-center justify-between text-sm text-[#9e9e9e]">
                  <span>{exam.date}</span>
                  <span>{exam.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4">Report Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { term: 'Spring Semester 2026', date: 'June 15, 2026', gpa: '3.8' },
            { term: 'Fall Semester 2025', date: 'December 20, 2025', gpa: '3.6' },
            { term: 'Spring Semester 2025', date: 'June 18, 2025', gpa: '3.5' },
          ].map((report, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Award className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-xl font-black">{report.gpa}</div>
                  <div className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">GPA</div>
                </div>
              </div>
              <h4 className="font-bold text-lg mb-1">{report.term}</h4>
              <p className="text-sm text-[#9e9e9e] mb-6">Issued: {report.date}</p>
              
              <button className="mt-auto w-full flex items-center justify-center gap-2 bg-[#f5f5f5] hover:bg-[#e5e5e5] text-[#1a1a1a] font-bold py-3 rounded-xl transition-colors">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
