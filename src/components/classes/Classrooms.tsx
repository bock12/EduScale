import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Classroom } from '../../types';
import { Plus, School, Trash2, Edit2, X, Check, Search, MapPin, Layers, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ClassroomResources from './ClassroomResources';
import ConfirmModal from '../ui/ConfirmModal';

interface ClassroomsProps {
  organization: Organization;
}

export default function Classrooms({ organization }: ClassroomsProps) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: 1,
    capacity: 30,
    type: 'general' as const,
    status: 'available' as const
  });

  useEffect(() => {
    const q = query(
      collection(db, 'organizations', organization.id, 'classrooms'),
      where('organizationId', '==', organization.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClassrooms(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `organizations/${organization.id}/classrooms`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'organizations', organization.id, 'classrooms'), {
        ...formData,
        organizationId: organization.id
      });
      setIsAdding(false);
      setFormData({
        name: '',
        building: '',
        floor: 1,
        capacity: 30,
        type: 'general',
        status: 'available'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${organization.id}/classrooms`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'classrooms', id));
      if (selectedClassroom?.id === id) setSelectedClassroom(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${organization.id}/classrooms/${id}`);
    }
  };

  const filteredClassrooms = classrooms.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.building?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Classrooms List */}
      <div className={`${selectedClassroom ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-4`}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
            <input
              type="text"
              placeholder="Search classrooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-black/10 rounded-2xl py-3 pl-12 pr-4 text-[#1a1a1a] placeholder:text-black/20 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
            />
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="bg-black text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Room</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredClassrooms.map((room) => (
              <motion.div
                layout
                key={room.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setSelectedClassroom(room)}
                className={`
                  group relative p-6 rounded-[32px] border transition-all cursor-pointer
                  ${selectedClassroom?.id === room.id 
                    ? 'bg-black border-black shadow-xl scale-[1.02] z-10' 
                    : 'bg-white border-black/10 hover:border-black/20 hover:shadow-md'}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className={`text-xs font-black uppercase tracking-widest ${selectedClassroom?.id === room.id ? 'text-white/40' : 'text-black/40'}`}>
                      {room.type} • {room.building || 'Main Building'}
                    </div>
                    <h3 className={`text-2xl font-black tracking-tight ${selectedClassroom?.id === room.id ? 'text-white' : 'text-[#1a1a1a]'}`}>
                      {room.name}
                    </h3>
                    <div className={`flex items-center gap-4 mt-2 ${selectedClassroom?.id === room.id ? 'text-white/60' : 'text-black/60'}`}>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4" />
                        <span>Cap. {room.capacity}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Layers className="w-4 h-4" />
                        <span>Floor {room.floor}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(room.id);
                    }}
                    className={`p-2 rounded-xl transition-colors ${selectedClassroom?.id === room.id ? 'hover:bg-white/10 text-white/40' : 'hover:bg-black/5 text-black/40'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Column: Classroom Details & Resources */}
      <AnimatePresence>
        {selectedClassroom && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="lg:col-span-8 space-y-6"
          >
            <div className="bg-white border border-black/10 rounded-[40px] p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-black/5 flex items-center justify-center text-[#1a1a1a]">
                    <School className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">{selectedClassroom.name}</h2>
                    <p className="text-black/40 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedClassroom.building || 'Main Building'}, Floor {selectedClassroom.floor}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedClassroom(null)}
                  className="p-3 bg-black/5 hover:bg-black/10 rounded-2xl text-[#1a1a1a] transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-black/10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Capacity</div>
                  <div className="text-xl font-black text-[#1a1a1a]">{selectedClassroom.capacity}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-black/10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Type</div>
                  <div className="text-xl font-black text-[#1a1a1a] capitalize">{selectedClassroom.type}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-black/10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-black/40 mb-1">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedClassroom.status === 'available' ? 'bg-green-500' : 'bg-orange-500'}`} />
                    <div className="text-xl font-black text-[#1a1a1a] capitalize">{selectedClassroom.status}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-[#1a1a1a]">Classroom Resources</h3>
                </div>
                <ClassroomResources organization={organization} classroom={selectedClassroom} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white border border-black/10 rounded-[40px] p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a] mb-6">New Classroom</h2>
              <form onSubmit={handleAdd} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Room Name/Number</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Room 101"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Building</label>
                      <input
                        type="text"
                        placeholder="e.g. Science Block"
                        value={formData.building}
                        onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Floor</label>
                      <input
                        type="number"
                        value={isNaN(formData.floor) ? '' : formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Capacity</label>
                      <input
                        required
                        type="number"
                        value={isNaN(formData.capacity) ? '' : formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black/40 uppercase tracking-widest mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full bg-black/5 border border-black/10 rounded-2xl py-4 px-6 text-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-black/5"
                      >
                        <option value="general">General</option>
                        <option value="lab">Lab</option>
                        <option value="gym">Gym</option>
                        <option value="library">Library</option>
                        <option value="other">Other</option>
                      </select>
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
                    Create Room
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
        title="Delete Classroom"
        message="Are you sure you want to delete this classroom? This action cannot be undone and may affect existing timetables."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
