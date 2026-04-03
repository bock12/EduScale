import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization } from '../../types';
import { X, UserPlus, Camera, UserCircle, Trash2 } from 'lucide-react';

import { generateStudentId } from '../../lib/idGenerator';

interface AddStudentModalProps {
  organization: Organization;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentId: string) => void;
}

export default function AddStudentModal({ organization, isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoURL, setPhotoURL] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    studentId: '',
    gradeLevel: '',
    dateOfBirth: '',
    gender: 'unspecified',
    status: 'active',
    enrollmentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen && !formData.studentId) {
      const fetchLatestId = async () => {
        try {
          const nextId = await generateStudentId(organization.id);
          setFormData(prev => ({ ...prev, studentId: nextId }));
        } catch (err) {
          console.error("Error fetching latest student ID:", err);
          setFormData(prev => ({ ...prev, studentId: `STU-${new Date().getFullYear()}-001` }));
        }
      };
      fetchLatestId();
    }
  }, [isOpen, organization.id, formData.studentId]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) {
        alert('File is too large. Please select an image under 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoURL('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check for unique student ID
      const studentsRef = collection(db, 'organizations', organization.id, 'students');
      const q = query(studentsRef, where('studentId', '==', formData.studentId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError(`A student with ID "${formData.studentId}" already exists in this organization.`);
        setLoading(false);
        return;
      }

      const studentData = {
        ...formData,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'organizations', organization.id, 'students'), studentData);
      
      // Also create an empty profile with the photo
      await addDoc(collection(db, 'organizations', organization.id, 'student_profiles'), {
        studentId: docRef.id,
        organizationId: organization.id,
        photoURL: photoURL,
        bio: '',
        hobbies: [],
        extracurriculars: [],
        primaryLanguage: '',
        nationality: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onSuccess(docRef.id);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/students`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" />
            Add New Student
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <span className="font-medium">{error}</span>
            </div>
          )}
          <form id="add-student-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-[#f5f5f5] border-4 border-white shadow-md flex items-center justify-center">
                  {photoURL ? (
                    <img 
                      src={photoURL} 
                      alt="Student Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCircle className="w-20 h-20 text-[#9e9e9e]" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all"
                >
                  <Camera className="w-5 h-5" />
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-0 right-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <p className="text-xs text-[#9e9e9e]">Student Photo (Optional)</p>
            </div>

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
                  placeholder="e.g. Jane"
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
                  placeholder="e.g. Doe"
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
                  placeholder="e.g. STU-2024-001"
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
                  placeholder="e.g. 10"
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
            form="add-student-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Add Student'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
