import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, AttendanceSession, ClassSection, Teacher, Student, AttendanceRecord, Classroom, ClassTeacher, UserProfile, Subject } from '../../types';
import { Plus, Search, Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, ChevronRight, Filter, MoreVertical, Trash2, X, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AttendanceRecords from './AttendanceRecords';

interface AttendanceSessionsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function AttendanceSessions({ organization, userProfile }: AttendanceSessionsProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeSessions = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'attendance_sessions'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceSession)));
        });

        const classesSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
        setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection)));

        const teachersSnap = await getDocs(collection(db, 'organizations', organization.id, 'teachers'));
        setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));

        const roomsSnap = await getDocs(collection(db, 'organizations', organization.id, 'classrooms'));
        setClassrooms(roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom)));

        const classTeachersSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_teachers'));
        setClassTeachers(classTeachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassTeacher)));

        const subjectsSnap = await getDocs(collection(db, 'organizations', organization.id, 'subjects'));
        setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));

        setLoading(false);
        return () => unsubscribeSessions();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'attendance_sessions_data');
      }
    };

    fetchData();
  }, [organization.id]);

  const filteredSessions = sessions.filter(s => {
    // Role-based filtering
    const isTeacher = userProfile.role === 'teacher';
    const teacherId = userProfile.entityId || userProfile.uid;
    
    if (isTeacher && teacherId) {
      const isAssignedToSession = s.teacherId === teacherId;
      const isClassMaster = classTeachers.some(ct => ct.sectionId === s.classSectionId && ct.teacherId === teacherId && ct.role === 'primary');
      
      if (!isAssignedToSession && !isClassMaster) return false;
    }

    const cls = classes.find(c => c.id === s.classSectionId);
    const teacher = teachers.find(t => t.id === s.teacherId);
    const searchStr = `${cls?.sectionName} ${teacher?.firstName} ${teacher?.lastName} ${s.subject}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  if (selectedSession) {
    return <AttendanceRecords organization={organization} session={selectedSession} userProfile={userProfile} onBack={() => setSelectedSession(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Session</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => {
          const cls = classes.find(c => c.id === session.classSectionId);
          const teacher = teachers.find(t => t.id === session.teacherId);
          
          return (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  session.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                  session.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                  'bg-black/5 text-black/40'
                }`}>
                  {session.status.replace('_', ' ')}
                </div>
                <button className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-black">{session.subject}</h3>
                <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">{cls?.sectionName}</p>
              </div>

              <div className="space-y-2 pt-4 border-t border-black/5">
                <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                  <User className="w-4 h-4" />
                  <span>{teacher?.firstName} {teacher?.lastName}</span>
                </div>
                {session.classroomId && (
                  <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                    <MapPin className="w-4 h-4" />
                    <span>{classrooms.find(r => r.id === session.classroomId)?.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>{session.date}</span>
                </div>
                <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  <span>{session.startTime} - {session.endTime}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSession(session)}
                className="w-full bg-black/5 hover:bg-black text-black hover:text-white py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
              >
                <span>{session.status === 'completed' ? 'Generate Report' : 'Mark Attendance'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </div>

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* New Session Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">New Session</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  const newSession = {
                    organizationId: organization.id,
                    classSectionId: formData.get('classId') as string,
                    teacherId: formData.get('teacherId') as string,
                    classroomId: formData.get('classroomId') as string,
                    subject: formData.get('subject') as string,
                    date: formData.get('date') as string,
                    startTime: formData.get('startTime') as string,
                    endTime: formData.get('endTime') as string,
                    status: 'in_progress',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  await addDoc(collection(db, 'organizations', organization.id, 'attendance_sessions'), newSession);
                  setIsAdding(false);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, 'attendance_sessions');
                }
              }} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Class Section</label>
                    <select name="classId" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      {classes.map(c => <option key={c.id} value={c.id}>{c.sectionName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Classroom</label>
                    <select name="classroomId" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      <option value="">Select Classroom</option>
                      {classrooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Teacher</label>
                    <select name="teacherId" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Subject</label>
                    <select name="subject" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      <option value="">Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Date</label>
                      <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Start Time</label>
                      <input name="startTime" type="time" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">End Time</label>
                      <input name="endTime" type="time" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">Start Session</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
