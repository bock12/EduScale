import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Organization, UserProfile, Class, Assignment, Lesson, AttendanceSession, TeacherTask } from '../../types';
import { 
  BookOpen, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  Users, 
  TrendingUp, 
  Bell,
  Plus,
  ArrowRight,
  ClipboardCheck,
  AlertCircle,
  MessageSquare,
  CheckCircle2,
  Layout,
  Trash2,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UpcomingEvents } from '../announcements/UpcomingEvents';
import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

interface TeacherDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function TeacherDashboard({ organization, userProfile }: TeacherDashboardProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [todaySessions, setTodaySessions] = useState<AttendanceSession[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [lessonNotes, setLessonNotes] = useState<any[]>([]);
  const [classMasterAssignment, setClassMasterAssignment] = useState<any>(null);
  const [tasks, setTasks] = useState<TeacherTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', category: 'lesson_planning' as any });
  const navigate = useNavigate();

  useEffect(() => {
    if (!organization?.id || !userProfile?.uid) return;

    const today = new Date().toISOString().split('T')[0];
    const teacherIdToFetch = userProfile.entityId || userProfile.uid;

    // Fetch Classes taught by the teacher
    const classesQ = query(
      collection(db, 'organizations', organization.id, 'classes'),
      where('teacherId', '==', teacherIdToFetch)
    );
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    // Fetch Today's Sessions
    const sessionsQ = query(
      collection(db, 'organizations', organization.id, 'attendance_sessions'),
      where('teacherId', '==', teacherIdToFetch),
      where('date', '==', today)
    );
    const unsubSessions = onSnapshot(sessionsQ, (snap) => {
      const fetchedSessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceSession));
      fetchedSessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodaySessions(fetchedSessions);
    });

    // Fetch Assignments created by the teacher
    const assignmentsQ = query(
      collection(db, 'organizations', organization.id, 'assignments'),
      where('teacherId', '==', teacherIdToFetch)
    );
    const unsubAssignments = onSnapshot(assignmentsQ, (snap) => {
      const fetchedAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      fetchedAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAssignments(fetchedAssignments);
    });

    // Fetch Recent Submissions
    const submissionsQ = query(
      collection(db, 'organizations', organization.id, 'assignment_submissions'),
      orderBy('submittedAt', 'desc'),
      limit(5)
    );
    const unsubSubmissions = onSnapshot(submissionsQ, (snap) => {
      setRecentSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Lessons created by the teacher
    const lessonsQ = query(
      collection(db, 'organizations', organization.id, 'lessons'),
      where('teacherId', '==', teacherIdToFetch)
    );
    const unsubLessons = onSnapshot(lessonsQ, (snap) => {
      const fetchedLessons = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
      fetchedLessons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLessons(fetchedLessons);
    });

    // Fetch Lesson Notes
    const notesQ = query(
      collection(db, 'organizations', organization.id, 'lesson_notes'),
      where('teacherId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubNotes = onSnapshot(notesQ, (snap) => {
      setLessonNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Class Master Assignment
    const masterQ = query(
      collection(db, 'organizations', organization.id, 'class_master_assignments'),
      where('teacherId', '==', userProfile.uid),
      where('status', '==', 'approved'),
      limit(1)
    );
    const unsubMaster = onSnapshot(masterQ, (snap) => {
      if (!snap.empty) {
        setClassMasterAssignment({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setClassMasterAssignment(null);
      }
    });

    // Fetch Teacher Tasks
    const tasksQ = query(
      collection(db, 'organizations', organization.id, 'teacher_tasks'),
      where('teacherId', '==', userProfile.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as TeacherTask)));
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubSessions();
      unsubAssignments();
      unsubSubmissions();
      unsubLessons();
      unsubNotes();
      unsubMaster();
      unsubTasks();
    };
  }, [organization.id, userProfile.uid, userProfile.entityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingAssignments = assignments.filter(a => new Date(a.dueDate) >= new Date()).slice(0, 5);

  return (
    <div className="space-y-6 md:space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header with Quick Actions */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
            Welcome, {userProfile.displayName.split(' ')[0]}!
          </h2>
          <p className="text-[#9e9e9e] text-lg font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => navigate('/attendance')}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
          >
            <ClipboardCheck className="w-5 h-5" />
            Mark Attendance
          </button>
          <button 
            onClick={() => navigate('/lesson-notes/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-2xl font-bold hover:bg-[#f9f9f9] transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            New Lesson Note
          </button>
        </div>
      </header>

      <UpcomingEvents organizationId={organization.id} userProfile={userProfile} />

      {/* Class Master Section */}
      {classMasterAssignment && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 rounded-[32px] border border-primary/20 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center">
                <Layout className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Class Master: {classMasterAssignment.classSectionId}</h3>
                <p className="text-sm text-[#4a4a4a]">You are the assigned class master for this section.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-white text-primary rounded-xl text-xs font-bold border border-primary/20 hover:bg-primary/5 transition-all">
                Daily Attendance
              </button>
              <button className="px-4 py-2 bg-white text-primary rounded-xl text-xs font-bold border border-primary/20 hover:bg-primary/5 transition-all">
                Report Cards
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm group hover:border-blue-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest">Active</span>
          </div>
          <h3 className="text-3xl font-black mb-1">{classes.length}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Assigned Classes</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm group hover:border-orange-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-widest">Pending</span>
          </div>
          <h3 className="text-3xl font-black mb-1">{upcomingAssignments.length}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Active Assignments</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm group hover:border-green-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest">Total</span>
          </div>
          <h3 className="text-3xl font-black mb-1">{lessons.length}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Lessons Published</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm group hover:border-purple-200 transition-all">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full uppercase tracking-widest">Avg</span>
          </div>
          <h3 className="text-3xl font-black mb-1">88%</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Class Performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Lesson Notes Status */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-6 h-6 text-primary" />
                  Lesson Notes Status
                </h3>
                <p className="text-[#9e9e9e] text-sm mt-1">Track your lesson note approvals.</p>
              </div>
              <button className="text-primary font-bold text-sm hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {lessonNotes.length === 0 ? (
                <div className="text-center py-8 bg-[#f9f9f9] rounded-2xl border border-dashed border-[#e5e5e5]">
                  <p className="text-sm text-[#9e9e9e]">No lesson notes prepared yet.</p>
                </div>
              ) : (
                lessonNotes.map((note, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#f8fafc] border border-[#e5e5e5]">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        note.status === 'approved' ? 'bg-green-100 text-green-600' :
                        note.status === 'rejected' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{note.title}</h4>
                        <p className="text-xs text-[#9e9e9e]">{note.classSectionId} • {new Date(note.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      note.status === 'approved' ? 'bg-green-50 text-green-600' :
                      note.status === 'rejected' ? 'bg-red-50 text-red-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {note.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Grading Queue Widget */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <ClipboardCheck className="w-6 h-6 text-orange-600" />
                  Grading Queue
                </h3>
                <p className="text-[#9e9e9e] text-sm mt-1">Assignments waiting for your review.</p>
              </div>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold">
                {recentSubmissions.length} Pending
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentSubmissions.length === 0 ? (
                <div className="col-span-2 text-center py-8 bg-[#f9f9f9] rounded-2xl border border-dashed border-[#e5e5e5]">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-[#9e9e9e] font-medium">All caught up! No pending submissions.</p>
                </div>
              ) : (
                recentSubmissions.map((sub, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-[#f8fafc] border border-[#e5e5e5] hover:border-orange-200 transition-all group cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
                          {sub.studentId.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold text-[#1a1a1a]">Student {sub.studentId.slice(0, 5)}</span>
                      </div>
                      <span className="text-[10px] text-[#9e9e9e] font-bold">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-medium text-[#4a4a4a] mb-3 line-clamp-1">Assignment: {sub.assignmentId.slice(0, 8)}...</h4>
                    <button className="w-full py-2 bg-white border border-[#e5e5e5] rounded-xl text-[10px] font-bold uppercase tracking-widest group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all">
                      Grade Now
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Today's Schedule
                </h3>
                <p className="text-[#9e9e9e] text-sm mt-1">Your teaching sessions for today.</p>
              </div>
              <button 
                onClick={() => navigate('/timetable')}
                className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1"
              >
                Full Timetable
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {todaySessions.length === 0 ? (
                <div className="text-center py-12 bg-[#f9f9f9] rounded-[24px] border border-dashed border-[#e5e5e5]">
                  <Clock className="w-12 h-12 text-[#e5e5e5] mx-auto mb-3" />
                  <p className="text-[#9e9e9e] font-medium">No sessions scheduled for today.</p>
                </div>
              ) : (
                todaySessions.map((session) => (
                  <div 
                    key={session.id} 
                    className={`flex items-center justify-between p-5 rounded-[24px] border transition-all hover:shadow-md ${
                      session.status === 'in_progress' 
                        ? 'bg-blue-50 border-blue-100 ring-1 ring-blue-200' 
                        : 'bg-white border-[#e5e5e5]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold ${
                        session.status === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-[#f5f5f5] text-[#4a4a4a]'
                      }`}>
                        <span className="text-xs uppercase opacity-80">{session.startTime.split(':')[0] >= '12' ? 'PM' : 'AM'}</span>
                        <span className="text-lg leading-none">{session.startTime}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1a1a1a] text-lg">{session.subject}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-[#9e9e9e] flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Class {session.classSectionId}
                          </span>
                          <span className="text-[#e5e5e5]">•</span>
                          <span className="text-sm text-[#9e9e9e] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {session.startTime} - {session.endTime}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.status === 'in_progress' && (
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-ping" />
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        session.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        session.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Modules */}
        <div className="space-y-6 md:space-y-8">
          {/* Notifications / Alerts */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                My Tasks
              </h3>
              <button 
                onClick={() => setIsAddingTask(true)}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {isAddingTask && (
              <div className="mb-6 p-4 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] animate-in slide-in-from-top-2">
                <input 
                  type="text"
                  placeholder="What needs to be done?"
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-[#9e9e9e]"
                  autoFocus
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && newTask.title) {
                      await addDoc(collection(db, 'organizations', organization.id, 'teacher_tasks'), {
                        ...newTask,
                        teacherId: userProfile.uid,
                        organizationId: organization.id,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                      });
                      setNewTask({ title: '', category: 'lesson_planning' });
                      setIsAddingTask(false);
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-3">
                  <select 
                    className="text-[10px] font-bold uppercase tracking-widest bg-white border border-[#e5e5e5] rounded-lg px-2 py-1"
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value as any })}
                  >
                    <option value="lesson_planning">Lesson Planning</option>
                    <option value="grading">Grading</option>
                    <option value="administrative">Administrative</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setIsAddingTask(false)} className="text-[10px] font-bold uppercase text-[#9e9e9e]">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-xs text-[#9e9e9e] text-center py-4">No tasks yet. Add one to stay organized!</p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(db, 'organizations', organization.id, 'teacher_tasks', task.id), {
                            status: task.status === 'completed' ? 'pending' : 'completed'
                          });
                        }}
                        className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${
                          task.status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'border-[#e5e5e5] hover:border-blue-500'
                        }`}
                      >
                        {task.status === 'completed' && <Check className="w-3 h-3" />}
                      </button>
                      <span className={`text-sm font-medium ${task.status === 'completed' ? 'text-[#9e9e9e] line-through' : 'text-[#4a4a4a]'}`}>
                        {task.title}
                      </span>
                    </div>
                    <button 
                      onClick={async () => {
                        await deleteDoc(doc(db, 'organizations', organization.id, 'teacher_tasks', task.id));
                      }}
                      className="p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notifications / Alerts */}
          <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Alerts & Tasks
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 rounded-2xl bg-orange-50 border border-orange-100">
                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-900">3 Ungraded Assignments</p>
                  <p className="text-xs text-orange-700 mt-0.5">Calculus Quiz due yesterday needs grading.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <MessageSquare className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-blue-900">2 Parent Messages</p>
                  <p className="text-xs text-blue-700 mt-0.5">New messages regarding student performance.</p>
                </div>
              </div>
              <div className="flex gap-4 p-4 rounded-2xl bg-green-50 border border-green-100">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-900">Exam Questions Due</p>
                  <p className="text-xs text-green-700 mt-0.5">Submit questions for Term 2 Finals.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
