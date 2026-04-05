import Dexie, { Table } from 'dexie';
import { AttendanceRecord } from '../types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export class SchoolDB extends Dexie {
  attendance!: Table<AttendanceRecord & { synced: number }>;

  constructor() {
    super('SchoolDB');
    this.version(1).stores({
      attendance: '++id, studentId, date, organizationId, status, synced' // synced: 0 or 1
    });
  }
}

export const localDB = new SchoolDB();

export const saveAttendanceLocally = async (record: AttendanceRecord) => {
  await localDB.attendance.add({ ...record, synced: 0 });
};

export const getUnsyncedAttendanceCount = async () => {
  return await localDB.attendance.where('synced').equals(0).count();
};

export const syncOfflineAttendance = async (organizationId: string) => {
  if (!navigator.onLine) return;
  
  const unsynced = await localDB.attendance.where('synced').equals(0).toArray();
  if (unsynced.length === 0) return;

  for (const record of unsynced) {
    try {
      const { id, synced, ...data } = record;
      await addDoc(collection(db, 'organizations', organizationId, 'attendance_records'), {
        ...data,
        createdAt: serverTimestamp(),
        syncedFromOffline: true
      });
      
      if (id) {
        await localDB.attendance.update(id, { synced: 1 });
      }
    } catch (error) {
      console.error('Failed to sync record:', error);
    }
  }
};
