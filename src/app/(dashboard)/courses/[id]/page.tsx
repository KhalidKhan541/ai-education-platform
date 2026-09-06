'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCourseStore, useAssignmentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle2,
  Lock,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  HelpCircle,
  Code,
  Layers,
  Award,
  MessageSquare,
  BarChart3,
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

const lessonIcons = {
  video: Video,
  article: FileText,
  quiz: HelpCircle,
  assignment: Code,
  interactive: Layers,
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { courses, enrolledCourses, enrollInCourse, fetchCourses, progress } = useCourseStore();
  const { assignments, fetchAssignments } = useAssignmentStore();
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchCourses();
    fetchAssignments(courseId);
  }, [fetchCourses, fetchAssignments, courseId]);

  const course = courses.find((c) => c.id === courseId);
  const isEnrolled = enrolledCourses.includes(courseId);
  const courseProgress = progress[courseId];

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BookOpen className="h-16 w-16 text-slate-300" />
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Course not found</h2>
        <p className="mt-2 text-slate-500">The course you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/courses">
          <Button className="mt-4">Browse Courses</Button>
        </Link>
      </div>
    );
  }

  const completedLessons = course.modules.flatMap((m) => m.lessons).filter((l) => l.isCompleted).length;
  const totalLessons = course.modules.flatMap((m) => m.lessons).length;
  const completionPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Course Header */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex-1">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  {course.category}
                </span>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium capitalize backdrop-blur-sm">
                  {course.level}
                </span>
              </div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="mt-3 max-w-2xl text-violet-100">{course.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-violet-100">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {course.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {course.enrolledCount.toLocaleString()} students
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {course.duration}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-medium backdrop-blur-sm">
                  {course.instructor.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{course.instructor.name}</p>
                  <p className="text-xs text-violet-200">Instructor</p>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs rounded-xl bg-white/10 p-6 backdrop-blur-sm">
              <div className="mb-4 text-center">
                <p className="text-3xl font-bold">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </p>
              </div>
              {isEnrolled ? (
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-violet-100">Progress</span>
                      <span className="font-medium">{completionPercent}%</span>
                    </div>
                    <Progress value={completionPercent} className="bg-white/20" />
                  </div>
                  <Link href={`/dashboard/courses/${courseId}/learn`}>
                    <Button className="w-full bg-white text-violet-600 hover:bg-violet-50">
                      <Play className="mr-2 h-4 w-4" />
                      Continue Learning
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  onClick={() => enrollInCourse(courseId)}
                  className="w-full bg-white text-violet-600 hover:bg-violet-50"
                  size="lg"
                >
                  Enroll Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Course Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {[
          { label: 'Overview', icon: BookOpen, href: `/dashboard/courses/${courseId}` },
          { label: 'Learn', icon: Play, href: `/dashboard/courses/${courseId}/learn` },
          { label: 'Assignments', icon: FileText, href: `/dashboard/courses/${courseId}/assignments` },
          { label: 'Quizzes', icon: HelpCircle, href: `/dashboard/courses/${courseId}/quizzes` },
          { label: 'Discussions', icon: MessageSquare, href: `/dashboard/courses/${courseId}/discussions` },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Course Content</h2>
            <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
              <span>{course.modules.length} modules • {totalLessons} lessons</span>
              <span>{completedLessons} completed</span>
            </div>
            <div className="space-y-2">
              {course.modules.map((module) => {
                const moduleCompleted = module.lessons.filter((l) => l.isCompleted).length;
                const isExpanded = expandedModules[module.id] !== false;

                return (
                  <div key={module.id} className="rounded-lg border border-slate-100">
                    <button
                      onClick={() => toggleModule(module.id)}
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-slate-400 transition-transform',
                            !isExpanded && '-rotate-90'
                          )}
                        />
                        <div>
                          <p className="font-medium text-slate-900">{module.title}</p>
                          <p className="text-xs text-slate-500">
                            {moduleCompleted}/{module.lessons.length} lessons
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {moduleCompleted === module.lessons.length ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          `${Math.round((moduleCompleted / module.lessons.length) * 100)}%`
                        )}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 pb-2">
                        {module.lessons.map((lesson) => {
                          const Icon = lessonIcons[lesson.type] || FileText;
                          return (
                            <Link
                              key={lesson.id}
                              href={`/dashboard/courses/${courseId}/learn?lesson=${lesson.id}`}
                              className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-slate-50"
                            >
                              {lesson.isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                              ) : (
                                <Icon className="h-5 w-5 flex-shrink-0 text-slate-400" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                                <p className="text-xs text-slate-500">{lesson.duration}</p>
                              </div>
                              <span className="text-xs capitalize text-slate-400">{lesson.type}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* What You'll Learn */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">What You&apos;ll Learn</h3>
            <ul className="space-y-3">
              {[
                'Build modern React applications from scratch',
                'Master hooks and state management patterns',
                'Implement responsive layouts with CSS Grid and Flexbox',
                'Write clean, maintainable TypeScript code',
                'Deploy applications to production',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <span className="text-sm text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prerequisites */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Prerequisites</h3>
            <ul className="space-y-2">
              {['Basic HTML/CSS knowledge', 'JavaScript fundamentals', 'Node.js installed'].map(
                (item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
