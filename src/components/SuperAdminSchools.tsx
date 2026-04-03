import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Organization } from '../types';
import { 
  School, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Plus,
  Mail,
  Globe,
  MapPin,
  Calendar,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminSchools() {
  const [schools, setSchools] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<Organization | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    contactEmail: '',
    website: '',
    address: '',
    phone: '',
    subscriptionPlan: 'basic' as 'basic' | 'premium' | 'enterprise',
    logoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'organizations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const schoolData: Organization[] = [];
      snapshot.forEach((doc) => {
        schoolData.push({ id: doc.id, ...doc.data() } as Organization);
      });
      setSchools(schoolData);
      setLoading(false);
    }, (err) => {
      console.error('Error in organizations listener:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredSchools = schools.filter(school => {
    const matchesSearch = 
      school.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || school.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUpdateStatus = async (schoolId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'organizations', schoolId), { status: newStatus });
      if (selectedSchool?.id === schoolId) {
        setSelectedSchool(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `organizations/${schoolId}`);
    }
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'organizations'), {
        ...newSchool,
        status: 'pending',
        createdAt: new Date().toISOString(),
        primaryColor: '#2563eb',
        secondaryColor: '#9333ea'
      });
      setShowAddModal(false);
      setNewSchool({
        name: '',
        contactEmail: '',
        website: '',
        address: '',
        phone: '',
        subscriptionPlan: 'basic',
        logoUrl: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'organizations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert('File size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewSchool(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    if (!window.confirm('Are you sure you want to delete this school? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'organizations', schoolId));
      if (selectedSchool?.id === schoolId) setSelectedSchool(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${schoolId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">School Directory</h2>
          <p className="text-[#9e9e9e] text-sm md:text-base">Manage all registered educational institutions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            <span>Register New School</span>
          </button>
          <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <School className="w-5 h-5" />
            <span>{schools.length} Schools</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9e9e9e]" />
          <input
            type="text"
            placeholder="Search by school name or contact email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#9e9e9e] ml-2" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-[#e5e5e5] rounded-2xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSchools.map((school) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={school.id}
              className="bg-white p-6 rounded-[32px] border border-[#e5e5e5] shadow-sm hover:border-blue-200 transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden border border-[#e5e5e5]">
                  {school.logoUrl ? (
                    <img src={school.logoUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <School className="w-8 h-8 text-blue-600" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    school.status === 'approved' ? 'bg-green-100 text-green-700' :
                    school.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {school.status}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleUpdateStatus(school.id!, school.status === 'approved' ? 'pending' : 'approved')}
                      className="p-2 hover:bg-blue-50 text-[#9e9e9e] hover:text-blue-600 rounded-xl transition-all"
                      title="Toggle Status"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSchool(school.id!)}
                      className="p-2 hover:bg-red-50 text-[#9e9e9e] hover:text-red-600 rounded-xl transition-all"
                      title="Delete School"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">{school.name}</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <Mail className="w-4 h-4 text-[#9e9e9e]" />
                  <span className="truncate">{school.contactEmail}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <Globe className="w-4 h-4 text-[#9e9e9e]" />
                  <span>{school.website || 'No website'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <MapPin className="w-4 h-4 text-[#9e9e9e]" />
                  <span className="truncate">{school.address || 'No address'}</span>
                </div>
              </div>

              <div className="pt-6 border-t border-[#f5f5f5] flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">
                  <Calendar className="w-4 h-4" />
                  <span>{school.createdAt ? new Date(school.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <button 
                  onClick={() => setSelectedSchool(school)}
                  className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View Details
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add School Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleAddSchool} className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold tracking-tight">Register New School</h3>
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-[#9e9e9e]" />
                  </button>
                </div>

                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {/* Logo Upload */}
                  <div className="flex flex-col items-center mb-6">
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-4 text-center w-full">School Logo</label>
                    <div 
                      onClick={() => logoInputRef.current?.click()}
                      className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-[#f9f9f9] flex flex-col items-center justify-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all overflow-hidden group relative"
                    >
                      {newSchool.logoUrl ? (
                        <img src={newSchool.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-[#9e9e9e] mb-1 group-hover:text-blue-600" />
                          <span className="text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest group-hover:text-blue-600">Upload</span>
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
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">School Name</label>
                    <input 
                      type="text" 
                      required
                      value={newSchool.name}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="e.g. Green Valley High"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Contact Email</label>
                      <input 
                        type="email" 
                        required
                        value={newSchool.contactEmail}
                        onChange={(e) => setNewSchool(prev => ({ ...prev, contactEmail: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="admin@school.edu"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Phone Number</label>
                      <input 
                        type="tel" 
                        value={newSchool.phone}
                        onChange={(e) => setNewSchool(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Website</label>
                    <input 
                      type="url" 
                      value={newSchool.website}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="https://www.school.edu"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Address</label>
                    <textarea 
                      value={newSchool.address}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      rows={2}
                      placeholder="123 Education St, City, Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Subscription Plan</label>
                    <select 
                      value={newSchool.subscriptionPlan}
                      onChange={(e) => setNewSchool(prev => ({ ...prev, subscriptionPlan: e.target.value as any }))}
                      className="w-full px-4 py-3 bg-[#f9f9f9] border border-[#e5e5e5] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    >
                      <option value="basic">Basic Plan</option>
                      <option value="premium">Premium Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-4 border border-[#e5e5e5] text-[#4a4a4a] rounded-2xl font-bold hover:bg-[#f5f5f5] transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Registering...' : 'Register School'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* School Detail Modal */}
      <AnimatePresence>
        {selectedSchool && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSchool(null)}
              className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-12 overflow-y-auto max-h-[90vh]">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-3xl bg-blue-50 flex items-center justify-center border border-[#e5e5e5] overflow-hidden">
                      {selectedSchool.logoUrl ? (
                        <img src={selectedSchool.logoUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <School className="w-12 h-12 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-3xl font-black tracking-tight text-[#1a1a1a] mb-2">{selectedSchool.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          selectedSchool.status === 'approved' ? 'bg-green-100 text-green-700' :
                          selectedSchool.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {selectedSchool.status}
                        </span>
                        <span className="text-sm text-[#9e9e9e]">Registered {selectedSchool.createdAt ? new Date(selectedSchool.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSchool(null)}
                    className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-[#9e9e9e]" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-[#4a4a4a]">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <span>{selectedSchool.contactEmail}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#4a4a4a]">
                        <Globe className="w-5 h-5 text-blue-600" />
                        <span>{selectedSchool.website || 'No website'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#4a4a4a]">
                        <MapPin className="w-5 h-5 text-blue-600" />
                        <span>{selectedSchool.address || 'No address'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Subscription Details</h4>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">Current Plan</span>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedSchool.subscriptionPlan}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-700">
                        <Calendar className="w-4 h-4" />
                        <span>Next billing: April 15, 2026</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                  <h4 className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Approval Requirements</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {[
                      { label: 'Verified Contact Email', met: !!selectedSchool.contactEmail },
                      { label: 'Physical Address Provided', met: !!selectedSchool.address },
                      { label: 'Valid Subscription Plan', met: !!selectedSchool.subscriptionPlan },
                      { label: 'School Logo Uploaded', met: !!selectedSchool.logoUrl },
                      { label: 'Terms of Service Accepted', met: true }
                    ].map((req, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-[#e5e5e5] bg-[#fcfcfc]">
                        <span className="text-sm font-medium text-[#4a4a4a]">{req.label}</span>
                        {req.met ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-orange-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {selectedSchool.status !== 'approved' ? (
                    <button 
                      onClick={() => handleUpdateStatus(selectedSchool.id!, 'approved')}
                      className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      Approve School
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdateStatus(selectedSchool.id!, 'pending')}
                      className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
                    >
                      Revoke Approval
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteSchool(selectedSchool.id!)}
                    className="px-8 py-4 border border-red-200 text-red-600 rounded-2xl font-bold hover:bg-red-50 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {filteredSchools.length === 0 && (
        <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#f5f5f5] mb-4">
            <School className="w-8 h-8 text-[#9e9e9e]" />
          </div>
          <h3 className="text-xl font-bold mb-2">No schools found</h3>
          <p className="text-[#9e9e9e]">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}
