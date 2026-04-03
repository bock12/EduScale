import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile } from '../../types';
import { School, Users, BookOpen, Clock, MapPin, User } from 'lucide-react';

interface StudentClassesProps {
  organization: Organization;
  userProfile: UserProfile;
}

interface ClassSection {
  id: string;
  name: string;
  subject: string;
  teacherId: string;
  teacherName?: string;
  roomId?: string;
  roomName?: string;
  schedule?: string;
}

export default function StudentClasses({ organization, userProfile }: StudentClassesProps) {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would query the student's enrollments
    // For now, we'll fetch class_sections and mock the enrollment
    const q = query(collection(db, 'organizations', organization.id, 'class_sections'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const classData: ClassSection[] = [];
      snapshot.forEach((doc) => {
        // Mock: Assume student is enrolled in the first 4 classes
        if (classData.length < 4) {
          classData.push({ id: doc.id, ...doc.data() } as ClassSection);
        }
      });
      setClasses(classData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `organizations/${organization.id}/class_sections`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [organization.id, userProfile.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold tracking-tight mb-2">My Classes</h2>
        <p className="text-[#9e9e9e]">View your enrolled classes and subjects.</p>
      </header>

      {classes.length === 0 ? (
        <div className="bg-white p-12 rounded-[32px] border border-[#e5e5e5] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-4">
            <School className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">No Classes Found</h3>
          <p className="text-[#9e9e9e]">You are not currently enrolled in any classes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">
                  Enrolled
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-[#1a1a1a] mb-1">{cls.name}</h3>
              <p className="text-[#9e9e9e] font-medium mb-6">{cls.subject || 'General Studies'}</p>
              
              <div className="space-y-3 mt-auto">
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <User className="w-4 h-4 text-[#9e9e9e]" />
                  <span>{cls.teacherName || 'Teacher Not Assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <MapPin className="w-4 h-4 text-[#9e9e9e]" />
                  <span>{cls.roomName || 'Room Not Assigned'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[#4a4a4a]">
                  <Clock className="w-4 h-4 text-[#9e9e9e]" />
                  <span>{cls.schedule || 'Schedule Not Set'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
