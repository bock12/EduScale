import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, Class, Attendance } from '../../types';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentAttendanceProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentAttendance({ organization, userProfile }: StudentAttendanceProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !userProfile?.uid) return;

    const classesQ = query(collection(db, 'organizations', organization.id, 'classes'));
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    const attendanceQ = query(
      collection(db, 'organizations', organization.id, 'attendance'),
      where('studentId', '==', userProfile.uid)
    );
    const unsubAttendance = onSnapshot(attendanceQ, (snap) => {
      setAttendanceRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as Attendance)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'attendance');
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubAttendance();
    };
  }, [organization.id, userProfile.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const totalRecords = attendanceRecords.length;
  const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
  const excusedCount = attendanceRecords.filter(r => r.status === 'excused').length;

  const attendanceRate = totalRecords > 0 
    ? Math.round(((presentCount + lateCount + excusedCount) / totalRecords) * 100) 
    : 100;

  // Sort records by date descending
  const sortedRecords = [...attendanceRecords].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-700';
      case 'absent': return 'bg-red-100 text-red-700';
      case 'late': return 'bg-orange-100 text-orange-700';
      case 'excused': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle className="w-4 h-4" />;
      case 'absent': return <XCircle className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'excused': return <AlertCircle className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">My Attendance</h2>
        <p className="text-[#9e9e9e] text-sm md:text-base">View your attendance records and statistics.</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{attendanceRate}%</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Overall Rate</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{presentCount}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Present</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{absentCount}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Absent</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{lateCount}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Late</p>
        </div>
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[#e5e5e5] bg-[#f9f9f9]">
          <h3 className="text-xl font-bold tracking-tight">Recent Records</h3>
        </div>
        
        {sortedRecords.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-[#9e9e9e]" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Records Yet</h3>
            <p className="text-[#9e9e9e]">Your attendance records will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {sortedRecords.map((record) => {
              const recordClass = classes.find(c => c.id === record.classSectionId);
              return (
                <div key={record.id} className="p-4 flex items-center justify-between hover:bg-[#f9f9f9] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getStatusColor(record.status)}`}>
                      {getStatusIcon(record.status)}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[#1a1a1a]">
                        {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-[#9e9e9e] mt-1">{recordClass?.name || 'General Class'}</p>
                      {record.notes && (
                        <p className="text-xs text-[#4a4a4a] mt-1 italic">"{record.notes}"</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(record.status)}`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
