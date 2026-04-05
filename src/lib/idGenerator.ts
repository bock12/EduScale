import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generates a unique student ID in the format: YYLNNN
 * YY: Last two digits of the year
 * L: Level (1, 2, 3)
 * NNN: Sequential number
 * @param organizationId The organization ID
 * @param gradeLevel The student's grade level
 * @returns A unique student ID string
 */
export async function generateStudentId(organizationId: string, gradeLevel: string): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Extract level from gradeLevel string (e.g. "Grade 1" -> 1)
  let level = '1';
  const levelMatch = gradeLevel.match(/\d+/);
  if (levelMatch) {
    level = levelMatch[0];
  }
  
  const prefix = `${year}${level}`;
  
  // Query for the last student ID with this prefix to get the next number
  const studentsRef = collection(db, 'organizations', organizationId, 'students');
  const q = query(
    studentsRef, 
    orderBy('studentId', 'desc'), 
    limit(100) // Get more to find the one with the same prefix
  );
  
  const querySnapshot = await getDocs(q);
  let nextNumber = 1;
  
  if (!querySnapshot.empty) {
    // Filter docs that start with our prefix
    const matchingDocs = querySnapshot.docs.filter(d => d.data().studentId?.startsWith(prefix));
    if (matchingDocs.length > 0) {
      const lastId = matchingDocs[0].data().studentId as string;
      const lastNumberStr = lastId.slice(prefix.length);
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }
  
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Generates a secure random token for QR codes
 */
export function generateQrToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
