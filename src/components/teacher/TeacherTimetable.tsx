import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Organization, UserProfile } from '../../types';
import { Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react';

interface TeacherTimetableProps {
  organization: Organization;
  userProfile: UserProfile;
}

interface TimetablePeriod {
  id: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: number;
  subjectName?: string;
  teacherName?: string;
  roomName?: string;
  className?: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TeacherTimetable({ organization, userProfile }: TeacherTimetableProps) {
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay() >= 1 && new Date().getDay() <= 5 ? new Date().getDay() : 1);
  const [isClassMaster, setIsClassMaster] = useState(false);
  const [masterClassId, setMasterClassId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimetable = async () => {
      if (!organization?.id || !userProfile?.uid) return;
      
      const teacherIdToFetch = userProfile.entityId || userProfile.uid;

      // Check if the teacher is a class master
      const classTeachersQ = query(
        collection(db, 'organizations', organization.id, 'class_teachers'),
        where('teacherId', '==', teacherIdToFetch),
        where('role', '==', 'primary')
      );
      
      let isMaster = false;
      try {
        const classTeachersSnap = await getDocs(classTeachersQ);
        if (!classTeachersSnap.empty) {
          isMaster = true;
          setIsClassMaster(true);
          setMasterClassId(classTeachersSnap.docs[0].data().sectionId || classTeachersSnap.docs[0].data().classId);
        }
      } catch (err) {
        console.error("Error checking class master status", err);
      }

      // Mock data for demonstration since full timetable generation is complex
      // In a real app, we would fetch from the 'timetable_entries' collection
      // filtering by teacherId if subject teacher, or by classId if class master
      
      const mockPeriods: TimetablePeriod[] = [
        { id: '1', startTime: '08:00', endTime: '08:50', subjectId: 'math', teacherId: teacherIdToFetch, roomId: '101', dayOfWeek: 1, subjectName: 'Mathematics', className: 'Grade 10A' },
        { id: '2', startTime: '09:00', endTime: '09:50', subjectId: 'sci', teacherId: teacherIdToFetch, roomId: '102', dayOfWeek: 1, subjectName: 'Science', className: 'Grade 10B' },
        { id: '3', startTime: '10:00', endTime: '10:50', subjectId: 'eng', teacherId: 'other', roomId: '103', dayOfWeek: 1, subjectName: 'English', className: 'Grade 10A' },
      ];
      
      // Filter mock periods based on role
      let filteredPeriods = mockPeriods;
      if (isMaster) {
        // Show all periods for their class
        // filteredPeriods = mockPeriods.filter(p => p.classId === masterClassId);
      } else {
        // Show only periods they teach
        filteredPeriods = mockPeriods.filter(p => p.teacherId === teacherIdToFetch);
      }

      setPeriods(filteredPeriods);
      setLoading(false);
    };

    fetchTimetable();
  }, [organization.id, userProfile.uid, userProfile.entityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const activePeriods = periods
    .filter(p => p.dayOfWeek === activeDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-2">My Timetable</h2>
        <p className="text-[#9e9e9e]">
          {isClassMaster ? "View the full timetable for your assigned class." : "View your teaching schedule."}
        </p>
      </header>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {DAYS.map((day, index) => {
          const dayNum = index + 1;
          const isActive = activeDay === dayNum;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(dayNum)}
              className={`
                px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'bg-white text-[#4a4a4a] border border-[#e5e5e5] hover:bg-[#f5f5f5]'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Timetable View */}
      <div className="bg-white rounded-3xl border border-[#e5e5e5] overflow-hidden">
        {activePeriods.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">No Classes Scheduled</h3>
            <p className="text-[#9e9e9e]">You don't have any classes scheduled for this day.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e5e5]">
            {activePeriods.map((period) => (
              <div key={period.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:bg-[#f8f9fa] transition-colors">
                <div className="flex items-center gap-3 sm:w-48 shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-[#1a1a1a]">{period.startTime}</div>
                    <div className="text-sm text-[#9e9e9e]">{period.endTime}</div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-[#1a1a1a] mb-1">{period.subjectName}</h4>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#4a4a4a]">
                    {period.className && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-[#9e9e9e]" />
                        <span>{period.className}</span>
                      </div>
                    )}
                    {period.roomName && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-[#9e9e9e]" />
                        <span>{period.roomName}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
