import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ClassSection, Student, DailyAttendance as DailyAttendanceType, ClassTeacher, ClassStudent } from '../../types';
import { Calendar, Users, CheckCircle2, XCircle, Clock, AlertCircle, Save, ChevronLeft, ChevronRight, Search, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FaceRecognition from '../face-recognition/FaceRecognition';

interface DailyAttendanceProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function DailyAttendance({ organization, userProfile }: DailyAttendanceProps) {
  const [sections, setSections] = useState<ClassSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<ClassSection | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecord, setAttendanceRecord] = useState<DailyAttendanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFaceScan, setShowFaceScan] = useState(false);

  // Fetch sections where user is primary teacher
  useEffect(() => {
    const fetchSections = async () => {
      try {
        // First get the teacher record for this user
        const teachersRef = collection(db, 'organizations', organization.id, 'teachers');
        const teacherQuery = query(teachersRef, where('email', '==', userProfile.email));
        const teacherSnap = await getDocs(teacherQuery);
        
        if (teacherSnap.empty && userProfile.role !== 'school_admin' && userProfile.role !== 'super_admin') {
          setLoading(false);
          return;
        }

        const teacherId = teacherSnap.docs[0]?.id;

        // Get class teacher assignments
        const assignmentsRef = collection(db, 'organizations', organization.id, 'class_teachers');
        let assignmentsQuery;
        
        if (userProfile.role === 'school_admin' || userProfile.role === 'super_admin') {
          assignmentsQuery = query(assignmentsRef);
        } else {
          assignmentsQuery = query(assignmentsRef, where('teacherId', '==', teacherId), where('role', '==', 'primary'));
        }

        const assignmentsSnap = await getDocs(assignmentsQuery);
        const sectionIds = assignmentsSnap.docs.map(doc => (doc.data() as ClassTeacher).sectionId);

        if (sectionIds.length === 0 && userProfile.role !== 'school_admin' && userProfile.role !== 'super_admin') {
          setLoading(false);
          return;
        }

        // Get the actual sections
        const sectionsRef = collection(db, 'organizations', organization.id, 'class_sections');
        const sectionsSnap = await getDocs(sectionsRef);
        const allSections = sectionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection));
        
        const filteredSections = userProfile.role === 'school_admin' || userProfile.role === 'super_admin'
          ? allSections
          : allSections.filter(s => sectionIds.includes(s.id));

        setSections(filteredSections);
        if (filteredSections.length > 0) {
          setSelectedSection(filteredSections[0]);
        }
        setLoading(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_sections');
        setLoading(false);
      }
    };

    fetchSections();
  }, [organization.id, userProfile]);

  // Fetch students and existing attendance when section or date changes
  useEffect(() => {
    if (!selectedSection) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch students in this section
        const enrollmentsRef = collection(db, 'organizations', organization.id, 'class_students');
        const enrollmentsQuery = query(enrollmentsRef, where('sectionId', '==', selectedSection.id), where('status', '==', 'active'));
        const enrollmentsSnap = await getDocs(enrollmentsQuery);
        const studentIds = enrollmentsSnap.docs.map(doc => doc.data().studentId);

        if (studentIds.length > 0) {
          const studentsRef = collection(db, 'organizations', organization.id, 'students');
          const studentsSnap = await getDocs(studentsRef);
          const allStudents = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
          setStudents(allStudents.filter(s => studentIds.includes(s.id)));
        } else {
          setStudents([]);
        }

        // Fetch existing attendance record
        const attendanceRef = collection(db, 'organizations', organization.id, 'daily_attendance');
        const attendanceQuery = query(
          attendanceRef, 
          where('classSectionId', '==', selectedSection.id), 
          where('date', '==', selectedDate)
        );
        
        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
          if (!snapshot.empty) {
            setAttendanceRecord({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as DailyAttendanceType);
          } else {
            setAttendanceRecord(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_attendance_data');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSection, selectedDate, organization.id]);

  const handleStatusChange = (studentId: string, status: DailyAttendanceType['records'][0]['status']) => {
    const currentRecords = attendanceRecord?.records || [];
    const existingIndex = currentRecords.findIndex(r => r.studentId === studentId);
    
    let newRecords;
    if (existingIndex >= 0) {
      newRecords = [...currentRecords];
      newRecords[existingIndex] = { ...newRecords[existingIndex], status };
    } else {
      newRecords = [...currentRecords, { studentId, status }];
    }

    setAttendanceRecord(prev => ({
      ...(prev || {
        id: '',
        organizationId: organization.id,
        classSectionId: selectedSection!.id,
        date: selectedDate,
        markedBy: userProfile.uid,
        createdAt: new Date().toISOString(),
        records: []
      }),
      records: newRecords
    }));
  };

  const handleSave = async () => {
    if (!selectedSection || !attendanceRecord) return;
    setSaving(true);
    try {
      const data = {
        ...attendanceRecord,
        organizationId: organization.id,
        classSectionId: selectedSection.id,
        date: selectedDate,
        markedBy: userProfile.uid,
        updatedAt: serverTimestamp()
      };

      if (attendanceRecord.id) {
        const { id, ...updateData } = data;
        await updateDoc(doc(db, 'organizations', organization.id, 'daily_attendance', id), updateData);
      } else {
        const { id, ...addData } = data;
        await addDoc(collection(db, 'organizations', organization.id, 'daily_attendance'), {
          ...addData,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'save_daily_attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status: DailyAttendanceType['records'][0]['status']) => {
    const newRecords = students.map(s => ({
      studentId: s.id,
      status
    }));

    setAttendanceRecord(prev => ({
      ...(prev || {
        id: '',
        organizationId: organization.id,
        classSectionId: selectedSection!.id,
        date: selectedDate,
        markedBy: userProfile.uid,
        createdAt: new Date().toISOString(),
        records: []
      }),
      records: newRecords
    }));
  };

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.studentId}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && sections.length === 0) {
    return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white border border-black/10 rounded-[32px] p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-black/20" />
        </div>
        <h3 className="text-xl font-black text-black">No Assigned Classes</h3>
        <p className="text-black/40 font-bold max-w-sm mx-auto">You are not assigned as a primary teacher (Class Master) to any class sections.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Class Section</label>
          <select
            value={selectedSection?.id || ''}
            onChange={(e) => setSelectedSection(sections.find(s => s.id === e.target.value) || null)}
            className="w-full bg-white border border-black/10 rounded-2xl py-4 px-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
          >
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.sectionName} ({s.gradeLevel})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-black/40 ml-4">Attendance Date</label>
          <div className="relative">
            <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-2xl py-4 pl-14 pr-6 font-bold text-black focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>
        </div>

        <div className="flex items-end gap-3">
          <button
            onClick={() => setShowFaceScan(true)}
            disabled={!selectedSection}
            className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            <Camera className="w-5 h-5" />
            <span>Face Scan</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedSection}
            className="flex-1 bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all disabled:opacity-50"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{attendanceRecord?.id ? 'Update Records' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFaceScan && selectedSection && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
            >
              <FaceRecognition 
                organization={organization}
                classSectionId={selectedSection.id}
                mode="attendance"
                onClose={() => setShowFaceScan(false)}
                onMatch={(studentId) => {
                  // The record will be updated in Firestore, and onSnapshot will update the list
                  console.log(`Face matched for student: ${studentId}`);
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Actions & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => markAll('present')}
            className="px-4 py-2 bg-green-500/10 text-green-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-green-500/20 transition-all"
          >
            Mark All Present
          </button>
          <button
            onClick={() => markAll('absent')}
            className="px-4 py-2 bg-red-500/10 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500/20 transition-all"
          >
            Mark All Absent
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/5 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-sm"
          />
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white border border-black/10 rounded-[32px] overflow-hidden shadow-sm">
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-black/5">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Student</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">ID</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40 text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-black/40">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredStudents.map((student) => {
                const record = attendanceRecord?.records.find(r => r.studentId === student.id);
                const status = record?.status;

                return (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-black/[0.02] transition-colors"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-black text-black/40">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-black text-black">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{student.gender}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-mono text-xs font-bold text-black/40">{student.studentId}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        {[
                          { id: 'present', label: 'P', color: 'bg-green-500', icon: CheckCircle2 },
                          { id: 'absent', label: 'A', color: 'bg-red-500', icon: XCircle },
                          { id: 'late', label: 'L', color: 'bg-amber-500', icon: Clock },
                          { id: 'excused', label: 'E', color: 'bg-blue-500', icon: AlertCircle }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleStatusChange(student.id, s.id as any)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                              status === s.id
                                ? `${s.color} text-white shadow-lg scale-110`
                                : 'bg-black/5 text-black/20 hover:bg-black/10 hover:text-black/40'
                            }`}
                            title={s.id.charAt(0).toUpperCase() + s.id.slice(1)}
                          >
                            <span className="text-xs font-black">{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={record?.notes || ''}
                        onChange={(e) => {
                          const newRecords = [...(attendanceRecord?.records || [])];
                          const idx = newRecords.findIndex(r => r.studentId === student.id);
                          if (idx >= 0) {
                            newRecords[idx] = { ...newRecords[idx], notes: e.target.value };
                          } else {
                            newRecords.push({ studentId: student.id, status: 'present', notes: e.target.value });
                          }
                          setAttendanceRecord(prev => ({ ...prev!, records: newRecords }));
                        }}
                        className="w-full bg-black/5 border border-transparent rounded-xl py-2 px-4 text-sm font-medium focus:bg-white focus:border-black/10 focus:outline-none transition-all"
                      />
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-black/5">
          {filteredStudents.map((student) => {
            const record = attendanceRecord?.records.find(r => r.studentId === student.id);
            const status = record?.status;

            return (
              <div key={student.id} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center font-black text-black/40">
                      {student.firstName[0]}{student.lastName[0]}
                    </div>
                    <div>
                      <p className="font-black text-black">{student.firstName} {student.lastName}</p>
                      <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{student.studentId}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                    status === 'present' ? 'bg-green-500/10 text-green-600' :
                    status === 'absent' ? 'bg-red-500/10 text-red-600' :
                    status === 'late' ? 'bg-amber-500/10 text-amber-600' :
                    status === 'excused' ? 'bg-blue-500/10 text-blue-600' :
                    'bg-black/5 text-black/40'
                  }`}>
                    {status || 'Not Marked'}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'present', label: 'P', color: 'bg-green-500' },
                    { id: 'absent', label: 'A', color: 'bg-red-500' },
                    { id: 'late', label: 'L', color: 'bg-amber-500' },
                    { id: 'excused', label: 'E', color: 'bg-blue-500' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleStatusChange(student.id, s.id as any)}
                      className={`py-3 rounded-xl flex items-center justify-center transition-all ${
                        status === s.id
                          ? `${s.color} text-white shadow-md`
                          : 'bg-black/5 text-black/20'
                      }`}
                    >
                      <span className="text-xs font-black">{s.label}</span>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Add note..."
                  value={record?.notes || ''}
                  onChange={(e) => {
                    const newRecords = [...(attendanceRecord?.records || [])];
                    const idx = newRecords.findIndex(r => r.studentId === student.id);
                    if (idx >= 0) {
                      newRecords[idx] = { ...newRecords[idx], notes: e.target.value };
                    } else {
                      newRecords.push({ studentId: student.id, status: 'present', notes: e.target.value });
                    }
                    setAttendanceRecord(prev => ({ ...prev!, records: newRecords }));
                  }}
                  className="w-full bg-black/5 border border-transparent rounded-xl py-3 px-4 text-sm font-medium focus:bg-white focus:border-black/10 focus:outline-none transition-all"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
