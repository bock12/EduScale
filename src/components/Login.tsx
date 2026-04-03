import React, { useState } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { School, Mail, Lock, User as UserIcon, ShieldAlert } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const pendingInviteId = sessionStorage.getItem('pendingInviteId');

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The App.tsx listener will handle the redirect to Onboarding if the user profile doesn't exist
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        try {
          await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // If sign in fails, check if it's a temporary credential from an invitation
          if (signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/user-not-found') {
            let inviteData = null;
            let inviteId = sessionStorage.getItem('pendingInviteId');
            
            // Try to fetch by ID first (more secure, allowed by rules)
            if (inviteId) {
              const { getDoc, doc } = await import('firebase/firestore');
              const inviteDoc = await getDoc(doc(db, 'invitations', inviteId));
              if (inviteDoc.exists()) {
                const data = inviteDoc.data();
                if (data.recipientEmail === email && data.tempPassword === password && data.status === 'pending') {
                  inviteData = data;
                }
              }
            }
            
            // Fallback to query if no ID in session (requires rule change or might still fail)
            if (!inviteData) {
              const q = query(
                collection(db, 'invitations'), 
                where('recipientEmail', '==', email),
                where('tempPassword', '==', password),
                where('status', '==', 'pending')
              );
              const inviteSnap = await getDocs(q);
              if (!inviteSnap.empty) {
                inviteData = inviteSnap.docs[0].data();
                inviteId = inviteSnap.docs[0].id;
              }
            }
            
            if (inviteData && inviteId) {
              // Create the account using the temporary credentials
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              await updateProfile(userCredential.user, { displayName: inviteData.schoolName });
              
              // Store invite ID in session to trigger onboarding
              sessionStorage.setItem('pendingInviteId', inviteId);
              return;
            }
          }
          throw signInErr;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      console.error(err);
      // Provide more user-friendly error messages for common Firebase auth errors
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in the Firebase Console.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white mb-6 shadow-2xl shadow-white/10">
            <School className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-3">EduScale</h1>
          <p className="text-gray-400 text-base">National-scale education management.</p>
        </div>

        <div className="bg-[#151515] p-8 rounded-[32px] border border-white/5 shadow-2xl">
          {pendingInviteId && (
            <div className="mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                <School className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-400">School Invitation</h4>
                <p className="text-xs text-blue-400/70 mt-0.5">You've been invited to set up a school portal. Please sign in to continue.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                  placeholder="name@school.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder-gray-600"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#151515] text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Google
          </button>

          {error && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
