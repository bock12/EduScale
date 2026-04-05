import React, { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, AlertCircle, User, FlipHorizontal } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, StudentFaceEmbedding, AttendanceRecord, Student } from '../../types';
import { loadModels, compareFaces } from '../../lib/faceApi';
import { saveAttendanceLocally } from '../../lib/db';
import { motion, AnimatePresence } from 'motion/react';

interface FaceRecognitionProps {
  organization: Organization;
  onMatch?: (studentId: string) => void;
  onClose?: () => void;
  mode?: 'attendance' | 'identity' | 'register';
  studentId?: string; // Required for 'register' mode
  sessionId?: string; // Optional: for session-based attendance
  classSectionId?: string; // Optional: for daily attendance
}

export default function FaceRecognition({ 
  organization, 
  onMatch, 
  onClose, 
  mode = 'attendance', 
  studentId,
  sessionId,
  classSectionId
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<{ type: 'idle' | 'success' | 'error' | 'loading', message: string }>({ type: 'idle', message: '' });
  const [embeddings, setEmbeddings] = useState<StudentFaceEmbedding[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [matchedStudent, setMatchedStudent] = useState<Student | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectionActive, setDetectionActive] = useState(false);
  const [activeDetections, setActiveDetections] = useState<any[]>([]);
  const [lastUnknownDetection, setLastUnknownDetection] = useState<number>(0);
  const processedFaces = useRef<Set<string>>(new Set());
  const isUnmounting = useRef(false);
  const cameraRequested = useRef(false);

  useEffect(() => {
    isUnmounting.current = false;
    return () => {
      isUnmounting.current = true;
      cameraRequested.current = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addLog = (msg: string) => {
    console.log(msg);
    setDebugInfo(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    isUnmounting.current = false;
    let unsubscribeEmbeddings: (() => void) | undefined;
    let unsubscribeStudents: (() => void) | undefined;

    const init = async () => {
      addLog('Initializing face recognition...');
      try {
        await loadModels();
        addLog('Face recognition models loaded successfully');
        if (isUnmounting.current) {
          addLog('Component unmounted during model loading, skipping state update');
          return;
        }
        setIsModelLoaded(true);
        
        // Fetch all student embeddings for this organization
        addLog(`Fetching student embeddings for org: ${organization.id}`);
        const q = query(collection(db, 'organizations', organization.id, 'student_face_embeddings'));
        unsubscribeEmbeddings = onSnapshot(q, (snap) => {
          if (isUnmounting.current) return;
          addLog(`Fetched ${snap.docs.length} student embeddings`);
          setEmbeddings(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentFaceEmbedding)));
        }, (err) => {
          if (isUnmounting.current) return;
          addLog(`Error listening to embeddings: ${err.message}`);
          handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/student_face_embeddings`);
        });

        // Fetch students to display names
        const studentsQ = query(collection(db, 'organizations', organization.id, 'students'));
        unsubscribeStudents = onSnapshot(studentsQ, (snap) => {
          if (isUnmounting.current) return;
          const studentMap: Record<string, Student> = {};
          snap.docs.forEach(d => {
            const data = d.data() as Student;
            studentMap[d.id] = { id: d.id, ...data };
          });
          setStudents(studentMap);
        }, (err) => {
          if (isUnmounting.current) return;
          console.error('Error listening to students:', err);
          handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/students`);
        });
      } catch (err) {
        if (isUnmounting.current) return;
        console.error('Error initializing face-api:', err);
        setStatus({ type: 'error', message: `Failed to load face recognition models: ${err instanceof Error ? err.message : 'Unknown error'}` });
      }
    };
    init();

    return () => {
      if (unsubscribeEmbeddings) unsubscribeEmbeddings();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, [organization.id]);

  useEffect(() => {
    if (isModelLoaded && !isCameraOn && !cameraRequested.current) {
      startCamera();
    }
  }, [isModelLoaded]);

  useEffect(() => {
    if (isCameraOn && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      setDetectionActive(true);
    } else {
      setDetectionActive(false);
    }
  }, [isCameraOn, stream]);

  // Face detection loop for visual feedback
  useEffect(() => {
    let animationFrameId: number;
    let isProcessing = false;
    
    const detectFaces = async () => {
      if (!videoRef.current || !canvasRef.current || !isModelLoaded || !isCameraOn || !detectionActive || isProcessing) {
        animationFrameId = requestAnimationFrame(detectFaces);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.paused || video.ended || video.readyState < 2) {
        animationFrameId = requestAnimationFrame(detectFaces);
        return;
      }

      isProcessing = true;

      try {
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        // Don't use true here to avoid overriding Tailwind CSS scaling
        faceapi.matchDimensions(canvas, displaySize);

        // Detect all faces with landmarks and descriptors for recognition
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const currentDetections: any[] = [];

          for (const detection of resizedDetections) {
            const box = detection.detection.box;
            const descriptor = Array.from(detection.descriptor);
            
            let bestMatch: { studentId: string; distance: number } | null = null;
            let minDistance = 0.55; // Slightly stricter threshold for auto-attendance

            for (const stored of embeddings) {
              const distance = faceapi.euclideanDistance(descriptor, stored.embedding);
              if (distance < minDistance) {
                minDistance = distance;
                bestMatch = { studentId: stored.studentId, distance };
              }
            }

            const student = bestMatch ? students[bestMatch.studentId] : null;
            const isRecognized = !!student;

            currentDetections.push({
              box,
              student,
              isRecognized
            });

            // Draw bounding box
            ctx.strokeStyle = isRecognized ? '#22c55e' : '#ef4444'; // green-500 or red-500
            ctx.lineWidth = 4;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            // Draw corners
            const cornerSize = 20;
            ctx.strokeStyle = isRecognized ? '#4ade80' : '#f87171'; // green-400 or red-400
            ctx.lineWidth = 6;
            
            // Top Left
            ctx.beginPath();
            ctx.moveTo(box.x, box.y + cornerSize);
            ctx.lineTo(box.x, box.y);
            ctx.lineTo(box.x + cornerSize, box.y);
            ctx.stroke();
            
            // Top Right
            ctx.beginPath();
            ctx.moveTo(box.right - cornerSize, box.y);
            ctx.lineTo(box.right, box.y);
            ctx.lineTo(box.right, box.y + cornerSize);
            ctx.stroke();
            
            // Bottom Left
            ctx.beginPath();
            ctx.moveTo(box.x, box.bottom - cornerSize);
            ctx.lineTo(box.x, box.bottom);
            ctx.lineTo(box.x + cornerSize, box.bottom);
            ctx.stroke();
            
            // Bottom Right
            ctx.beginPath();
            ctx.moveTo(box.right - cornerSize, box.bottom);
            ctx.lineTo(box.right, box.bottom);
            ctx.lineTo(box.right, box.bottom - cornerSize);
            ctx.stroke();

            // Draw Name Tag
            if (isRecognized) {
              const name = `${student.firstName} ${student.lastName}`;
              ctx.fillStyle = '#22c55e';
              ctx.font = 'bold 24px Inter, sans-serif';
              const textWidth = ctx.measureText(name).width;
              
              // Background for text
              ctx.fillRect(box.x, box.y - 40, textWidth + 20, 40);
              
              // Text
              ctx.fillStyle = '#ffffff';
              ctx.fillText(name, box.x + 10, box.y - 12);

              // Automatic Attendance Recording
              if (mode === 'attendance' && !processedFaces.current.has(student.id)) {
                recordAttendance(student.id);
                processedFaces.current.add(student.id);
              }
            } else {
              // Unknown Face Tracking
              const now = Date.now();
              if (now - lastUnknownDetection > 10000) { // Throttle unknown detections to every 10s
                const captureCanvas = document.createElement('canvas');
                captureCanvas.width = video.videoWidth;
                captureCanvas.height = video.videoHeight;
                const captureCtx = captureCanvas.getContext('2d');
                if (captureCtx) {
                  captureCtx.drawImage(video, 0, 0);
                  const imageData = captureCanvas.toDataURL('image/jpeg', 0.6);
                  recordUnknownDetection(imageData);
                } else {
                  recordUnknownDetection();
                }
                setLastUnknownDetection(now);
              }

              ctx.fillStyle = '#ef4444';
              ctx.font = 'bold 20px Inter, sans-serif';
              ctx.fillText('UNKNOWN', box.x + 10, box.y - 12);
            }
          }
          setActiveDetections(currentDetections);
        }
      } catch (err) {
        console.error('Detection loop error:', err);
      } finally {
        isProcessing = false;
      }

      animationFrameId = requestAnimationFrame(detectFaces);
    };

    if (detectionActive) {
      detectFaces();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [detectionActive, isModelLoaded, isCameraOn]);

  useEffect(() => {
    if (status.type === 'success') {
      const timer = setTimeout(() => {
        setStatus({ type: 'idle', message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status.type]);

  const recordAttendance = async (matchedStudentId: string) => {
    const student = students[matchedStudentId];
    if (!student) return;

    // Mark attendance
    const attendanceRecord: any = {
      organizationId: organization.id,
      studentId: matchedStudentId,
      date: new Date().toISOString().split('T')[0],
      status: 'present',
      method: 'face',
      timestamp: new Date().toISOString()
    };

    if (sessionId) {
      attendanceRecord.sessionId = sessionId;
    } else {
      attendanceRecord.classId = 'general';
    }

    try {
      if (navigator.onLine) {
        // If it's a daily attendance update (Class Master style)
        if (classSectionId) {
          const dailyRef = collection(db, 'organizations', organization.id, 'daily_attendance');
          const dailyQ = query(
            dailyRef, 
            where('classSectionId', '==', classSectionId), 
            where('date', '==', attendanceRecord.date)
          );
          const dailySnap = await getDocs(dailyQ);
          
          if (!dailySnap.empty) {
            const docId = dailySnap.docs[0].id;
            const data = dailySnap.docs[0].data();
            const records = data.records || [];
            const existingIdx = records.findIndex((r: any) => r.studentId === matchedStudentId);
            
            if (existingIdx >= 0) {
              records[existingIdx] = { ...records[existingIdx], status: 'present', method: 'face', timestamp: new Date().toISOString() };
            } else {
              records.push({ studentId: matchedStudentId, status: 'present', method: 'face', timestamp: new Date().toISOString() });
            }
            
            await updateDoc(doc(db, 'organizations', organization.id, 'daily_attendance', docId), {
              records,
              updatedAt: serverTimestamp()
            });
          } else {
            // Create new daily attendance record
            await addDoc(dailyRef, {
              organizationId: organization.id,
              classSectionId: classSectionId,
              date: attendanceRecord.date,
              records: [{ studentId: matchedStudentId, status: 'present', method: 'face', timestamp: new Date().toISOString() }],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }

        // Always add to attendance_records for history/reporting
        await addDoc(collection(db, 'organizations', organization.id, 'attendance_records'), {
          ...attendanceRecord,
          createdAt: serverTimestamp()
        });
      } else {
        await saveAttendanceLocally(attendanceRecord);
      }
      
      setStatus({ type: 'success', message: `Attendance marked for ${student.firstName}!` });
      if (onMatch) onMatch(matchedStudentId);
    } catch (err) {
      console.error('Error recording attendance:', err);
    }
  };

  const recordUnknownDetection = async (image?: string) => {
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'unknown_detections'), {
        organizationId: organization.id,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        location: sessionId ? `Session: ${sessionId}` : classSectionId ? `Class: ${classSectionId}` : 'General',
        sessionId: sessionId || null,
        classSectionId: classSectionId || null,
        method: 'face',
        image: image || null,
        createdAt: serverTimestamp()
      });
      addLog('Unknown face detection recorded');
    } catch (err) {
      console.error('Error recording unknown detection:', err);
    }
  };

  const startCamera = async () => {
    if (isUnmounting.current) return;
    addLog('Attempting to start camera...');
    cameraRequested.current = true;
    setStatus({ type: 'loading', message: 'Starting camera...' });
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser or context (requires HTTPS)');
      }

      const constraints = [
        { video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode } },
        { video: true }
      ];

      let lastError = null;
      let newStream = null;

      for (const constraint of constraints) {
        try {
          addLog(`Trying constraints: ${JSON.stringify(constraint)}`);
          newStream = await navigator.mediaDevices.getUserMedia(constraint);
          if (newStream) break;
        } catch (e) {
          lastError = e;
          addLog(`Failed with constraint: ${JSON.stringify(constraint)} - ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      if (!newStream) {
        throw lastError || new Error('Failed to get camera stream with any constraints');
      }

      if (!cameraRequested.current || isUnmounting.current) {
        addLog('Camera request cancelled or component unmounting');
        newStream.getTracks().forEach(track => track.stop());
        return;
      }

      addLog('Camera stream obtained successfully');
      setStream(newStream);
      setIsCameraOn(true);
      setStatus({ type: 'idle', message: '' });
    } catch (err: any) {
      if (isUnmounting.current) return;
      addLog(`Error starting camera: ${err.name} - ${err.message}`);
      
      let errorMessage = 'Could not access camera. Please check permissions.';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions in your browser.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.message) {
        errorMessage = `Camera error: ${err.message}`;
      }
      
      setStatus({ type: 'error', message: errorMessage });
    }
  };

  const stopCamera = () => {
    addLog('Stopping camera...');
    cameraRequested.current = false;
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    setStream(null);
    setIsCameraOn(false);
    setIsScanning(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    addLog(`Switching to ${newMode} camera...`);
    setFacingMode(newMode);
    stopCamera();
    cameraRequested.current = true;
  };

  useEffect(() => {
    if (isModelLoaded && !isCameraOn && cameraRequested.current) {
      startCamera();
    }
  }, [facingMode, isModelLoaded]);

  const handleScan = async () => {
    if (!videoRef.current || !isModelLoaded || isScanning || !isCameraOn) return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) { // HAVE_CURRENT_DATA
      setStatus({ type: 'error', message: 'Camera is warming up. Please wait.' });
      return;
    }

    const activeStream = video.srcObject as MediaStream;
    if (!activeStream || !activeStream.getTracks().some(track => track.readyState === 'live')) {
      setStatus({ type: 'error', message: 'Camera track is not active.' });
      return;
    }

    setIsScanning(true);
    setStatus({ type: 'loading', message: 'Scanning face...' });
    setMatchedStudent(null);

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (isUnmounting.current || !isCameraOn) return;

      if (!detection) {
        setStatus({ type: 'error', message: 'No face detected. Please try again.' });
        setIsScanning(false);
        return;
      }

      const currentEmbedding = Array.from(detection.descriptor);
      
      if (mode === 'register' && studentId) {
        // Save embedding for the student (one per student)
        try {
          const embeddingRef = doc(db, 'organizations', organization.id, 'student_face_embeddings', studentId);
          await setDoc(embeddingRef, {
            studentId,
            organizationId: organization.id,
            embedding: currentEmbedding,
            updatedAt: new Date().toISOString(),
            createdAt: serverTimestamp()
          });
          setStatus({ type: 'success', message: 'Face registered successfully!' });
          if (onMatch) onMatch(studentId);
          setTimeout(() => {
            if (onClose) onClose();
          }, 2000);
        } catch (err) {
          console.error('Error saving embedding:', err);
          setStatus({ type: 'error', message: 'Failed to save face registration.' });
        }
      } else {
        // Manual scan logic (fallback)
        let matchedStudentId: string | null = null;
        for (const stored of embeddings) {
          if (compareFaces(currentEmbedding, stored.embedding)) {
            matchedStudentId = stored.studentId;
            break;
          }
        }

        if (matchedStudentId) {
          recordAttendance(matchedStudentId);
        } else {
          setStatus({ type: 'error', message: 'Face not recognized. Please register first.' });
        }
      }
    } catch (err: any) {
      if (isUnmounting.current) return;
      
      // Handle the "Track is in an invalid state" error gracefully
      if (err.name === 'InvalidStateError' || err.message?.includes('Track is in an invalid state')) {
        console.warn('Face recognition scan interrupted by track state change');
        return;
      }
      
      console.error('Error during scan:', err);
      setStatus({ type: 'error', message: 'An error occurred during scanning.' });
    } finally {
      if (!isUnmounting.current) {
        setIsScanning(false);
      }
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-[32px] md:rounded-[40px] border border-[#e5e5e5] shadow-sm max-w-2xl mx-auto relative">
      {onClose && (
        <button 
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-black/5 rounded-full transition-all z-30"
        >
          <XCircle className="w-6 h-6 text-[#9e9e9e]" />
        </button>
      )}
      <div className="text-center mb-6 md:mb-8">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Camera className="w-6 h-6 md:w-8 md:h-8" />
        </div>
        <h2 className="text-xl md:text-2xl font-black tracking-tight">
          {mode === 'attendance' ? 'Face Recognition Attendance' : 
           mode === 'register' ? 'Register Student Face' : 'Face Identity Verification'}
        </h2>
        <p className="text-[#9e9e9e] font-medium text-sm md:text-base">
          {mode === 'attendance' 
            ? 'Scan student faces to mark attendance automatically.' 
            : mode === 'register'
            ? 'Capture a face embedding to enable facial recognition for this student.'
            : 'Verify student identity using facial recognition.'}
        </p>
      </div>

      <div className="relative aspect-video bg-[#f5f5f5] rounded-[24px] md:rounded-[32px] overflow-hidden border-4 border-white shadow-inner mb-6 md:mb-8">
        {isCameraOn ? (
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline
            onLoadedMetadata={() => {
              console.log('Video metadata loaded, starting playback...');
              videoRef.current?.play().catch(e => console.error('Error playing video:', e));
            }}
            onPlay={() => console.log('Video playback started')}
            onPause={() => console.log('Video playback paused')}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9e9e9e]">
            <Camera className="w-10 h-10 md:w-12 md:h-12 mb-2 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Camera Offline</p>
          </div>
        )}

        {/* Face Detection Canvas Overlay */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />
        
        {/* Scanning Animation Overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              <div className="w-full h-1 bg-blue-500/50 absolute top-0 animate-scan shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              <div className="absolute inset-0 border-[20px] md:border-[40px] border-black/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 border-2 border-blue-500 rounded-3xl border-dashed opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Overlay */}
        <AnimatePresence>
          {status.type === 'success' && (mode === 'register' || matchedStudent) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-green-500/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center z-20"
            >
              <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 mb-4" />
              <h4 className="text-xl md:text-2xl font-bold mb-1">
                {mode === 'attendance' ? 'Attendance Recorded!' : 
                 mode === 'register' ? 'Face Registered!' : 'Identity Verified!'}
              </h4>
              {matchedStudent && (
                <p className="text-base md:text-lg opacity-90">Welcome, {matchedStudent.firstName} {matchedStudent.lastName}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Overlay (Error/Loading) */}
        <AnimatePresence>
          {status.type !== 'idle' && status.type !== 'success' && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 p-4 rounded-2xl flex items-center gap-3 z-10 ${
                status.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {status.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {status.type === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
              <p className="font-bold text-sm">{status.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {!isCameraOn ? (
          <button 
            onClick={startCamera}
            disabled={(!isModelLoaded && status.type !== 'error') || status.type === 'loading'}
            className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 text-sm md:text-base"
          >
            {status.type === 'error' && status.message.includes('models') ? 'Retry Loading Models' : 
             status.type === 'loading' ? 'Starting Camera...' :
             isModelLoaded ? 'Start Camera' : 'Loading Models...'}
          </button>
        ) : (
          <>
            {mode === 'register' && (
              <button 
                onClick={handleScan}
                disabled={isScanning || status.type === 'success'}
                className="flex-1 py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                Capture & Register
              </button>
            )}
            <button 
              onClick={toggleCamera}
              className="px-4 py-3 md:py-4 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-xl md:rounded-2xl font-black hover:bg-[#f9f9f9] transition-all flex items-center justify-center"
              title="Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button 
              onClick={stopCamera}
              className="px-6 md:px-8 py-3 md:py-4 bg-white border border-[#e5e5e5] text-[#1a1a1a] rounded-xl md:rounded-2xl font-black hover:bg-[#f9f9f9] transition-all text-sm md:text-base"
            >
              Stop
            </button>
          </>
        )}
      </div>

      {!navigator.onLine && mode === 'attendance' && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700">
          <AlertCircle className="w-5 h-5" />
          <p className="text-xs font-bold">Offline mode active. Attendance will be stored locally and synced later.</p>
        </div>
      )}

      {debugInfo.length > 0 && (
        <div className="mt-8 p-4 bg-gray-900 rounded-2xl overflow-hidden">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2">Debug Console</p>
          <div className="space-y-1">
            {debugInfo.map((info, i) => (
              <p key={i} className="text-[10px] font-mono text-green-400 break-all">{info}</p>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
