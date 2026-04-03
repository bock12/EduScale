import React, { useState, useRef, useEffect } from 'react';
import { Channel, Message, User } from '../../types/chat';
import { Send, Paperclip, MoreVertical, Search, X, Smile, Image as ImageIcon, FileText, MessageSquare, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  channel: Channel | null;
  messages: Message[];
  onSendMessage: (content: string, attachment?: any) => void;
  currentUser: User;
  onClose?: () => void;
}

export default function ChatWindow({ 
  channel, 
  messages, 
  onSendMessage, 
  currentUser,
  onClose 
}: ChatWindowProps) {
  const [messageText, setMessageText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File, preview: string } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 500KB for Firestore document size safety
    if (file.size > 500 * 1024) {
      alert("File is too large. Please select a file smaller than 500KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        file,
        preview: reader.result as string
      });
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageText.trim() && !selectedFile) return;
    
    onSendMessage(messageText, selectedFile ? {
      name: selectedFile.file.name,
      type: selectedFile.file.type.startsWith('image/') ? 'image' : 'file',
      url: selectedFile.preview // In a real app, this would be the uploaded URL
    } : undefined);
    
    setMessageText('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f9f9f9] p-8 text-center">
        <div className="w-20 h-20 rounded-[32px] bg-white shadow-sm border border-[#e5e5e5] flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-blue-600" />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Select a conversation</h2>
        <p className="text-[#9e9e9e] max-w-xs">Choose a chat from the sidebar to start messaging with your colleagues or students.</p>
      </div>
    );
  }

  const otherParticipant = channel.type === 'direct' 
    ? channel.participants?.find(p => p.id !== currentUser.id)
    : null;
  
  const displayName = channel.type === 'direct' 
    ? otherParticipant?.name || 'Unknown User'
    : channel.name;

  return (
    <div className="flex-1 flex flex-col bg-white h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="md:hidden p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            channel.type === 'direct' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
          }`}>
            {channel.type === 'direct' ? (
              otherParticipant?.profileImage ? (
                <img src={otherParticipant.profileImage} alt="" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="font-black">{displayName?.charAt(0)}</span>
              )
            ) : (
              <Users className="w-5 h-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#1a1a1a]">{displayName}</h3>
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-widest">
              {channel.type === 'direct' ? 'Online' : `${channel.participants?.length || 0} Members`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#9e9e9e]">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-[#9e9e9e]">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#f9f9f9]/50">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const isMe = message.fromUserId === currentUser.id;
            const showAvatar = index === 0 || messages[index - 1].fromUserId !== message.fromUserId;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && showAvatar && (
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 mb-1">
                    {message.sender.name.charAt(0)}
                  </div>
                )}
                {!isMe && !showAvatar && <div className="w-8 shrink-0" />}
                
                <div className={`max-w-[70%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && !isMe && (
                    <span className="text-[10px] font-bold text-[#9e9e9e] ml-1 uppercase tracking-widest">
                      {message.sender.name}
                    </span>
                  )}
                  <div className={`p-4 rounded-2xl text-sm shadow-sm border ${
                    isMe 
                      ? 'bg-blue-600 text-white border-blue-500 rounded-br-none' 
                      : 'bg-white text-[#1a1a1a] border-[#e5e5e5] rounded-bl-none'
                  }`}>
                    {message.attachment && (
                      <div className="mb-2">
                        {message.attachment.type === 'image' ? (
                          <img 
                            src={message.attachment.url} 
                            alt={message.attachment.name} 
                            className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(message.attachment?.url, '_blank')}
                          />
                        ) : (
                          <a 
                            href={message.attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 p-2 rounded-xl border ${
                              isMe ? 'bg-blue-700 border-blue-500' : 'bg-[#f9f9f9] border-[#e5e5e5]'
                            }`}
                          >
                            <FileText className="w-5 h-5" />
                            <span className="text-xs font-bold truncate max-w-[150px]">{message.attachment.name}</span>
                          </a>
                        )}
                      </div>
                    )}
                    {message.content}
                    <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-medium ${isMe ? 'text-blue-100' : 'text-[#9e9e9e]'}`}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && (
                        <span className={`font-black uppercase tracking-widest ${message.read ? 'text-white' : 'text-blue-200'}`}>
                          {message.read ? 'Read' : 'Sent'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#e5e5e5] bg-white">
        <AnimatePresence>
          {selectedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-4 p-3 bg-[#f9f9f9] rounded-2xl border border-[#e5e5e5] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {selectedFile.file.type.startsWith('image/') ? (
                  <img src={selectedFile.preview} alt="" className="w-12 h-12 rounded-lg object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold truncate max-w-[200px]">{selectedFile.file.name}</p>
                  <p className="text-[10px] text-[#9e9e9e] font-bold uppercase tracking-widest">
                    {(selectedFile.file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button onClick={removeFile} className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-red-500">
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-3 bg-[#f9f9f9] p-2 rounded-2xl border border-[#e5e5e5] focus-within:ring-2 focus-within:ring-blue-600 transition-all">
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-[#9e9e9e] hover:text-blue-600"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="text"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm py-2"
          />
          <button 
            type="button"
            className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-[#9e9e9e] hover:text-orange-500"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button 
            type="submit"
            disabled={!messageText.trim() && !selectedFile}
            className={`p-2 rounded-xl transition-all shadow-lg ${
              (messageText.trim() || selectedFile)
                ? 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700' 
                : 'bg-[#e5e5e5] text-white shadow-none cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect}
            className="hidden" 
          />
        </form>
      </div>
    </div>
  );
}
