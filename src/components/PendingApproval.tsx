import React from 'react';
import { Clock, LogOut } from 'lucide-react';
import { auth } from '../firebase';

export default function PendingApproval() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-10 rounded-[32px] border border-[#e5e5e5] shadow-xl text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-6">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-4">Under Review</h1>
        <p className="text-[#4a4a4a] mb-8 leading-relaxed">
          Your school registration has been submitted successfully. Our team is reviewing your details to ensure platform security and compliance. 
          <br/><br/>
          You will receive an email once your organization is approved.
        </p>

        <button
          onClick={() => auth.signOut()}
          className="w-full flex items-center justify-center gap-2 bg-[#f5f5f5] text-[#1a1a1a] font-bold py-4 rounded-xl hover:bg-[#e5e5e5] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
