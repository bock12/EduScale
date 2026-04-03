import Dexie, { Table } from 'dexie';
import { AttendanceRecord } from '../types';

export class SchoolDB extends Dexie {
  attendance!: Table<AttendanceRecord>;

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

export const getUnsyncedAttendance = async () => {
  return await localDB.attendance.where('synced').equals(0).toArray();
};

export const markAsSynced = async (id: string | number) => {
  await localDB.attendance.update(id, { synced: 1 });
};
