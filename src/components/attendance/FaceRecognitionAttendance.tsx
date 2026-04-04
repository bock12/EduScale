import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Organization, StudentFaceEmbedding, AttendanceRecord } from '../../types';
import { loadModels, getFaceEmbedding, compareFaces } from '../../lib/faceApi';
import { saveAttendanceLocally } from '../../lib/db';

interface FaceRecognitionAttendanceProps {
  organization: Organization;
  onAttendanceMarked?: (studentId: string) => void;
}

export default function FaceRecognitionAttendance({ organization, onAttendanceMarked }: FaceRecognitionAttendanceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading', message: string }>({ type: 'idle', message: '' });
  const [embeddings, setEmbeddings] = useState<StudentFaceEmbedding[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        await loadModels();
        setIsModelLoaded(true);
        
        // Fetch all student embeddings for this organization
        const q = query(collection(db, 'organizations', organization.id, 'student_face_embeddings'));
        const snap = await getDocs(q);
        setEmbeddings(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentFaceEmbedding)));
      } catch (err) {
        console.error('Error initializing face-api:', err);
        setStatus({ type: 'error', message: 'Failed to load face recognition models.' });
      }
    };
    init();
  }, [organization.id]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      setStatus({ type: 'error', message: 'Could not access camera.' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraOn(false);
    }
  };

  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScan = async () => {
    if (!videoRef.current || !isModelLoaded || isScanning || !isCameraOn) return;

    // Check if tracks are still active
    const stream = videoRef.current.srcObject as MediaStream;
    if (!stream || !stream.getTracks().some(track => track.readyState === 'live')) {
      setStatus({ type: 'error', message: 'Camera track is not active.' });
      return;
    }

    setIsScanning(true);
    setStatus({ type: 'loading', message: 'Scanning face...' });

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus({ type: 'error', message: 'No face detected. Please try again.' });
        setIsScanning(false);
        return;
      }

      const currentEmbedding = Array.from(detection.descriptor);
      let matchedStudentId: string | null = null;

      // Compare with stored embeddings
      for (const stored of embeddings) {
        if (compareFaces(currentEmbedding, stored.embedding)) {
          matchedStudentId = stored.studentId;
          break;
        }
      }

      if (matchedStudentId) {
        // Mark attendance
        const attendanceRecord: AttendanceRecord = {
          id: '', // Will be set by Firestore or IndexedDB
          organizationId: organization.id,
          studentId: matchedStudentId,
          date: new Date().toISOString().split('T')[0],
          status: 'present',
          method: 'face',
          timestamp: new Date().toISOString()
        };

        if (navigator.onLine) {
          await addDoc(collection(db, 'organizations', organization.id, 'attendance_records'), {
            ...attendanceRecord,
            createdAt: serverTimestamp()
          });
        } else {
          await saveAttendanceLocally(attendanceRecord);
        }

        setStatus({ type: 'success', message: 'Attendance marked successfully!' });
        if (onAttendanceMarked) onAttendanceMarked(matchedStudentId);
      } else {
        setStatus({ type: 'error', message: 'Face not recognized. Please register first.' });
      }
    } catch (err) {
      console.error('Error during scan:', err);
      setStatus({ type: 'error', message: 'An error occurred during scanning.' });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[40px] border border-[#e5e5e5] shadow-sm max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Camera className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Face Recognition Attendance</h2>
        <p className="text-[#9e9e9e] font-medium">Scan student faces to mark attendance automatically.</p>
      </div>

      <div className="relative aspect-video bg-[#f5f5f5] rounded-[32px] overflow-hidden border-4 border-white shadow-inner mb-8">
        {isCameraOn ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9e9e9e]">
            <Camera className="w-12 h-12 mb-2 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Camera Offline</p>
          </div>
        )}
        
        {isScanning && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-blue-500 rounded-full animate-pulse flex items-center justify-center">
              <div className="w-32 h-32 border border-blue-400 rounded-full animate-ping" />
            </div>
          </div>
        )}

        {/* Status Overlay */}
        {status.type !== 'idle' && (
          <div className={`absolute bottom-6 left-6 right-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 ${
            status.type === 'success' ? 'bg-green-500 text-white' : 
            status.type === 'error' ? 'bg-red-500 text-white' : 
            'bg-blue-600 text-white'
          }`}>
            {status.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
            {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {status.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
            <p className="font-bold text-sm">{status.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {!isCameraOn ? (
          <button 
            onClick={startCamera}
            disabled={!isModelLoaded}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
          >
            {isModelLoaded ? 'Start Camera' : 'Loading Models...'}
          </button>
        ) : (
          <>
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              Scan Face
            </button>
            <button 
              onClick={stopCamera}
              className="px-8 py-4 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-2xl font-black hover:bg-[#f9f9f9] transition-all"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {!navigator.onLine && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-xs font-bold">Offline mode active. Attendance will be stored locally and synced later.</p>
        </div>
      )}
    </div>
  );
}
