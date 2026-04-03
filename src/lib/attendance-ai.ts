import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

export interface AttendanceRecord {
  studentId: string;
  organizationId: string;
  classId: string;
  date: string;
  status: string;
  timestamp: Date;
  method: string;
}

export interface StudentHistory {
  todayScans: number;
  absentDays: number;
  lastScanTime?: string;
}

export async function detectAttendanceAnomaly(record: AttendanceRecord, organizationId: string) {
  const anomalies = [];
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // 1. Late Scan Detection (After school hours)
  if (timeStr > "17:00") {
    anomalies.push({
      anomalyType: "late_scan",
      severity: "medium",
      description: `Attendance recorded late at ${timeStr}`
    });
  }

  // Fetch student history for more advanced checks
  const history = await fetchStudentHistory(record.studentId, organizationId);

  // 2. Multiple Scans Detection
  if (history.todayScans > 3) {
    anomalies.push({
      anomalyType: "multiple_scans",
      severity: "high",
      description: `Multiple scans detected today (${history.todayScans} scans)`
    });
  }

  // 3. Long Absence Detection
  if (history.absentDays >= 5) {
    anomalies.push({
      anomalyType: "long_absence",
      severity: "high",
      description: `Student has been absent for ${history.absentDays} consecutive days`
    });
  }

  // Save anomalies to Firestore if any detected
  if (anomalies.length > 0) {
    for (const anomaly of anomalies) {
      await addDoc(collection(db, 'organizations', organizationId, 'attendance_anomalies'), {
        ...anomaly,
        studentId: record.studentId,
        organizationId,
        detectedAt: serverTimestamp(),
        resolved: false
      });
    }
  }

  return anomalies;
}

async function fetchStudentHistory(studentId: string, organizationId: string): Promise<StudentHistory> {
  const today = new Date().toISOString().split('T')[0];
  
  // Count today's scans
  const attendanceRef = collection(db, 'organizations', organizationId, 'attendance_records');
  const todayQuery = query(
    attendanceRef, 
    where('studentId', '==', studentId),
    where('date', '==', today)
  );
  const todaySnapshot = await getDocs(todayQuery);
  
  // Count consecutive absences
  const historyQuery = query(
    attendanceRef,
    where('studentId', '==', studentId),
    orderBy('date', 'desc'),
    limit(10)
  );
  const historySnapshot = await getDocs(historyQuery);
  
  let absentDays = 0;
  for (const doc of historySnapshot.docs) {
    if (doc.data().status === 'absent') {
      absentDays++;
    } else {
      break;
    }
  }

  return {
    todayScans: todaySnapshot.size,
    absentDays
  };
}
