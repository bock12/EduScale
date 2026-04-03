import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Star, 
  Loader2, 
  Megaphone,
  Image as ImageIcon,
  ArrowRight,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, increment, getDocs, arrayUnion } from 'firebase/firestore';
import { Announcement } from '../../types/announcements';
import { UserProfile, ClassStudent, ClassTeacher } from '../../types';

interface UpcomingEventsProps {
  organizationId: string;
  userProfile: UserProfile;
}

export const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ organizationId, userProfile }) => {
  const [notices, setNotices] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [userAssignments, setUserAssignments] = useState<{
    sectionIds: string[];
    subjectIds: string[];
  }>({ sectionIds: [], subjectIds: [] });

  useEffect(() => {
    const fetchUserAssignments = async () => {
      if (userProfile.role === 'student' && userProfile.entityId) {
        const q = query(
          collection(db, 'organizations', organizationId, 'class_students'),
          where('studentId', '==', userProfile.entityId)
        );
        const snap = await getDocs(q);
        const sectionIds = snap.docs.map(d => (d.data() as ClassStudent).sectionId);
        setUserAssignments({ sectionIds, subjectIds: [] });
      } else if (userProfile.role === 'teacher' && userProfile.entityId) {
        const q = query(
          collection(db, 'organizations', organizationId, 'class_teachers'),
          where('teacherId', '==', userProfile.entityId)
        );
        const snap = await getDocs(q);
        const sectionIds = snap.docs.map(d => (d.data() as ClassTeacher).sectionId);
        setUserAssignments({ sectionIds, subjectIds: [] });
      }
    };

    fetchUserAssignments();
  }, [organizationId, userProfile]);

  useEffect(() => {
    // Fetch notices and events
    const q = query(
      collection(db, 'organizations', organizationId, 'announcements'),
      where('isPublished', '==', true),
      orderBy('isFeatured', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      
      // Filter by audience
      const filtered = data.filter(a => {
        if (userProfile.role === 'super_admin' || userProfile.role === 'school_admin') return true;
        if (a.audience === 'ALL') return true;
        
        if (userProfile.role === 'student') {
          if (a.audience === 'STUDENTS') return true;
          if (a.audience === 'CLASS' && a.targetId && userAssignments.sectionIds.includes(a.targetId)) return true;
          if (a.audience === 'SUBJECT') return true;
        }
        
        if (userProfile.role === 'teacher' || userProfile.role === 'exam_officer') {
          if (a.audience === 'STAFF') return true;
          if (a.createdBy === userProfile.uid) return true;
          if (a.audience === 'CLASS' && a.targetId && userAssignments.sectionIds.includes(a.targetId)) return true;
        }

        if (userProfile.role === 'parent') {
          if (a.audience === 'PARENTS') return true;
        }

        return false;
      });

      setNotices(filtered);
      
      // Extract event dates for calendar
      const dates = new Set<string>();
      filtered.forEach(a => {
        if (a.displayType === 'EVENT' && a.eventDate) {
          dates.add(new Date(a.eventDate).toDateString());
        }
      });
      setEventDates(dates);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notices:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organizationId, userProfile.role]);

  const handleNoticeClick = async (notice: Announcement) => {
    try {
      if (!auth.currentUser) return;
      
      // Track view if not already viewed
      if (!notice.viewedBy?.includes(auth.currentUser.uid)) {
        const noticeRef = doc(db, 'organizations', organizationId, 'announcements', notice.id);
        await updateDoc(noticeRef, {
          viewedBy: arrayUnion(auth.currentUser.uid),
          viewCount: increment(1)
        });
      }
    } catch (err) {
      console.error("Failed to track view:", err);
    }
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const hasEvent = eventDates.has(date.toDateString());
      
      days.push(
        <button
          key={d}
          onClick={() => setSelectedDate(date)}
          className={`h-8 w-8 rounded-full text-[10px] font-bold flex flex-col items-center justify-center relative transition-all
            ${isSelected ? 'bg-primary text-white' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 text-[#1a1a1a]'}
          `}
        >
          {d}
          {hasEvent && (
            <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
          )}
        </button>
      );
    }
    
    return days;
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* Notice Board */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Notice Board
          </h3>
          <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {notices.map((notice) => (
                <motion.div
                  key={notice.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -2 }}
                  onClick={() => handleNoticeClick(notice)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden
                    ${notice.isFeatured ? 'bg-amber-50/30 border-amber-100' : 'bg-[#f9f9f9] border-[#f0f0f0] hover:border-primary/20'}
                  `}
                >
                  {notice.isFeatured && (
                    <div className="absolute top-0 right-0 p-2">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    </div>
                  )}

                  <div className="flex gap-4">
                    {notice.imageUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#f0f0f0]">
                        <img
                          src={notice.imageUrl}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[#f0f0f0] text-primary`}>
                        <ImageIcon className="w-6 h-6 opacity-20" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider
                          ${notice.category === 'URGENT' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}
                        `}>
                          {notice.category}
                        </span>
                        <span className="text-[10px] text-[#9e9e9e] font-medium">
                          {new Date(notice.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#1a1a1a] truncate mb-1">{notice.title}</h4>
                      <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed">
                        {notice.message}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {notice.targetName && (
                          <span className="flex items-center gap-1 text-[9px] text-blue-600 font-bold uppercase tracking-widest">
                            <Users className="w-2.5 h-2.5" />
                            {notice.targetName}
                          </span>
                        )}
                        {notice.dueDate && (
                          <span className="flex items-center gap-1 text-[9px] text-red-600 font-bold uppercase tracking-widest">
                            <Clock className="w-2.5 h-2.5" />
                            Due: {new Date(notice.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {auth.currentUser && notice.viewedBy?.includes(auth.currentUser.uid) && (
                          <span className="flex items-center gap-1 text-[9px] text-green-600 font-bold uppercase tracking-widest">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Viewed
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[9px] text-[#9e9e9e] font-bold uppercase tracking-widest">
                          <Eye className="w-2.5 h-2.5" />
                          {notice.viewCount}
                        </span>
                        {notice.eventDate && (
                          <span className="flex items-center gap-1 text-[9px] text-purple-600 font-bold uppercase tracking-widest">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            {new Date(notice.eventDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {notices.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-[#1a1a1a]">No active notices</p>
                <p className="text-xs text-[#9e9e9e]">Check back later for school updates.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Calendar */}
      <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-orange-500" />
            Events
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-all">
              <ChevronLeft className="w-4 h-4 text-[#9e9e9e]" />
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-all">
              <ChevronRight className="w-4 h-4 text-[#9e9e9e]" />
            </button>
          </div>
        </div>

        <div className="mb-4 text-center">
          <span className="text-xs font-bold text-[#1a1a1a] uppercase tracking-widest">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`${day}-${i}`} className="text-[10px] font-bold text-[#9e9e9e] text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-6">
          {renderCalendar()}
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <h4 className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">
            {selectedDate.toDateString() === new Date().toDateString() ? "Today's Events" : `Events for ${selectedDate.toLocaleDateString()}`}
          </h4>
          
          {notices
            .filter(n => n.displayType === 'EVENT' && n.eventDate && new Date(n.eventDate).toDateString() === selectedDate.toDateString())
            .map(event => (
              <div key={event.id} className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                <h5 className="text-xs font-bold text-[#1a1a1a] mb-1">{event.title}</h5>
                <p className="text-[10px] text-orange-600 font-medium">
                  {new Date(event.eventDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))
          }
          
          {notices.filter(n => n.displayType === 'EVENT' && n.eventDate && new Date(n.eventDate).toDateString() === selectedDate.toDateString()).length === 0 && (
            <p className="text-[10px] text-[#9e9e9e] italic text-center py-4">No events scheduled</p>
          )}
        </div>
      </div>
    </div>
  );
};
