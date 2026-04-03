import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, getCountFromServer, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Organization } from '../types';
import { Building2, ArrowRight, School, Users, Calendar, Activity, Plus, X, Link as LinkIcon, CheckCircle2, DollarSign, Server, BrainCircuit, Settings, Mail, ShieldAlert, AlertCircle } from 'lucide-react';

interface SuperAdminDashboardProps {
  onEnterPortal: (orgId: string) => void;
}

interface OrgWithMetrics extends Organization {
  studentCount?: number;
}

export default function SuperAdminDashboard({ onEnterPortal }: SuperAdminDashboardProps) {
  const [organizations, setOrganizations] = useState<OrgWithMetrics[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null);
  const [inviteSchoolName, setInviteSchoolName] = useState('');
  const [invitePlan, setInvitePlan] = useState<'basic' | 'premium' | 'enterprise'>('premium');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const qOrgs = query(collection(db, 'organizations'), where('status', '==', 'approved'));
    const unsubscribeOrgs = onSnapshot(qOrgs, (snapshot) => {
      const orgs: OrgWithMetrics[] = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as OrgWithMetrics));
      
      setOrganizations(orgs);
      
      // Fetch counts separately to avoid async onSnapshot callback issues
      orgs.forEach(async (org) => {
        try {
          const studentsQuery = query(collection(db, 'organizations', org.id, 'students'));
          const snapshotCount = await getCountFromServer(studentsQuery);
          setOrganizations(prev => prev.map(o => 
            o.id === org.id ? { ...o, studentCount: snapshotCount.data().count } : o
          ));
        } catch (error) {
          console.error(`Error fetching count for ${org.id}:`, error);
        }
      });
    }, (err) => {
      console.error('Error in organizations listener:', err);
      setLoading(false);
    });

    const qInvites = query(collection(db, 'invitations'), where('status', '==', 'pending'));
    const unsubscribeInvites = onSnapshot(qInvites, (snapshot) => {
      const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvitations(invites);
      setLoading(false);
    }, (err) => {
      console.error('Error in invitations listener:', err);
      setLoading(false);
    });

    return () => {
      unsubscribeOrgs();
      unsubscribeInvites();
    };
  }, []);

  const handleInviteSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteSchoolName.trim() || !inviteEmail.trim()) return;
    
    // Enforce 3-trial limit
    if (invitations.length >= 3) {
      setInviteError("Trial limit reached. You can only have 3 active invitations at a time.");
      return;
    }

    setIsInviting(true);
    setInviteError(null);
    try {
      // Generate a random 8-character password
      const tempPassword = Math.random().toString(36).slice(-8) + '!' + Math.floor(Math.random() * 10);
      
      const inviteRef = await addDoc(collection(db, 'invitations'), {
        schoolName: inviteSchoolName,
        recipientEmail: inviteEmail,
        tempPassword: tempPassword,
        plan: invitePlan,
        status: 'pending',
        invitedBy: auth.currentUser?.uid,
        createdAt: new Date().toISOString()
      });
      
      const inviteLink = `${window.location.origin}/?invite=${inviteRef.id}`;
      setGeneratedInviteLink(inviteLink);
      setGeneratedTempPassword(tempPassword);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (generatedInviteLink) {
      navigator.clipboard.writeText(generatedInviteLink);
      setCopiedId('invite');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyLink = (orgId: string) => {
    const link = `${window.location.origin}/?join=${orgId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(orgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      await deleteDoc(doc(db, 'invitations', inviteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invitations/${inviteId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate metrics
  const totalSchools = organizations.length;
  const totalStudents = organizations.reduce((sum, org) => sum + (org.studentCount || 0), 0);
  
  // Mock revenue calculation based on plans
  const monthlyRevenue = organizations.reduce((sum, org) => {
    if (org.subscriptionPlan === 'enterprise') return sum + 999;
    if (org.subscriptionPlan === 'premium') return sum + 299;
    return sum + 99;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <header>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h2>
          <p className="text-[#9e9e9e]">Manage schools, monitor health, and track revenue.</p>
        </header>
        <button
          onClick={() => {
            setIsInviteModalOpen(true);
            setGeneratedInviteLink(null);
            setInviteSchoolName('');
            setInviteEmail('');
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          Invite School
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <School className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-black mb-1">{totalSchools}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Total Schools</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-black mb-1">{totalStudents.toLocaleString()}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Total Students</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <DollarSign className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-black mb-1">${monthlyRevenue.toLocaleString()}</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">MRR</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-black mb-1">99.99%</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">Platform Health</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] flex flex-col">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <h3 className="text-2xl font-black mb-1">1.2M</h3>
          <p className="text-[#9e9e9e] text-xs font-bold uppercase tracking-widest">AI Tokens Used</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <button 
          onClick={() => window.location.href = '/schools'}
          className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:border-blue-600 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <School className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">School Directory</h3>
          <p className="text-[#9e9e9e] text-sm">Manage all registered educational institutions and their subscriptions.</p>
        </button>
        <button 
          onClick={() => window.location.href = '/users'}
          className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:border-purple-600 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">User Management</h3>
          <p className="text-[#9e9e9e] text-sm">Control user access, roles, and permissions across the entire platform.</p>
        </button>
        <button 
          onClick={() => window.location.href = '/settings'}
          className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:border-green-600 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Platform Settings</h3>
          <p className="text-[#9e9e9e] text-sm">Configure global parameters, integrations, and system-wide defaults.</p>
        </button>
        <button 
          onClick={() => window.location.href = '/admin/claims'}
          className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:border-orange-600 hover:shadow-md transition-all text-left group"
        >
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold mb-2">Branding & Claims</h3>
          <p className="text-[#9e9e9e] text-sm">Manage intellectual property disputes and branding rights claims.</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold tracking-tight mb-4">Active Portals</h3>
          {organizations.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
                <School className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Active Schools</h3>
              <p className="text-[#9e9e9e]">There are currently no approved schools on the platform.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {organizations.map((org) => (
                <div key={org.id} className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      {org.logoUrl ? (
                        <img src={org.logoUrl} alt={org.name} className="w-12 h-12 rounded-xl object-cover border border-[#e5e5e5]" referrerPolicy="no-referrer" />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: org.primaryColor || '#2563eb' }}
                        >
                          <Building2 className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight truncate">{org.name}</h3>
                        <p className="text-xs text-[#9e9e9e] uppercase tracking-widest font-bold mt-1">{org.subscriptionPlan} Plan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyLink(org.id)}
                      className="p-2 text-[#9e9e9e] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copy Access Link"
                    >
                      {copiedId === org.id ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-[#4a4a4a]">
                        <Users className="w-4 h-4 text-[#9e9e9e]" />
                        <span>Students Enrolled</span>
                      </div>
                      <span className="font-bold">{org.studentCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-[#4a4a4a]">
                        <Calendar className="w-4 h-4 text-[#9e9e9e]" />
                        <span>Joined</span>
                      </div>
                      <span className="font-medium">{new Date(org.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => onEnterPortal(org.id)}
                    className="w-full flex items-center justify-center gap-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold py-3 rounded-xl hover:bg-[#e5e5e5] transition-all"
                  >
                    Enter Portal <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight">Pending Invitations</h3>
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
              {invitations.length} Total
            </span>
          </div>
          
          {invitations.length === 0 ? (
            <div className="bg-white p-8 rounded-[32px] border border-[#e5e5e5] text-center">
              <p className="text-[#9e9e9e] text-sm font-medium">No pending invitations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invite) => (
                <div 
                  key={invite.id} 
                  onClick={() => setSelectedInvite(invite)}
                  className="bg-white p-5 rounded-2xl border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1a1a1a] truncate">{invite.schoolName}</h4>
                      <p className="text-xs text-[#9e9e9e] truncate">{invite.recipientEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                        Pending
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInvite(invite.id);
                        }}
                        className="p-1.5 text-[#9e9e9e] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete Invitation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#f5f5f5]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = `${window.location.origin}/?invite=${invite.id}`;
                        navigator.clipboard.writeText(link);
                        setCopiedId(invite.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-[#f5f5f5] text-[#4a4a4a] hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      {copiedId === invite.id ? (
                        <><CheckCircle2 className="w-3 h-3 text-green-600" /> Copied</>
                      ) : (
                        <><LinkIcon className="w-3 h-3" /> Copy Link</>
                      )}
                    </button>
                    
                    <a
                      href={`mailto:${invite.recipientEmail}?subject=Invitation to join EduScale&body=Hello,%0D%0A%0D%0AYou have been invited to set up the school portal for ${invite.schoolName} on EduScale.%0D%0A%0D%0APlease use the following link to complete your registration:%0D%0A%0D%0A${window.location.origin}/?invite=${invite.id}%0D%0A%0D%0ABest regards,%0D%0AEduScale Team`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                    >
                      <Mail className="w-3 h-3" /> Resend
                    </a>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">
                      Sent {new Date(invite.createdAt).toLocaleDateString()}
                    </span>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{invite.plan} Plan</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Invitation Modal */}
      {selectedInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl relative shadow-2xl max-h-[95vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedInvite(null)}
              className="absolute right-4 top-4 md:right-6 md:top-6 p-2 text-[#9e9e9e] hover:bg-[#f5f5f5] rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Invitation Details</h2>
              <p className="text-[#9e9e9e]">Credentials for {selectedInvite.schoolName}</p>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-[#f9f9f9] rounded-3xl border border-[#e5e5e5] space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Invitation Link</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/?invite=${selectedInvite.id}`}
                      className="flex-1 bg-white border border-[#e5e5e5] rounded-xl px-4 py-2 text-sm font-medium outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/?invite=${selectedInvite.id}`);
                        setCopiedId(selectedInvite.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-2 bg-white border border-[#e5e5e5] rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      {copiedId === selectedInvite.id ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Temporary Password</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={selectedInvite.tempPassword}
                      className="flex-1 bg-white border border-[#e5e5e5] rounded-xl px-4 py-2 text-sm font-mono font-bold outline-none"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedInvite.tempPassword);
                        setCopiedId('pass');
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="p-2 bg-white border border-[#e5e5e5] rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                      {copiedId === 'pass' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  The user should use their email (<strong>{selectedInvite.recipientEmail}</strong>) and this temporary password to log in. They will be prompted to change their password upon first login.
                </p>
              </div>

              <button
                onClick={() => setSelectedInvite(null)}
                className="w-full bg-[#1a1a1a] text-white font-black py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-black/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite School Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-12 w-full max-w-2xl relative shadow-2xl max-h-[95vh] overflow-y-auto">
            <button 
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute right-4 top-4 md:right-6 md:top-6 p-2 text-[#9e9e9e] hover:bg-[#f5f5f5] rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-6 md:mb-8">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 md:mb-6">
                <Mail className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Invite a School</h2>
              <p className="text-[#9e9e9e] text-sm md:text-base">Send an invitation to a school principal to set up their portal.</p>
              {window.location.origin.includes('-dev-') && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 font-medium leading-tight">
                    You are currently on a development URL. Invitations generated here may not be accessible to others. 
                    Please use the <strong>Shared App URL</strong> for public invitations.
                  </p>
                </div>
              )}
            </div>
            
            {!generatedInviteLink ? (
              <form onSubmit={handleInviteSchool} className="space-y-4 md:space-y-6">
                {inviteError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 font-medium">{inviteError}</p>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">School Name</label>
                  <input
                    type="text"
                    required
                    value={inviteSchoolName}
                    onChange={(e) => setInviteSchoolName(e.target.value)}
                    className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border border-[#e5e5e5] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base md:text-lg font-medium"
                    placeholder="e.g. Lincoln High School"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Principal's Email</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl border border-[#e5e5e5] focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-base md:text-lg font-medium"
                    placeholder="principal@school.edu"
                  />
                </div>

                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Subscription Plan</label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {['basic', 'premium', 'enterprise'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setInvitePlan(p as any)}
                        className={`py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-[10px] md:text-sm capitalize transition-all border-2 ${
                          invitePlan === p 
                            ? 'border-blue-600 bg-blue-50 text-blue-600' 
                            : 'border-[#e5e5e5] text-[#4a4a4a] hover:border-blue-200'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isInviting || !inviteSchoolName.trim() || !inviteEmail.trim()}
                  className="w-full bg-blue-600 text-white font-black py-4 md:py-5 rounded-xl md:rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 mt-2 md:mt-4 text-base md:text-lg"
                >
                  {isInviting ? 'Generating...' : 'Generate Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-4 md:p-6 bg-green-50 border border-green-100 rounded-2xl md:rounded-3xl">
                  <div className="flex items-center gap-3 text-green-700 font-bold mb-2 text-sm md:text-base">
                    <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
                    Credentials Generated
                  </div>
                  <p className="text-xs md:text-sm text-green-600/80">Give these temporary credentials to the school principal.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Email</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={inviteEmail}
                        className="w-full pl-4 pr-12 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-xs md:text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteEmail);
                          setCopiedId('email');
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white text-blue-600 rounded-lg md:rounded-xl shadow-sm border border-[#e5e5e5] hover:bg-blue-50 transition-all"
                      >
                        {copiedId === 'email' ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Temporary Password</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={generatedTempPassword || ''}
                        className="w-full pl-4 pr-12 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-xs md:text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTempPassword || '');
                          setCopiedId('password');
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white text-blue-600 rounded-lg md:rounded-xl shadow-sm border border-[#e5e5e5] hover:bg-blue-50 transition-all"
                      >
                        {copiedId === 'password' ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Invitation Link</label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={generatedInviteLink}
                        className="w-full pl-4 pr-12 py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5] font-mono text-xs md:text-sm"
                      />
                      <button
                        onClick={handleCopyInviteLink}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 md:p-3 bg-white text-blue-600 rounded-lg md:rounded-xl shadow-sm border border-[#e5e5e5] hover:bg-blue-50 transition-all"
                      >
                        {copiedId === 'invite' ? <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> : <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-full bg-[#1a1a1a] text-white font-black py-4 md:py-5 rounded-xl md:rounded-2xl hover:bg-black transition-all text-base md:text-lg"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
