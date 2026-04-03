export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

export interface SubscriptionPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingModel: 'per_student' | 'student_range';
  studentRange?: {
    min: number;
    max: number;
  };
  features: {
    name: string;
    isActive: boolean;
  }[];
  isActive: boolean;
}

export interface PlatformSettings {
  defaultLanguage: string;
  defaultCurrency: string;
  currencies: Currency[];
  exchangeRates: ExchangeRate[];
  subscriptionPackages: SubscriptionPackage[];
  security: {
    twoFactorAuthRequired: boolean;
    passwordComplexity: {
      minLength: number;
      requireSymbols: boolean;
      requireNumbers: boolean;
    };
  };
  integrations: {
    name: string;
    status: 'connected' | 'disconnected';
    config?: any;
  }[];
}

export interface Organization {
  id: string;
  name: string;
  address?: string;
  contactEmail?: string;
  website?: string;
  phone?: string;
  subscriptionPlan: 'basic' | 'premium' | 'enterprise';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  defaultGradingScaleId?: string;
  customDomain?: string;
  customDomainStatus?: 'pending' | 'active' | 'failed';
  setupConfig?: {
    academicYear: {
      name: string;
      startDate: string;
      endDate: string;
    };
    departments: string[];
    gradingScale: string;
  };
}

export interface UserProfile {
  id?: string;
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'school_admin' | 'principal' | 'vice_principal' | 'exam_officer' | 'hod' | 'teacher' | 'student' | 'parent';
  organizationId: string;
  entityId?: string;
  photoURL?: string;
  createdAt?: string;
  requiresPasswordChange?: boolean;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  studentId: string;
  gradeLevel: string;
  email?: string;
  dateOfBirth: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred';
  enrollmentDate: string;
  gender?: string;
}

export interface StudentProfile {
  id: string;
  studentId: string;
  organizationId: string;
  photoURL?: string;
  bio?: string;
  hobbies?: string[];
  extracurriculars?: string[];
  primaryLanguage?: string;
  nationality?: string;
}

export interface StudentGuardian {
  id: string;
  studentId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  relationship: 'mother' | 'father' | 'guardian' | 'other';
  email?: string;
  phone: string;
  isEmergencyContact: boolean;
  isPrimary: boolean;
}

export interface StudentMedicalRecord {
  id: string;
  studentId: string;
  organizationId: string;
  bloodType?: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
  doctorName?: string;
  doctorPhone?: string;
  notes?: string;
}

export interface StudentAddress {
  id: string;
  studentId: string;
  organizationId: string;
  type: 'home' | 'mailing' | 'other';
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface StudentEnrollmentHistory {
  id: string;
  studentId: string;
  organizationId: string;
  academicYear: string;
  gradeLevel: string;
  enrollmentDate: string;
  status: 'enrolled' | 'withdrawn' | 'graduated' | 'transferred';
  notes?: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  organizationId: string;
  title: string;
  type: 'transcript' | 'medical_record' | 'permission_slip' | 'identification' | 'other';
  fileUrl: string;
  notes?: string;
  createdAt: string;
}

export interface StudentTag {
  id: string;
  studentId: string;
  organizationId: string;
  name: string;
  category: 'academic' | 'behavioral' | 'extracurricular' | 'medical' | 'other';
  color: string; // hex code or tailwind class
}

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  teacherId: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'on_leave';
  hireDate: string;
  gender?: string;
  subjects?: string[];
  department?: string;
}

export interface TeacherProfile {
  id: string;
  teacherId: string;
  organizationId: string;
  bio?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  photoURL?: string;
}

export interface TeacherDepartment {
  id: string;
  teacherId: string;
  organizationId: string;
  departmentId: string;
  role: 'head' | 'teacher' | 'assistant';
  isHead?: boolean;
}

export interface TeacherQualification {
  id: string;
  teacherId: string;
  organizationId: string;
  degree: string;
  institution: string;
  yearOfPassing: number;
  subjectSpecialization?: string;
}

export interface TeacherSchedulePreference {
  id: string;
  teacherId: string;
  organizationId: string;
  maxHoursPerWeek: number;
  preferredDays: string[];
  unavailableTimeSlots: { day: string; startTime: string; endTime: string }[];
}

