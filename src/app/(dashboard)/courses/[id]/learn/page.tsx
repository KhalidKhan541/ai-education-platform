'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCourseStore } from '@/store';
import { LessonPlayer } from '@/components/lessons/lesson-player';
import { ProgressBar } from '@/components/lessons/progress-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  List,
  X,
} from 'lucide-react';

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-500"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function LearnPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const lessonId = searchParams.get('lesson');
  const { courses, fetchCourses, progress } = useCourseStore();
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const course = courses.find((c) => c.id === courseId);
  if (!course) return null;

  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleName: m.title }))
  );

  const currentLessonIndex = lessonId
    ? allLessons.findIndex((l) => l.id === lessonId)
    : 0;

  const currentLesson = allLessons[currentLessonIndex] || allLessons[0];
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const completedCount = allLessons.filter((l) => l.isCompleted).length;
  const progressPercent = Math.round((completedCount / allLessons.length) * 100);

  return (
    <div className="animate-fadeIn">
      {/* Top Bar */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Course
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden w-48 sm:block">
            <ProgressBar value={progressPercent} showLabel />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <List className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <LessonPlayer
            lesson={currentLesson}
            onNext={() => nextLesson && window.location.href = `/dashboard/courses/${courseId}/learn?lesson=${nextLesson.id}`}
            onPrevious={() => previousLesson && window.location.href = `/dashboard/courses/${courseId}/learn?lesson=${previousLesson.id}`}
            hasNext={!!nextLesson}
            hasPrevious={!!previousLesson}
          />
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{currentLesson.moduleName}</p>
              <h2 className="text-lg font-semibold text-slate-900">{currentLesson.title}</h2>
            </div>
            <div className="flex gap-2">
              {previousLesson && (
                <Link href={`/dashboard/courses/${courseId}/learn?lesson=${previousLesson.id}`}>
                  <Button variant="outline" size="sm">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                </Link>
              )}
              {nextLesson && (
                <Link href={`/dashboard/courses/${courseId}/learn?lesson=${nextLesson.id}`}>
                  <Button size="sm">
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div
          className={cn(
            'w-80 flex-shrink-0 rounded-xl border border-slate-200 bg-white transition-all',
            showSidebar ? 'block' : 'hidden lg:block'
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">Course Content</h3>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setShowSidebar(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
            {course.modules.map((module) => (
              <div key={module.id} className="border-b border-slate-100">
                <div className="px-4 py-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-500 uppercase">{module.title}</p>
                </div>
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/dashboard/courses/${courseId}/learn?lesson=${lesson.id}`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-violet-50',
                      lesson.id === currentLesson?.id && 'bg-violet-50 border-l-2 border-violet-600'
                    )}
                  >
                    {lesson.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                      <div className="h-4 w-4 flex-shrink-0 rounded-full border-2 border-slate-300" />
                    )}
                    <div className="flex-1">
                      <p className={cn(
                        'font-medium',
                        lesson.id === currentLesson?.id ? 'text-violet-700' : 'text-slate-700'
                      )}>
                        {lesson.title}
                      </p>
                      <p className="text-xs text-slate-400">{lesson.duration}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
