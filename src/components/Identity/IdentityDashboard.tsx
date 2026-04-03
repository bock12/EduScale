import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc, 
  where, 
  serverTimestamp, 
  getDoc,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Student, UserProfile } from '../../types';
import { 
  CreditCard, 
  QrCode, 
  Nfc, 
  RefreshCw, 
  Search, 
  Filter, 
  UserCheck, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Printer,
  Plus,
  ArrowRight,
  ShieldCheck,
  History,
  Camera,
  Fingerprint,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QrScanner from './QrScanner';
import FaceAttendance from './FaceAttendance';
import { generateStudentId, generateQrToken } from '../../lib/idGenerator';
import { detectAttendanceAnomaly } from '../../lib/attendance-ai';
import { saveOfflineAttendance, syncOfflineAttendance, getUnsyncedRecords } from '../../lib/offline-storage';

interface IdentityDashboardProps {
  organization: Organization;
  userProfile: UserProfile | null;
}

interface StudentIdentityCard {
  id: string;
  studentId: string;
  organizationId: string;
  cardId: string;
  nfcUid?: string;
  qrToken: string;
  issuedAt: any;
  expiresAt: any;
  status: 'active' | 'suspended' | 'expired' | 'lost';
}

export default function IdentityDashboard({ organization, userProfile }: IdentityDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [identityCards, setIdentityCards] = useState<Record<string, StudentIdentityCard>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'scanner' | 'face' | 'anomalies'>('overview');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkUnsynced = async () => {
      const records = await getUnsyncedRecords();
      setUnsyncedCount(records.length);
    };
    checkUnsynced();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && unsyncedCount > 0) {
      syncOfflineAttendance(organization.id, () => {
        setUnsyncedCount(prev => Math.max(0, prev - 1));
      });
    }
  }, [isOnline, unsyncedCount, organization.id]);

  useEffect(() => {
    const anomaliesRef = collection(db, 'organizations', organization.id, 'attendance_anomalies');
    const q = query(anomaliesRef, where('resolved', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnomalies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [organization.id]);

  useEffect(() => {
    const studentsRef = collection(db, 'organizations', organization.id, 'students');
    const unsubscribeStudents = onSnapshot(studentsRef, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      setStudents(studentsData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organization.id}/students`);
    });

    const cardsRef = collection(db, 'organizations', organization.id, 'student_identity_cards');
    const unsubscribeCards = onSnapshot(cardsRef, (snapshot) => {
      const cardsData: Record<string, StudentIdentityCard> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data() as StudentIdentityCard;
        cardsData[data.studentId] = { id: doc.id, ...data };
      });
      setIdentityCards(cardsData);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organization.id}/student_identity_cards`);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeCards();
    };
  }, [organization.id]);

  const handleQrScan = async (result: string) => {
    setIsProcessing(true);
    setLastScanResult(null);
    
    try {
      // Result could be a studentId or a full verification URL
      let studentId = result;
      if (result.includes('/verify/student/')) {
        studentId = result.split('/verify/student/')[1].split('?')[0];
      }

      const student = students.find(s => s.id === studentId || s.studentId === studentId);
      
      if (!student) {
        setLastScanResult({ success: false, message: 'Invalid Student ID' });
        setTimeout(() => setLastScanResult(null), 3000);
        return;
      }

      const card = identityCards[student.id];
      if (card && card.status !== 'active') {
        setLastScanResult({ success: false, message: `Card is ${card.status}` });
        setTimeout(() => setLastScanResult(null), 3000);
        return;
      }

      const attendanceData = {
        studentId: student.id,
        organizationId: organization.id,
        date: new Date().toISOString().split('T')[0],
        status: 'present',
        method: 'qr',
        timestamp: new Date(),
        classId: 'general' // Default for school entry
      };

      if (isOnline) {
        const attendanceRef = collection(db, 'organizations', organization.id, 'attendance');
        const docRef = await addDoc(attendanceRef, {
          ...attendanceData,
          timestamp: serverTimestamp(),
          markedBy: userProfile?.uid || 'system'
        });

        // Run AI Anomaly Detection
        detectAttendanceAnomaly({
          ...attendanceData,
          timestamp: new Date()
        }, organization.id);
      } else {
        await saveOfflineAttendance({
          ...attendanceData,
          timestamp: new Date().toISOString()
        });
        setUnsyncedCount(prev => prev + 1);
      }

      setLastScanResult({ success: true, message: `Attendance recorded for ${student.firstName}` });
      setTimeout(() => {
        setLastScanResult(null);
        setShowScanner(false);
      }, 2000);

    } catch (err) {
      console.error('Error processing scan:', err);
      setLastScanResult({ success: false, message: 'Error recording attendance' });
    } finally {
      setIsProcessing(false);
    }
  };

  const issueNewCard = async (student: Student) => {
    try {
      const cardId = student.studentId || await generateStudentId(organization.id);
      
      // Update student with ID if they don't have one
      if (!student.studentId) {
        await updateDoc(doc(db, 'organizations', organization.id, 'students', student.id), {
          studentId: cardId
        });
      }

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const cardData = {
        studentId: student.id,
        organizationId: organization.id,
        cardId: cardId,
        qrToken: generateQrToken(),
        issuedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        status: 'active'
      };

      await setDoc(doc(db, 'organizations', organization.id, 'student_identity_cards', student.id), cardData);
      setShowCardModal(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/student_identity_cards`);
    }
  };

  const filteredStudents = students.filter(student => 
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: students.length,
    activeCards: Object.values(identityCards).filter(c => c.status === 'active').length,
    expiredSoon: Object.values(identityCards).filter(c => {
      const expiry = new Date(c.expiresAt);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
    }).length,
    missingCards: students.length - Object.keys(identityCards).length
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight">Identity & Attendance</h1>
          <p className="text-[#9e9e9e] text-sm md:text-base">Manage student ID cards, NFC tags, and QR attendance.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline Mode'}
            {unsyncedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px]">
                {unsyncedCount} pending
              </span>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 font-bold px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all shadow-lg text-sm md:text-base ${activeTab === 'scanner' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-white text-[#4a4a4a] border border-[#e5e5e5]'}`}
          >
            <QrCode className="w-4 h-4 md:w-5 md:h-5" />
            Scanner
          </button>
          <button 
            onClick={() => setActiveTab('face')}
            className={`flex items-center gap-2 font-bold px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl transition-all shadow-lg text-sm md:text-base ${activeTab === 'face' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-white text-[#4a4a4a] border border-[#e5e5e5]'}`}
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
            Face AI
          </button>
        </div>
      </header>

      {/* Advanced Tabs */}
      <div className="flex gap-2 md:gap-4 border-b border-[#e5e5e5] pb-4 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap text-sm md:text-base ${activeTab === 'overview' ? 'bg-[#1a1a1a] text-white' : 'text-[#9e9e9e] hover:text-[#1a1a1a]'}`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('anomalies')}
          className={`px-4 md:px-6 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-2 text-sm md:text-base ${activeTab === 'anomalies' ? 'bg-red-600 text-white' : 'text-[#9e9e9e] hover:text-red-600'}`}
        >
          AI Anomalies
          {anomalies.length > 0 && (
            <span className="px-2 py-0.5 bg-white text-red-600 rounded-full text-[10px]">
              {anomalies.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Active Cards</p>
              <h4 className="text-2xl font-bold">{stats.activeCards}</h4>
            </div>
          </div>
          <div className="w-full bg-[#f5f5f5] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-500" 
              style={{ width: `${(stats.activeCards / stats.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Expiring Soon</p>
              <h4 className="text-2xl font-bold">{stats.expiredSoon}</h4>
            </div>
          </div>
          <p className="text-xs text-[#9e9e9e]">Cards expiring in the next 30 days</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Missing Cards</p>
              <h4 className="text-2xl font-bold">{stats.missingCards}</h4>
            </div>
          </div>
          <p className="text-xs text-[#9e9e9e]">Students without an issued ID card</p>
        </div>

        <div className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Total Students</p>
              <h4 className="text-2xl font-bold">{stats.total}</h4>
            </div>
          </div>
          <p className="text-xs text-[#9e9e9e]">Total enrolled student population</p>
        </div>
      </div>

          {/* Student List & Management */}
          <div className="bg-white rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div className="p-4 md:p-8 border-b border-[#e5e5e5] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-[#9e9e9e]" />
            <input 
              type="text" 
              placeholder="Search by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm md:text-base"
            />
          </div>
          <div className="flex gap-2">
            <button className="p-2.5 md:p-3 border border-[#e5e5e5] rounded-xl md:rounded-2xl hover:bg-[#f5f5f5] transition-all">
              <Filter className="w-4 h-4 md:w-5 md:h-5 text-[#1a1a1a]" />
            </button>
            <button className="p-2.5 md:p-3 border border-[#e5e5e5] rounded-xl md:rounded-2xl hover:bg-[#f5f5f5] transition-all">
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 text-[#1a1a1a]" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f9f9f9]">
                <th className="px-4 md:px-8 py-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Student</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest hidden sm:table-cell">Student ID</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Status</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest hidden lg:table-cell">Expiry</th>
                <th className="px-4 md:px-8 py-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e5]">
              {filteredStudents.map((student) => {
                const card = identityCards[student.id];
                return (
                  <tr key={student.id} className="hover:bg-[#fcfcfc] transition-all group">
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center font-bold text-blue-600 text-xs md:text-base">
                          {student.firstName[0]}{student.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-[#1a1a1a] text-sm md:text-base">{student.firstName} {student.lastName}</p>
                          <p className="text-[10px] md:text-xs text-[#9e9e9e]">{student.gradeLevel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 hidden sm:table-cell">
                      <span className="font-mono text-xs md:text-sm bg-[#f5f5f5] px-2 py-1 rounded-lg border border-[#e5e5e5]">
                        {student.studentId || 'NOT ASSIGNED'}
                      </span>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      {card ? (
                        <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${
                          card.status === 'active' ? 'bg-green-100 text-green-700' :
                          card.status === 'suspended' ? 'bg-red-100 text-red-700' :
                          'bg-[#f5f5f5] text-[#9e9e9e]'
                        }`}>
                          {card.status}
                        </span>
                      ) : (
                        <span className="px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700">
                          No Card
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-8 py-4 hidden lg:table-cell">
                      {card ? (
                        <div className="flex items-center gap-2 text-sm text-[#1a1a1a]">
                          <Calendar className="w-4 h-4 text-[#9e9e9e]" />
                          {new Date(card.expiresAt).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-[#9e9e9e] text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 md:px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2 md:opacity-0 md:group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowCardModal(true);
                          }}
                          className="p-1.5 md:p-2 hover:bg-blue-50 text-blue-600 rounded-lg md:rounded-xl transition-all"
                          title="Manage Card"
                        >
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        <button className="p-1.5 md:p-2 hover:bg-[#f5f5f5] text-[#1a1a1a] rounded-lg md:rounded-xl transition-all hidden sm:block" title="Print ID">
                          <Printer className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

        </>
      )}

      {activeTab === 'scanner' && (
        <div className="max-w-2xl mx-auto">
          <QrScanner 
            onScan={handleQrScan}
            onClose={() => setActiveTab('overview')}
            isProcessing={isProcessing}
            lastResult={lastScanResult}
          />
        </div>
      )}

      {activeTab === 'face' && (
        <div className="max-w-2xl mx-auto">
          <FaceAttendance 
            onMatch={handleQrScan}
            organizationId={organization.id}
          />
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-red-600" />
                Detected Anomalies
              </h3>
              {anomalies.length === 0 ? (
                <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-[32px] border border-[#e5e5e5] text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-bold">All Clear!</h4>
                  <p className="text-[#9e9e9e]">No suspicious attendance patterns detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {anomalies.map((anomaly) => (
                    <div key={anomaly.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-red-100 shadow-sm flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className={`p-3 rounded-2xl shrink-0 ${
                          anomaly.severity === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                              anomaly.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {anomaly.severity} Priority
                            </span>
                            <span className="text-xs text-[#9e9e9e]">
                              {new Date(anomaly.detectedAt?.toDate?.() || anomaly.detectedAt).toLocaleString()}
                            </span>
                          </div>
                          <h4 className="font-bold text-[#1a1a1a]">{anomaly.description}</h4>
                          <p className="text-sm text-[#9e9e9e]">Student ID: {anomaly.studentId}</p>
                        </div>
                      </div>
                      <button 
                        onClick={async () => {
                          await updateDoc(doc(db, 'organizations', organization.id, 'attendance_anomalies', anomaly.id), {
                            resolved: true,
                            resolvedAt: serverTimestamp(),
                            resolvedBy: userProfile?.uid
                          });
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[#f5f5f5] text-[#4a4a4a] font-bold rounded-xl hover:bg-[#e5e5e5] transition-all text-sm"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl md:rounded-[32px] border border-[#e5e5e5] shadow-sm">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  AI Guard Settings
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4a4a]">Late Scan Detection</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4a4a]">Multi-Location Check</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#4a4a4a]">Consecutive Absence</span>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative cursor-pointer">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl md:rounded-[32px] text-white shadow-lg">
                <h4 className="font-bold mb-2">AI Insights</h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  Our AI models analyze historical data to predict attendance trends and identify students at risk of falling behind.
                </p>
                <button className="mt-4 w-full py-2 bg-white/20 backdrop-blur-md rounded-xl font-bold text-sm hover:bg-white/30 transition-all">
                  View Full Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCardModal && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl md:rounded-[40px] overflow-hidden w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8 border-b border-[#e5e5e5] flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 md:p-3 bg-blue-50 text-blue-600 rounded-xl md:rounded-2xl">
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold">Manage Student Identity</h3>
                    <p className="text-xs md:text-sm text-[#9e9e9e]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCardModal(false)}
                  className="p-2 hover:bg-[#f5f5f5] rounded-full transition-all"
                >
                  <XCircle className="w-5 h-5 md:w-6 md:h-6 text-[#9e9e9e]" />
                </button>
              </div>

              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                {/* Card Preview */}
                <div className="space-y-6">
                  <div className="aspect-[1.58/1] bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl md:rounded-3xl p-4 md:p-6 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-white/10 rounded-full -mr-12 md:-mr-16 -mt-12 md:-mt-16 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-16 md:w-24 h-16 md:h-24 bg-blue-400/20 rounded-full -ml-8 md:-ml-12 -mb-8 md:-mb-12 blur-xl"></div>
                    
                    <div className="flex justify-between items-start mb-4 md:mb-8 relative z-10">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 md:w-6 md:h-6" />
                        <span className="font-bold text-[10px] md:text-sm tracking-widest uppercase">{organization.name}</span>
                      </div>
                      <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 backdrop-blur-md rounded-lg md:rounded-xl flex items-center justify-center">
                        <QrCode className="w-4 h-4 md:w-6 md:h-6" />
                      </div>
                    </div>

                    <div className="flex gap-3 md:gap-4 items-center relative z-10">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center font-bold text-lg md:text-2xl">
                        {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                      </div>
                      <div>
                        <h4 className="text-sm md:text-lg font-bold leading-tight">{selectedStudent.firstName} {selectedStudent.lastName}</h4>
                        <p className="text-[10px] text-white/70 uppercase tracking-widest font-bold">{selectedStudent.gradeLevel}</p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 md:pt-6 flex justify-between items-end relative z-10">
                      <div>
                        <p className="text-[8px] md:text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Student ID</p>
                        <p className="font-mono text-xs md:text-sm">{selectedStudent.studentId || 'PENDING'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] md:text-[10px] text-white/50 uppercase tracking-widest font-bold mb-1">Expires</p>
                        <p className="text-[10px] md:text-xs font-bold">
                          {identityCards[selectedStudent.id] 
                            ? new Date(identityCards[selectedStudent.id].expiresAt).toLocaleDateString()
                            : '—'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 md:gap-3">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-[#e5e5e5] transition-all text-sm">
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold py-2.5 md:py-3 rounded-xl md:rounded-2xl hover:bg-[#e5e5e5] transition-all text-sm">
                      <ArrowRight className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] md:text-sm font-bold text-[#1a1a1a] uppercase tracking-widest">Card Management</h4>
                    
                    {!identityCards[selectedStudent.id] ? (
                      <button 
                        onClick={() => issueNewCard(selectedStudent)}
                        className="w-full flex items-center gap-4 p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all text-left"
                      >
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm md:text-base">Issue New Card</p>
                          <p className="text-[10px] md:text-xs opacity-70">Generate ID and activate QR token</p>
                        </div>
                      </button>
                    ) : (
                      <>
                        <div className="p-4 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Status</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                              {identityCards[selectedStudent.id].status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] md:text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">NFC Tag</span>
                            <span className="text-[10px] md:text-xs font-mono">
                              {identityCards[selectedStudent.id].nfcUid || 'NOT LINKED'}
                            </span>
                          </div>
                        </div>

                        <button className="w-full flex items-center gap-4 p-4 bg-white text-[#1a1a1a] rounded-2xl border border-[#e5e5e5] hover:bg-[#f5f5f5] transition-all text-left">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <Nfc className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm md:text-base">Link NFC Tag</p>
                            <p className="text-[10px] md:text-xs text-[#9e9e9e]">Tap NFC card to associate UID</p>
                          </div>
                        </button>

                        <button className="w-full flex items-center gap-4 p-4 bg-white text-red-600 rounded-2xl border border-red-100 hover:bg-red-50 transition-all text-left">
                          <div className="p-2 bg-red-50 rounded-xl">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm md:text-base">Suspend Card</p>
                            <p className="text-[10px] md:text-xs text-red-400">Deactivate all access immediately</p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3 mb-2">
                      <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                      <h5 className="font-bold text-indigo-900 text-xs md:text-sm">Security Info</h5>
                    </div>
                    <p className="text-[10px] md:text-xs text-indigo-700 leading-relaxed">
                      QR tokens are rotated on every card renewal. NFC UIDs are hardware-locked and cannot be spoofed by standard mobile devices.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 bg-[#f5f5f5] border-t border-[#e5e5e5] flex justify-end">
                <button 
                  onClick={() => setShowCardModal(false)}
                  className="w-full md:w-auto px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-xl md:rounded-2xl hover:bg-black transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
