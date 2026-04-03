import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, ExamGradingRule, GradingScale } from '../../types';
import { Plus, Search, Settings, MoreVertical, Trash2, Edit2, X, Save, AlertCircle, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GradingRulesProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function GradingRules({ organization, userProfile }: GradingRulesProps) {
  const [gradingRules, setGradingRules] = useState<ExamGradingRule[]>([]);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingRule, setEditingRule] = useState<ExamGradingRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const unsubscribeRules = onSnapshot(query(
          collection(db, 'organizations', organization.id, 'exam_grading_rules'),
          where('organizationId', '==', organization.id)
        ), (snapshot) => {
          setGradingRules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamGradingRule)));
        });

        const scalesSnap = await getDocs(collection(db, 'organizations', organization.id, 'grading_scales'));
        setGradingScales(scalesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradingScale)));

        setLoading(false);
        return () => unsubscribeRules();
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'fetch_grading_rules');
      }
    };

    fetchData();
  }, [organization.id]);

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const newRule = {
        organizationId: organization.id,
        name: formData.get('name') as string,
        scaleId: formData.get('scaleId') as string,
        rules: [], // Rules will be added in edit mode for simplicity
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'organizations', organization.id, 'exam_grading_rules'), newRule);
      setIsAdding(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'add_grading_rule');
    }
  };

  const handleUpdateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    try {
      await updateDoc(doc(db, 'organizations', organization.id, 'exam_grading_rules', editingRule.id), {
        name: formData.get('name') as string,
        scaleId: formData.get('scaleId') as string,
        rules: editingRule.rules,
        updatedAt: serverTimestamp()
      });
      setEditingRule(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'update_grading_rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this grading rule?')) return;
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'exam_grading_rules', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'delete_grading_rule');
    }
  };

  const addSubRule = () => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      rules: [...editingRule.rules, { minScore: 0, maxScore: 100, grade: 'A', remarks: '' }]
    });
  };

  const removeSubRule = (index: number) => {
    if (!editingRule) return;
    const newRules = [...editingRule.rules];
    newRules.splice(index, 1);
    setEditingRule({ ...editingRule, rules: newRules });
  };

  const updateSubRule = (index: number, field: string, value: any) => {
    if (!editingRule) return;
    const newRules = [...editingRule.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setEditingRule({ ...editingRule, rules: newRules });
  };

  const filteredRules = gradingRules.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20" />
          <input
            type="text"
            placeholder="Search grading rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black/5 border border-black/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 font-bold text-black"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black/80 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>New Grading Rule</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRules.map((rule) => {
          const scale = gradingScales.find(s => s.id === rule.scaleId);
          return (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-black/10 p-6 rounded-[32px] space-y-4 hover:border-black/20 transition-all group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="px-3 py-1 bg-black/5 rounded-full text-[10px] font-black uppercase tracking-widest text-black/40">
                  {scale?.name || 'Custom Scale'}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingRule(rule)}
                    className="p-2 text-black/20 hover:text-black hover:bg-black/5 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-red-500/20 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-black">{rule.name}</h3>
                <p className="text-black/40 font-bold uppercase tracking-widest text-[10px]">{rule.rules.length} Grade Levels</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-black/5">
                {rule.rules.slice(0, 5).map((r, i) => (
                  <div key={i} className="px-2 py-1 bg-black/5 rounded-lg text-[10px] font-black text-black/60">
                    {r.grade}: {r.minScore}-{r.maxScore}%
                  </div>
                ))}
                {rule.rules.length > 5 && <div className="px-2 py-1 bg-black/5 rounded-lg text-[10px] font-black text-black/60">+{rule.rules.length - 5} more</div>}
              </div>
            </motion.div>
          );
        })}
      </div>

      {loading && <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(isAdding || editingRule) && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsAdding(false); setEditingRule(null); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                  {editingRule ? 'Edit Grading Rule' : 'New Grading Rule'}
                </h2>
                <button onClick={() => { setIsAdding(false); setEditingRule(null); }} className="p-2 hover:bg-black/5 rounded-xl text-black/40 hover:text-black transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={editingRule ? handleUpdateRule : handleAddRule} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Rule Name</label>
                      <input
                        name="name"
                        defaultValue={editingRule?.name}
                        required
                        placeholder="e.g. Senior Secondary Grading"
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Base Scale</label>
                      <select
                        name="scaleId"
                        defaultValue={editingRule?.scaleId}
                        required
                        className="w-full bg-gray-50 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                      >
                        <option value="">Select Scale</option>
                        {gradingScales.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editingRule && (
                    <div className="space-y-4 pt-6 border-t border-black/5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-black">Grade Thresholds</h3>
                        <button
                          type="button"
                          onClick={addSubRule}
                          className="flex items-center gap-2 text-sm font-black text-black/40 hover:text-black transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Threshold</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {editingRule.rules.map((rule, index) => (
                          <div key={index} className="grid grid-cols-12 gap-3 items-center bg-black/5 p-4 rounded-2xl">
                            <div className="col-span-2">
                              <input
                                type="text"
                                value={rule.grade}
                                onChange={(e) => updateSubRule(index, 'grade', e.target.value)}
                                placeholder="Grade"
                                className="w-full bg-white border border-black/10 rounded-xl py-2 px-3 text-center font-black text-sm"
                              />
                            </div>
                            <div className="col-span-3 flex items-center gap-2">
                              <input
                                type="number"
                                value={rule.minScore}
                                onChange={(e) => updateSubRule(index, 'minScore', parseFloat(e.target.value))}
                                placeholder="Min %"
                                className="w-full bg-white border border-black/10 rounded-xl py-2 px-3 text-center font-bold text-sm"
                              />
                              <span className="text-black/20">-</span>
                              <input
                                type="number"
                                value={rule.maxScore}
                                onChange={(e) => updateSubRule(index, 'maxScore', parseFloat(e.target.value))}
                                placeholder="Max %"
                                className="w-full bg-white border border-black/10 rounded-xl py-2 px-3 text-center font-bold text-sm"
                              />
                            </div>
                            <div className="col-span-6">
                              <input
                                type="text"
                                value={rule.remarks || ''}
                                onChange={(e) => updateSubRule(index, 'remarks', e.target.value)}
                                placeholder="Remarks (e.g. Excellent)"
                                className="w-full bg-white border border-black/10 rounded-xl py-2 px-3 font-medium text-sm"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeSubRule(index)}
                                className="p-2 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setEditingRule(null); }} className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#1a1a1a] bg-black/5 hover:bg-black/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 rounded-2xl font-black text-white bg-black hover:scale-105 transition-all active:scale-95">
                    {editingRule ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
