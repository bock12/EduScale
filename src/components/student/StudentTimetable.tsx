import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile } from '../../types';
import { Calendar as CalendarIcon, Clock, MapPin, User } from 'lucide-react';

interface StudentTimetableProps {
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
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function StudentTimetable({ organization, userProfile }: StudentTimetableProps) {
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay() >= 1 && new Date().getDay() <= 5 ? new Date().getDay() : 1);

  useEffect(() => {
    // In a real app, we would fetch the active timetable for the student's class
    // For now, we'll fetch periods that might be associated with the student's class
    // This is a simplified mock implementation since the full timetable data structure is complex
    
    // Mock data for demonstration
    const mockPeriods: TimetablePeriod[] = [
      { id: '1', startTime: '08:00', endTime: '08:50', subjectId: 'math', teacherId: 't1', roomId: '101', dayOfWeek: 1, subjectName: 'Mathematics', teacherName: 'Mr. Smith', roomName: 'Room 101' },
      { id: '2', startTime: '09:00', endTime: '09:50', subjectId: 'sci', teacherId: 't2', roomId: '102', dayOfWeek: 1, subjectName: 'Science', teacherName: 'Mrs. Johnson', roomName: 'Lab 1' },
      { id: '3', startTime: '10:00', endTime: '10:50', subjectId: 'eng', teacherId: 't3', roomId: '103', dayOfWeek: 1, subjectName: 'English', teacherName: 'Ms. Davis', roomName: 'Room 103' },
      { id: '4', startTime: '11:00', endTime: '11:50', subjectId: 'hist', teacherId: 't4', roomId: '104', dayOfWeek: 1, subjectName: 'History', teacherName: 'Mr. Wilson', roomName: 'Room 104' },
      
      { id: '5', startTime: '08:00', endTime: '08:50', subjectId: 'sci', teacherId: 't2', roomId: '102', dayOfWeek: 2, subjectName: 'Science', teacherName: 'Mrs. Johnson', roomName: 'Lab 1' },
      { id: '6', startTime: '09:00', endTime: '09:50', subjectId: 'math', teacherId: 't1', roomId: '101', dayOfWeek: 2, subjectName: 'Mathematics', teacherName: 'Mr. Smith', roomName: 'Room 101' },
      { id: '7', startTime: '10:00', endTime: '10:50', subjectId: 'art', teacherId: 't5', roomId: '105', dayOfWeek: 2, subjectName: 'Art', teacherName: 'Ms. Taylor', roomName: 'Art Studio' },
      { id: '8', startTime: '11:00', endTime: '11:50', subjectId: 'pe', teacherId: 't6', roomId: 'gym', dayOfWeek: 2, subjectName: 'Physical Education', teacherName: 'Coach Brown', roomName: 'Gymnasium' },
    ];
    
    setPeriods(mockPeriods);
    setLoading(false);
  }, [organization.id, userProfile.uid]);

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
        <p className="text-[#9e9e9e]">View your weekly class schedule.</p>
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
            <h3 className="text-xl font-bold mb-2">No Classes Scheduled</h3>
            <p className="text-[#9e9e9e]">You don't have any classes scheduled for {DAYS[activeDay - 1]}.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e5e5]">
            {activePeriods.map((period) => (
              <div key={period.id} className="p-6 hover:bg-[#f8fafc] transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="sm:w-32 shrink-0">
                  <div className="flex items-center gap-2 text-blue-600 font-bold">
                    <Clock className="w-4 h-4" />
                    <span>{period.startTime}</span>
                  </div>
                  <div className="text-sm text-[#9e9e9e] mt-1 ml-6">
                    to {period.endTime}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h4 className="text-lg font-bold text-[#1a1a1a] mb-2">{period.subjectName}</h4>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#4a4a4a]">
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#9e9e9e]" />
                      <span>{period.teacherName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#9e9e9e]" />
                      <span>{period.roomName}</span>
                    </div>
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
