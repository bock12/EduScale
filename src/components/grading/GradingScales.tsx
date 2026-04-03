import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, GradingScale } from '../../types';
import { Plus, Edit2, Trash2, Save, X, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GradingScalesProps {
  organization: Organization;
}

export default function GradingScales({ organization }: GradingScalesProps) {
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    grades: { label: string; minScore: number; maxScore: number; gpaValue: number }[];
  }>({
    name: '',
    grades: [{ label: 'A', minScore: 90, maxScore: 100, gpaValue: 4.0 }]
  });

  useEffect(() => {
    const q = query(collection(db, 'organizations', organization.id, 'grading_scales'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scalesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GradingScale[];
      setScales(scalesData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organization.id}/grading_scales`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id]);

  const handleOpenModal = (scale?: GradingScale) => {
    if (scale) {
      setEditingScale(scale);
      setFormData({
        name: scale.name,
        grades: [...scale.grades]
      });
    } else {
      setEditingScale(null);
      setFormData({
        name: '',
        grades: [{ label: 'A', minScore: 90, maxScore: 100, gpaValue: 4.0 }]
      });
    }
    setIsModalOpen(true);
  };

  const handleAddGrade = () => {
    setFormData({
      ...formData,
      grades: [...formData.grades, { label: '', minScore: 0, maxScore: 0, gpaValue: 0 }]
    });
  };

  const handleRemoveGrade = (index: number) => {
    const newGrades = formData.grades.filter((_, i) => i !== index);
    setFormData({ ...formData, grades: newGrades });
  };

  const handleGradeChange = (index: number, field: string, value: string | number) => {
    const newGrades = [...formData.grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setFormData({ ...formData, grades: newGrades });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a name for the grading scale.");
      return;
    }

    if (formData.grades.length === 0) {
      alert("Please add at least one grade to the scale.");
      return;
    }

    setSaving(true);
    try {
      if (editingScale) {
        await updateDoc(doc(db, 'organizations', organization.id, 'grading_scales', editingScale.id), formData);
      } else {
        await addDoc(collection(db, 'organizations', organization.id, 'grading_scales'), formData);
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingScale ? OperationType.UPDATE : OperationType.CREATE, `organizations/${organization.id}/grading_scales`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (scaleId: string) => {
    if (!confirm("Are you sure you want to delete this grading scale? This action cannot be undone.")) return;

    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'grading_scales', scaleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/grading_scales/${scaleId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Custom Grading Scales</h3>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          Add Grading Scale
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scales.length === 0 ? (
          <div className="col-span-full bg-white rounded-[32px] border border-dashed border-[#e5e5e5] p-12 text-center">
            <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-[#9e9e9e]" />
            </div>
            <h4 className="text-lg font-bold mb-2">No Grading Scales Defined</h4>
            <p className="text-[#9e9e9e] mb-6">Create your first grading scale to start using it in assignments and report cards.</p>
            <button
              onClick={() => handleOpenModal()}
              className="text-blue-600 font-bold hover:underline"
            >
              Create Scale
            </button>
          </div>
        ) : (
          scales.map((scale) => (
            <div key={scale.id} className="bg-white rounded-[32px] border border-[#e5e5e5] p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold">{scale.name}</h4>
                  <p className="text-xs text-[#9e9e9e] uppercase tracking-widest font-bold mt-1">
                    {scale.grades.length} Grades
                  </p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenModal(scale)}
                    className="p-2 text-[#4a4a4a] hover:bg-[#f5f5f5] rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(scale.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {scale.grades.slice(0, 5).map((grade, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-[#f5f5f5] last:border-0">
                    <span className="font-bold">{grade.label}</span>
                    <span className="text-[#9e9e9e]">{grade.minScore}% - {grade.maxScore}%</span>
                    <span className="font-mono text-blue-600">{grade.gpaValue.toFixed(1)}</span>
                  </div>
                ))}
                {scale.grades.length > 5 && (
                  <p className="text-xs text-[#9e9e9e] text-center pt-2 italic">
                    + {scale.grades.length - 5} more grades
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
                <div>
                  <h3 className="text-2xl font-bold">{editingScale ? 'Edit Grading Scale' : 'New Grading Scale'}</h3>
                  <p className="text-[#9e9e9e] text-sm">Define labels, score ranges, and GPA values.</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-[#e5e5e5] rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
                <div>
                  <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest mb-2">Scale Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Standard 4.0 Scale"
                    className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#1a1a1a] uppercase tracking-widest">Grades & Values</label>
                    <button
                      onClick={handleAddGrade}
                      className="flex items-center gap-1 text-blue-600 text-sm font-bold hover:underline"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add Grade
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-12 gap-4 px-2 text-[10px] font-bold text-[#9e9e9e] uppercase tracking-widest">
                      <div className="col-span-3">Label</div>
                      <div className="col-span-3">Min %</div>
                      <div className="col-span-3">Max %</div>
                      <div className="col-span-2">GPA</div>
                      <div className="col-span-1"></div>
                    </div>

                    {formData.grades.map((grade, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center bg-[#f9f9f9] p-3 rounded-2xl border border-[#e5e5e5]">
                        <div className="col-span-3">
                          <input
                            type="text"
                            value={grade.label}
                            onChange={(e) => handleGradeChange(index, 'label', e.target.value)}
                            placeholder="A"
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={isNaN(grade.minScore) ? '' : grade.minScore}
                            onChange={(e) => handleGradeChange(index, 'minScore', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={isNaN(grade.maxScore) ? '' : grade.maxScore}
                            onChange={(e) => handleGradeChange(index, 'maxScore', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            step="0.1"
                            value={isNaN(grade.gpaValue) ? '' : grade.gpaValue}
                            onChange={(e) => handleGradeChange(index, 'gpaValue', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 outline-none"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            onClick={() => handleRemoveGrade(index)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-[#f9f9f9] border-t border-[#e5e5e5] flex justify-end gap-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-[#4a4a4a] font-bold hover:bg-[#e5e5e5] rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 text-white font-bold px-8 py-3 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {editingScale ? 'Update Scale' : 'Create Scale'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
