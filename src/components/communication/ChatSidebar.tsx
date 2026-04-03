import React from 'react';
import { Channel, User } from '../../types/chat';
import { MessageSquare, Users, Search, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface ChatSidebarProps {
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  onNewMessage: () => void;
  onNewChannel: () => void;
  currentUser: User;
}

export default function ChatSidebar({ 
  channels, 
  activeChannelId, 
  onSelectChannel, 
  onNewMessage, 
  onNewChannel,
  currentUser 
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredChannels = channels.filter(channel => {
    if (channel.type === 'direct') {
      const otherParticipant = channel.participants?.find(p => p.id !== currentUser.id);
      return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return channel.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full md:w-80 border-r border-[#e5e5e5] flex flex-col bg-white h-full">
      <div className="p-6 border-b border-[#e5e5e5]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black tracking-tight">Messages</h2>
          <div className="flex gap-2">
            <button 
              onClick={onNewMessage}
              className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-blue-600"
              title="New Direct Message"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button 
              onClick={onNewChannel}
              className="p-2 hover:bg-[#f5f5f5] rounded-xl transition-colors text-purple-600"
              title="New Group Channel"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9e9e9e]" />
          <input 
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f9f9f9] border border-[#e5e5e5] rounded-xl text-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredChannels.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-[#9e9e9e]">No conversations found</p>
          </div>
        ) : (
          filteredChannels.map((channel) => {
            const isActive = activeChannelId === channel.id;
            const otherParticipant = channel.type === 'direct' 
              ? channel.participants?.find(p => p.id !== currentUser.id)
              : null;
            
            const displayName = channel.type === 'direct' 
              ? otherParticipant?.name || 'Unknown User'
              : channel.name;

            return (
              <motion.button
                key={channel.id}
                whileHover={{ x: 4 }}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${
                  isActive 
                    ? 'bg-blue-50 border border-blue-100' 
                    : 'hover:bg-[#f9f9f9] border border-transparent'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
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
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className={`font-bold text-sm truncate ${isActive ? 'text-blue-900' : 'text-[#1a1a1a]'}`}>
                      {displayName}
                    </h4>
                    {channel.lastMessage && channel.lastMessage.createdAt && (
                      <span className="text-[10px] text-[#9e9e9e] whitespace-nowrap ml-2">
                        {new Date(channel.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9e9e9e] truncate">
                    {channel.lastMessage ? (
                      <>
                        {channel.lastMessage.fromUserId === currentUser.id ? 'You: ' : ''}
                        {channel.lastMessage.content}
                      </>
                    ) : (
                      channel.description || 'No messages yet'
                    )}
                  </p>
                </div>
                {channel.unreadCount ? (
                  <div className="w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shrink-0">
                    {channel.unreadCount}
                  </div>
                ) : null}
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
