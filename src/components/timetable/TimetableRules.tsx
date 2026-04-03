import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, TimetableRule } from '../../types';
import { Plus, Shield, Trash2, Edit2, X, Check, Search, AlertCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../ui/ConfirmModal';

interface TimetableRulesProps {
  organization: Organization;
}

export default function TimetableRules({ organization }: TimetableRulesProps) {
  const [rules, setRules] = useState<TimetableRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'teacher_availability' as const,
    priority: 1,
    config: {}
  });

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'timetable_rules'),
      where('organizationId', '==', organization.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableRule)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/timetable_rules`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'timetable_rules'), {
        ...formData,
        organizationId: organization.id
      });
      setIsAdding(false);
      setFormData({
        name: '',
        type: 'teacher_availability',
        priority: 1,
        config: {}
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/timetable_rules`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'timetable_rules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/timetable_rules/${id}`);
    }
  };

  const filteredRules = rules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'text-red-500 bg-red-500/10';
    if (priority === 2) return 'text-orange-500 bg-orange-500/10';
    return 'text-blue-500 bg-blue-500/10';
  };

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 border border-black/10 rounded-2xl py-3 pl-12 pr-4 text-black focus:outline-none focus:ring-2 focus:ring-black/20 transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredRules.map((rule) => (
            <motion.div
              layout
              key={rule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 p-6 rounded-[32px] flex items-center justify-between hover:border-black/20 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-black tracking-tight text-black">{rule.name}</h3>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${getPriorityColor(rule.priority)}`}>
                      Priority {rule.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-black/40 text-sm">
                    <span className="capitalize">Type: {rule.type.replace('_', ' ')}</span>
                    <span className="flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      Active for all generations
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(rule.id)}
                className="p-3 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredRules.length === 0 && (
          <div className="py-20 text-center bg-black/5 border border-dashed border-black/10 rounded-[40px]">
            <Shield className="w-12 h-12 text-black/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-black/40">No rules defined</h3>
            <p className="text-black/20 mt-2">Add rules to guide the AI in generating your timetable.</p>
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
              <h2 className="text-3xl font-black tracking-tight text-black mb-6">New Rule</h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Rule Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. No back-to-back Math"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Type</label>
                      <select
                        required
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                      >
                        <option value="teacher_availability">Teacher Availability</option>
                        <option value="room_capacity">Room Capacity</option>
                        <option value="subject_consecutive">Subject Consecutive</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Priority (1-3)</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="3"
                        value={isNaN(formData.priority) ? '' : formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                      />
                    </div>
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
                    Create Rule
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
        title="Delete Rule"
        message="Are you sure you want to delete this rule? This may affect future timetable generations."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
