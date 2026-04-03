import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Student, Organization } from '../../types';
import { 
  ShieldCheck, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  MapPin, 
  Phone,
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

export default function VerificationPortal() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [student, setStudent] = useState<Student | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!studentId) {
        setError('Invalid verification link');
        setLoading(false);
        return;
      }

      try {
        // Find organization first (in a real app, this would be part of the URL or a global lookup)
        // For this demo, we'll search across organizations for the student
        const orgsRef = collection(db, 'organizations');
        const orgsSnapshot = await getDocs(orgsRef);
        
        let foundStudent: Student | null = null;
        let foundOrg: Organization | null = null;
        let foundCard: any = null;

        for (const orgDoc of orgsSnapshot.docs) {
          const orgId = orgDoc.id;
          const studentRef = doc(db, 'organizations', orgId, 'students', studentId);
          const studentSnap = await getDoc(studentRef);
          
          if (studentSnap.exists()) {
            foundStudent = { id: studentSnap.id, ...studentSnap.data() } as Student;
            foundOrg = { id: orgDoc.id, ...orgDoc.data() } as Organization;
            
            // Check card status
            const cardRef = doc(db, 'organizations', orgId, 'student_identity_cards', studentId);
            const cardSnap = await getDoc(cardRef);
            if (cardSnap.exists()) {
              foundCard = cardSnap.data();
            }
            break;
          }
        }

        if (!foundStudent || !foundOrg) {
          setError('Student record not found');
        } else {
          // If token is provided, verify it
          if (token && foundCard && foundCard.qrToken !== token) {
            setError('Invalid or expired verification token');
          } else {
            setStudent(foundStudent);
            setOrganization(foundOrg);
            setCard(foundCard);
          }
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [studentId, token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="font-bold text-[#1a1a1a]">Verifying Identity...</p>
        </div>
      </div>
    );
  }

  if (error || !student || !organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-xl border border-red-100 text-center"
        >
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Verification Failed</h2>
          <p className="text-[#9e9e9e] mb-8">{error || 'This student identity could not be verified.'}</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-[#1a1a1a] text-white font-bold rounded-2xl hover:bg-black transition-all"
          >
            Return to Homepage
          </button>
        </motion.div>
      </div>
    );
  }

  const isCardActive = card && card.status === 'active';
  const isExpired = card && new Date(card.expiresAt) < new Date();

  return (
    <div className="min-h-screen bg-[#f9f9f9] py-8 md:py-12 px-4 md:px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" />
            Official Verification Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a1a]">Student Identity Verified</h1>
          <p className="text-[#9e9e9e] mt-2 text-sm md:text-base">Verified by {organization.name}</p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl md:rounded-[48px] shadow-2xl shadow-blue-100/50 overflow-hidden border border-[#e5e5e5]">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-10 text-white text-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[40px] bg-white/20 backdrop-blur-md border-2 border-white/30 mx-auto mb-6 flex items-center justify-center overflow-hidden shadow-xl">
              <User className="w-12 h-12 md:w-16 md:h-16 text-white/80" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold">{student.firstName} {student.lastName}</h2>
            <p className="text-white/70 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1">{student.gradeLevel}</p>
            
            <div className="mt-6 md:mt-8 inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md rounded-xl text-xs md:text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Identity Authenticated
            </div>
          </div>

          <div className="p-6 md:p-10 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Student ID</p>
                <p className="font-mono font-bold text-[#1a1a1a] text-sm md:text-base">{student.studentId}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Card Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCardActive && !isExpired ? 'bg-green-500' : 'bg-red-500'}`} />
                  <p className={`font-bold uppercase text-[10px] md:text-xs tracking-widest ${isCardActive && !isExpired ? 'text-green-600' : 'text-red-600'}`}>
                    {isExpired ? 'EXPIRED' : (card?.status || 'INACTIVE')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5]">
                <div className="p-2 bg-white rounded-xl shadow-sm text-blue-600 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Institution</p>
                  <p className="font-bold text-[#1a1a1a] text-sm md:text-base">{organization.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5]">
                <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">Enrollment Date</p>
                  <p className="font-bold text-[#1a1a1a] text-sm md:text-base">{new Date(student.enrollmentDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#e5e5e5]">
              <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-[10px] md:text-xs leading-relaxed">
                  This verification is valid for the current academic session. If you suspect this identity is being used fraudulently, please contact the school administration immediately.
                </p>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full flex items-center justify-center gap-2 py-3 md:py-4 border-2 border-[#1a1a1a] text-[#1a1a1a] font-bold rounded-2xl hover:bg-[#f5f5f5] transition-all text-sm md:text-base"
            >
              Print Verification Certificate
            </button>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-[#9e9e9e] text-sm">© 2026 EduScale Smart Identity System</p>
          <div className="flex items-center justify-center gap-6">
            <a href="#" className="text-xs font-bold text-[#1a1a1a] hover:underline">Privacy Policy</a>
            <a href="#" className="text-xs font-bold text-[#1a1a1a] hover:underline">Terms of Service</a>
            <a href="#" className="text-xs font-bold text-[#1a1a1a] hover:underline">Contact Support</a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
