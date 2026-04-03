import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp, setDoc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, StudentMedicalRecord } from '../../types';
import { X, HeartPulse } from 'lucide-react';

interface EditMedicalModalProps {
  organization: Organization;
  medical: StudentMedicalRecord | null;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditMedicalModal({ organization, medical, studentId, isOpen, onClose, onSuccess }: EditMedicalModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bloodType: '',
    allergies: '',
    conditions: '',
    medications: '',
    doctorName: '',
    doctorPhone: '',
    notes: ''
  });

  useEffect(() => {
    if (medical) {
      setFormData({
        bloodType: medical.bloodType || '',
        allergies: medical.allergies?.join(', ') || '',
        conditions: medical.conditions?.join(', ') || '',
        medications: medical.medications?.join(', ') || '',
        doctorName: medical.doctorName || '',
        doctorPhone: medical.doctorPhone || '',
        notes: medical.notes || ''
      });
    }
  }, [medical]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const medicalData = {
        studentId,
        organizationId: organization.id,
        bloodType: formData.bloodType,
        allergies: formData.allergies.split(',').map(s => s.trim()).filter(Boolean),
        conditions: formData.conditions.split(',').map(s => s.trim()).filter(Boolean),
        medications: formData.medications.split(',').map(s => s.trim()).filter(Boolean),
        doctorName: formData.doctorName,
        doctorPhone: formData.doctorPhone,
        notes: formData.notes,
        updatedAt: serverTimestamp()
      };

      if (medical) {
        const medicalRef = doc(db, 'organizations', organization.id, 'student_medical_records', medical.id);
        await updateDoc(medicalRef, medicalData);
      } else {
        // Create new medical record
        const medicalRef = doc(collection(db, 'organizations', organization.id, 'student_medical_records'));
        await setDoc(medicalRef, {
          ...medicalData,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/student_medical_records`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-red-600" />
            Edit Medical Records
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="edit-medical-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Blood Type</label>
                <select
                  name="bloodType"
                  value={formData.bloodType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Primary Physician</label>
                <input
                  type="text"
                  name="doctorName"
                  value={formData.doctorName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Dr. Smith"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Physician Phone</label>
                <input
                  type="tel"
                  name="doctorPhone"
                  value={formData.doctorPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. 555-0123"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Allergies (comma-separated)</label>
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Peanuts, Penicillin"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Medical Conditions (comma-separated)</label>
              <input
                type="text"
                name="conditions"
                value={formData.conditions}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Asthma, Diabetes"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Medications (comma-separated)</label>
              <input
                type="text"
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Albuterol inhaler"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Additional Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Any other important medical information..."
              />
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
            form="edit-medical-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Medical Records'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
