import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getUnsyncedAttendanceCount, syncOfflineAttendance } from '../../lib/db';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineSyncIndicatorProps {
  organizationId: string;
}

export default function OfflineSyncIndicator({ organizationId }: OfflineSyncIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkPending = async () => {
      const count = await getUnsyncedAttendanceCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      handleSync();
    }
  }, [isOnline, pendingCount]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineAttendance(organizationId);
      const count = await getUnsyncedAttendanceCount();
      setPendingCount(count);
      setLastSyncTime(new Date());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#e5e5e5] rounded-2xl shadow-sm">
      <div className={`p-2 rounded-xl ${isOnline ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      </div>
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e]">
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#1a1a1a]">
            {pendingCount > 0 ? `${pendingCount} Pending` : 'Synced'}
          </span>
          {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />}
          {!isSyncing && pendingCount === 0 && <CheckCircle2 className="w-3 h-3 text-green-500" />}
        </div>
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <button 
          onClick={handleSync}
          className="ml-2 p-1.5 hover:bg-[#f5f5f5] rounded-lg transition-all text-blue-600"
          title="Sync Now"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
