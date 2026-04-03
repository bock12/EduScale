import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, StudentProfile } from '../../types';
import { X, UserCircle, Camera, Trash2 } from 'lucide-react';

interface EditProfileModalProps {
  organization: Organization;
  profile: StudentProfile | null;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProfileModal({ organization, profile, studentId, isOpen, onClose, onSuccess }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    bio: '',
    primaryLanguage: '',
    nationality: '',
    hobbies: '',
    extracurriculars: '',
    photoURL: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        bio: profile.bio || '',
        primaryLanguage: profile.primaryLanguage || '',
        nationality: profile.nationality || '',
        hobbies: profile.hobbies?.join(', ') || '',
        extracurriculars: profile.extracurriculars?.join(', ') || '',
        photoURL: profile.photoURL || ''
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit for base64 in Firestore
        alert('File is too large. Please select an image under 500KB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoURL: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profileData = {
        bio: formData.bio,
        primaryLanguage: formData.primaryLanguage,
        nationality: formData.nationality,
        hobbies: formData.hobbies.split(',').map(s => s.trim()).filter(Boolean),
        extracurriculars: formData.extracurriculars.split(',').map(s => s.trim()).filter(Boolean),
        photoURL: formData.photoURL,
        updatedAt: serverTimestamp()
      };

      if (profile) {
        const profileRef = doc(db, 'organizations', organization.id, 'student_profiles', profile.id);
        await updateDoc(profileRef, profileData);
      } else {
        // Handle case where profile doesn't exist yet (should have been created on student creation, but just in case)
        console.error("Profile document missing");
      }

      onSuccess();
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/student_profiles`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <UserCircle className="w-6 h-6 text-blue-600" />
            Edit Student Profile
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Photo Upload Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-[#f5f5f5] border-4 border-white shadow-md flex items-center justify-center">
                  {formData.photoURL ? (
                    <img 
                      src={formData.photoURL} 
                      alt="Student" 
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
                {formData.photoURL && (
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
              <p className="text-xs text-[#9e9e9e]">Recommended: Square image, max 500KB</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Biography</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                placeholder="Brief description about the student..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Primary Language</label>
                <input
                  type="text"
                  name="primaryLanguage"
                  value={formData.primaryLanguage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. English"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[#4a4a4a]">Nationality</label>
                <input
                  type="text"
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. American"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Hobbies (comma-separated)</label>
              <input
                type="text"
                name="hobbies"
                value={formData.hobbies}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Reading, Chess, Soccer"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-[#4a4a4a]">Extracurriculars (comma-separated)</label>
              <input
                type="text"
                name="extracurriculars"
                value={formData.extracurriculars}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Debate Club, Band"
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
            form="edit-profile-form"
            disabled={loading}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
