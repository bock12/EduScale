import React, { useRef } from 'react';
import { Organization, Student, StudentProfile } from '../../types';
import { X, Printer, UserCircle } from 'lucide-react';
import QRCode from 'react-qr-code';

interface IdCardModalProps {
  organization: Organization;
  student: Student;
  profile: StudentProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function IdCardModal({ organization, student, profile, isOpen, onClose }: IdCardModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ID Card - ${student.firstName} ${student.lastName}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: 3.375in 2.125in; margin: 0; }
              body { 
                margin: 0; 
                display: flex; 
                flex-direction: column;
                align-items: center; 
                background: white; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .id-card {
                width: 3.375in;
                height: 2.125in;
                position: relative;
                overflow: hidden;
                border-radius: 0.5rem;
                border: 1px solid #e5e5e5;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                page-break-after: always;
              }
              @media print {
                body {
                  display: block;
                }
                .id-card {
                  border: none;
                  box-shadow: none;
                  border-radius: 0;
                }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
        <div className="flex items-center justify-between p-6 border-b border-[#e5e5e5]">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Student ID Card
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[#f5f5f5] rounded-full transition-colors text-[#9e9e9e] hover:text-[#1a1a1a]"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 flex flex-col md:flex-row items-center justify-center gap-8 bg-[#f9f9f9]">
          <div ref={printRef} className="hidden">
            {/* Front of Card (Print Version) */}
            <div className="id-card bg-white">
              <div className="w-full h-full flex flex-col relative bg-white">
                <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shrink-0 h-10">
                  <span className="font-bold text-sm truncate max-w-[150px]">{organization.name}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-90">Student ID</span>
                </div>
                <div className="flex-1 flex p-3 gap-3">
                  <div className="w-[1.2in] h-[1.2in] shrink-0 rounded-lg overflow-hidden bg-[#f5f5f5] border-2 border-white shadow-sm flex items-center justify-center">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="Student" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <UserCircle className="w-12 h-12 text-[#9e9e9e]" />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h3 className="font-bold text-lg leading-tight text-[#1a1a1a] truncate">{student.firstName}</h3>
                    <h3 className="font-bold text-lg leading-tight text-[#1a1a1a] truncate mb-1">{student.lastName}</h3>
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1"><span className="font-bold text-[#9e9e9e] w-8">ID:</span><span className="font-mono font-medium truncate">{student.studentId}</span></p>
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1"><span className="font-bold text-[#9e9e9e] w-8">Grade:</span><span className="font-medium truncate">{student.gradeLevel}</span></p>
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1"><span className="font-bold text-[#9e9e9e] w-8">DOB:</span><span className="font-medium truncate">{new Date(student.dateOfBirth).toLocaleDateString()}</span></p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 flex items-end justify-end">
                  <div className="bg-white p-1 rounded shadow-sm border border-[#e5e5e5]">
                    <QRCode value={`STUDENT:${organization.id}:${student.id}:${student.studentId}`} size={40} level="L" />
                  </div>
                </div>
                <div className="absolute top-10 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/5 rounded-full -ml-12 -mb-12 pointer-events-none" />
              </div>
            </div>
            
            {/* Back of Card (Print Version) */}
            <div className="id-card bg-white">
              <div className="w-full h-full flex flex-col relative bg-white p-4">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h4 className="font-bold text-sm text-[#1a1a1a] mb-2">If found, please return to:</h4>
                  <p className="text-xs text-[#4a4a4a] font-bold">{organization.name}</p>
                  <p className="text-[10px] text-[#9e9e9e] mt-4 max-w-[2.5in]">
                    This card is the property of {organization.name} and must be returned upon request.
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t border-[#e5e5e5] flex justify-between items-center">
                  <span className="text-[8px] text-[#9e9e9e]">Valid for current academic year</span>
                  <span className="text-[8px] text-[#9e9e9e] font-mono">{student.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Front of Card (Display Version) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[#9e9e9e] uppercase tracking-wider">Front</span>
            <div 
              className="relative bg-white rounded-xl shadow-lg border border-[#e5e5e5] overflow-hidden"
              style={{ width: '3.375in', height: '2.125in' }}
            >
              <div className="w-full h-full flex flex-col relative bg-white">
                {/* Header */}
                <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between shrink-0 h-10">
                  <span className="font-bold text-sm truncate max-w-[150px]">{organization.name}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider opacity-90">Student ID</span>
                </div>

                {/* Body */}
                <div className="flex-1 flex p-3 gap-3">
                  {/* Photo */}
                  <div className="w-[1.2in] h-[1.2in] shrink-0 rounded-lg overflow-hidden bg-[#f5f5f5] border-2 border-white shadow-sm flex items-center justify-center">
                    {profile?.photoURL ? (
                      <img 
                        src={profile.photoURL} 
                        alt="Student" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserCircle className="w-12 h-12 text-[#9e9e9e]" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <h3 className="font-bold text-lg leading-tight text-[#1a1a1a] truncate">
                      {student.firstName}
                    </h3>
                    <h3 className="font-bold text-lg leading-tight text-[#1a1a1a] truncate mb-1">
                      {student.lastName}
                    </h3>
                    
                    <div className="space-y-0.5 mt-1">
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1">
                        <span className="font-bold text-[#9e9e9e] w-8">ID:</span>
                        <span className="font-mono font-medium truncate">{student.studentId}</span>
                      </p>
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1">
                        <span className="font-bold text-[#9e9e9e] w-8">Grade:</span>
                        <span className="font-medium truncate">{student.gradeLevel}</span>
                      </p>
                      <p className="text-[10px] text-[#4a4a4a] flex items-center gap-1">
                        <span className="font-bold text-[#9e9e9e] w-8">DOB:</span>
                        <span className="font-medium truncate">{new Date(student.dateOfBirth).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer / QR Code */}
                <div className="absolute bottom-2 right-2 flex items-end justify-end">
                  <div className="bg-white p-1 rounded shadow-sm border border-[#e5e5e5]">
                    <QRCode 
                      value={`STUDENT:${organization.id}:${student.id}:${student.studentId}`} 
                      size={40} 
                      level="L"
                    />
                  </div>
                </div>
                
                {/* Background Accent */}
                <div className="absolute top-10 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/5 rounded-full -ml-12 -mb-12 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Back of Card (Display Version) */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-[#9e9e9e] uppercase tracking-wider">Back</span>
            <div 
              className="relative bg-white rounded-xl shadow-lg border border-[#e5e5e5] overflow-hidden"
              style={{ width: '3.375in', height: '2.125in' }}
            >
              <div className="w-full h-full flex flex-col relative bg-white p-4">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <h4 className="font-bold text-sm text-[#1a1a1a] mb-2">If found, please return to:</h4>
                  <p className="text-xs text-[#4a4a4a] font-bold">{organization.name}</p>
                  <p className="text-[10px] text-[#9e9e9e] mt-4 max-w-[2.5in]">
                    This card is the property of {organization.name} and must be returned upon request.
                  </p>
                </div>
                <div className="mt-auto pt-2 border-t border-[#e5e5e5] flex justify-between items-center">
                  <span className="text-[8px] text-[#9e9e9e]">Valid for current academic year</span>
                  <span className="text-[8px] text-[#9e9e9e] font-mono">{student.id.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-[#f9f9f9] px-8 pb-8">
          <p className="text-sm text-[#9e9e9e] text-center">
            Standard CR80 size (3.375" × 2.125"). Use the print button to generate a print-ready version with both sides.
          </p>
        </div>

        <div className="p-6 border-t border-[#e5e5e5] bg-white flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-[#4a4a4a] hover:bg-[#e5e5e5] transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Print ID Card
          </button>
        </div>
      </div>
    </div>
  );
}
