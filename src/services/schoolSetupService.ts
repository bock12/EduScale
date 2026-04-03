import { writeBatch, doc, collection, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function setupNewSchool(orgId: string) {
  const orgRef = doc(db, 'organizations', orgId);
  const orgSnap = await getDoc(orgRef);
  
  if (!orgSnap.exists()) {
    throw new Error('Organization not found');
  }
  
  const orgData = orgSnap.data();
  const config = orgData.setupConfig || {};

  const batch = writeBatch(db);

  // 1. Approve the organization
  batch.update(orgRef, { status: 'approved' });

  // 2. Default Academic Year
  const currentYear = new Date().getFullYear();
  const academicYearRef = doc(collection(db, `organizations/${orgId}/academic_years`));
  batch.set(academicYearRef, {
    name: config.academicYear?.name || `${currentYear}-${currentYear + 1}`,
    startDate: config.academicYear?.startDate || `${currentYear}-08-01`,
    endDate: config.academicYear?.endDate || `${currentYear + 1}-06-30`,
    isCurrent: true
  });

  // 3. Default Departments
  const departments = config.departments || [
    'Mathematics', 
    'Science', 
    'English', 
    'History & Social Studies', 
    'Physical Education', 
    'Arts & Music',
    'Computer Science'
  ];
  
  departments.forEach((dept: string) => {
    const deptRef = doc(collection(db, `organizations/${orgId}/departments`));
    batch.set(deptRef, {
      name: dept,
      description: `Department of ${dept}`
    });
  });

  // 4. Default Grading Scale
  const gradingScaleRef = doc(collection(db, `organizations/${orgId}/grading_scales`));
  let grades = [];
  let scaleName = 'Standard Letter Grades';
  
  if (config.gradingScale === 'numeric') {
    scaleName = 'Numeric (0-100)';
    grades = [
      { label: 'Excellent', minScore: 90, maxScore: 100, gpaValue: 4.0 },
      { label: 'Good', minScore: 80, maxScore: 89, gpaValue: 3.0 },
      { label: 'Average', minScore: 70, maxScore: 79, gpaValue: 2.0 },
      { label: 'Poor', minScore: 60, maxScore: 69, gpaValue: 1.0 },
      { label: 'Failing', minScore: 0, maxScore: 59, gpaValue: 0.0 }
    ];
  } else if (config.gradingScale === 'gpa') {
    scaleName = 'GPA (0.0 - 4.0)';
    grades = [
      { label: '4.0', minScore: 95, maxScore: 100, gpaValue: 4.0 },
      { label: '3.0', minScore: 85, maxScore: 94, gpaValue: 3.0 },
      { label: '2.0', minScore: 75, maxScore: 84, gpaValue: 2.0 },
      { label: '1.0', minScore: 65, maxScore: 74, gpaValue: 1.0 },
      { label: '0.0', minScore: 0, maxScore: 64, gpaValue: 0.0 }
    ];
  } else {
    grades = [
      { label: 'A', minScore: 90, maxScore: 100, gpaValue: 4.0 },
      { label: 'B', minScore: 80, maxScore: 89, gpaValue: 3.0 },
      { label: 'C', minScore: 70, maxScore: 79, gpaValue: 2.0 },
      { label: 'D', minScore: 60, maxScore: 69, gpaValue: 1.0 },
      { label: 'F', minScore: 0, maxScore: 59, gpaValue: 0.0 }
    ];
  }

  batch.set(gradingScaleRef, {
    name: scaleName,
    grades: grades
  });

  // 5. Default Organization Settings
  const settingsRef = doc(db, `organizations/${orgId}/settings`, 'general');
  batch.set(settingsRef, {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    featuresEnabled: {
      aiGrading: true,
      aiTimetable: true,
      parentPortal: true
    },
    setupCompletedAt: new Date().toISOString()
  });

  // Commit all changes atomically
  await batch.commit();
}
