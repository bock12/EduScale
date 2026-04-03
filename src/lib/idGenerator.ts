import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Generates a unique student ID in the format: SLIMS-YYYY-NNNNN
 * @param organizationId The organization ID
 * @returns A unique student ID string
 */
export async function generateStudentId(organizationId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SLIMS-${year}-`;
  
  // Query for the last student ID with this prefix to get the next number
  const studentsRef = collection(db, 'organizations', organizationId, 'students');
  const q = query(
    studentsRef, 
    orderBy('studentId', 'desc'), 
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  let nextNumber = 1;
  
  if (!querySnapshot.empty) {
    const lastStudent = querySnapshot.docs[0].data();
    const lastId = lastStudent.studentId as string;
    
    if (lastId.startsWith(prefix)) {
      const lastNumberStr = lastId.replace(prefix, '');
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }
  }
  
  const paddedNumber = String(nextNumber).padStart(5, '0');
  return `${prefix}${paddedNumber}`;
}

/**
 * Generates a secure random token for QR codes
 */
export function generateQrToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
