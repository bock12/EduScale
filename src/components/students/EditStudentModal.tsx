import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Student } from '../../types';
import { X, Edit2 } from 'lucide-react';

interface EditStudentModalProps {
  organization: Organization;
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditStudentModal({ organization, student, isOpen, onClose, onSuccess }: EditStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    gradeLevel: '',
    dateOfBirth: '',
    gender: 'unspecified',
    status: 'active',
    enrollmentDate: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        studentId: student.studentId || '',
        gradeLevel: student.gradeLevel || '',
        dateOfBirth: student.dateOfBirth || '',
        gender: student.gender || 'unspecified',
        status: student.status || 'active',
        enrollmentDate: student.enrollmentDate || ''
      });
    }
  }, [student]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const studentRef = doc(db, 'organizations', organization.id, 'students', student.id);
      await updateDoc(studentRef, {
        ...formData,
        updatedAt: serverTimestamp()
      });

      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/students/${student.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Edit2 className="w-6 h-6 text-blue-600" />
            Edit Student
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="edit-student-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Student ID *</label>
                <input
                  type="text"
                  name="studentId"
                  required
                  value={formData.studentId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Grade Level *</label>
                <input
                  type="text"
                  name="gradeLevel"
                  required
                  value={formData.gradeLevel}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Date of Birth *</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="unspecified">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Status *</label>
                <select
                  name="status"
                  required
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Enrollment Date *</label>
                <input
                  type="date"
                  name="enrollmentDate"
                  required
                  value={formData.enrollmentDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-[#e5e5e5] bg-[#f9f9f9] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#e5e5e5] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-student-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
