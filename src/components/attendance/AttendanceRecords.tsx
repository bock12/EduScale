import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, AttendanceSession, AttendanceRecord, Student, ClassStudent, UserProfile } from '../../types';
import { ChevronLeft, CheckCircle2, XCircle, Clock, AlertCircle, Save, Search, User, Check, X, Minus, Download, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FaceRecognition from '../face-recognition/FaceRecognition';

interface AttendanceRecordsProps {
  organization: Organization;
  session: AttendanceSession;
  userProfile: UserProfile;
  onBack: () => void;
}

export default function AttendanceRecords({ organization, session, userProfile, onBack }: AttendanceRecordsProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [showFaceScan, setShowFaceScan] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch students in this class section
        const enrollmentsSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'class_students'),
          where('sectionId', '==', session.classSectionId)
        ));
        const studentIds = enrollmentsSnap.docs.map(doc => (doc.data() as ClassStudent).studentId);
        
        if (studentIds.length > 0) {
          const studentsSnap = await getDocs(query(
            collection(db, 'organizations', organization.id, 'students'),
            where('id', 'in', studentIds)
          ));
          setStudents(studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
        }

        // Fetch existing records for this session
        const unsubscribeRecords = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'attendance_records'),
          where('sessionId', '==', session.id)
        ), (snapshot) => {
          setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
        });

        setLoading(false);
        return () => unsubscribeRecords();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'attendance_records_data');
      }
    };

    fetchData();
  }, [organization.id, session.id, session.classSectionId]);

  const markAttendance = async (studentId: string, status: AttendanceRecord['status']) => {
    try {
      const existingRecord = records.find(r => r.studentId === studentId);
      if (existingRecord) {
        await updateDoc(doc(db, 'organizations', organization.id, 'attendance_records', existingRecord.id), {
          status,
          timestamp: new Date().toISOString(),
          markedBy: userProfile.uid
        });
      } else {
        await addDoc(collection(db, 'organizations', organization.id, 'attendance_records'), {
          organizationId: organization.id,
          sessionId: session.id,
          studentId,
          status,
          timestamp: new Date().toISOString(),
          markedBy: userProfile.uid
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_record');
    }
  };

  const markAll = async (status: AttendanceRecord['status']) => {
    setSaving(true);
    try {
      for (const student of students) {
        await markAttendance(student.id, status);
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadReport = () => {
    const headers = ['Student ID', 'First Name', 'Last Name', 'Status', 'Timestamp'];
    const rows = students.map(student => {
      const record = records.find(r => r.studentId === student.id);
      return [
        student.studentId,
        student.firstName,
        student.lastName,
        record?.status || 'unmarked',
        record?.timestamp || ''
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_report_${session.subject}_${session.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    excused: records.filter(r => r.status === 'excused').length,
    total: students.length
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl text-black transition-all shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-black truncate">{session.subject}</h2>
            <p className="text-black/40 font-bold uppercase tracking-widest text-[10px] sm:text-xs truncate">{session.date} • {session.startTime} - {session.endTime}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {session.status === 'completed' ? (
            <button
              onClick={downloadReport}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Report</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowFaceScan(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all text-sm shadow-lg shadow-indigo-200"
              >
                <Camera className="w-4 h-4" />
                <span>Face Scan</span>
              </button>
              <button
                onClick={() => markAll('present')}
                disabled={saving}
                className="bg-green-500/10 text-green-600 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-500/20 transition-all disabled:opacity-50"
              >
                Mark All Present
              </button>
              <button
                onClick={async () => {
                  await updateDoc(doc(db, 'organizations', organization.id, 'attendance_sessions', session.id), {
                    status: 'completed'
                  });
                  onBack();
                }}
                className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish Session</span>
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFaceScan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
            >
              <FaceRecognition 
                organization={organization}
                sessionId={session.id}
                mode="attendance"
                onClose={() => setShowFaceScan(false)}
                onMatch={(studentId) => {
                  // The record will be added to Firestore, and onSnapshot will update the list
                  console.log(`Face matched for student: ${studentId}`);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-500/10' },
          { label: 'Absent', value: stats.absent, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Late', value: stats.late, color: 'text-amber-600', bg: 'bg-amber-500/10' },
          { label: 'Excused', value: stats.excused, color: 'text-blue-600', bg: 'bg-blue-500/10' },
          { label: 'Unmarked', value: stats.total - records.length, color: 'text-black/40', bg: 'bg-black/5' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} p-4 rounded-2xl text-center space-y-1`}>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-black/40">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-black/10 rounded-[40px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
            />
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40">Student</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40 text-center">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-black/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredStudents.map((student) => {
                const record = records.find(r => r.studentId === student.id);
                return (
                  <tr key={student.id} className="group hover:bg-black/[0.02] transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-black text-black/20">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <div className="font-black text-black">{student.firstName} {student.lastName}</div>
                          <div className="text-black/40 text-xs font-bold uppercase tracking-widest">{student.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center">
                        {record ? (
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            record.status === 'present' ? 'bg-green-500/10 text-green-600' :
                            record.status === 'absent' ? 'bg-red-500/10 text-red-600' :
                            record.status === 'late' ? 'bg-amber-500/10 text-amber-600' :
                            'bg-blue-500/10 text-blue-600'
                          }`}>
                            {record.status}
                          </div>
                        ) : (
                          <div className="px-4 py-1.5 rounded-full bg-black/5 text-black/20 text-[10px] font-black uppercase tracking-widest">
                            Unmarked
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => markAttendance(student.id, 'present')}
                          className={`p-2 rounded-xl transition-all ${
                            record?.status === 'present' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-black/5 text-black/20 hover:bg-green-500/10 hover:text-green-600'
                          }`}
                          title="Present"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'absent')}
                          className={`p-2 rounded-xl transition-all ${
                            record?.status === 'absent' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-black/5 text-black/20 hover:bg-red-500/10 hover:text-red-600'
                          }`}
                          title="Absent"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'late')}
                          className={`p-2 rounded-xl transition-all ${
                            record?.status === 'late' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-black/5 text-black/20 hover:bg-amber-500/10 hover:text-amber-600'
                          }`}
                          title="Late"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => markAttendance(student.id, 'excused')}
                          className={`p-2 rounded-xl transition-all ${
                            record?.status === 'excused' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-black/5 text-black/20 hover:bg-blue-500/10 hover:text-blue-600'
                          }`}
                          title="Excused"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-black/5">
          {filteredStudents.map((student) => {
            const record = records.find(r => r.studentId === student.id);
            return (
              <div key={student.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-black text-black/20">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div>
                      <div className="font-black text-black">{student.firstName} {student.lastName}</div>
                      <div className="text-black/40 text-[10px] font-bold uppercase tracking-widest">{student.studentId}</div>
                    </div>
                  </div>
                  {record ? (
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      record.status === 'present' ? 'bg-green-500/10 text-green-600' :
                      record.status === 'absent' ? 'bg-red-500/10 text-red-600' :
                      record.status === 'late' ? 'bg-amber-500/10 text-amber-600' :
                      'bg-blue-500/10 text-blue-600'
                    }`}>
                      {record.status}
                    </div>
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-black/5 text-black/20 text-[8px] font-black uppercase tracking-widest">
                      Unmarked
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'present', icon: Check, color: 'bg-green-500' },
                    { id: 'absent', icon: X, color: 'bg-red-500' },
                    { id: 'late', icon: Clock, color: 'bg-amber-500' },
                    { id: 'excused', icon: Minus, color: 'bg-blue-500' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => markAttendance(student.id, s.id as any)}
                      className={`py-3 rounded-xl flex items-center justify-center transition-all ${
                        record?.status === s.id
                          ? `${s.color} text-white shadow-md`
                          : 'bg-black/5 text-black/20'
                      }`}
                    >
                      <s.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
