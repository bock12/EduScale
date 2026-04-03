import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization } from '../../types';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface AddTeacherModalProps {
  organization: Organization;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (teacherId: string) => void;
}

export default function AddTeacherModal({ organization, isOpen, onClose, onSuccess }: AddTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    teacherId: '',
    email: '',
    phone: '',
    status: 'active',
    hireDate: new Date().toISOString().split('T')[0],
    gender: 'unspecified'
  });

  useEffect(() => {
    if (isOpen && !formData.teacherId) {
      const fetchLatestId = async () => {
        try {
          const teachersRef = collection(db, 'organizations', organization.id, 'teachers');
          const q = query(teachersRef, orderBy('teacherId', 'desc'), limit(1));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const lastId = snapshot.docs[0].data().teacherId;
            const match = lastId.match(/(\d+)$/);
            if (match) {
              const nextNum = parseInt(match[1]) + 1;
              const prefix = lastId.substring(0, lastId.length - match[1].length);
              setFormData(prev => ({ ...prev, teacherId: `${prefix}${nextNum.toString().padStart(match[1].length, '0')}` }));
            } else {
              setFormData(prev => ({ ...prev, teacherId: `${lastId}-001` }));
            }
          } else {
            setFormData(prev => ({ ...prev, teacherId: `TCH-${new Date().getFullYear()}-001` }));
          }
        } catch (err) {
          console.error("Error fetching latest teacher ID:", err);
          setFormData(prev => ({ ...prev, teacherId: `TCH-${new Date().getFullYear()}-001` }));
        }
      };
      fetchLatestId();
    }
  }, [isOpen, organization.id, formData.teacherId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if teacher ID already exists
      const teachersRef = collection(db, 'organizations', organization.id, 'teachers');
      const q = query(teachersRef, where('teacherId', '==', formData.teacherId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError(`A teacher with ID ${formData.teacherId} already exists.`);
        setLoading(false);
        return;
      }

      const docRef = await addDoc(teachersRef, {
        ...formData,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create empty profile
      await addDoc(collection(db, 'organizations', organization.id, 'teacher_profiles'), {
        teacherId: docRef.id,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onSuccess(docRef.id);
      setFormData({
        firstName: '',
        lastName: '',
        teacherId: '',
        email: '',
        phone: '',
        status: 'active',
        hireDate: new Date().toISOString().split('T')[0],
        gender: 'unspecified'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/teachers`);
      setError('Failed to add teacher. Please try again.');
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
            Add New Teacher
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
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form id="add-teacher-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Teacher ID *</label>
                <input
                  type="text"
                  required
                  value={formData.teacherId}
                  onChange={e => setFormData(prev => ({ ...prev, teacherId: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. TCH-2024-001"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="teacher@school.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Hire Date *</label>
                <input
                  type="date"
                  required
                  value={formData.hireDate}
                  onChange={e => setFormData(prev => ({ ...prev, hireDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Gender</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="unspecified">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-[#e5e5e5] bg-[#f9f9f9] flex justify-end gap-3 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#e5e5e5] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-teacher-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            Add Teacher
          </button>
        </div>
      </div>
    </div>
  );
}