export interface TeacherWorkload {
  id: string;
  teacherId: string;
  organizationId: string;
  assignedClasses: string[];
  assignedSubjects: string[];
  totalWeeklyHours: number;
}

export interface Class {
  id: string;
  name: string;
  organizationId: string;
  teacherId: string;
  subject: string;
  academicYear: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  classId: string;
  classSectionId?: string;
  organizationId: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

export interface Exam {
  id: string;
  title: string;
  organizationId: string;
  classId: string;
  date: string;
  maxScore: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface Department {
  id: string;
  name: string;
  description: string;
}

export interface GradingScale {
  id: string;
  name: string;
  grades: {
    label: string;
    minScore: number;
    maxScore: number;
    gpaValue: number;
  }[];
}

export interface AIGradingJob {
  id: string;
  examId: string;
  organizationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: string;
}

export interface ClassSection {
  id: string;
  organizationId: string;
  classId: string;
  name: string;
  sectionName: string;
  academicYear: string;
  gradeLevel: string;
  stream?: string;
  sectionNumber?: number;
  capacity: number;
  status: 'active' | 'inactive';
  subjects?: string[];
}

export interface ClassStudent {
  id: string;
  organizationId: string;
  sectionId: string;
  studentId: string;
  enrollmentDate: string;
  status: 'active' | 'withdrawn' | 'transferred';
}

export interface ClassTeacher {
  id: string;
  organizationId: string;
  sectionId: string;
  teacherId: string;
  role: 'primary' | 'assistant' | 'substitute';
  startDate: string;
  endDate?: string;
}

export interface Classroom {
  id: string;
  organizationId: string;
  name: string;
  building?: string;
  floor?: number;
  capacity: number;
  type: 'general' | 'lab' | 'gym' | 'library' | 'other';
  status: 'available' | 'maintenance' | 'unavailable';
}

export interface ClassroomResource {
  id: string;
  organizationId: string;
  classroomId: string;
  name: string;
  type: 'electronic' | 'furniture' | 'educational' | 'other';
  quantity: number;
  condition: 'new' | 'good' | 'fair' | 'poor';
  lastChecked?: string;
}

export interface TimetableTemplate {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  daysPerWeek: number;
  slotsPerDay: number;
  defaultSlotDuration: number;
  shift?: 'morning' | 'afternoon' | 'full_day';
  structure?: string[];
  durations?: number[];
  startTimes?: string[];
  endTimes?: string[];
}

export interface TimetableRule {
  id: string;
  organizationId: string;
  name: string;
  type: 'teacher_availability' | 'room_capacity' | 'subject_consecutive' | 'other';
  priority: number;
  config: any;
}

export interface TimetableSlot {
  id: string;
  organizationId: string;
  templateId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  label?: string;
}

export interface Timetable {
  id: string;
  organizationId: string;
  name: string;
  academicYear: string;
  status: 'draft' | 'published' | 'archived';
  templateId: string;
}

export interface TimetableEntry {
  id: string;
  organizationId: string;
  timetableId: string;
  slotId: string;
  classSectionId: string;
  teacherId: string;
  classroomId: string;
  subject: string;
}

export interface TimetableConflict {
  id: string;
  organizationId: string;
  timetableId: string;
  type: 'teacher_clash' | 'room_clash' | 'student_clash' | 'other';
  description: string;
  severity: 'error' | 'warning';
  affectedEntryIds: string[];
}

export interface TimetableVersion {
  id: string;
  organizationId: string;
  timetableId: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  snapshot: string;
}

export interface AttendanceSession {
  id: string;
  organizationId: string;
  classSectionId: string;
  teacherId: string;
  classroomId?: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  timetableEntryId?: string;
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  sessionId?: string;
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  timestamp: string;
  markedBy?: string;
  notes?: string;
  date?: string;
  synced?: number; // 0 for unsynced, 1 for synced
  method?: 'face' | 'manual';
}

export interface AttendanceException {
  id: string;
  organizationId: string;
  studentId: string;
  startDate: string;
  endDate: string;
  type: 'medical' | 'family' | 'other';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
}

export interface AttendanceReport {
  id: string;
  organizationId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'student' | 'class';
  dateRange: { start: string; end: string };
  filters: any;
  data: any;
  createdAt: string;
  generatedBy: string;
}

export interface DailyAttendance {
  id: string;
  organizationId: string;
  classSectionId: string;
  date: string;
  markedBy: string;
  records: {
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[];
  createdAt: string;
}

export interface ExamSession {
  id: string;
  organizationId: string;
  name: string;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  status: 'draft' | 'published' | 'completed';
}

export interface ExamSubject {
  id: string;
  organizationId: string;
  sessionId: string;
  classSectionId: string;
  subject: string;
  date?: string;
  maxScore: number;
  passingScore?: number;
  teacherId?: string;
  questionsUrl?: string;
  markingSchemeUrl?: string;
  status?: 'draft' | 'submitted' | 'approved';
}

export interface ExamResult {
  id: string;
  organizationId: string;
  examSubjectId: string;
  studentId: string;
  score: number;
  grade?: string;
  remarks?: string;
  markedBy?: string;
  isAIGraded?: boolean;
}

export interface ExamGradingRule {
  id: string;
  organizationId: string;
  name: string;
  scaleId: string;
  rules: {
    minScore: number;
    maxScore: number;
    grade: string;
    remarks?: string;
  }[];
}

export interface ReportCard {
  id: string;
  organizationId: string;
  sessionId: string;
  studentId: string;
  totalScore?: number;
  averageScore?: number;
  rank?: number;
  status: 'draft' | 'published';
  generatedAt?: string;
}

export interface ReportCardComment {
  id: string;
  organizationId: string;
  reportCardId: string;
  teacherId: string;
  comment: string;
  type: 'general' | 'subject_specific' | 'principal';
}

export interface AIGradingResult {
  id: string;
  jobId: string;
  studentId: string;
  score: number;
  feedback?: string;
  criteriaBreakdown?: any;
}

export interface AIGradingFeedback {
  id: string;
  resultId: string;
  teacherId: string;
  rating: number;
  comment?: string;
}

export interface AIGradingModelVersion {
  id: string;
  version: string;
  description?: string;
  isActive: boolean;
  deployedAt: string;
}

export interface Assignment {
  id: string;
  organizationId: string;
  classSectionId: string;
  teacherId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  status: 'draft' | 'published' | 'closed';
  createdAt: string;
}

export interface AssignmentSubmission {
  id: string;
  organizationId: string;
  assignmentId: string;
  studentId: string;
  contentUrl?: string;
  submittedAt: string;
  status: 'pending' | 'submitted' | 'late' | 'graded';
}

export interface AssignmentGrade {
  id: string;
  organizationId: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  score: number;
  maxScore?: number;
  gradedBy: string;
  gradedAt: string;
}

export interface Subject {
  id: string;
  organizationId: string;
  name: string;
  departmentId?: string;
  description?: string;
}

export interface ClassSubject {
  id: string;
  organizationId: string;
  classSectionId: string;
  subjectId: string;
  teacherId: string;
  academicYear: string;
}

export interface TeacherTask {
  id: string;
  organizationId: string;
  teacherId: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  category: 'lesson_planning' | 'grading' | 'administrative' | 'other';
  createdAt: string;
}

export interface StudentFaceEmbedding {
  id: string;
  organizationId: string;
  studentId: string;
  embedding: number[]; // Face descriptors
  updatedAt: string;
}

export interface AnnouncementReminder {
  id: string;
  organizationId: string;
  announcementId: string;
  userId: string;
  reminderTime: string;
  status: 'pending' | 'sent';
  createdAt: string;
}

export interface Lesson {
  id: string;
  organizationId: string;
  classId: string;
  subjectId?: string;
  title: string;
  description: string;
  teacherId: string;
  createdAt: string;
}

export interface LessonMaterial {
  id: string;
  organizationId: string;
  lessonId: string;
  title: string;
  type: 'document' | 'link' | 'image' | 'video';
  url: string;
}

export interface AssignmentFeedback {
  id: string;
  organizationId: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  comment: string;
  feedbackBy: string;
  feedbackAt: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  senderId: string;
  senderName: string;
  senderRole: 'super_admin' | 'school_admin' | 'principal' | 'vice_principal' | 'exam_officer' | 'hod' | 'teacher' | 'student' | 'parent';
  organizationId: string;
  recipientRole: 'school_admin' | 'super_admin';
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  updatedAt: string;
  responses: {
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    createdAt: string;
  }[];
}
