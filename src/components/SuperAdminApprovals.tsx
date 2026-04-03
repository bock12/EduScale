import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Organization } from '../types';
import { Check, X, Building2, Mail, Phone, Calendar, Eye, MapPin, Globe, CreditCard, User } from 'lucide-react';
import { setupNewSchool } from '../services/schoolSetupService';

export default function SuperAdminApprovals() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'organizations'), (snapshot) => {
      const orgs: Organization[] = [];
      snapshot.forEach((doc) => {
        orgs.push({ id: doc.id, ...doc.data() } as Organization);
      });
      // Filter for pending organizations
      setOrganizations(orgs.filter(o => o.status === 'pending'));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'organizations');
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (orgId: string) => {
    setProcessingId(orgId);
    try {
      await setupNewSchool(orgId);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/setup`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (orgId: string) => {
    setProcessingId(orgId);
    try {
      await updateDoc(doc(db, 'organizations', orgId), { status: 'rejected' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `organizations/${orgId}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Pending Approvals</h2>
        <p className="text-[#9e9e9e]">Review and approve new school registrations.</p>
      </header>

      {organizations.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-50 mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">All Caught Up!</h3>
          <p className="text-[#9e9e9e]">There are no pending school registrations to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {organizations.map((org) => (
            <div key={org.id} className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col md:flex-row gap-6 md:items-center justify-between">
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#9e9e9e] text-xs font-bold uppercase tracking-widest mb-1">
                    <Building2 className="w-4 h-4" /> School Name
                  </div>
                  <p className="font-bold text-lg">{org.name}</p>
                  <p className="text-sm text-[#4a4a4a] mt-1">{org.address || 'No address provided'}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-[#9e9e9e]" />
                    <span className="font-medium">{org.contactEmail || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-[#9e9e9e]" />
                    <span className="font-medium">{org.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-[#9e9e9e]" />
                    <span className="font-medium">{new Date(org.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[200px]">
                <div className="bg-[#f5f5f5] px-4 py-2 rounded-xl text-center">
                  <span className="text-xs text-[#9e9e9e] font-bold uppercase tracking-widest block mb-1">Requested Plan</span>
                  <span className="font-black capitalize text-blue-600">{org.subscriptionPlan}</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedOrg(org)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#e5e5e5] text-[#1a1a1a] font-bold py-3 rounded-xl hover:bg-[#f5f5f5] transition-all"
                  >
                    <Eye className="w-4 h-4" /> View Details
                  </button>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(org.id)}
                    disabled={processingId === org.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingId === org.id ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(org.id)}
                    disabled={processingId === org.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-[#e5e5e5] flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm">
                  {selectedOrg.logoUrl ? (
                    <img src={selectedOrg.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                  ) : (
                    <Building2 className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{selectedOrg.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest">Pending Approval</span>
                    <span className="text-xs text-[#9e9e9e] font-medium">Submitted on {new Date(selectedOrg.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrg(null)}
                className="p-2 hover:bg-white/50 rounded-full transition-all"
              >
                <X className="w-6 h-6 text-[#9e9e9e]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Contact Information */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-widest flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" /> Contact Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f9f9f9] p-6 rounded-3xl border border-[#e5e5e5]">
                  <div>
                    <label className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1">Email Address</label>
                    <p className="font-bold">{selectedOrg.contactEmail || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1">Phone Number</label>
                    <p className="font-bold">{selectedOrg.phone || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1">Physical Address</label>
                    <p className="font-bold flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      {selectedOrg.address || 'Not provided'}
                    </p>
                  </div>
                </div>
              </section>

              {/* Subscription Details */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" /> Subscription Plan
                </h4>
                <div className="flex items-center justify-between bg-green-50 p-6 rounded-3xl border border-green-100">
                  <div>
                    <p className="text-2xl font-black text-green-900 capitalize">{selectedOrg.subscriptionPlan}</p>
                    <p className="text-sm text-green-700">Full access to all {selectedOrg.subscriptionPlan} features upon approval.</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </section>

              {/* Technical Details */}
              <section className="space-y-4">
                <h4 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-600" /> Technical Setup
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f9f9f9] p-6 rounded-3xl border border-[#e5e5e5]">
                  <div>
                    <label className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1">Custom Domain</label>
                    <p className="font-bold font-mono text-sm">{selectedOrg.customDomain || 'None requested'}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9e9e9e] uppercase tracking-widest mb-1">Organization ID</label>
                    <p className="font-bold font-mono text-xs text-[#9e9e9e]">{selectedOrg.id}</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-8 border-t border-[#e5e5e5] bg-[#f5f5f5] flex gap-4">
              <button 
                onClick={() => {
                  handleApprove(selectedOrg.id);
                  setSelectedOrg(null);
                }}
                disabled={processingId === selectedOrg.id}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200"
              >
                <Check className="w-5 h-5" /> Approve Registration
              </button>
              <button 
                onClick={() => {
                  handleReject(selectedOrg.id);
                  setSelectedOrg(null);
                }}
                disabled={processingId === selectedOrg.id}
                className="px-8 flex items-center justify-center gap-2 bg-white border border-red-100 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-50 transition-all"
              >
                <X className="w-5 h-5" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
