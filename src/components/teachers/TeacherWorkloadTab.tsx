import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherWorkload } from '../../types';
import { Save, AlertCircle, Briefcase, Users, BookOpen } from 'lucide-react';

interface TeacherWorkloadTabProps {
  organization: Organization;
  teacher: Teacher;
}

export default function TeacherWorkloadTab({ organization, teacher }: TeacherWorkloadTabProps) {
  const [workload, setWorkload] = useState<TeacherWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    assignedClasses: [] as string[],
    assignedSubjects: [] as string[],
    totalWeeklyHours: 0,
    newClass: '',
    newSubject: ''
  });

  useEffect(() => {
    const fetchWorkload = async () => {
      try {
        setLoading(true);
        const workloadRef = collection(db, 'organizations', organization.id, 'teacher_workload');
        const q = query(workloadRef, where('teacherId', '==', teacher.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const workloadData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TeacherWorkload;
          setWorkload(workloadData);
          setFormData(prev => ({
            ...prev,
            assignedClasses: workloadData.assignedClasses || [],
            assignedSubjects: workloadData.assignedSubjects || [],
            totalWeeklyHours: workloadData.totalWeeklyHours || 0
          }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teacher_workload`);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkload();
  }, [organization.id, teacher.id]);

  const addClass = () => {
    if (!formData.newClass.trim() || formData.assignedClasses.includes(formData.newClass.trim())) return;
    setFormData(prev => ({
      ...prev,
      assignedClasses: [...prev.assignedClasses, prev.newClass.trim()],
      newClass: ''
    }));
  };

  const removeClass = (cls: string) => {
    setFormData(prev => ({
      ...prev,
      assignedClasses: prev.assignedClasses.filter(c => c !== cls)
    }));
  };

  const addSubject = () => {
    if (!formData.newSubject.trim() || formData.assignedSubjects.includes(formData.newSubject.trim())) return;
    setFormData(prev => ({
      ...prev,
      assignedSubjects: [...prev.assignedSubjects, prev.newSubject.trim()],
      newSubject: ''
    }));
  };

  const removeSubject = (subj: string) => {
    setFormData(prev => ({
      ...prev,
      assignedSubjects: prev.assignedSubjects.filter(s => s !== subj)
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
        assignedClasses: formData.assignedClasses,
        assignedSubjects: formData.assignedSubjects,
        totalWeeklyHours: formData.totalWeeklyHours,
        updatedAt: serverTimestamp()
      };

      if (workload) {
        // Update existing
        const wlRef = doc(db, 'organizations', organization.id, 'teacher_workload', workload.id);
        await updateDoc(wlRef, dataToSave);
      } else {
        // Create new
        const newWlRef = doc(collection(db, 'organizations', organization.id, 'teacher_workload'));
        await setDoc(newWlRef, {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        setWorkload({ id: newWlRef.id, ...dataToSave } as any);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/teacher_workload`);
      setError('Failed to save workload.');
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
          <p className="text-sm font-medium">Workload saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Total Weekly Hours */}
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Total Weekly Teaching Hours
            </h3>
            <p className="text-sm text-blue-700 mt-1">Estimated total hours based on assignments.</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="100"
              value={formData.totalWeeklyHours || ''}
              onChange={e => setFormData(prev => ({ ...prev, totalWeeklyHours: parseInt(e.target.value) || 0 }))}
              className="w-24 px-4 py-3 rounded-xl border border-blue-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-xl font-bold text-center text-blue-900 bg-white"
            />
            <span className="font-bold text-blue-900">hrs</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Assigned Classes */}
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Assigned Classes
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={formData.newClass}
                onChange={e => setFormData(prev => ({ ...prev, newClass: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addClass())}
                placeholder="e.g. Grade 10A"
                className="flex-1 px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
              <button
                type="button"
                onClick={addClass}
                disabled={!formData.newClass.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] p-4 min-h-[150px]">
              {formData.assignedClasses.length === 0 ? (
                <p className="text-sm text-[#9e9e9e] italic text-center mt-10">No classes assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.assignedClasses.map(cls => (
                    <div key={cls} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#e5e5e5] shadow-sm">
                      <span className="font-bold text-sm text-[#4a4a4a]">{cls}</span>
                      <button
                        type="button"
                        onClick={() => removeClass(cls)}
                        className="text-[#9e9e9e] hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Subjects */}
          <div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Assigned Subjects
            </h3>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={formData.newSubject}
                onChange={e => setFormData(prev => ({ ...prev, newSubject: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubject())}
                placeholder="e.g. Advanced Mathematics"
                className="flex-1 px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
              <button
                type="button"
                onClick={addSubject}
                disabled={!formData.newSubject.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Add
              </button>
            </div>

            <div className="bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] p-4 min-h-[150px]">
              {formData.assignedSubjects.length === 0 ? (
                <p className="text-sm text-[#9e9e9e] italic text-center mt-10">No subjects assigned.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.assignedSubjects.map(subj => (
                    <div key={subj} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#e5e5e5] shadow-sm">
                      <span className="font-bold text-sm text-[#4a4a4a]">{subj}</span>
                      <button
                        type="button"
                        onClick={() => removeSubject(subj)}
                        className="text-[#9e9e9e] hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            Save Workload
          </button>
        </div>
      </form>
    </div>
  );
}
