import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherProfile } from '../../types';
import { Save, AlertCircle, Upload, UserCircle } from 'lucide-react';

interface TeacherProfileTabProps {
  organization: Organization;
  teacher: Teacher;
}

export default function TeacherProfileTab({ organization, teacher }: TeacherProfileTabProps) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    bio: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    photoURL: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profilesRef = collection(db, 'organizations', organization.id, 'teacher_profiles');
        const q = query(profilesRef, where('teacherId', '==', teacher.id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          const profileData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as TeacherProfile;
          setProfile(profileData);
          setFormData({
            bio: profileData.bio || '',
            address: profileData.address || '',
            emergencyContactName: profileData.emergencyContactName || '',
            emergencyContactPhone: profileData.emergencyContactPhone || '',
            emergencyContactRelation: profileData.emergencyContactRelation || '',
            photoURL: profileData.photoURL || ''
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teacher_profiles`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [organization.id, teacher.id]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB limit
      setError('Image size should be less than 500KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, photoURL: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      if (profile) {
        // Update existing
        const profileRef = doc(db, 'organizations', organization.id, 'teacher_profiles', profile.id);
        await updateDoc(profileRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new
        const newProfileRef = doc(collection(db, 'organizations', organization.id, 'teacher_profiles'));
        await setDoc(newProfileRef, {
          ...formData,
          teacherId: teacher.id,
          organizationId: organization.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setProfile({ id: newProfileRef.id, ...formData, teacherId: teacher.id, organizationId: organization.id } as any);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `organizations/${organization.id}/teacher_profiles`);
      setError('Failed to save profile. Please try again.');
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
          <p className="text-sm font-medium">Profile saved successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-[#f5f5f5] border-2 border-dashed border-[#e5e5e5] flex items-center justify-center overflow-hidden shrink-0">
            {formData.photoURL ? (
              <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="w-12 h-12 text-[#9e9e9e]" />
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Profile Photo</label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white border border-[#e5e5e5] rounded-xl font-bold text-sm hover:bg-[#f9f9f9] transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Photo
              </button>
              {formData.photoURL && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, photoURL: '' }))}
                  className="px-4 py-2 text-red-600 font-bold text-sm hover:bg-red-50 rounded-xl transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-[#9e9e9e] mt-2">Recommended: Square image, max 500KB</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Bio</label>
          <textarea
            value={formData.bio}
            onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Brief biography or summary..."
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Full residential address"
          />
        </div>

        <div className="pt-6 border-t border-[#e5e5e5]">
          <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Name</label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="Contact person's name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Phone</label>
              <input
                type="tel"
                value={formData.emergencyContactPhone}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="Contact phone number"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Relationship</label>
              <input
                type="text"
                value={formData.emergencyContactRelation}
                onChange={e => setFormData(prev => ({ ...prev, emergencyContactRelation: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. Spouse, Parent, Sibling"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
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
            Save Profile
          </button>
        </div>
      </form>
    </div>
  );
}
