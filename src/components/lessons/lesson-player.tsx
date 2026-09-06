'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipForward,
  SkipBack,
  BookOpen,
  FileText,
  Code,
  MessageSquare,
} from 'lucide-react';
import type { Lesson } from '@/types';

interface LessonPlayerProps {
  lesson: Lesson;
  onComplete?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function LessonPlayer({
  lesson,
  onComplete,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
}: LessonPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleProgressChange = (value: number) => {
    setProgress(value);
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      {lesson.type === 'video' && (
        <div className="relative overflow-hidden rounded-xl bg-slate-900">
          <div className="aspect-video">
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <Play className="h-10 w-10 text-white" />
                </div>
                <p className="text-sm text-slate-300">{lesson.title}</p>
              </div>
            </div>
          </div>
          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => handleProgressChange(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/30 accent-violet-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  className="h-8 w-8 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                  className="h-8 w-8 text-white hover:bg-white/20 disabled:opacity-50"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>
                <span className="ml-2 text-xs text-slate-300">
                  {Math.floor(progress * 0.15)}:{String(Math.floor((progress * 9) % 60)).padStart(2, '0')} / 15:00
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Article Content */}
      {lesson.type === 'article' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="prose prose-slate max-w-none">
            <h1>{lesson.title}</h1>
            <p className="lead">{lesson.description}</p>
            <p>
              This lesson covers the fundamental concepts you need to understand before moving forward.
              We&apos;ll explore real-world examples and best practices that will help you build better applications.
            </p>
            <h2>Key Concepts</h2>
            <ul>
              <li>Understanding the core principles</li>
              <li>Applying best practices in real projects</li>
              <li>Avoiding common pitfalls</li>
            </ul>
            <p>
              Take your time to read through this material carefully. You can use the notes feature
              to jot down important points as you go.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Content */}
      {lesson.type === 'interactive' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Code className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{lesson.title}</h2>
              <p className="text-sm text-slate-500">Interactive coding exercise</p>
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-300">
            <pre className="overflow-x-auto">
              <code>{`// Complete the exercise below
function greet(name) {
  // TODO: Return a greeting string
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`}</code>
            </pre>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button>Run Code</Button>
            <Button variant="outline">Reset</Button>
          </div>
        </div>
      )}

      {/* Lesson Info & Notes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-slate-400" />
            <h3 className="font-semibold text-slate-900">Lesson Info</h3>
          </div>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Type</dt>
              <dd className="text-sm font-medium text-slate-900 capitalize">{lesson.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Duration</dt>
              <dd className="text-sm font-medium text-slate-900">{lesson.duration}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Status</dt>
              <dd className="text-sm font-medium text-slate-900">
                {lesson.isCompleted ? '✅ Completed' : '⏳ In Progress'}
              </dd>
            </div>
          </dl>
          {!lesson.isCompleted && (
            <Button onClick={onComplete} className="mt-4 w-full" variant="success">
              Mark as Complete
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" />
              <h3 className="font-semibold text-slate-900">My Notes</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowNotes(!showNotes)}>
              {showNotes ? 'Hide' : 'Show'}
            </Button>
          </div>
          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take notes about this lesson..."
              className="h-32 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          )}
          {!showNotes && (
            <p className="text-sm text-slate-500">Click &quot;Show&quot; to take notes on this lesson</p>
          )}
        </div>
      </div>
    </div>
  );
}
