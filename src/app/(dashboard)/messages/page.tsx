'use client';

import { useEffect, useState } from 'react';
import { useMessageStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import { Search, Send, Mail, MailOpen, Plus, Filter, ArrowLeft } from 'lucide-react';

export default function MessagesPage() {
  const { messages, fetchMessages, sendMessage, markAsRead } = useMessageStore();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const conversations = messages.reduce<Record<string, typeof messages[0]>>((acc, msg) => {
    const otherId = msg.sender.id === '1' ? msg.recipient.id : msg.sender.id;
    if (!acc[otherId] || new Date(msg.createdAt) > new Date(acc[otherId]!.createdAt)) {
      acc[otherId] = msg;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations)
    .filter((msg) => {
      const otherName = msg.sender.id === '1' ? msg.recipient.name : msg.sender.name;
      return otherName.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const selectedMessages = selectedConversation
    ? messages.filter(
        (m) =>
          (m.sender.id === selectedConversation && m.recipient.id === '1') ||
          (m.sender.id === '1' && m.recipient.id === selectedConversation)
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const selectedUser = selectedConversation
    ? messages.find(
        (m) =>
          (m.sender.id === selectedConversation && m.recipient.id === '1') ||
          (m.sender.id === '1' && m.recipient.id === selectedConversation)
      )
    : null;

  const otherUser = selectedUser
    ? selectedUser.sender.id === '1'
      ? selectedUser.recipient
      : selectedUser.sender
    : null;

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    await sendMessage(selectedConversation, newMessage);
    setNewMessage('');
  };

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Messages</h2>
        <p className="mt-1 text-sm text-slate-500">Communicate with instructors and peers</p>
      </div>

      <div className="flex h-[calc(100vh-220px)] overflow-hidden rounded-xl border border-slate-200 bg-white">
        {/* Conversation List */}
        <div className={cn(
          'w-80 flex-shrink-0 border-r border-slate-200',
          selectedConversation ? 'hidden lg:block' : 'block'
        )}>
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search messages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
                />
              </div>
              <Button size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto scrollbar-thin">
            {conversationList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Mail className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm text-slate-500">No conversations</p>
              </div>
            ) : (
              conversationList.map((msg) => {
                const other = msg.sender.id === '1' ? msg.recipient : msg.sender;
                const isSelected = selectedConversation === other.id;
                const isUnread = !msg.isRead && msg.sender.id !== '1';

                return (
                  <button
                    key={other.id}
                    onClick={() => {
                      setSelectedConversation(other.id);
                      if (!msg.isRead) markAsRead(msg.id);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left transition-colors hover:bg-slate-50',
                      isSelected && 'bg-violet-50'
                    )}
                  >
                    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-sm font-medium text-white">
                      {other.name.charAt(0)}
                      {isUnread && (
                        <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-violet-600 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className={cn('text-sm', isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>
                          {other.name}
                        </p>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className={cn('mt-0.5 text-xs', isUnread ? 'font-medium text-slate-700' : 'text-slate-500')}>
                        {msg.sender.id === '1' ? 'You: ' : ''}
                        {msg.content.length > 40 ? msg.content.substring(0, 40) + '...' : msg.content}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={cn(
          'flex flex-1 flex-col',
          !selectedConversation && 'hidden lg:flex'
        )}>
          {selectedConversation && otherUser ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-sm font-medium text-white">
                  {otherUser.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{otherUser.name}</p>
                  <p className="text-xs text-slate-500">{otherUser.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                <div className="space-y-4">
                  {selectedMessages.map((msg) => {
                    const isOwn = msg.sender.id === '1';
                    return (
                      <div
                        key={msg.id}
                        className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[70%] rounded-2xl px-4 py-2.5',
                            isOwn
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-100 text-slate-900'
                          )}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p className={cn(
                            'mt-1 text-[10px]',
                            isOwn ? 'text-violet-200' : 'text-slate-400'
                          )}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Input */}
              <div className="border-t border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button onClick={handleSend} disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center">
              <Mail className="h-16 w-16 text-slate-300" />
              <h3 className="mt-4 text-lg font-medium text-slate-900">Select a conversation</h3>
              <p className="mt-1 text-sm text-slate-500">
                Choose a conversation from the left to start messaging
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
