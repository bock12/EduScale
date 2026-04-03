import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  ChevronRight,
  User,
  Building,
  LifeBuoy,
  Search,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { SupportTicket, UserProfile } from '../types';

interface SupportDeskProps {
  userProfile: UserProfile;
}

export default function SupportDesk({ userProfile }: SupportDeskProps) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    recipientRole: userProfile.role === 'school_admin' ? 'super_admin' : 'school_admin' as 'super_admin' | 'school_admin'
  });
  const [response, setResponse] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'closed'>('all');

  useEffect(() => {
    let q;
    if (userProfile.role === 'super_admin') {
      // Super admin sees all tickets directed to them
      q = query(
        collection(db, 'support_tickets'),
        where('recipientRole', '==', 'super_admin'),
        orderBy('createdAt', 'desc')
      );
    } else if (userProfile.role === 'school_admin') {
      // School admin sees tickets from their school directed to them OR tickets they sent to super admin
      q = query(
        collection(db, 'support_tickets'),
        where('organizationId', '==', userProfile.organizationId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Other users see only their own tickets
      q = query(
        collection(db, 'support_tickets'),
        where('senderId', '==', userProfile.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SupportTicket[];
      setTickets(ticketData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'support_tickets');
    });

    return () => unsubscribe();
  }, [userProfile]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.subject || !newTicket.message) return;

    try {
      await addDoc(collection(db, 'support_tickets'), {
        subject: newTicket.subject,
        message: newTicket.message,
        senderId: userProfile.uid,
        senderName: userProfile.displayName,
        senderRole: userProfile.role,
        organizationId: userProfile.organizationId,
        recipientRole: newTicket.recipientRole,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: []
      });
      setShowNewTicket(false);
      setNewTicket({ subject: '', message: '', recipientRole: userProfile.role === 'school_admin' ? 'super_admin' : 'school_admin' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'support_tickets');
    }
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response) return;

    const newResponse = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: userProfile.uid,
      senderName: userProfile.displayName,
      message: response,
      createdAt: new Date().toISOString()
    };

    try {
      const ticketRef = doc(db, 'support_tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        responses: [...selectedTicket.responses, newResponse],
        updatedAt: new Date().toISOString(),
        status: selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status
      });
      setResponse('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${selectedTicket.id}`);
    }
  };

  const updateStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `support_tickets/${ticketId}`);
    }
  };

  const filteredTickets = tickets.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">Support Desk</h2>
          <p className="text-[#9e9e9e]">Get help from administrators or respond to user requests.</p>
        </div>
        {userProfile.role !== 'super_admin' && (
          <button 
            onClick={() => setShowNewTicket(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Ticket
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 p-2 bg-[#f5f5f5] rounded-2xl">
            {(['all', 'open', 'in_progress', 'closed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === f ? 'bg-white text-blue-600 shadow-sm' : 'text-[#9e9e9e] hover:text-[#4a4a4a]'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-[#e5e5e5]">
                <LifeBuoy className="w-12 h-12 text-[#e5e5e5] mx-auto mb-4" />
                <p className="text-[#9e9e9e] font-medium">No tickets found.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full text-left p-4 rounded-[24px] border transition-all ${
                    selectedTicket?.id === ticket.id 
                      ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-100' 
                      : 'border-[#e5e5e5] bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                      ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#9e9e9e] font-medium">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#1a1a1a] mb-1 truncate">{ticket.subject}</h4>
                  <p className="text-xs text-[#9e9e9e] line-clamp-2">{ticket.message}</p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-[#4a4a4a] uppercase tracking-wider">
                    <User className="w-3 h-3" />
                    {ticket.senderName}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-[32px] border border-[#e5e5e5] shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-6 border-b border-[#f5f5f5] flex items-center justify-between bg-[#fcfcfc]">
                <div>
                  <h3 className="text-xl font-bold text-[#1a1a1a]">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-[#9e9e9e] flex items-center gap-1">
                      <User className="w-3 h-3" /> {selectedTicket.senderName} ({selectedTicket.senderRole})
                    </span>
                    <span className="text-xs text-[#9e9e9e] flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(selectedTicket.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateStatus(selectedTicket.id, e.target.value as any)}
                    className="text-xs font-bold bg-[#f5f5f5] border-none rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Initial Message */}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="bg-blue-50 rounded-2xl p-4 max-w-[80%]">
                    <p className="text-sm text-[#1a1a1a] whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                </div>

                {/* Responses */}
                {selectedTicket.responses.map((res) => (
                  <div key={res.id} className={`flex gap-4 ${res.senderId === userProfile.uid ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      res.senderId === userProfile.uid ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <User className={`w-5 h-5 ${res.senderId === userProfile.uid ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className={`rounded-2xl p-4 max-w-[80%] ${
                      res.senderId === userProfile.uid ? 'bg-green-50' : 'bg-gray-50'
                    }`}>
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4a4a4a]">{res.senderName}</span>
                        <span className="text-[10px] text-[#9e9e9e]">{new Date(res.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-[#1a1a1a] whitespace-pre-wrap">{res.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-[#f5f5f5] bg-[#fcfcfc]">
                <div className="flex gap-4">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your response here..."
                    className="flex-1 bg-white border border-[#e5e5e5] rounded-2xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                  />
                  <button
                    onClick={handleSendResponse}
                    disabled={!response}
                    className="bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 self-end"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[600px] bg-white rounded-[32px] border border-[#e5e5e5] flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-12 h-12 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-[#1a1a1a] mb-2">Select a ticket to view details</h3>
              <p className="text-[#9e9e9e] max-w-sm">
                Choose a support request from the list on the left to view the conversation and provide assistance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      <AnimatePresence>
        {showNewTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewTicket(false)}
              className="absolute inset-0 bg-[#0a0a0a]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <h3 className="text-3xl font-black tracking-tight mb-2">New Support Ticket</h3>
                <p className="text-[#9e9e9e] mb-8">Describe your issue and we'll get back to you as soon as possible.</p>
                
                <form onSubmit={handleCreateTicket} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Subject</label>
                    <input 
                      type="text" 
                      required
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      placeholder="Brief summary of the issue"
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Recipient</label>
                    <select
                      value={newTicket.recipientRole}
                      onChange={(e) => setNewTicket({ ...newTicket, recipientRole: e.target.value as any })}
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium appearance-none"
                    >
                      {userProfile.role === 'school_admin' ? (
                        <option value="super_admin">Super Administrator (Platform Support)</option>
                      ) : (
                        <option value="school_admin">School Administrator</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#9e9e9e] uppercase tracking-widest">Message</label>
                    <textarea 
                      required
                      value={newTicket.message}
                      onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                      placeholder="Provide more details about your request..."
                      className="w-full px-6 py-4 bg-[#f5f5f5] border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium h-32 resize-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowNewTicket(false)}
                      className="flex-1 px-8 py-4 rounded-2xl font-bold text-[#4a4a4a] hover:bg-[#f5f5f5] transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Send Ticket
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
