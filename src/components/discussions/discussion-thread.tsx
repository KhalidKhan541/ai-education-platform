'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDiscussionStore } from '@/store';
import { MessageSquare, ThumbsUp, Pin, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { Discussion } from '@/types';

interface DiscussionThreadProps {
  discussion: Discussion;
}

export function DiscussionThread({ discussion }: DiscussionThreadProps) {
  const { addReply, toggleLike } = useDiscussionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const handleReply = async () => {
    if (!replyContent.trim()) return;
    await addReply(discussion.id, replyContent);
    setReplyContent('');
    setShowReplyInput(false);
  };

  return (
    <div className={cn(
      'rounded-xl border bg-white transition-all',
      discussion.isPinned ? 'border-violet-200 bg-violet-50/30' : 'border-slate-200'
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-sm font-medium text-white">
              {discussion.author.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">{discussion.title}</h3>
                {discussion.isPinned && (
                  <Pin className="h-3.5 w-3.5 text-violet-500" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{discussion.author.name}</span>
                {discussion.author.role === 'instructor' && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                    Instructor
                  </span>
                )}
                <span>•</span>
                <span>{formatRelativeTime(discussion.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{discussion.content}</p>

        {discussion.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {discussion.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => toggleLike(discussion.id)}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              discussion.isLiked ? 'text-violet-600' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <ThumbsUp className={cn('h-4 w-4', discussion.isLiked && 'fill-current')} />
            {discussion.likes}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
          >
            <MessageSquare className="h-4 w-4" />
            {discussion.replies.length} replies
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-sm"
          >
            Reply
          </Button>
        </div>
      </div>

      {/* Replies */}
      {isExpanded && discussion.replies.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="space-y-4">
            {discussion.replies.map((reply) => (
              <div key={reply.id} className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-xs font-medium text-white">
                  {reply.author.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">{reply.author.name}</span>
                    {reply.author.role === 'instructor' && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                        Instructor
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{formatRelativeTime(reply.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{reply.content}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {reply.likes}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reply Input */}
      {showReplyInput && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-xs font-medium text-white">
              A
            </div>
            <div className="flex-1">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your reply..."
                className="h-20 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowReplyInput(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleReply} disabled={!replyContent.trim()}>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
