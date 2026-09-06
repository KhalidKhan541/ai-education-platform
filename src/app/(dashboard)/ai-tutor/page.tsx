'use client';

import { useEffect } from 'react';
import { TutorChat } from '@/components/ai/tutor-chat';
import { useCourseStore } from '@/store';
import { Bot, BookOpen, HelpCircle, Lightbulb, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const quickActions = [
  { label: 'Explain a concept', icon: Lightbulb, prompt: 'Can you explain the concept of ' },
  { label: 'Quiz me', icon: HelpCircle, prompt: 'Quiz me on what I\'ve learned about ' },
  { label: 'Help with code', icon: BookOpen, prompt: 'Help me understand this code: ' },
];

const suggestedTopics = [
  'React Hooks best practices',
  'State management patterns',
  'TypeScript generics',
  'API design principles',
  'Database optimization',
];

export default function AiTutorPage() {
  const { courses, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="animate-fadeIn">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">AI Tutor</h2>
            <p className="text-sm text-slate-500">Ask anything about your courses</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Quick Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm text-slate-600 transition-colors hover:bg-violet-50 hover:text-violet-700"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggested Topics */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Suggested Topics</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.map((topic) => (
                <button
                  key={topic}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-violet-100 hover:text-violet-700"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Conversations */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Recent</h3>
            <div className="space-y-2">
              <button className="w-full rounded-lg p-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                <p className="font-medium">React Hooks</p>
                <p className="text-xs text-slate-400">2 hours ago</p>
              </button>
              <button className="w-full rounded-lg p-2 text-left text-sm text-slate-600 hover:bg-slate-50">
                <p className="font-medium">State Management</p>
                <p className="text-xs text-slate-400">Yesterday</p>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <TutorChat />
        </div>
      </div>
    </div>
  );
}
