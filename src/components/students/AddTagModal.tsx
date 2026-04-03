import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization } from '../../types';
import { X, Tags } from 'lucide-react';

interface AddTagModalProps {
  organization: Organization;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTagModal({ organization, studentId, isOpen, onClose, onSuccess }: AddTagModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'academic',
    color: '#3b82f6'
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tagData = {
        ...formData,
        studentId,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'organizations', organization.id, 'student_tags'), tagData);

      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/student_tags`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Tags className="w-6 h-6 text-pink-600" />
            Add Tag
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="add-tag-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Tag Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Honor Roll"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Category *</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="academic">Academic</option>
                <option value="behavioral">Behavioral</option>
                <option value="extracurricular">Extracurricular</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Color *</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="color"
                  required
                  value={formData.color}
                  onChange={handleChange}
                  className="w-12 h-12 rounded-xl border border-[#e5e5e5] cursor-pointer p-1"
                />
                <span className="text-sm text-[#4a4a4a] uppercase font-mono">{formData.color}</span>
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
            form="add-tag-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Add Tag'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
