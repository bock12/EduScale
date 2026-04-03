import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Timetable, TimetableTemplate } from '../../types';
import { Plus, Calendar, Trash2, Edit2, X, Check, Search, ChevronRight, Sparkles, History, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TimetableEditor from './TimetableEditor';
import ConfirmModal from '../ui/ConfirmModal';

interface TimetableListProps {
  organization: Organization;
}

export default function TimetableList({ organization }: TimetableListProps) {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    academicYear: organization.setupConfig?.academicYear.name || '2025-2026',
    templateId: '',
    status: 'draft' as const
  });

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'timetables'),
      where('organizationId', '==', organization.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTimetables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Timetable)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/timetables`);
      setLoading(false);
    });

    const templatesQ = query(
      collection(db, 'organizations', organization.id, 'timetable_templates'),
      where('organizationId', '==', organization.id)
    );
    const unsubscribeTemplates = onSnapshot(templatesQ, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableTemplate)));
    });

    return () => {
      unsubscribe();
      unsubscribeTemplates();
    };
  }, [organization.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'timetables'), {
        ...formData,
        organizationId: organization.id
      });
      setIsAdding(false);
      setFormData({
        name: '',
        academicYear: organization.setupConfig?.academicYear.name || '2025-2026',
        templateId: '',
        status: 'draft'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/timetables`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'timetables', id));
      if (selectedTimetable?.id === id) setSelectedTimetable(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/timetables/${id}`);
    }
  };

  const filteredTimetables = timetables.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  if (selectedTimetable) {
    return <TimetableEditor organization={organization} timetable={selectedTimetable} onBack={() => setSelectedTimetable(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
          <input
            type="text"
            placeholder="Search timetables..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 pl-12 pr-4 text-black focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Timetable</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTimetables.map((timetable) => (
            <motion.div
              layout
              key={timetable.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedTimetable(timetable)}
              className="group relative bg-white border border-black/10 p-8 rounded-[40px] hover:border-black/20 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
            >
              <div className="absolute top-0 right-0 p-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(timetable.id);
                  }}
                  className="p-2 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-black/40 mb-1">
                    {timetable.academicYear} • {timetable.status}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-black group-hover:text-blue-600 transition-colors">
                    {timetable.name}
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-black/40 text-sm">
                  <FileText className="w-4 h-4" />
                  <span>Template: {templates.find(t => t.id === timetable.templateId)?.name || 'Unknown'}</span>
                </div>
                <div className="pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>AI Ready</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-black/20 group-hover:text-black group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTimetables.length === 0 && (
          <div className="col-span-full py-20 text-center bg-black/5 border border-dashed border-black/10 rounded-[40px]">
            <Calendar className="w-12 h-12 text-black/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-black/40">No timetables found</h3>
            <p className="text-black/20 mt-2">Create your first timetable to get started.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-black tracking-tight text-black mb-6">New Timetable</h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Timetable Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Fall Semester 2025"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Template</label>
                    <select
                      required
                      value={formData.templateId}
                      onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                    >
                      <option value="" disabled>Select a template</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-black bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95"
                  >
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Timetable"
        message="Are you sure you want to delete this timetable? All generated entries and versions will be permanently removed."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
