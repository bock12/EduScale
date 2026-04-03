import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, TimetableTemplate, TimetableSlot } from '../../types';
import { Plus, LayoutGrid, Trash2, Edit2, X, Check, Search, Clock, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from '../ui/ConfirmModal';

interface TimetableTemplatesProps {
  organization: Organization;
}

export default function TimetableTemplates({ organization }: TimetableTemplatesProps) {
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TimetableTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    daysPerWeek: number;
    slotsPerDay: number;
    defaultSlotDuration: number | '';
    shift: 'morning' | 'afternoon' | 'full_day';
    structure: string[];
    durations: (number | '')[];
    startTimes: string[];
    endTimes: string[];
  }>({
    name: '',
    description: '',
    daysPerWeek: 5,
    slotsPerDay: 6,
    defaultSlotDuration: 60,
    shift: 'afternoon',
    structure: ['Assembly', 'Teaching', 'Teaching', 'Lunch', 'Teaching', 'Teaching'],
    durations: [20, 60, 65, 30, 60, 60],
    startTimes: ['13:00', '13:20', '14:25', '15:30', '16:00', '17:00'],
    endTimes: ['13:20', '14:20', '15:30', '16:00', '17:00', '18:00']
  });

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'timetable_templates'),
      where('organizationId', '==', organization.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimetableTemplate)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/timetable_templates`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await updateDoc(doc(db, 'organizations', organization.id, 'timetable_templates', editingTemplate.id), {
          ...formData,
          organizationId: organization.id
        });
      } else {
        const templateRef = await addDoc(collection(db, 'organizations', organization.id, 'timetable_templates'), {
          ...formData,
          organizationId: organization.id
        });

        const slotsCollection = collection(db, 'organizations', organization.id, 'timetable_slots');
        
        for (let d = 0; d < formData.daysPerWeek; d++) {
          let currentTime = formData.shift === 'afternoon' ? 13 * 60 : 8 * 60;
          for (let s = 0; s < formData.slotsPerDay; s++) {
            const duration = (formData.durations[s] || formData.defaultSlotDuration || 45) as number;
            
            let startTime = '';
            let endTime = '';

            if (formData.startTimes[s] && formData.endTimes[s]) {
              startTime = formData.startTimes[s];
              endTime = formData.endTimes[s];
              
              // Update currentTime for next slot if needed
              const [h, m] = endTime.split(':').map(Number);
              currentTime = h * 60 + m;
            } else {
              const startH = Math.floor(currentTime / 60);
              const startM = currentTime % 60;
              const endH = Math.floor((currentTime + duration) / 60);
              const endM = (currentTime + duration) % 60;
              
              startTime = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`;
              endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
              currentTime += duration;
            }

            await addDoc(slotsCollection, {
              organizationId: organization.id,
              templateId: templateRef.id,
              dayOfWeek: d,
              startTime,
              endTime,
              label: formData.structure[s] || `Period ${s + 1}`
            });
          }
        }
      }

      setIsAdding(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        daysPerWeek: 5,
        slotsPerDay: 6,
        defaultSlotDuration: 60,
        shift: 'afternoon',
        structure: ['Assembly', 'Teaching', 'Teaching', 'Lunch', 'Teaching', 'Teaching'],
        durations: [20, 60, 65, 30, 60, 60],
        startTimes: ['13:00', '13:20', '14:25', '15:30', '16:00', '17:00'],
        endTimes: ['13:20', '14:20', '15:30', '16:00', '17:00', '18:00']
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/timetable_templates`);
    }
  };

  const handleEdit = (template: TimetableTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      daysPerWeek: template.daysPerWeek,
      slotsPerDay: template.slotsPerDay,
      defaultSlotDuration: template.defaultSlotDuration,
      shift: template.shift || 'morning',
      structure: template.structure || [],
      durations: template.durations || [],
      startTimes: template.startTimes || [],
      endTimes: template.endTimes || []
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'timetable_templates', id));
      if (editingTemplate?.id === id) setEditingTemplate(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/timetable_templates/${id}`);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
          <input
            type="text"
            placeholder="Search templates..."
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
          <span>New Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTemplates.map((template) => (
            <motion.div
              layout
              key={template.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-black/10 p-8 rounded-[40px] hover:border-black/20 transition-all group relative overflow-hidden shadow-sm"
            >
              <div className="absolute top-0 right-0 p-6 flex gap-2">
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-black/20 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(template.id)}
                  className="p-2 text-black/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-black group-hover:text-purple-600 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-black/40 text-sm mt-1 line-clamp-2">{template.description || 'No description provided.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-black/5 p-3 rounded-2xl border border-black/10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-black/20 mb-1">Days</div>
                    <div className="text-lg font-black text-black">{template.daysPerWeek}</div>
                  </div>
                  <div className="bg-black/5 p-3 rounded-2xl border border-black/10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-black/20 mb-1">Slots</div>
                    <div className="text-lg font-black text-black">{template.slotsPerDay}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-3xl font-black tracking-tight text-black mb-6">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Template Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Standard High School"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Days / Week</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="7"
                        value={isNaN(formData.daysPerWeek) ? '' : formData.daysPerWeek}
                        onChange={(e) => setFormData({ ...formData, daysPerWeek: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Shift</label>
                      <select
                        required
                        value={formData.shift}
                        onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                      >
                        <option value="morning">Morning Shift</option>
                        <option value="afternoon">Afternoon Shift</option>
                        <option value="full_day">Full Day</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Slots / Day</label>
                      <input
                        required
                        type="number"
                        min="1"
                        max="15"
                        value={isNaN(formData.slotsPerDay) ? '' : formData.slotsPerDay}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          const newStructure = [...formData.structure];
                          const newDurations = [...formData.durations];
                          const newStartTimes = [...formData.startTimes];
                          const newEndTimes = [...formData.endTimes];
                          
                          if (val > newStructure.length) {
                            for (let i = newStructure.length; i < val; i++) {
                              newStructure.push(`Period ${i + 1}`);
                              newDurations.push(formData.defaultSlotDuration || 45);
                              newStartTimes.push('');
                              newEndTimes.push('');
                            }
                          } else {
                            newStructure.splice(val);
                            newDurations.splice(val);
                            newStartTimes.splice(val);
                            newEndTimes.splice(val);
                          }
                          setFormData({ 
                            ...formData, 
                            slotsPerDay: val, 
                            structure: newStructure,
                            durations: newDurations as any,
                            startTimes: newStartTimes,
                            endTimes: newEndTimes
                          });
                        }}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Day Structure (Labels, Times & Durations)</label>
                    <div className="space-y-3">
                      {formData.structure.map((label, idx) => (
                        <div key={idx} className="space-y-2 p-4 bg-black/5 rounded-2xl border border-black/5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={label}
                              onChange={(e) => {
                                const newStructure = [...formData.structure];
                                newStructure[idx] = e.target.value;
                                setFormData({ ...formData, structure: newStructure });
                              }}
                              className="flex-1 bg-white border border-black/10 rounded-xl py-2 px-4 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                              placeholder={`Slot ${idx + 1} Label`}
                            />
                            <div className="flex items-center gap-1 bg-white border border-black/10 rounded-xl px-3">
                              <Clock className="w-3 h-3 text-black/40" />
                              <input
                                type="number"
                                value={formData.durations[idx] === '' ? '' : (formData.durations[idx] || '')}
                                onChange={(e) => {
                                  const newDurations = [...formData.durations];
                                  newDurations[idx] = e.target.value === '' ? '' : parseInt(e.target.value);
                                  setFormData({ ...formData, durations: newDurations });
                                }}
                                className="w-12 bg-transparent text-sm text-black focus:outline-none"
                                placeholder="Min"
                              />
                              <span className="text-[10px] font-bold text-black/20 uppercase">min</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 flex items-center gap-2 bg-white border border-black/10 rounded-xl px-3 py-2">
                              <span className="text-[10px] font-bold text-black/40 uppercase w-8">Start</span>
                              <input
                                type="time"
                                value={formData.startTimes[idx] || ''}
                                onChange={(e) => {
                                  const newStartTimes = [...formData.startTimes];
                                  newStartTimes[idx] = e.target.value;
                                  setFormData({ ...formData, startTimes: newStartTimes });
                                }}
                                className="flex-1 bg-transparent text-sm text-black focus:outline-none"
                              />
                            </div>
                            <div className="flex-1 flex items-center gap-2 bg-white border border-black/10 rounded-xl px-3 py-2">
                              <span className="text-[10px] font-bold text-black/40 uppercase w-8">End</span>
                              <input
                                type="time"
                                value={formData.endTimes[idx] || ''}
                                onChange={(e) => {
                                  const newEndTimes = [...formData.endTimes];
                                  newEndTimes[idx] = e.target.value;
                                  setFormData({ ...formData, endTimes: newEndTimes });
                                }}
                                className="flex-1 bg-transparent text-sm text-black focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Default Duration (min)</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max="180"
                      value={formData.defaultSlotDuration === '' as any ? '' : formData.defaultSlotDuration}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                        const newDurations = formData.durations.map((d, i) => 
                          formData.structure[i].toLowerCase().includes('teaching') ? val : d
                        );
                        setFormData({ 
                          ...formData, 
                          defaultSlotDuration: val,
                          durations: newDurations
                        });
                      }}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-black focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
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
                    {editingTemplate ? 'Save Changes' : 'Create Template'}
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
        title="Delete Template"
        message="Are you sure you want to delete this template? This will also remove all associated time slots."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
