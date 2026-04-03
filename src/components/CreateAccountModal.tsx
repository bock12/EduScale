import React, { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { X, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

// Initialize secondary app for creating users without logging out the current admin
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
const secondaryAuth = getAuth(secondaryApp);

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  defaultEmail: string;
  defaultName: string;
  role: 'student' | 'teacher';
  entityId: string; // The ID of the student or teacher document
}

export default function CreateAccountModal({ 
  isOpen, 
  onClose, 
  organizationId, 
  defaultEmail, 
  defaultName, 
  role,
  entityId
}: CreateAccountModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Create the user in Firebase Auth using the secondary app
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCredential.user.uid;

      // 2. Create the user document in Firestore
      await setDoc(doc(db, 'users', newUid), {
        email: email,
        displayName: defaultName,
        role: role,
        organizationId: organizationId,
        entityId: entityId // Link to the specific student or teacher record
      });

      // 3. Sign out the secondary auth instance just to be clean
      await signOut(secondaryAuth);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setPassword('');
      }, 2000);

    } catch (err: any) {
      console.error("Error creating account:", err);
      if (err.code === 'auth/email-already-in-use') {
        // Check if a Firestore document already exists for this email
        try {
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingUserDoc = querySnapshot.docs[0];
            const userData = existingUserDoc.data();
            
            if (userData.entityId === entityId) {
              setError('This user already has a login account linked to this record.');
            } else if (userData.entityId) {
              setError('This email is already linked to another student or teacher record.');
            } else if (userData.organizationId && userData.organizationId !== organizationId) {
              setError('This email is registered with another organization.');
            } else {
              // The account exists in Auth and Firestore but is not linked to an entity
              // We can link it now
              await updateDoc(doc(db, 'users', existingUserDoc.id), {
                entityId: entityId,
                organizationId: organizationId,
                role: role,
                displayName: defaultName // Update name if needed
              });
              setSuccess(true);
              setTimeout(() => {
                onClose();
                setSuccess(false);
                setPassword('');
              }, 2000);
              return;
            }
          } else {
            // Account exists in Auth but not in Firestore
            // This shouldn't happen often if we always create both, but could if a user signed up manually
            setError('An account with this email already exists in our authentication system, but no profile was found. Please contact support.');
          }
        } catch (firestoreErr) {
          console.error("Error checking existing user:", firestoreErr);
          setError('An account with this email already exists.');
        }
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Create Login Account
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-8 animate-in fade-in zoom-in">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Account Created!</h3>
              <p className="text-[#4a4a4a]">
                The {role} can now log in using their email and password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Temporary Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all pr-12"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#9e9e9e] hover:text-[#1a1a1a] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-[#9e9e9e] mt-2">
                  Provide this password to the {role}. They can change it later.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !email || password.length < 6}
                  className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
