import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, AttendanceReport, UserProfile } from '../../types';
import { Plus, Search, FileText, Download, Calendar, User, CheckCircle2, XCircle, AlertCircle, Clock, Filter, MoreVertical, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AttendanceReportsProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function AttendanceReports({ organization, userProfile }: AttendanceReportsProps) {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeReports = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'attendance_reports'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          let fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceReport));
          if (userProfile.role === 'teacher') {
            fetchedReports = fetchedReports.filter(r => r.generatedBy === userProfile.uid);
          }
          setReports(fetchedReports);
        });

        setLoading(false);
        return () => unsubscribeReports();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'attendance_reports_data');
      }
    };

    fetchData();
  }, [organization.id]);

  const filteredReports = reports.filter(r => 
    r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.createdAt.includes(searchTerm)
  );

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const newReport = {
        organizationId: organization.id,
        type: formData.get('type') as string,
        dateRange: {
          start: formData.get('startDate') as string,
          end: formData.get('endDate') as string
        },
        generatedBy: userProfile.uid,
        status: 'completed',
        fileUrl: '#', // Mock URL
        createdAt: new Date().toISOString().split('T')[0]
      };
      await addDoc(collection(db, 'organizations', organization.id, 'attendance_reports'), newReport);
      setIsGenerating(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'attendance_reports');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
          />
        </div>
        <button
          onClick={() => setIsGenerating(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Generate Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <motion.div
            key={report.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest text-black/40">
                {report.type} Report
              </div>
              <button className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-black">Attendance Summary</h3>
              <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">{report.dateRange.start} - {report.dateRange.end}</p>
            </div>

            <div className="space-y-2 pt-4 border-t border-black/5">
              <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                <span>Generated on {report.createdAt}</span>
              </div>
              <div className="flex items-center gap-3 text-black/60 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>By {report.generatedBy}</span>
              </div>
            </div>

            <button
              className="w-full bg-black/5 hover:bg-black text-black hover:text-white py-3 rounded-2xl font-black transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </motion.div>
        ))}
      </div>

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* Generate Report Modal */}
      <AnimatePresence>
        {isGenerating && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsGenerating(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Generate Report</h2>
                <button onClick={() => setIsGenerating(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleGenerateReport} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Report Type</label>
                    <select name="type" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5">
                      <option value="daily">Daily Summary</option>
                      <option value="weekly">Weekly Summary</option>
                      <option value="monthly">Monthly Summary</option>
                      <option value="student_specific">Student Specific</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Start Date</label>
                      <input name="startDate" type="date" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">End Date</label>
                      <input name="endDate" type="date" required className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsGenerating(false)} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">Generate</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
