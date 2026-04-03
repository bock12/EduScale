import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, Teacher, TeacherDepartment } from '../../types';
import { Plus, Trash2, AlertCircle, Building2 } from 'lucide-react';

interface TeacherDepartmentsTabProps {
  organization: Organization;
  teacher: Teacher;
}

export default function TeacherDepartmentsTab({ organization, teacher }: TeacherDepartmentsTabProps) {
  const [departments, setDepartments] = useState<TeacherDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newDepartment, setNewDepartment] = useState({
    departmentId: '',
    role: 'teacher',
    isHead: false
  });

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const deptsRef = collection(db, 'organizations', organization.id, 'teacher_departments');
      const q = query(deptsRef, where('teacherId', '==', teacher.id));
      const snapshot = await getDocs(q);
      
      const deptsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeacherDepartment[];
      
      setDepartments(deptsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `organizations/${organization.id}/teacher_departments`);
      setError('Failed to load departments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [organization.id, teacher.id]);

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.departmentId) return;

    setAdding(true);
    setError(null);

    try {
      // Check if already in this department
      if (departments.some(d => d.departmentId === newDepartment.departmentId)) {
        setError('Teacher is already assigned to this department.');
        setAdding(false);
        return;
      }

      const deptsRef = collection(db, 'organizations', organization.id, 'teacher_departments');
      await addDoc(deptsRef, {
        ...newDepartment,
        teacherId: teacher.id,
        organizationId: organization.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setNewDepartment({ departmentId: '', role: 'teacher', isHead: false });
      fetchDepartments();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `organizations/${organization.id}/teacher_departments`);
      setError('Failed to assign department.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this department assignment?')) return;

    try {
      await deleteDoc(doc(db, 'organizations', organization.id, 'teacher_departments', id));
      fetchDepartments();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `organizations/${organization.id}/teacher_departments/${id}`);
      setError('Failed to remove department.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Add Department Form */}
      <div className="bg-[#f9f9f9] p-6 rounded-2xl border border-[#e5e5e5]">
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          Assign Department
        </h3>
        <form onSubmit={handleAddDepartment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Department Name/ID *</label>
            <input
              type="text"
              required
              value={newDepartment.departmentId}
              onChange={e => setNewDepartment(prev => ({ ...prev, departmentId: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
              placeholder="e.g. Mathematics, Science"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-[#4a4a4a] mb-2">Role</label>
            <select
              value={newDepartment.role}
              onChange={e => setNewDepartment(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-[#e5e5e5] focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
            >
              <option value="teacher">Teacher</option>
              <option value="head">Head of Department</option>
              <option value="assistant">Assistant</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={adding || !newDepartment.departmentId}
            className="w-full px-4 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Assign
              </>
            )}
          </button>
        </form>
      </div>

      {/* Departments List */}
      <div>
        <h3 className="text-lg font-bold text-[#1a1a1a] mb-4">Current Departments</h3>
        {departments.length === 0 ? (
          <div className="text-center py-12 bg-[#f9f9f9] rounded-2xl border border-dashed border-[#e5e5e5]">
            <Building2 className="w-12 h-12 text-[#9e9e9e] mx-auto mb-3 opacity-50" />
            <p className="text-[#4a4a4a] font-medium">No departments assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {departments.map(dept => (
              <div key={dept.id} className="bg-white p-5 rounded-2xl border border-[#e5e5e5] shadow-sm flex items-start justify-between group">
                <div>
                  <h4 className="font-bold text-[#1a1a1a] text-lg">{dept.departmentId}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest rounded-full">
                      {dept.role}
                    </span>
                    {dept.isHead && (
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-full">
                        HOD
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDepartment(dept.id)}
                  className="p-2 text-[#9e9e9e] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Remove Department"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
