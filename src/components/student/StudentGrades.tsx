import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { Organization, UserProfile, Class, Assignment, AssignmentGrade } from '../../types';
import { BookOpen, Calendar, CheckCircle, TrendingUp, Award, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface StudentGradesProps {
  organization: Organization;
  userProfile: UserProfile;
}

export default function StudentGrades({ organization, userProfile }: StudentGradesProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<AssignmentGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization?.id || !userProfile?.uid) return;

    const classesQ = query(collection(db, 'organizations', organization.id, 'classes'));
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Class)));
    });

    const assignmentsQ = query(collection(db, 'organizations', organization.id, 'assignments'));
    const unsubAssignments = onSnapshot(assignmentsQ, (snap) => {
      setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)));
    });

    const gradesQ = query(
      collection(db, 'organizations', organization.id, 'assignment_grades'),
      where('studentId', '==', userProfile.uid)
    );
    const unsubGrades = onSnapshot(gradesQ, (snap) => {
      setGrades(snap.docs.map(d => ({ id: d.id, ...d.data() } as AssignmentGrade)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'assignment_grades');
      setLoading(false);
    });

    return () => {
      unsubClasses();
      unsubAssignments();
      unsubGrades();
    };
  }, [organization.id, userProfile.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Calculate overall average
  let totalScore = 0;
  let totalMaxScore = 0;

  const gradedAssignments = grades.map(grade => {
    const assignment = assignments.find(a => a.id === grade.assignmentId);
    if (assignment) {
      totalScore += grade.score;
      totalMaxScore += assignment.maxScore;
    }
    return {
      ...grade,
      assignment
    };
  }).filter(g => g.assignment); // Only keep grades where assignment exists

  const averagePercentage = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

  // Group grades by class
  const classGrades = classes.map(c => {
    const classAssignments = assignments.filter(a => a.classSectionId === c.id);
    const classGradesList = gradedAssignments.filter(g => g.assignment?.classSectionId === c.id);
    
    let cTotal = 0;
    let cMax = 0;
    classGradesList.forEach(g => {
      cTotal += g.score;
      cMax += g.assignment!.maxScore;
    });

    return {
      class: c,
      grades: classGradesList,
      average: cMax > 0 ? Math.round((cTotal / cMax) * 100) : null
    };
  }).filter(cg => cg.grades.length > 0); // Only show classes with grades

  return (
    <div className="space-y-6 md:space-y-8 pb-8">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">My Grades</h2>
        <p className="text-[#9e9e9e] text-sm md:text-base">Track your academic performance across all classes.</p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-black mb-1">{averagePercentage}%</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Overall Average</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-black mb-1">{gradedAssignments.length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Graded Assignments</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-[#e5e5e5] shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-4xl font-black mb-1">{classGrades.length}</h3>
          <p className="text-[#9e9e9e] text-sm font-bold uppercase tracking-widest">Active Classes</p>
        </div>
      </div>

      {/* Grades by Class */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold tracking-tight">Grades by Class</h3>
        
        {classGrades.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-[#e5e5e5] text-center">
            <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[#9e9e9e]" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Grades Yet</h3>
            <p className="text-[#9e9e9e]">You haven't received any grades for your assignments yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classGrades.map((cg) => (
              <motion.div 
                key={cg.class.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-[#e5e5e5] shadow-sm overflow-hidden"
              >
                <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between bg-[#f9f9f9]">
                  <div>
                    <h4 className="font-bold text-lg text-[#1a1a1a]">{cg.class.name}</h4>
                    <p className="text-sm text-[#9e9e9e]">{cg.grades.length} graded assignments</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-blue-600">{cg.average}%</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9e9e9e]">Average</p>
                  </div>
                </div>
                
                <div className="divide-y divide-[#f0f0f0]">
                  {cg.grades.map((grade) => (
                    <div key={grade.id} className="p-4 flex items-center justify-between hover:bg-[#f9f9f9] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-[#1a1a1a]">{grade.assignment?.title}</p>
                          <p className="text-xs text-[#9e9e9e]">Graded: {new Date(grade.gradedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#1a1a1a]">
                          {grade.score} <span className="text-[#9e9e9e] font-normal text-sm">/ {grade.assignment?.maxScore}</span>
                        </p>
                        <p className="text-xs font-medium text-green-600">
                          {Math.round((grade.score / grade.assignment!.maxScore) * 100)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
