import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Classroom, ClassroomResource } from '../../types';
import { Plus, Trash2, Package, Edit2, X, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../ui/ConfirmModal';

interface ClassroomResourcesProps {
  organization: Organization;
  classroom: Classroom;
}

export default function ClassroomResources({ organization, classroom }: ClassroomResourcesProps) {
  const [resources, setResources] = useState<ClassroomResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'electronic' as const,
    quantity: 1,
    condition: 'new' as const
  });

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'classroom_resources'),
      where('classroomId', '==', classroom.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassroomResource)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/classroom_resources`);
    });

    return () => unsubscribe();
  }, [organization.id, classroom.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'classroom_resources'), {
        ...formData,
        organizationId: organization.id,
        classroomId: classroom.id,
        lastChecked: new Date().toISOString().split('T')[0]
      });
      setIsAdding(false);
      setFormData({
        name: '',
        type: 'electronic',
        quantity: 1,
        condition: 'new'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/classroom_resources`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'classroom_resources', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/classroom_resources/${id}`);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'text-green-500 bg-green-500/10';
      case 'good': return 'text-blue-500 bg-blue-500/10';
      case 'fair': return 'text-orange-500 bg-orange-500/10';
      case 'poor': return 'text-red-500 bg-red-500/10';
      default: return 'text-white/40 bg-white/5';
    }
  };

  if (loading) return <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {resources.map((resource) => (
            <motion.div
              layout
              key={resource.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-2xl group hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center text-black/40 group-hover:text-black transition-colors">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-[#1a1a1a] flex items-center gap-2">
                    {resource.name}
                    <span className="text-xs text-black/40">x{resource.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${getConditionColor(resource.condition)}`}>
                      {resource.condition}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-black/20">
                      Type: {resource.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(resource.id)}
                className="p-2 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 p-4 bg-white border border-dashed border-black/20 rounded-2xl text-black/40 hover:text-black hover:bg-gray-50 hover:border-black/40 transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="font-bold">Add Resource</span>
        </button>
      </div>

      {/* Add Resource Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Add Resource</h2>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Resource Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Smart Board"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="electronic">Electronic</option>
                        <option value="furniture">Furniture</option>
                        <option value="educational">Educational</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={isNaN(formData.quantity) ? '' : formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Condition</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['new', 'good', 'fair', 'poor'].map((cond) => (
                        <button
                          key={cond}
                          type="button"
                          onClick={() => setFormData({ ...formData, condition: cond as any })}
                          className={`
                            px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                            ${formData.condition === cond 
                              ? 'bg-black text-white scale-105 shadow-lg' 
                              : 'bg-black/5 text-black/40 hover:bg-black/10'}
                          `}
                        >
                          {cond}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95"
                  >
                    Add Resource
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
        title="Remove Resource"
        message="Are you sure you want to remove this resource from the classroom?"
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
}
