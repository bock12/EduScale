import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, Class, Assignment, Lesson, Attendance } from '../../types';
import { BookOpen, Calendar, CheckCircle, Clock, FileText, GraduationCap, TrendingUp, Bell, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { UpcomingEvents } from '../announcements/UpcomingEvents';

interface StudentDashboardProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentDashboard({ organization, userProfile }: StudentDashboardProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [classSections, setClassSections] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !userProfile?.uid) return;

    // In a real app, we'd first query 'class_students' to find the student's enrolled sections,
    // then fetch the corresponding classes. For this demo, we'll fetch all classes and assignments
    // and assume the student is enrolled in a subset (or just show all for demo purposes).
    
    // Fetch Classes
    const classesQ = query(collection(db, 'organizations', organization.id, 'classes'));
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    // Fetch Class Sections
    const classSectionsQ = query(collection(db, 'organizations', organization.id, 'class_sections'));
    const unsubClassSections = onSnapshot(classSectionsQ, (snap) => {
      setClassSections(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });

    // Fetch Assignments
    const assignmentsQ = query(collection(db, 'organizations', organization.id, 'assignments'));
    const unsubAssignments = onSnapshot(assignmentsQ, (snap) => {
      const fetchedAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
      // Sort by due date
      fetchedAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAssignments(fetchedAssignments);
    });

    // Fetch Lessons
    const lessonsQ = query(collection(db, 'organizations', organization.id, 'lessons'));
    const unsubLessons = onSnapshot(lessonsQ, (snap) => {
      const fetchedLessons = snap.docs.map(d => ({ id: d.id, ...d.data() } as Lesson));
      fetchedLessons.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLessons(fetchedLessons);
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubClassSections();
      unsubAssignments();
      unsubLessons();
    };
  }, [organization.id, userProfile.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingAssignments = assignments.filter(a => new Date(a.dueDate) >= new Date()).slice(0, 5);
  const recentLessons = lessons.slice(0, 5);

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Welcome back, {userProfile.displayName}!</h2>
        <p className="text-[#9e9e9e] text-sm md:text-base">Here's what's happening in your classes today.</p>
      </header>

      <UpcomingEvents organizationId={organization.id} userProfile={userProfile} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{classes.length || 6}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Enrolled Classes</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">{upcomingAssignments.length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Pending Assignments</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">A-</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Current Average</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black mb-1">96%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Attendance Rate</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Left Column: Upcoming Assignments & Recent Lessons */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Grade Progress Chart (Mock) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Academic Progress
                </h3>
                <p className="text-xs text-[#9e9e9e] mt-1">Your performance across all subjects this term.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  +2.4% <TrendingUp className="w-3 h-3" />
                </span>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {[
                { label: 'Math', value: 85, color: 'bg-blue-500' },
                { label: 'Sci', value: 92, color: 'bg-green-500' },
                { label: 'Eng', value: 78, color: 'bg-purple-500' },
                { label: 'Hist', value: 88, color: 'bg-orange-500' },
                { label: 'Art', value: 95, color: 'bg-pink-500' },
                { label: 'PE', value: 100, color: 'bg-yellow-500' },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div className="w-full relative flex items-end justify-center h-full">
                    <div 
                      className={`w-full max-w-[40px] rounded-t-xl ${item.color} transition-all duration-500 group-hover:opacity-80`}
                      style={{ height: `${item.value}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {item.value}%
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Assignments */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Upcoming Assignments
              </h3>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">View All</button>
            </div>
            
            <div className="space-y-4">
              {upcomingAssignments.length === 0 ? (
                <p className="text-[#9e9e9e] text-sm italic text-center py-4">No upcoming assignments. You're all caught up!</p>
              ) : (
                upcomingAssignments.map((assignment) => {
                  const assignmentClass = classSections.find(c => c.id === assignment.classSectionId);
                  const dueDate = new Date(assignment.dueDate);
                  const isOverdue = dueDate < new Date();
                  
                  return (
                    <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0] gap-4 sm:gap-0 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-[#1a1a1a]">{assignment.title}</h4>
                          <p className="text-xs text-[#9e9e9e] mt-1">{assignmentClass?.name || 'General Class'}</p>
                        </div>
                      </div>
                      <div className="flex sm:block items-center justify-between sm:text-right">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                        <p className={`text-xs font-medium sm:mt-2 ${isOverdue ? 'text-red-600' : 'text-[#4a4a4a]'}`}>
                          Due: {dueDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Lessons */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Recent Lessons
              </h3>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Go to LMS</button>
            </div>
            
            <div className="space-y-4">
              {recentLessons.length === 0 ? (
                <p className="text-[#9e9e9e] text-sm italic text-center py-4">No recent lessons posted.</p>
              ) : (
                recentLessons.map((lesson) => {
                  const lessonClass = classes.find(c => c.id === lesson.classId);
                  return (
                    <div key={lesson.id} className="flex items-start gap-4 p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0] hover:bg-white hover:shadow-md transition-all cursor-pointer">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shrink-0">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-[#1a1a1a] truncate">{lesson.title}</h4>
                        <p className="text-xs text-[#9e9e9e] mt-1 truncate">{lessonClass?.name || 'General Class'}</p>
                        <p className="text-xs text-[#4a4a4a] mt-2 line-clamp-2">{lesson.description}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Schedule & Announcements */}
        <div className="space-y-6 md:space-y-8">
          
          {/* Today's Schedule */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Today's Schedule
            </h3>
            
            <div className="relative border-l-2 border-[#f0f0f0] ml-3 space-y-6">
              {/* Mock Schedule Items */}
              {[
                { time: '08:00 AM', subject: 'Mathematics', room: 'Room 101', type: 'lecture' },
                { time: '09:30 AM', subject: 'Physics Lab', room: 'Lab 3', type: 'lab' },
                { time: '11:00 AM', subject: 'World History', room: 'Room 204', type: 'lecture' },
                { time: '01:00 PM', subject: 'Physical Education', room: 'Gymnasium', type: 'activity' },
              ].map((slot, i) => (
                <div key={i} className="relative pl-6">
                  <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-white ${
                    slot.type === 'lab' ? 'bg-purple-500' : 
                    slot.type === 'activity' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <p className="text-xs font-bold text-[#9e9e9e] mb-1">{slot.time}</p>
                  <div className="bg-[#f9f9f9] p-3 rounded-xl border border-[#f0f0f0]">
                    <p className="font-bold text-sm text-[#1a1a1a]">{slot.subject}</p>
                    <p className="text-xs text-[#9e9e9e] mt-1">{slot.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5e5e5] shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Recent Feedback
            </h3>
            
            <div className="space-y-4">
              {[
                { teacher: 'Dr. Sarah Smith', subject: 'Mathematics', comment: 'Great improvement on your last quiz! Keep it up.', date: '2h ago' },
                { teacher: 'Mr. John Doe', subject: 'Physics', comment: 'Please review the lab report guidelines for the next submission.', date: 'Yesterday' },
              ].map((feedback, i) => (
                <div key={i} className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm text-[#1a1a1a]">{feedback.teacher}</h4>
                    <span className="text-[10px] text-[#9e9e9e] font-bold uppercase">{feedback.date}</span>
                  </div>
                  <p className="text-xs text-[#4a4a4a] italic leading-relaxed">"{feedback.comment}"</p>
                  <p className="text-[10px] font-bold text-blue-600 mt-2 uppercase tracking-widest">{feedback.subject}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          {/* Removed static announcements section as it's now handled by UpcomingEvents at the top */}
        </div>
      </div>
    </div>
  );
}
