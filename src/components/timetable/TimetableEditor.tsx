import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Timetable, TimetableTemplate, TimetableSlot, TimetableEntry, ClassSection, Teacher, Classroom, TimetableConflict, Subject } from '../../types';
import { ChevronLeft, Sparkles, Save, Download, AlertCircle, CheckCircle2, Clock, MapPin, User, BookOpen, Info, X, Lightbulb, Plus, Trash2, Coffee, Users, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface TimetableEditorProps {
  organization: Organization;
  timetable: Timetable;
  onBack: () => void;
}

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Science': 'bg-green-500/10 text-green-600 border-green-500/20',
  'English': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  'History': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  'Geography': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  'Physics': 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  'Chemistry': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  'Biology': 'bg-lime-500/10 text-lime-600 border-lime-500/20',
  'Art': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  'Music': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  'PE': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  'Computer Science': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const getSubjectColor = (subject: string) => {
  return SUBJECT_COLORS[subject] || 'bg-black/5 text-black/60 border-black/10';
};

export default function TimetableEditor({ organization, timetable, onBack }: TimetableEditorProps) {
  const [template, setTemplate] = useState<TimetableTemplate | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState('');
  const [showConflicts, setShowConflicts] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState<string | null>(null);

  const [manualFormData, setManualFormData] = useState({
    slotId: '',
    classSectionId: '',
    teacherId: '',
    subject: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch template
        const templateSnap = await getDocs(query(
          collection(db, 'organizations', organization.id, 'timetable_templates'),
          where('organizationId', '==', organization.id)
        ));
        const t = templateSnap.docs.find(d => d.id === timetable.templateId);
        if (t) setTemplate({ id: t.id, ...t.data() } as TimetableTemplate);

        // Fetch slots
        const unsubscribeSlots = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'timetable_slots'),
          where('templateId', '==', timetable.templateId)
        ), (snapshot) => {
          setSlots(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableSlot)));
        });

        // Fetch entries
        const unsubscribeEntries = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'timetable_entries'),
          where('timetableId', '==', timetable.id)
        ), (snapshot) => {
          setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableEntry)));
        });

        // Fetch support data
        const classesSnap = await getDocs(collection(db, 'organizations', organization.id, 'class_sections'));
        setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassSection)));

        const teachersSnap = await getDocs(collection(db, 'organizations', organization.id, 'teachers'));
        setTeachers(teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));

        const roomsSnap = await getDocs(collection(db, 'organizations', organization.id, 'classrooms'));
        setClassrooms(roomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom)));

        const subjectsSnap = await getDocs(collection(db, 'organizations', organization.id, 'subjects'));
        setSubjects(subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject)));

        setLoading(false);
        return () => {
          unsubscribeSlots();
          unsubscribeEntries();
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'timetable_editor_data');
      }
    };

    fetchData();
  }, [organization.id, timetable.id, timetable.templateId]);

  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'timetable_slots', editingSlot.id), {
        startTime: editingSlot.startTime,
        endTime: editingSlot.endTime,
        label: editingSlot.label
      });
      setEditingSlot(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'timetable_slots');
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedClass = classes.find(c => c.id === manualFormData.classSectionId);
      
      await addDoc(collection(db, 'organizations', organization.id, 'timetable_entries'), {
        ...manualFormData,
        classroomId: selectedClass?.classroomId || '',
        timetableId: timetable.id,
        organizationId: organization.id
      });
      setIsAddingManual(false);
      setManualFormData({
        slotId: '',
        classSectionId: '',
        teacherId: '',
        subject: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'timetable_entries');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'timetable_entries', id));
      setIsDeletingEntry(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'timetable_entries');
    }
  };

  const filteredEntries = useMemo(() => {
    if (selectedClassId === 'all') return entries;
    return entries.filter(e => e.classSectionId === selectedClassId);
  }, [entries, selectedClassId]);

  const conflicts = useMemo(() => {
    const foundConflicts: TimetableConflict[] = [];
    
    // Group entries by slot
    const entriesBySlot: Record<string, TimetableEntry[]> = {};
    entries.forEach(entry => {
      if (!entriesBySlot[entry.slotId]) entriesBySlot[entry.slotId] = [];
      entriesBySlot[entry.slotId].push(entry);
    });

    Object.entries(entriesBySlot).forEach(([slotId, slotEntries]) => {
      // Teacher clashes
      const teacherMap: Record<string, TimetableEntry[]> = {};
      slotEntries.forEach(e => {
        if (!teacherMap[e.teacherId]) teacherMap[e.teacherId] = [];
        teacherMap[e.teacherId].push(e);
      });

      Object.entries(teacherMap).forEach(([teacherId, teacherEntries]) => {
        if (teacherEntries.length > 1) {
          const teacher = teachers.find(t => t.id === teacherId);
          foundConflicts.push({
            id: `teacher-${slotId}-${teacherId}`,
            organizationId: organization.id,
            timetableId: timetable.id,
            type: 'teacher_clash',
            severity: 'error',
            description: `${teacher?.firstName} ${teacher?.lastName} is double-booked in this slot.`,
            affectedEntryIds: teacherEntries.map(e => e.id)
          });
        }
      });

      // Room clashes
      const roomMap: Record<string, TimetableEntry[]> = {};
      slotEntries.forEach(e => {
        if (!roomMap[e.classroomId]) roomMap[e.classroomId] = [];
        roomMap[e.classroomId].push(e);
      });

      Object.entries(roomMap).forEach(([roomId, roomEntries]) => {
        if (roomEntries.length > 1) {
          const room = classrooms.find(r => r.id === roomId);
          foundConflicts.push({
            id: `room-${slotId}-${roomId}`,
            organizationId: organization.id,
            timetableId: timetable.id,
            type: 'room_clash',
            severity: 'error',
            description: `Classroom ${room?.name} is double-booked in this slot.`,
            affectedEntryIds: roomEntries.map(e => e.id)
          });
        }
      });
    });

    return foundConflicts;
  }, [entries, teachers, classrooms, organization.id, timetable.id]);

  const handleExport = () => {
    const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].slice(0, template?.daysPerWeek || 5);
    const sortedSlots = [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Header
    let csv = 'Time,' + activeDays.join(',') + '\n';
    
    // Group slots by start time
    const timeGroups: Record<string, TimetableSlot[]> = {};
    sortedSlots.forEach(slot => {
      if (!timeGroups[slot.startTime]) timeGroups[slot.startTime] = [];
      timeGroups[slot.startTime].push(slot);
    });
    
    const sortedTimes = Object.keys(timeGroups).sort();
    
    sortedTimes.forEach(time => {
      const row = [time];
      activeDays.forEach((_, dayIndex) => {
        const slot = timeGroups[time].find(s => s.dayOfWeek === dayIndex);
        if (slot) {
          const entry = entries.find(e => e.slotId === slot.id && (selectedClassId === 'all' || e.classSectionId === selectedClassId));
          if (entry) {
            const subject = entry.subject;
            const teacherData = teachers.find(t => t.id === entry.teacherId);
            const teacher = teacherData ? `${teacherData.firstName} ${teacherData.lastName}` : 'Unknown Teacher';
            const room = classrooms.find(r => r.id === entry.classroomId)?.name || 'Unknown Room';
            const classSection = classes.find(c => c.id === entry.classSectionId)?.sectionName || 'Unknown Class';
            row.push(`"${subject} (${teacher} - ${room} - ${classSection})"`);
          } else {
            row.push(`"${slot.label || 'Empty'}"`);
          }
        } else {
          row.push('""');
        }
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `timetable_${timetable.name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateTimetable = async () => {
    setIsGenerating(true);
    setGenerationProgress('Analyzing constraints...');
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const targetClasses = selectedClassId === 'all' 
        ? classes 
        : classes.filter(c => c.id === selectedClassId);

      const prompt = `
        Generate a school timetable for the following data:
        Classes: ${JSON.stringify(targetClasses.map(c => ({ id: c.id, name: c.sectionName, subjects: c.subjects })))}
        Teachers: ${JSON.stringify(teachers.map(t => ({ id: t.id, name: t.firstName + ' ' + t.lastName, subjects: t.subjects })))}
        Classrooms: ${JSON.stringify(classrooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity })))}
        Available Slots: ${JSON.stringify(slots.map(s => ({ id: s.id, day: s.dayOfWeek, start: s.startTime, end: s.endTime })))}
        Existing Entries (to avoid): ${JSON.stringify(entries.filter(e => !targetClasses.some(tc => tc.id === e.classSectionId)).map(e => ({ slotId: e.slotId, teacherId: e.teacherId, classroomId: e.classroomId })))}
        
        Rules:
        1. No teacher can be in two places at once.
        2. No classroom can have two classes at once.
        3. Each class section must have their subjects covered.
        
        Return a list of timetable entries in JSON format.
      `;

      setGenerationProgress(`AI is calculating optimal schedule for ${selectedClassId === 'all' ? 'all classes' : targetClasses[0].sectionName}...`);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                slotId: { type: Type.STRING },
                classSectionId: { type: Type.STRING },
                teacherId: { type: Type.STRING },
                classroomId: { type: Type.STRING },
                subject: { type: Type.STRING }
              },
              required: ["slotId", "classSectionId", "teacherId", "classroomId", "subject"]
            }
          }
        }
      });

      const generatedEntries = JSON.parse(response.text);
      setGenerationProgress('Saving generated schedule...');

      // Clear existing entries for the target classes
      const targetClassIds = targetClasses.map(c => c.id);
      const entriesToDelete = entries.filter(e => targetClassIds.includes(e.classSectionId));
      
      for (const entry of entriesToDelete) {
        await deleteDoc(doc(db, 'organizations', organization.id, 'timetable_entries', entry.id));
      }

      // Add new entries
      const entriesCol = collection(db, 'organizations', organization.id, 'timetable_entries');
      for (const entry of generatedEntries) {
        await addDoc(entriesCol, {
          ...entry,
          timetableId: timetable.id,
          organizationId: organization.id
        });
      }

      setGenerationProgress('Done!');
      setTimeout(() => setIsGenerating(false), 1000);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      alert('Failed to generate timetable. Please try again.');
    }
  };

  const [suggestingFix, setSuggestingFix] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string>>({});

  const suggestConflictFix = async (conflict: TimetableConflict) => {
    setSuggestingFix(conflict.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const affectedEntries = entries.filter(e => conflict.affectedEntryIds.includes(e.id));
      const emptySlots = slots.filter(s => !entries.some(e => e.slotId === s.id));

      const prompt = `
        Resolve this timetable conflict:
        Conflict: ${conflict.description}
        Affected Entries: ${JSON.stringify(affectedEntries.map(e => ({
          subject: e.subject,
          class: classes.find(c => c.id === e.classSectionId)?.sectionName,
          teacher: teachers.find(t => t.id === e.teacherId)?.firstName + ' ' + teachers.find(t => t.id === e.teacherId)?.lastName,
          room: classrooms.find(r => r.id === e.classroomId)?.name
        })))}
        Available Empty Slots: ${JSON.stringify(emptySlots.slice(0, 10).map(s => ({
          id: s.id,
          day: days[s.dayOfWeek],
          time: `${s.startTime} - ${s.endTime}`
        })))}

        Suggest a specific move to resolve the conflict. Be concise.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      setAiSuggestions(prev => ({ ...prev, [conflict.id]: response.text }));
    } catch (err) {
      console.error(err);
    } finally {
      setSuggestingFix(null);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const activeDays = days.slice(0, template?.daysPerWeek || 5);
  
  // Group slots by day
  const slotsByDay = activeDays.map((day, index) => ({
    day,
    slots: slots.filter(s => s.dayOfWeek === index).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }));

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

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
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-black truncate">{timetable.name}</h2>
            <p className="text-black/40 font-bold uppercase tracking-widest text-[10px] sm:text-xs truncate">{timetable.academicYear} • {template?.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="flex-1 sm:flex-none bg-black/5 border border-black/10 rounded-2xl px-4 py-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
          >
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.sectionName}</option>)}
          </select>
          {conflicts.length > 0 && (
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-sm transition-all ${
                showConflicts ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              <span>{conflicts.length} Conflicts</span>
            </button>
          )}
          <button
            onClick={generateTimetable}
            disabled={isGenerating}
            className="flex-1 sm:flex-none bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
          </button>
          <button
            onClick={() => setIsAddingManual(true)}
            className="hidden sm:flex bg-black text-white px-4 sm:px-6 py-3 rounded-2xl font-black items-center justify-center gap-2 hover:bg-black/80 transition-all text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Manual Entry</span>
          </button>
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none bg-black/5 hover:bg-black/10 text-black px-4 sm:px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Day Selector for Mobile */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {activeDays.map((day, index) => (
            <button
              key={day}
              onClick={() => setSelectedDayIndex(index)}
              className={`px-6 py-3 rounded-2xl font-black whitespace-nowrap transition-all ${
                selectedDayIndex === index
                  ? 'bg-black text-white shadow-lg scale-105'
                  : 'bg-black/5 text-black/40 hover:bg-black/10'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-x-auto pb-8">
          <div className="flex gap-4 lg:gap-6 min-w-full">
            {slotsByDay.map(({ day, slots: daySlots }, index) => (
              <div 
                key={day} 
                className={`flex-1 min-w-[280px] lg:min-w-[200px] xl:min-w-[240px] space-y-4 ${
                  index === selectedDayIndex ? 'block' : 'hidden lg:block'
                }`}
              >
                <div className="bg-black/5 border border-black/10 p-4 rounded-2xl text-center">
                  <h3 className="text-lg font-black text-black">{day}</h3>
                </div>
                <div className="space-y-4">
                  {daySlots.map(slot => {
                    const slotEntries = filteredEntries.filter(e => e.slotId === slot.id);
                    const slotConflicts = conflicts.filter(c => c.id.includes(slot.id));
                    const hasError = slotConflicts.some(c => c.severity === 'error');

                    return (
                      <div 
                        key={slot.id} 
                        onClick={() => {
                          setManualFormData({
                            ...manualFormData,
                            slotId: slot.id,
                            classSectionId: selectedClassId === 'all' ? '' : selectedClassId
                          });
                          setIsAddingManual(true);
                        }}
                        className={`bg-white border p-4 rounded-[32px] space-y-3 transition-all group shadow-sm cursor-pointer ${
                          hasError ? 'border-red-500/50 bg-red-50/30' : 'border-black/10 hover:border-black/20 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between text-black/40 text-xs font-bold uppercase tracking-widest">
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSlot(slot);
                            }}
                            className="flex items-center gap-1 hover:text-black transition-colors"
                          >
                            <Clock className="w-3 h-3" />
                            <span>{slot.startTime} - {slot.endTime}</span>
                            <Edit2 className="w-2 h-2 opacity-0 group-hover:opacity-100" />
                          </div>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSlot(slot);
                            }}
                            className="hover:text-black transition-colors"
                          >
                            {slot.label}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {slotEntries.length > 0 ? (
                            slotEntries.map(entry => {
                              const cls = classes.find(c => c.id === entry.classSectionId);
                              const teacher = teachers.find(t => t.id === entry.teacherId);
                              const room = classrooms.find(r => r.id === entry.classroomId);
                              const entryConflicts = conflicts.filter(c => c.affectedEntryIds.includes(entry.id));
                              const isConflicted = entryConflicts.length > 0;
                              
                              return (
                                <div 
                                  key={entry.id} 
                                  className={`border p-4 rounded-2xl space-y-2 transition-all ${
                                    isConflicted 
                                      ? 'bg-red-500/5 border-red-500/20' 
                                      : `${getSubjectColor(entry.subject)} border-current/10`
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-black text-sm truncate">{entry.subject}</div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <div className="text-black/40 text-[10px] font-black uppercase tracking-widest truncate max-w-[60px]">{cls?.sectionName}</div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsDeletingEntry(entry.id);
                                        }}
                                        className="p-1 hover:bg-black/10 rounded-lg text-black/20 hover:text-red-500 transition-all"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex items-center gap-2 text-black/60 text-xs min-w-0">
                                      <User className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{teacher?.firstName} {teacher?.lastName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-black/60 text-xs min-w-0">
                                      <MapPin className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{room?.name}</span>
                                    </div>
                                  </div>
                                  {isConflicted && (
                                    <div className="pt-2 border-t border-red-500/10 flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest">
                                      <AlertCircle className="w-3 h-3" />
                                      <span>Double Booked</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className={`h-20 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${
                              slot.label?.toLowerCase().includes('teaching') 
                                ? 'border-black/10 text-black/10' 
                                : 'border-black/20 bg-black/5 text-black/40'
                            }`}>
                              {slot.label?.toLowerCase().includes('teaching') ? (
                                <span className="text-xs font-bold uppercase tracking-widest">Empty Slot</span>
                              ) : (
                                <>
                                  <div className="p-2 bg-white rounded-xl shadow-sm">
                                    {slot.label?.toLowerCase().includes('lunch') ? <Coffee className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-widest">{slot.label}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showConflicts && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="w-80 bg-white border-l border-black/10 p-6 space-y-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-black">Conflicts</h3>
                <button onClick={() => setShowConflicts(false)} className="p-2 hover:bg-black/5 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {conflicts.map(conflict => (
                  <div key={conflict.id} className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-red-600 font-black uppercase tracking-widest text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      <span>{conflict.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-black/80 font-medium leading-relaxed">{conflict.description}</p>
                    <div className="pt-3 border-t border-red-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs">
                          <Lightbulb className="w-3 h-3" />
                          <span>AI Suggestion</span>
                        </div>
                        {!aiSuggestions[conflict.id] && (
                          <button
                            onClick={() => suggestConflictFix(conflict)}
                            disabled={suggestingFix === conflict.id}
                            className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {suggestingFix === conflict.id ? 'Thinking...' : 'Get Suggestion'}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-black/60 mt-1 italic">
                        {aiSuggestions[conflict.id] || 'Click "Get Suggestion" to see how to resolve this conflict.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {conflicts.length === 0 && (
                <div className="text-center py-12 space-y-4">
                  <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-black/40 font-bold text-sm">No conflicts found!</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full max-w-md rounded-[40px] p-12 text-center space-y-8 shadow-2xl"
            >
              <div className="relative">
                <div className="w-24 h-24 border-8 border-blue-500/10 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <Sparkles className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-black">AI Generating Timetable</h3>
                <p className="text-black/60 font-medium">{generationProgress}</p>
              </div>
              <div className="bg-black/5 p-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-black/40">
                Optimizing for teacher availability & room capacity
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {isDeletingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black mb-2">Delete Entry?</h3>
            <p className="text-[#9e9e9e] font-medium mb-8">
              Are you sure you want to remove this entry from the timetable? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeletingEntry(null)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteEntry(isDeletingEntry)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {isAddingManual && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingManual(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Manual Entry</h2>
                <button onClick={() => setIsAddingManual(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Slot</label>
                    <select
                      required
                      value={manualFormData.slotId}
                      onChange={(e) => setManualFormData({ ...manualFormData, slotId: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Slot</option>
                      {slots
                        .filter(s => s.label?.toLowerCase().includes('teaching'))
                        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {days[s.dayOfWeek]} - {s.startTime} ({s.label})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Class Section</label>
                    <select
                      required
                      value={manualFormData.classSectionId}
                      onChange={(e) => setManualFormData({ ...manualFormData, classSectionId: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.sectionName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Teacher</label>
                    <select
                      required
                      value={manualFormData.teacherId}
                      onChange={(e) => setManualFormData({ ...manualFormData, teacherId: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Subject</label>
                    <select
                      required
                      value={manualFormData.subject}
                      onChange={(e) => setManualFormData({ ...manualFormData, subject: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.category || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddingManual(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95"
                  >
                    Add Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Slot Modal */}
      <AnimatePresence>
        {editingSlot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingSlot(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Edit Slot</h2>
                <button onClick={() => setEditingSlot(null)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateSlot} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Label</label>
                    <input
                      required
                      type="text"
                      value={editingSlot.label || ''}
                      onChange={(e) => setEditingSlot({ ...editingSlot, label: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Start Time</label>
                      <input
                        required
                        type="time"
                        value={editingSlot.startTime}
                        onChange={(e) => setEditingSlot({ ...editingSlot, startTime: e.target.value })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">End Time</label>
                      <input
                        required
                        type="time"
                        value={editingSlot.endTime}
                        onChange={(e) => setEditingSlot({ ...editingSlot, endTime: e.target.value })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
