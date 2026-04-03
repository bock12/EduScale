import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Organization, UserProfile, AssignmentGrade, AttendanceRecord } from '../../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  Calendar,
  ChevronRight,
  Target,
  Zap
} from 'lucide-react';

interface StudentProgressTrackingProps {
  organization: Organization;
  studentId: string;
}

export default function StudentProgressTracking({ organization, studentId }: StudentProgressTrackingProps) {
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !studentId) return;

    const unsubGrades = onSnapshot(
      query(
        collection(db, 'organizations', organization.id, 'assignment_grades'),
        where('studentId', '==', studentId),
        orderBy('gradedAt', 'asc')
      ),
      (snap) => {
        setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentGrade)));
      }
    );

    const unsubAttendance = onSnapshot(
      query(
        collection(db, 'organizations', organization.id, 'attendance_records'),
        where('studentId', '==', studentId),
        orderBy('date', 'desc'),
        limit(30)
      ),
      (snap) => {
        setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
        setLoading(false);
      }
    );

    return () => {
      unsubGrades();
      unsubAttendance();
    };
  }, [organization.id, studentId]);

  const gradeData = grades.map(g => ({
    date: new Date(g.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: g.score,
    maxScore: g.maxScore,
    percentage: (g.score / g.maxScore) * 100
  }));

  const attendanceRate = attendance.length > 0 
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 
    : 0;

  const averageGrade = grades.length > 0
    ? grades.reduce((acc, g) => acc + (g.score / g.maxScore) * 100, 0) / grades.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Avg. Grade</p>
              <h3 className="text-2xl font-black">{averageGrade.toFixed(1)}%</h3>
            </div>
          </div>
          <div className="w-full bg-[#f5f5f5] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${averageGrade}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Attendance</p>
              <h3 className="text-2xl font-black">{attendanceRate.toFixed(1)}%</h3>
            </div>
          </div>
          <div className="w-full bg-[#f5f5f5] h-2 rounded-full overflow-hidden">
            <div 
              className="bg-green-600 h-full rounded-full transition-all duration-1000" 
              style={{ width: `${attendanceRate}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Assignments</p>
              <h3 className="text-2xl font-black">{grades.length}</h3>
            </div>
          </div>
          <p className="text-xs text-[#9e9e9e] font-medium">Completed in current term</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[40px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black tracking-tight">Academic Performance</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Grade %</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gradeData}>
                <defs>
                  <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9e9e9e' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 600, fill: '#9e9e9e' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    padding: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="percentage" 
                  stroke="#2563eb" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorGrade)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-[#e5e5e5] shadow-sm">
          <h3 className="text-xl font-black tracking-tight mb-8">Recent Grades</h3>
          <div className="space-y-4">
            {grades.slice(-5).reverse().map((grade) => (
              <div key={grade.id} className="flex items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0] group hover:bg-white hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e5] flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1a1a1a]">Assignment {grade.assignmentId.slice(0, 8)}</h4>
                    <p className="text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">
                      {new Date(grade.gradedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-600">{grade.score}/{grade.maxScore}</p>
                  <p className="text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">
                    {((grade.score / grade.maxScore) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
