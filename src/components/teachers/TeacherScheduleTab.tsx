import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherSchedulePreference } from '../../types';
import { Save, AlertCircle, Clock } from 'lucide-react';

interface TeacherScheduleTabProps {
  organization: Organization;
  teacher: Teacher;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function TeacherScheduleTab({ organization, teacher }: TeacherScheduleTabProps) {
  const [preference, setPreference] = useState<TeacherSchedulePreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    maxHoursPerWeek: 40,
    preferredDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    unavailableTimeSlots: [] as { day: string; startTime: string; endTime: string }[],
    newUnavailableSlot: { day: 'Monday', startTime: '08:00', endTime: '10:00' }
  });

  useEffect(() => {
    const fetchPreference = async () => {
      try {
        setLoading(true);
        const prefsRef = collection(db, 'organizations', organization.id, 'teacher_schedule_preferences');
        const q = query(prefsRef, where('teacherId', '==', teacher.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const prefData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TeacherSchedulePreference;
          setPreference(prefData);
          setFormData(prev => ({
            ...prev,
            maxHoursPerWeek: prefData.maxHoursPerWeek || 40,
            preferredDays: prefData.preferredDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            unavailableTimeSlots: prefData.unavailableTimeSlots || []
          }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teacher_schedule_preferences`);
      } finally {
        setLoading(false);
      }
    };

    fetchPreference();
  }, [organization.id, teacher.id]);

  const togglePreferredDay = (day: string) => {
    setFormData(prev => {
      const isSelected = prev.preferredDays.includes(day);
      if (isSelected) {
        return { ...prev, preferredDays: prev.preferredDays.filter(d => d !== day) };
      } else {
        return { ...prev, preferredDays: [...prev.preferredDays, day] };
      }
    });
  };

  const addUnavailableSlot = () => {
    if (!formData.newUnavailableSlot.day || !formData.newUnavailableSlot.startTime || !formData.newUnavailableSlot.endTime) return;
    
    setFormData(prev => ({
      ...prev,
      unavailableTimeSlots: [...prev.unavailableTimeSlots, prev.newUnavailableSlot],
      newUnavailableSlot: { day: 'Monday', startTime: '08:00', endTime: '10:00' }
    }));
  };

  const removeUnavailableSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      unavailableTimeSlots: prev.unavailableTimeSlots.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const dataToSave = {
        teacherId: teacher.id,
        organizationId: organization.id,
        maxHoursPerWeek: formData.maxHoursPerWeek,
        preferredDays: formData.preferredDays,
        unavailableTimeSlots: formData.unavailableTimeSlots,
        updatedAt: serverTimestamp()
      };

      if (preference) {
        // Update existing
        const prefRef = doc(db, 'organizations', organization.id, 'teacher_schedule_preferences', preference.id);
        await updateDoc(prefRef, dataToSave);
      } else {
        // Create new
        const newPrefRef = doc(collection(db, 'organizations', organization.id, 'teacher_schedule_preferences'));
        await setDoc(newPrefRef, {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        setPreference({ id: newPrefRef.id, ...dataToSave } as any);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/teacher_schedule_preferences`);
      setError('Failed to save schedule preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl flex items-start gap-3 border border-green-100">
          <div className="w-5 h-5 shrink-0 mt-0.5 bg-green-600 rounded-full flex items-center justify-center text-white">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium">Schedule preferences saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Max Hours */}
        <div>
          <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Maximum Hours Per Week</label>
          <input
            type="number"
            min="1"
            max="60"
            value={isNaN(formData.maxHoursPerWeek) ? '' : formData.maxHoursPerWeek}
            onChange={e => setFormData(prev => ({ ...prev, maxHoursPerWeek: parseInt(e.target.value) || 0 }))}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Preferred Days */}
        <div>
          <label className="block text-sm font-bold text-[#4a4a4a] mb-3">Preferred Working Days</label>
          <div className="flex flex-wrap gap-3">
            {DAYS_OF_WEEK.map(day => {
              const isSelected = formData.preferredDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => togglePreferredDay(day)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors border ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-[#e5e5e5] text-[#9e9e9e] hover:border-blue-200 hover:text-blue-600'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unavailable Time Slots */}
        <div className="pt-6 border-t border-[#e5e5e5]">
          <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Unavailable Time Slots
          </h3>
          
          <div className="bg-[#f9f9f9] p-4 rounded-2xl border border-[#e5e5e5] mb-4 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Day</label>
              <select
                value={formData.newUnavailableSlot.day}
                onChange={e => setFormData(prev => ({ ...prev, newUnavailableSlot: { ...prev.newUnavailableSlot, day: e.target.value } }))}
                className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              >
                {DAYS_OF_WEEK.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">Start Time</label>
              <input
                type="time"
                value={formData.newUnavailableSlot.startTime}
                onChange={e => setFormData(prev => ({ ...prev, newUnavailableSlot: { ...prev.newUnavailableSlot, startTime: e.target.value } }))}
                className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-1">End Time</label>
              <input
                type="time"
                value={formData.newUnavailableSlot.endTime}
                onChange={e => setFormData(prev => ({ ...prev, newUnavailableSlot: { ...prev.newUnavailableSlot, endTime: e.target.value } }))}
                className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              />
            </div>
            <button
              type="button"
              onClick={addUnavailableSlot}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Add Slot
            </button>
          </div>

          {formData.unavailableTimeSlots.length > 0 ? (
            <div className="space-y-2">
              {formData.unavailableTimeSlots.map((slot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white border border-[#e5e5e5] rounded-xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[#1a1a1a] w-24">{slot.day}</span>
                    <span className="text-[#4a4a4a] bg-[#f5f5f5] px-3 py-1 rounded-lg font-mono text-sm">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUnavailableSlot(index)}
                    className="text-[#9e9e9e] hover:text-red-600 transition-colors p-1"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#9e9e9e] italic">No unavailable time slots added.</p>
          )}
        </div>

        <div className="pt-6 flex justify-end border-t border-[#e5e5e5]">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
