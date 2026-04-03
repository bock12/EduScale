import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Loader2, 
  ImageIcon, 
  Calendar, 
  Star, 
  Megaphone,
  Users,
  AlertCircle,
  BookOpen,
  School,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { AnnouncementFormData, AnnouncementCategory, AnnouncementAudience, AnnouncementDisplayType } from '../../types/announcements';
import { UserProfile, Class, ClassSection } from '../../types';

interface AnnouncementFormProps {
  organizationId: string;
  userProfile: UserProfile;
  onSuccess?: () => void;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({ organizationId, userProfile, onSuccess }) => {
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    message: '',
    category: 'GENERAL',
    audience: 'ALL',
    displayType: 'ANNOUNCEMENT',
    imageUrl: '',
    eventDate: '',
    dueDate: '',
    isFeatured: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [teacherSections, setTeacherSections] = useState<ClassSection[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  useEffect(() => {
    const fetchTeacherData = async () => {
      if (userProfile.role !== 'teacher') return;
      
      setLoadingTargets(true);
      try {
        const teacherId = userProfile.entityId || userProfile.uid;
        
        // Fetch classes where teacher is assigned
        const classesQ = query(
          collection(db, 'organizations', organizationId, 'classes'),
          where('teacherId', '==', teacherId)
        );
        const classesSnap = await getDocs(classesQ);
        setTeacherClasses(classesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));

        // Fetch sections where teacher is assigned
        const sectionsQ = query(
          collection(db, 'organizations', organizationId, 'class_sections'),
          where('teacherId', '==', teacherId)
        );
        const sectionsSnap = await getDocs(sectionsQ);
        setTeacherSections(sectionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSection)));
      } catch (err) {
        console.error("Error fetching teacher targets:", err);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchTeacherData();
  }, [organizationId, userProfile]);

  const getAudienceOptions = () => {
    const options = [];
    
    if (userProfile.role === 'school_admin' || userProfile.role === 'super_admin') {
      options.push(
        { value: 'ALL', label: 'All Members' },
        { value: 'STUDENTS', label: 'Students Only' },
        { value: 'STAFF', label: 'Staff Only' },
        { value: 'PARENTS', label: 'Parents Only' }
      );
    } else if (userProfile.role === 'exam_officer') {
      options.push(
        { value: 'STUDENTS', label: 'Students Only' },
        { value: 'STAFF', label: 'Staff Only' }
      );
    } else if (userProfile.role === 'teacher') {
      options.push(
        { value: 'CLASS', label: 'My Assigned Class' },
        { value: 'SUBJECT', label: 'My Subjects' }
      );
    }
    
    return options;
  };

  const audienceOptions = getAudienceOptions();

  // Set default audience if current one is not allowed
  useEffect(() => {
    if (audienceOptions.length > 0 && !audienceOptions.find(o => o.value === formData.audience)) {
      setFormData(prev => ({ ...prev, audience: audienceOptions[0].value as AnnouncementAudience }));
    }
  }, [userProfile.role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const announcementData = {
        ...formData,
        organizationId,
        createdBy: auth.currentUser?.uid,
        creator: {
          name: userProfile.displayName,
          photoURL: userProfile.photoURL || null
        },
        isPublished: true,
        viewCount: 0,
        createdAt: new Date().toISOString(),
        postedAt: serverTimestamp(), // For firestore sorting
      };

      await addDoc(collection(db, 'organizations', organizationId, 'announcements'), announcementData);
      
      setSuccess(true);
      setFormData({
        title: '',
        message: '',
        category: 'GENERAL',
        audience: 'ALL',
        displayType: 'ANNOUNCEMENT',
        imageUrl: '',
        eventDate: '',
        dueDate: '',
        isFeatured: false
      });
      
      if (onSuccess) onSuccess();
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error publishing announcement:", err);
      setError("Failed to publish announcement. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  return (
    <div className="bg-white rounded-3xl border border-[#e5e5e5] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#f0f0f0]">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-primary" />
          Create Announcement
        </h3>
        <p className="text-xs text-[#9e9e9e] mt-1">Compose a new notice for the school community.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Display Type</label>
          <select
            name="displayType"
            value={formData.displayType}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          >
            <option value="ANNOUNCEMENT">Announcement (Text-based)</option>
            <option value="NOTICE">Notice (Dashboard visual)</option>
            <option value="EVENT">Event (Calendar)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Title</label>
          <input
            type="text"
            name="title"
            placeholder="e.g., Parent-Teacher Meeting"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Message</label>
          <textarea
            name="message"
            placeholder="Enter the full announcement details here..."
            value={formData.message}
            onChange={handleChange}
            required
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
          />
        </div>

        {(formData.displayType === 'NOTICE' || formData.displayType === 'EVENT') && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5" />
              Image URL (optional)
            </label>
            <input
              type="url"
              name="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
            {formData.imageUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-[#e5e5e5] h-24 relative">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}
          </div>
        )}

        {formData.displayType === 'EVENT' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Event Date
            </label>
            <input
              type="datetime-local"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Due Date (optional)
          </label>
          <input
            type="datetime-local"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            >
              <option value="GENERAL">General</option>
              <option value="EVENTS">Events</option>
              <option value="EXAMS">Exams</option>
              <option value="ACTIVITIES">Activities</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider">Audience</label>
            <select
              name="audience"
              value={formData.audience}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            >
              {audienceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {formData.audience === 'CLASS' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
              <School className="w-3.5 h-3.5" />
              Select Class Section
            </label>
            <select
              name="targetId"
              value={formData.targetId || ''}
              onChange={(e) => {
                const section = teacherSections.find(s => s.id === e.target.value);
                setFormData(prev => ({ 
                  ...prev, 
                  targetId: e.target.value, 
                  targetName: section ? `${section.name} ${section.sectionName}` : '' 
                }));
              }}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            >
              <option value="">Select a class...</option>
              {teacherSections.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.sectionName}</option>
              ))}
            </select>
          </div>
        )}

        {formData.audience === 'SUBJECT' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              Select Subject
            </label>
            <select
              name="targetId"
              value={formData.targetId || ''}
              onChange={(e) => {
                const cls = teacherClasses.find(c => c.id === e.target.value);
                setFormData(prev => ({ 
                  ...prev, 
                  targetId: e.target.value, 
                  targetName: cls ? cls.subject : '' 
                }));
              }}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-[#e5e5e5] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            >
              <option value="">Select a subject...</option>
              {teacherClasses.map(c => (
                <option key={c.id} value={c.id}>{c.subject} ({c.name})</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f9f9f9] border border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${formData.isFeatured ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
              <Star className={`w-4 h-4 ${formData.isFeatured ? 'fill-current' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-bold">Featured</p>
              <p className="text-[10px] text-[#9e9e9e]">Highlight on dashboard</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              name="isFeatured"
              checked={formData.isFeatured}
              onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-xl bg-green-50 border border-green-100 flex items-center gap-2 text-green-600 text-xs font-medium"
            >
              <Megaphone className="w-4 h-4" />
              Announcement published successfully!
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Broadcast Announcement
            </>
          )}
        </button>
      </form>
    </div>
  );
};
