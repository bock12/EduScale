import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherQualification } from '../../types';
import { Plus, Trash2, AlertCircle, Award, GraduationCap, Calendar } from 'lucide-react';

interface TeacherQualificationsTabProps {
  organization: Organization;
  teacher: Teacher;
}

export default function TeacherQualificationsTab({ organization, teacher }: TeacherQualificationsTabProps) {
  const [qualifications, setQualifications] = useState<TeacherQualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newQualification, setNewQualification] = useState({
    degree: '',
    institution: '',
    yearOfPassing: new Date().getFullYear(),
    subjectSpecialization: ''
  });

  const fetchQualifications = async () => {
    try {
      setLoading(true);
      const qualsRef = collection(db, 'organizations', organization.id, 'teacher_qualifications');
      const q = query(qualsRef, where('teacherId', '==', teacher.id));
      const snapshot = await getDocs(q);
      
      const qualsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeacherQualification[];
      
      setQualifications(qualsData.sort((a, b) => b.yearOfPassing - a.yearOfPassing));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teacher_qualifications`);
      setError('Failed to load qualifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualifications();
  }, [organization.id, teacher.id]);

  const handleAddQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQualification.degree || !newQualification.institution) return;

    setAdding(true);
    setError(null);

    try {
      const qualsRef = collection(db, 'organizations', organization.id, 'teacher_qualifications');
      await addDoc(qualsRef, {
        ...newQualification,
        teacherId: teacher.id,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewQualification({
        degree: '',
        institution: '',
        yearOfPassing: new Date().getFullYear(),
        subjectSpecialization: ''
      });
      fetchQualifications();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/teacher_qualifications`);
      setError('Failed to add qualification.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteQualification = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this qualification?')) return;

    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'teacher_qualifications', id));
      fetchQualifications();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `organizations/${organization.id}/teacher_qualifications/${id}`);
      setError('Failed to delete qualification.');
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
    <div className="max-w-4xl space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Add Qualification Form */}
      <div className="bg-[#f9f9f9] p-6 rounded-2xl border border-[#e5e5e5]">
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          Add Qualification
        </h3>
        <form onSubmit={handleAddQualification} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Degree / Certification *</label>
            <input
              type="text"
              required
              value={newQualification.degree}
              onChange={e => setNewQualification(prev => ({ ...prev, degree: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              placeholder="e.g. M.Sc. Physics"
            />
          </div>
          
          <div className="lg:col-span-2">
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Institution *</label>
            <input
              type="text"
              required
              value={newQualification.institution}
              onChange={e => setNewQualification(prev => ({ ...prev, institution: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              placeholder="e.g. University of Science"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Year</label>
            <input
              type="number"
              required
              min="1950"
              max={new Date().getFullYear() + 5}
              value={isNaN(newQualification.yearOfPassing) ? '' : newQualification.yearOfPassing}
              onChange={e => setNewQualification(prev => ({ ...prev, yearOfPassing: parseInt(e.target.value) || new Date().getFullYear() }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Specialization (Optional)</label>
            <input
              type="text"
              value={newQualification.subjectSpecialization}
              onChange={e => setNewQualification(prev => ({ ...prev, subjectSpecialization: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              placeholder="e.g. Quantum Mechanics"
            />
          </div>

          <button
            type="submit"
            disabled={adding || !newQualification.degree || !newQualification.institution}
            className="w-full px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add
              </>
            )}
          </button>
        </form>
      </div>

      {/* Qualifications List */}
      <div>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Educational Background</h3>
        {qualifications.length === 0 ? (
          <div className="text-center py-12 bg-[#f9f9f9] rounded-2xl border border-dashed border-[#e5e5e5]">
            <GraduationCap className="w-12 h-12 text-[#9e9e9e] mx-auto mb-3 opacity-50" />
            <p className="text-[#4a4a4a] font-medium">No qualifications added yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {qualifications.map(qual => (
              <div key={qual.id} className="bg-white p-5 rounded-2xl border border-[#e5e5e5] shadow-sm flex items-start justify-between group">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a1a1a] text-lg">{qual.degree}</h4>
                    <p className="text-[#4a4a4a] font-medium">{qual.institution}</p>
                    <div className="flex items-center gap-3 mt-2 text-sm text-[#9e9e9e]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Class of {qual.yearOfPassing}
                      </span>
                      {qual.subjectSpecialization && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#e5e5e5]" />
                          <span>{qual.subjectSpecialization}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteQualification(qual.id)}
                  className="p-2 text-[#9e9e9e] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Delete Qualification"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
