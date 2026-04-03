import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc, deleteField, collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Organization, GradingScale, UserProfile } from '../types';
import { Palette, Image as ImageIcon, Save, CheckCircle2, Building2, Upload, Globe, AlertCircle, Ruler, User as UserIcon, Mail, Shield, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../firebase';
import { Vibrant } from 'node-vibrant/browser';

interface SettingsProps {
  organization: Organization;
  userProfile: UserProfile | null;
}

export default function Settings({ organization, userProfile }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'organization' | 'profile'>('organization');
  
  // Organization state
  const [primaryColor, setPrimaryColor] = useState(organization.primaryColor || '#2563eb');
  const [secondaryColor, setSecondaryColor] = useState(organization.secondaryColor || '#9333ea');
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');
  const [name, setName] = useState(organization.name || '');
  const [address, setAddress] = useState(organization.address || '');
  const [phone, setPhone] = useState(organization.phone || '');
  const [contactEmail, setContactEmail] = useState(organization.contactEmail || '');
  const [customDomain, setCustomDomain] = useState(organization.customDomain || '');
  const [defaultGradingScaleId, setDefaultGradingScaleId] = useState(organization.defaultGradingScaleId || '');

  // Extracted colors
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [extractingColors, setExtractingColors] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const currentOrgIdRef = useRef<string | null>(null);

  // Sync state with props only on initial load or when org ID changes
  useEffect(() => {
    if (organization.id !== currentOrgIdRef.current) {
      setPrimaryColor(organization.primaryColor || '#2563eb');
      setSecondaryColor(organization.secondaryColor || '#9333ea');
      setLogoUrl(organization.logoUrl || '');
      setName(organization.name || '');
      setAddress(organization.address || '');
      setPhone(organization.phone || '');
      setContactEmail(organization.contactEmail || '');
      setCustomDomain(organization.customDomain || '');
      setDefaultGradingScaleId(organization.defaultGradingScaleId || '');
      
      if (organization.logoUrl) {
        extractColors(organization.logoUrl);
      }
      
      currentOrgIdRef.current = organization.id;
    }
  }, [organization.id]);

  // Track if any changes were made
  useEffect(() => {
    const hasChanges = 
      primaryColor !== (organization.primaryColor || '#2563eb') ||
      secondaryColor !== (organization.secondaryColor || '#9333ea') ||
      logoUrl !== (organization.logoUrl || '') ||
      name !== (organization.name || '') ||
      address !== (organization.address || '') ||
      phone !== (organization.phone || '') ||
      contactEmail !== (organization.contactEmail || '') ||
      customDomain !== (organization.customDomain || '') ||
      defaultGradingScaleId !== (organization.defaultGradingScaleId || '');
    
    setIsDirty(hasChanges);
  }, [primaryColor, secondaryColor, logoUrl, name, address, phone, contactEmail, customDomain, defaultGradingScaleId, organization]);

  const currentUserUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (userProfile?.uid !== currentUserUidRef.current) {
      setDisplayName(userProfile?.displayName || '');
      setUserPhotoUrl(userProfile?.photoURL || '');
      currentUserUidRef.current = userProfile?.uid || null;
    }
  }, [userProfile?.uid]);

  // User Profile state
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [userPhotoUrl, setUserPhotoUrl] = useState(userProfile?.photoURL || '');
  
  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isPasswordUser = auth.currentUser?.providerData.some(p => p.providerId === 'password');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error("No user found");

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        setPasswordError("Current password is incorrect");
      } else {
        setPasswordError(err.message || "An error occurred");
      }
    } finally {
      setChangingPassword(false);
    }
  };
  
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchScales = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'organizations', organization.id, 'grading_scales'));
        const scalesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GradingScale[];
        setScales(scalesData);
      } catch (err) {
        console.error("Error fetching grading scales:", err);
      }
    };
    fetchScales();
  }, [organization.id]);

  const extractColors = async (imageUrl: string) => {
    if (!imageUrl) return;
    setExtractingColors(true);
    try {
      // Use a proxy or ensure CORS if needed, but for now try direct
      const palette = await Vibrant.from(imageUrl).getPalette();
      const colors = Object.values(palette)
        .filter(swatch => swatch !== null)
        .map(swatch => (swatch as any).hex);
      setExtractedColors(colors);
    } catch (err) {
      console.error("Error extracting colors:", err);
    } finally {
      setExtractingColors(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        extractColors(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (activeTab === 'organization') {
        const updates: any = {
          primaryColor,
          secondaryColor,
          logoUrl,
          name,
          address,
          phone,
          contactEmail,
          customDomain,
          defaultGradingScaleId
        };

        // If domain changed, reset status to pending
        if (customDomain !== organization.customDomain) {
          updates.customDomainStatus = customDomain ? 'pending' : deleteField();
        }

        await updateDoc(doc(db, 'organizations', organization.id), updates);
      } else {
        if (!userProfile) return;
        await updateDoc(doc(db, 'users', userProfile.uid), {
          displayName,
          photoURL: userPhotoUrl
        });
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, activeTab === 'organization' ? `organizations/${organization.id}` : `users/${userProfile?.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-2">System Settings</h2>
        <p className="text-[#9e9e9e]">Manage your personal profile and organization settings.</p>
      </header>

      <div className="flex gap-2 border-b border-[#e5e5e5]">
        <button
          onClick={() => setActiveTab('organization')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'organization'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-[#9e9e9e] hover:text-[#1a1a1a]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organization
          </div>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-[#9e9e9e] hover:text-[#1a1a1a]'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            My Profile
          </div>
        </button>
      </div>

      <div className="bg-white rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden">
        <div className="p-8 space-y-10">
          
          {activeTab === 'organization' ? (
            <>
              {/* School Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">School Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">School Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Contact Email</label>
                    <input 
                      type="email" 
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Address</label>
                    <textarea 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Domain */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Custom Domain</h3>
                </div>
                <p className="text-sm text-[#9e9e9e]">Set up a custom domain for your school's portal (e.g., portal.yourschool.edu).</p>
                
                <div className="bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl p-6">
                  {organization.subscriptionPlan === 'basic' ? (
                    <div className="flex items-start gap-3 text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-200">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm mb-1">Premium Feature</h4>
                        <p className="text-xs">Custom domains are available on Premium and Enterprise plans. Please upgrade your subscription to use this feature.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Domain Name</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="text" 
                            placeholder="portal.yourschool.edu"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono text-sm"
                          />
                          {organization.customDomainStatus && customDomain === organization.customDomain && (
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest shrink-0 ${
                              organization.customDomainStatus === 'active' ? 'bg-green-100 text-green-700' :
                              organization.customDomainStatus === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {organization.customDomainStatus}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {customDomain && (
                        <div className="bg-white p-4 rounded-xl border border-[#e5e5e5]">
                          <h4 className="text-sm font-bold mb-2">DNS Configuration</h4>
                          <p className="text-xs text-[#9e9e9e] mb-4">Add the following CNAME record to your domain's DNS settings to verify ownership and route traffic.</p>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm font-mono bg-[#f5f5f5] p-3 rounded-lg border border-[#e5e5e5]">
                            <div>
                              <span className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1 font-sans font-bold">Type</span>
                              CNAME
                            </div>
                            <div>
                              <span className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1 font-sans font-bold">Name</span>
                              {customDomain.split('.')[0] || '@'}
                            </div>
                            <div>
                              <span className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1 font-sans font-bold">Value</span>
                              cname.eduscale.app
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">School Logo</h3>
                </div>
                <p className="text-sm text-[#9e9e9e]">Upload your school's logo. This will be displayed in the sidebar and on login pages. (Max 1MB)</p>
                
                <div className="flex gap-6 items-center">
                  <div className="w-24 h-24 rounded-2xl border border-[#e5e5e5] bg-[#f5f5f5] flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Preview" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-[#d1d1d1]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-white border border-[#e5e5e5] text-[#1a1a1a] font-bold px-4 py-2 rounded-xl hover:bg-[#f5f5f5] transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Choose Image
                    </button>
                    {logoUrl && (
                      <button
                        onClick={() => setLogoUrl('')}
                        className="text-red-500 text-sm font-medium mt-2 hover:underline"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Color */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Palette className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Theme Colors</h3>
                </div>
                <p className="text-sm text-[#9e9e9e]">Choose primary and secondary colors that match your school's branding.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0"
                      />
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Primary Color</label>
                        <input 
                          type="text" 
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-16 h-16 rounded-xl cursor-pointer border-0 p-0"
                      />
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Secondary Color</label>
                        <input 
                          type="text" 
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {extractedColors.length > 0 && (
                  <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h4 className="text-sm font-bold text-blue-900">Extracted from Logo</h4>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                      {extractedColors.map((color, index) => (
                        <div key={index} className="group relative flex flex-col items-center">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(color);
                              // Optional: add a temporary "Copied!" tooltip
                            }}
                            className="w-14 h-14 rounded-2xl border-4 border-white shadow-md transition-all hover:scale-110 hover:rotate-3 active:scale-95 mb-2 relative overflow-hidden"
                            style={{ backgroundColor: color }}
                            title={`Click to copy: ${color}`}
                          >
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 drop-shadow-md uppercase">Copy</span>
                            </div>
                          </button>
                          
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              type="button"
                              onClick={() => setPrimaryColor(color)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${
                                primaryColor === color 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'
                              }`}
                            >
                              Primary
                            </button>
                            <button
                              type="button"
                              onClick={() => setSecondaryColor(color)}
                              className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${
                                secondaryColor === color 
                                  ? 'bg-purple-600 text-white border-purple-600' 
                                  : 'bg-white text-purple-600 border-purple-100 hover:bg-purple-50'
                              }`}
                            >
                              Secondary
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-blue-600 mt-12 font-medium">Hover over a color to apply it as Primary or Secondary.</p>
                  </div>
                )}
              </div>

              {/* Default Grading Scale */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Default Grading Scale</h3>
                </div>
                <p className="text-sm text-[#9e9e9e]">Select the default grading scale for your organization. This will be used for assignments and report cards.</p>
                
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Grading Scale</label>
                  <select
                    value={defaultGradingScaleId}
                    onChange={(e) => setDefaultGradingScaleId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  >
                    <option value="">Select a grading scale</option>
                    {scales.map((scale) => (
                      <option key={scale.id} value={scale.id}>{scale.name}</option>
                    ))}
                  </select>
                  {scales.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">No grading scales found. Please create one in the Grading section first.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* User Profile Information */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-2">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold">Personal Profile</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-3xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center overflow-hidden">
                      {userPhotoUrl ? (
                        <img src={userPhotoUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserIcon className="w-12 h-12 text-[#d1d1d1]" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleUserFileChange}
                      ref={userFileInputRef}
                      className="hidden"
                    />
                    <button
                      onClick={() => userFileInputRef.current?.click()}
                      className="text-sm font-bold text-blue-600 hover:underline"
                    >
                      Change Photo
                    </button>
                  </div>

                  <div className="flex-1 space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Display Name</label>
                      <input 
                        type="text" 
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Email Address</label>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#9e9e9e]">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{userProfile?.email}</span>
                      </div>
                      <p className="text-[10px] text-[#9e9e9e] mt-2 italic">Email cannot be changed as it is linked to your Google account.</p>
                    </div>

                    {isPasswordUser && (
                      <div className="pt-6 border-t border-[#e5e5e5]">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-sm font-bold">Account Security</h4>
                            <p className="text-xs text-[#9e9e9e]">Update your login password</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPasswordSection(!showPasswordSection)}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            {showPasswordSection ? 'Cancel' : 'Change Password'}
                          </button>
                        </div>

                        {showPasswordSection && (
                          <div className="space-y-4 bg-[#f9f9f9] p-6 rounded-2xl border border-[#e5e5e5]">
                            {passwordError && (
                              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {passwordError}
                              </div>
                            )}
                            
                            <div>
                              <label className="block text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Current Password</label>
                              <div className="relative">
                                <input
                                  type={showCurrentPass ? "text" : "password"}
                                  value={currentPassword}
                                  onChange={(e) => setCurrentPassword(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                                  placeholder="Enter current password"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
                                >
                                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">New Password</label>
                              <div className="relative">
                                <input
                                  type={showNewPass ? "text" : "password"}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                                  placeholder="New password"
                                />
                                <button 
                                  type="button"
                                  onClick={() => setShowNewPass(!showNewPass)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9e9e9e]"
                                >
                                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Confirm New Password</label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none transition-all text-sm"
                                placeholder="Confirm new password"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={handlePasswordChange}
                              disabled={changingPassword}
                              className="w-full bg-[#1a1a1a] text-white font-bold py-3 rounded-xl hover:bg-black transition-all disabled:opacity-50 text-sm"
                            >
                              {changingPassword ? "Updating..." : "Update Password"}
                            </button>
                          </div>
                        )}

                        {passwordSuccess && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Password updated successfully
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Account Role</label>
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#f5f5f5] border border-[#e5e5e5] text-[#9e9e9e]">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm uppercase tracking-widest font-bold">{userProfile?.role.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        <div className="bg-[#f5f5f5] p-6 border-t border-[#e5e5e5] flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 font-medium opacity-0 transition-opacity" style={{ opacity: saved ? 1 : 0 }}>
            <CheckCircle2 className="w-5 h-5" />
            Settings saved successfully
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 text-white font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 bg-primary"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
