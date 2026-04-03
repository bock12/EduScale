import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { ShieldAlert, MessageSquare, CheckCircle2, XCircle, Clock, Search, Filter, Scale } from 'lucide-react';

interface Claim {
  id: string;
  schoolName: string;
  organizationId: string;
  type: 'branding' | 'copyright' | 'trademark' | 'other';
  description: string;
  status: 'pending' | 'resolved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  resolution?: string;
  resolvedAt?: string;
}

export default function SuperAdminClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'claims'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const claimsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
      setClaims(claimsData);
      setLoading(false);
    }, (err) => {
      console.error('Error in claims listener:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleResolve = async (status: 'resolved' | 'rejected') => {
    if (!selectedClaim || !resolutionText.trim()) return;
    
    setIsResolving(true);
    try {
      await updateDoc(doc(db, 'claims', selectedClaim.id), {
        status,
        resolution: resolutionText,
        resolvedAt: new Date().toISOString(),
        resolvedBy: auth.currentUser?.uid
      });
      setSelectedClaim(null);
      setResolutionText('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `claims/${selectedClaim.id}`);
    } finally {
      setIsResolving(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.schoolName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         claim.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
        <h2 className="text-3xl font-bold tracking-tight mb-2">Branding Rights & Claims</h2>
        <p className="text-[#9e9e9e]">Manage intellectual property disputes and branding rights claims.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-[#e5e5e5]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
          <input 
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#f5f5f5] border-transparent focus:bg-white focus:border-blue-600 focus:ring-0 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-[#9e9e9e] ml-2" />
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#f5f5f5] border-transparent rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-0"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredClaims.length === 0 ? (
          <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
              <ShieldAlert className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Claims Found</h3>
            <p className="text-[#9e9e9e]">There are no branding or rights claims matching your criteria.</p>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div 
              key={claim.id} 
              className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    claim.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                    claim.status === 'resolved' ? 'bg-green-50 text-green-600' :
                    'bg-red-50 text-red-600'
                  }`}>
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{claim.schoolName}</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        claim.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                        claim.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {claim.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#4a4a4a] line-clamp-2 mb-2">{claim.description}</p>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(claim.submittedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> {claim.type}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {claim.status === 'pending' ? (
                    <button 
                      onClick={() => setSelectedClaim(claim)}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                    >
                      Review Claim
                    </button>
                  ) : (
                    <button 
                      onClick={() => setSelectedClaim(claim)}
                      className="bg-[#f5f5f5] text-[#4a4a4a] px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#e5e5e5] transition-colors"
                    >
                      View Resolution
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-6 md:p-12 w-full max-w-2xl relative shadow-2xl max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setSelectedClaim(null)}
              className="absolute right-6 top-6 p-2 text-[#9e9e9e] hover:bg-[#f5f5f5] rounded-full transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Claim ID: {selectedClaim.id.slice(-6)}
                </span>
                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  {selectedClaim.type}
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">{selectedClaim.schoolName}</h2>
              <p className="text-[#9e9e9e]">Submitted on {new Date(selectedClaim.submittedAt).toLocaleString()}</p>
            </div>

            <div className="space-y-6">
              <div className="bg-[#f5f5f5] p-6 rounded-3xl">
                <h4 className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-3">Claim Description</h4>
                <p className="text-[#1a1a1a] leading-relaxed">{selectedClaim.description}</p>
              </div>

              {selectedClaim.status === 'pending' ? (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest mb-2">Resolution Action</h4>
                  <textarea 
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution or reason for rejection..."
                    className="w-full px-5 py-4 rounded-2xl border border-[#e5e5e5] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all min-h-[150px]"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleResolve('rejected')}
                      disabled={isResolving || !resolutionText.trim()}
                      className="flex items-center justify-center gap-2 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" /> Reject Claim
                    </button>
                    <button
                      onClick={() => handleResolve('resolved')}
                      disabled={isResolving || !resolutionText.trim()}
                      className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
                    >
                      <CheckCircle2 className="w-5 h-5" /> Resolve Claim
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Resolution Details</h4>
                  <p className="text-blue-900 leading-relaxed mb-4">{selectedClaim.resolution}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-blue-400 uppercase tracking-widest pt-4 border-t border-blue-200">
                    <span>Resolved on {new Date(selectedClaim.resolvedAt!).toLocaleDateString()}</span>
                    <span>Status: {selectedClaim.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
