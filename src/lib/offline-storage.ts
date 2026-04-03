import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'attendance-offline-db';
const STORE_NAME = 'attendance-records';
const DB_VERSION = 1;

export interface OfflineAttendanceRecord {
  id: string;
  studentId: string;
  organizationId: string;
  classId: string;
  date: string;
  status: string;
  timestamp: string;
  method: string;
  synced: boolean;
}

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveOfflineAttendance(record: Omit<OfflineAttendanceRecord, 'id' | 'synced'>) {
  const db = await initDB();
  const id = `${record.studentId}-${Date.now()}`;
  const offlineRecord: OfflineAttendanceRecord = {
    ...record,
    id,
    synced: false,
  };
  await db.put(STORE_NAME, offlineRecord);
  return id;
}

export async function getUnsyncedRecords(): Promise<OfflineAttendanceRecord[]> {
  const db = await initDB();
  const allRecords = await db.getAll(STORE_NAME);
  return allRecords.filter((r: OfflineAttendanceRecord) => !r.synced);
}

export async function markAsSynced(id: string) {
  const db = await initDB();
  const record = await db.get(STORE_NAME, id);
  if (record) {
    record.synced = true;
    await db.put(STORE_NAME, record);
  }
}

export async function clearSyncedRecords() {
  const db = await initDB();
  const allRecords = await db.getAll(STORE_NAME);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  for (const record of allRecords) {
    if (record.synced) {
      await tx.store.delete(record.id);
    }
  }
  await tx.done;
}

export async function syncOfflineAttendance(organizationId: string, onSyncSuccess?: (record: OfflineAttendanceRecord) => void) {
  const unsynced = await getUnsyncedRecords();
  if (unsynced.length === 0) return;

  console.log(`Syncing ${unsynced.length} offline records...`);

  for (const record of unsynced) {
    try {
      // In a real app, we'd call our Firebase service here
      // For this demo, we'll simulate a successful sync
      // await addDoc(collection(db, 'organizations', organizationId, 'attendance_records'), { ... });
      
      await markAsSynced(record.id);
      if (onSyncSuccess) onSyncSuccess(record);
    } catch (error) {
      console.error(`Failed to sync record ${record.id}:`, error);
    }
  }
}
