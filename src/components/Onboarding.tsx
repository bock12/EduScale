import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { School, Building, Phone, Mail, CheckCircle2, ArrowRight, BookOpen, X, Loader2 } from 'lucide-react';
import { User } from 'firebase/auth';

interface OnboardingProps {
  authUser: User;
  inviteId?: string | null;
}

export default function Onboarding({ authUser, inviteId }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingInvite, setFetchingInvite] = useState(!!inviteId);
  const [inviteData, setInviteData] = useState<any>(null);
  
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    schoolName: '',
    address: '',
    contactEmail: authUser.email || '',
    phone: '',
    website: '',
    motto: '',
    mission: '',
    vision: '',
    logoUrl: '',
    plan: 'premium' as 'basic' | 'premium' | 'enterprise',
    academicYearName: `${currentYear}-${currentYear + 1}`,
    academicStartDate: `${currentYear}-08-01`,
    academicEndDate: `${currentYear + 1}-06-30`,
    departments: ['Mathematics', 'Science', 'English', 'History', 'Physical Education', 'Arts'],
    gradingScale: 'standard',
    termsAccepted: false
  });

  useEffect(() => {
    async function fetchInvite() {
      if (!inviteId) return;
      try {
        const inviteDoc = await getDoc(doc(db, 'invitations', inviteId));
        if (inviteDoc.exists()) {
          const data = inviteDoc.data();
          setInviteData(data);
          setFormData(prev => ({
            ...prev,
            schoolName: data.schoolName || prev.schoolName,
            plan: data.plan || prev.plan,
            contactEmail: data.recipientEmail || prev.contactEmail
          }));
        }
      } catch (error) {
        console.error("Error fetching invite:", error);
      } finally {
        setFetchingInvite(false);
      }
    }
    fetchInvite();
  }, [inviteId]);
  
  const [newDepartment, setNewDepartment] = useState('');
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Logo must be less than 1MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDepartment = () => {
    if (newDepartment.trim() && !formData.departments.includes(newDepartment.trim())) {
      setFormData({
        ...formData,
        departments: [...formData.departments, newDepartment.trim()]
      });
      setNewDepartment('');
    }
  };

  const handleRemoveDepartment = (deptToRemove: string) => {
    setFormData({
      ...formData,
      departments: formData.departments.filter(d => d !== deptToRemove)
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 1. Create Organization
      try {
        await setDoc(doc(db, 'organizations', orgId), {
          name: formData.schoolName,
          address: formData.address,
          contactEmail: formData.contactEmail,
          phone: formData.phone,
          website: formData.website,
          motto: formData.motto,
          mission: formData.mission,
          vision: formData.vision,
          logoUrl: formData.logoUrl || `https://picsum.photos/seed/${formData.schoolName}/200/200`,
          subscriptionPlan: formData.plan,
          status: 'pending', // Always pending for review as requested
          termsAccepted: formData.termsAccepted,
          termsAcceptedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          setupConfig: {
            academicYear: {
              name: formData.academicYearName,
              startDate: formData.academicStartDate,
              endDate: formData.academicEndDate
            },
            departments: formData.departments,
            gradingScale: formData.gradingScale
          }
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}`);
        return;
      }

      // 2. Create User Profile
      try {
        await setDoc(doc(db, 'users', authUser.uid), {
          email: authUser.email,
          displayName: authUser.displayName || 'Admin',
          role: 'school_admin',
          organizationId: orgId,
          photoURL: authUser.photoURL,
          requiresPasswordChange: !!inviteId && authUser.providerData.some(p => p.providerId === 'password'),
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${authUser.uid}`);
        return;
      }

      // 3. Mark invitation as accepted if applicable
      if (inviteId) {
        try {
          await updateDoc(doc(db, 'invitations', inviteId), {
            status: 'accepted',
            acceptedAt: new Date().toISOString(),
            acceptedBy: authUser.uid
          });
          sessionStorage.removeItem('pendingInviteId');
        } catch (err) {
          console.error("Error updating invite status:", err);
        }
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingInvite) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mb-4" />
        <p className="text-[#9e9e9e] font-bold animate-pulse">Validating Invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          {inviteData ? (
            <div className="animate-in fade-in slide-in-from-top-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 mb-6 shadow-sm border border-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2">Invitation Accepted</h1>
              <p className="text-[#9e9e9e]">Setting up <strong>{inviteData.schoolName}</strong> for you.</p>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white mb-6 shadow-sm border border-[#e5e5e5]">
                <School className="w-8 h-8 text-[#1a1a1a]" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to EduScale</h1>
              <p className="text-[#9e9e9e]">Let's get your school set up on the platform.</p>
            </>
          )}
        </div>

        <div className="bg-white rounded-[32px] border border-[#e5e5e5] shadow-xl overflow-hidden">
          {/* Progress Bar */}
          <div className="flex border-b border-[#e5e5e5]">
            {[1, 2, 3, 4, 5].map((s) => (
              <div 
                key={s} 
                className={`flex-1 h-2 ${step >= s ? 'bg-blue-600' : 'bg-transparent'} ${s !== 5 ? 'border-r border-[#e5e5e5]/30' : ''}`} 
                style={{ transition: 'background-color 0.3s ease' }}
              />
            ))}
          </div>

          <div className="p-10">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Building className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">School Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col items-center mb-6">
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-4 text-center w-full">School Logo</label>
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="w-32 h-32 rounded-3xl border-2 border-dashed border-[#e5e5e5] bg-[#f9f9f9] flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all overflow-hidden group relative"
                    >
                      {formData.logoUrl ? (
                        <>
                          <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Building className="w-6 h-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Building className="w-8 h-8 text-[#9e9e9e] mb-2 group-hover:text-blue-600" />
                          <span className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest group-hover:text-blue-600">Upload Logo</span>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <p className="text-[10px] text-[#9e9e9e] mt-2">Max 1MB. Recommended 512x512px.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Name</label>
                    <input 
                      type="text" 
                      value={formData.schoolName}
                      onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Lincoln High School"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Address</label>
                    <textarea 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="Full school address"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Motto</label>
                    <input 
                      type="text" 
                      value={formData.motto}
                      onChange={(e) => setFormData({...formData, motto: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. Excellence in Education"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={!formData.schoolName || !formData.address}
                  className="w-full mt-8 flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Phone className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Identity & Mission</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Mission</label>
                    <textarea 
                      value={formData.mission}
                      onChange={(e) => setFormData({...formData, mission: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                      placeholder="Our mission is to..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Vision</label>
                    <textarea 
                      value={formData.vision}
                      onChange={(e) => setFormData({...formData, vision: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                      placeholder="We envision a world where..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Website (Optional)</label>
                    <input 
                      type="url" 
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
                      placeholder="https://www.school.edu"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!formData.mission || !formData.vision}
                    className="flex-[2] flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Mail className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Contact Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
                      <input 
                        type="email" 
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
                      <input 
                        type="tel" 
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(2)}
                    className="flex-1 py-4 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(4)}
                    disabled={!formData.contactEmail || !formData.phone}
                    className="flex-[2] flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Academic Setup</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Academic Year */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1a1a1a] border-b border-[#e5e5e5] pb-2">Initial Academic Year</h3>
                    <div>
                      <label className="block text-xs font-bold text-[#9e9e9e] uppercase mb-1">Year Name</label>
                      <input 
                        type="text" 
                        value={formData.academicYearName}
                        onChange={(e) => setFormData({...formData, academicYearName: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#9e9e9e] uppercase mb-1">Start Date</label>
                        <input 
                          type="date" 
                          value={formData.academicStartDate}
                          onChange={(e) => setFormData({...formData, academicStartDate: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#9e9e9e] uppercase mb-1">End Date</label>
                        <input 
                          type="date" 
                          value={formData.academicEndDate}
                          onChange={(e) => setFormData({...formData, academicEndDate: e.target.value})}
                          className="w-full px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Departments */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1a1a1a] border-b border-[#e5e5e5] pb-2">Departments</h3>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()}
                        placeholder="Add a department..."
                        className="flex-1 px-4 py-2 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all"
                      />
                      <button 
                        onClick={handleAddDepartment}
                        className="px-4 py-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold rounded-xl hover:bg-[#e5e5e5] transition-all"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.departments.map((dept) => (
                        <span key={dept} className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                          {dept}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-orange-900" 
                            onClick={() => handleRemoveDepartment(dept)}
                          />
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Grading Scale */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-[#1a1a1a] border-b border-[#e5e5e5] pb-2">Grading Scale</h3>
                    <select 
                      value={formData.gradingScale}
                      onChange={(e) => setFormData({...formData, gradingScale: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-orange-600 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="standard">Standard Letter (A, B, C, D, F)</option>
                      <option value="numeric">Numeric (0-100)</option>
                      <option value="gpa">GPA (0.0 - 4.0)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(3)}
                    className="flex-1 py-4 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setStep(5)}
                    disabled={!formData.academicYearName || !formData.academicStartDate || !formData.academicEndDate}
                    className="flex-[2] flex items-center justify-center gap-2 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50"
                  >
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Review & Terms</h2>
                </div>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'basic', name: 'Basic', price: '$2/mo', desc: 'Core features' },
                      { id: 'premium', name: 'Premium', price: '$3/mo', desc: 'AI Grading' },
                      { id: 'enterprise', name: 'Enterprise', price: '$5/mo', desc: 'Full Suite' }
                    ].map((plan) => (
                      <div 
                        key={plan.id}
                        onClick={() => setFormData({...formData, plan: plan.id as any})}
                        className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                          formData.plan === plan.id 
                            ? 'border-green-600 bg-green-50' 
                            : 'border-[#e5e5e5] hover:border-green-200'
                        }`}
                      >
                        <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                        <p className="text-2xl font-black mb-2">{plan.price}<span className="text-xs text-[#9e9e9e] font-normal">/student</span></p>
                        <p className="text-xs text-[#4a4a4a]">{plan.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="bg-[#f5f5f5] p-6 rounded-2xl space-y-4">
                    <h3 className="font-bold text-[#1a1a1a]">Terms & Conditions</h3>
                    <div className="text-xs text-[#4a4a4a] h-32 overflow-y-auto pr-2 space-y-2">
                      <p>By submitting this form, you agree to EduScale's Terms of Service and Privacy Policy.</p>
                      <p>1. You represent that you have the authority to register this educational institution.</p>
                      <p>2. All information provided must be accurate and verifiable.</p>
                      <p>3. Your application will be reviewed by our compliance team. Approval is at the sole discretion of EduScale.</p>
                      <p>4. Branding rights: You grant EduScale a non-exclusive license to use your school's logo and name for the purpose of providing the service.</p>
                      <p>5. Claims: Any disputes regarding branding or intellectual property must be submitted through the official claims portal.</p>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.termsAccepted}
                        onChange={(e) => setFormData({...formData, termsAccepted: e.target.checked})}
                        className="w-5 h-5 rounded border-[#e5e5e5] text-green-600 focus:ring-green-600"
                      />
                      <span className="text-sm font-bold text-[#1a1a1a]">I accept the terms and conditions</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    onClick={() => setStep(4)}
                    className="flex-1 py-4 rounded-xl font-bold text-[#4a4a4a] bg-[#f5f5f5] hover:bg-[#e5e5e5] transition-all"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleSubmit}
                    disabled={loading || !formData.termsAccepted}
                    className="flex-[2] flex items-center justify-center gap-2 bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Submit for Approval'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
