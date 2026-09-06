'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDiscussionStore, useCourseStore } from '@/store';
import { DiscussionThread } from '@/components/discussions/discussion-thread';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Plus, Search, MessageSquare, Pin, Filter } from 'lucide-react';

export default function DiscussionsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { discussions, fetchDiscussions, createDiscussion } = useDiscussionStore();
  const { courses, fetchCourses } = useCourseStore();
  const [search, setSearch] = useState('');
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    fetchCourses();
    fetchDiscussions(courseId);
  }, [fetchCourses, fetchDiscussions, courseId]);

  const course = courses.find((c) => c.id === courseId);

  const allTags = Array.from(new Set(discussions.flatMap((d) => d.tags)));

  const filteredDiscussions = discussions.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.content.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === 'all' || d.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  const pinnedDiscussions = filteredDiscussions.filter((d) => d.isPinned);
  const regularDiscussions = filteredDiscussions.filter((d) => !d.isPinned);

  const handleCreateDiscussion = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    await createDiscussion({
      title: newTitle,
      content: newContent,
      author: { id: '1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', email: 'alex@example.com', role: 'student', joinedAt: '2024-01-15', xp: 2450, level: 12, streak: 14 },
      courseId,
      tags: [],
    });
    setNewTitle('');
    setNewContent('');
    setShowNewDiscussion(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Discussions</h2>
          <p className="mt-1 text-sm text-slate-500">{course?.title || 'Course Discussions'}</p>
        </div>
        <Button onClick={() => setShowNewDiscussion(!showNewDiscussion)}>
          <Plus className="mr-2 h-4 w-4" />
          New Discussion
        </Button>
      </div>

      {/* New Discussion Form */}
      {showNewDiscussion && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
          <h3 className="mb-4 font-semibold text-slate-900">Start a New Discussion</h3>
          <Input
            placeholder="Discussion title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="mb-3"
          />
          <textarea
            placeholder="What's on your mind?"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="h-32 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewDiscussion(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDiscussion}>Post Discussion</Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search discussions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedTag('all')}
            className={cn(
              'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              selectedTag === 'all'
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            All Topics
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                selectedTag === tag
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {discussions.length} discussions
        </span>
        <span className="flex items-center gap-1">
          <Pin className="h-4 w-4" />
          {pinnedDiscussions.length} pinned
        </span>
      </div>

      {/* Discussions */}
      <div className="space-y-4">
        {pinnedDiscussions.length > 0 && (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase">Pinned</h3>
            <div className="space-y-3">
              {pinnedDiscussions.map((discussion) => (
                <DiscussionThread key={discussion.id} discussion={discussion} />
              ))}
            </div>
          </div>
        )}

        {regularDiscussions.length > 0 && (
          <div>
            {pinnedDiscussions.length > 0 && (
              <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase">Recent</h3>
            )}
            <div className="space-y-3">
              {regularDiscussions.map((discussion) => (
                <DiscussionThread key={discussion.id} discussion={discussion} />
              ))}
            </div>
          </div>
        )}

        {filteredDiscussions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
            <MessageSquare className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No discussions found</h3>
            <p className="mt-1 text-sm text-slate-500">Be the first to start a discussion!</p>
          </div>
        )}
      </div>
    </div>
  );
}
