export type AnnouncementCategory = 'EVENTS' | 'EXAMS' | 'ACTIVITIES' | 'GENERAL' | 'URGENT';
export type AnnouncementAudience = 'ALL' | 'PARENTS' | 'STAFF' | 'STUDENTS' | 'CLASS' | 'SUBJECT';
export type AnnouncementDisplayType = 'ANNOUNCEMENT' | 'NOTICE' | 'EVENT';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  targetId?: string | null; // classId or subjectId
  targetName?: string | null; // Name of the class or subject
  displayType: AnnouncementDisplayType;
  imageUrl?: string | null;
  eventDate?: string | null;
  dueDate?: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  viewCount: number;
  viewedBy?: string[]; // Array of user UIDs who viewed
  createdBy: string;
  organizationId: string;
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string | null;
  creator?: {
    name: string;
    photoURL?: string;
    role?: string;
  };
}

export interface AnnouncementFormData {
  title: string;
  message: string;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
  targetId?: string;
  targetName?: string;
  displayType: AnnouncementDisplayType;
  imageUrl?: string;
  eventDate?: string;
  dueDate?: string;
  isFeatured: boolean;
}
