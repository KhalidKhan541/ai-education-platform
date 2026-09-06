'use client';

import { useEffect } from 'react';
import { useCourseStore } from '@/store';
import { CourseCard } from '@/components/courses/course-card';
import { ProgressBar } from '@/components/lessons/progress-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BookOpen, Clock, TrendingUp } from 'lucide-react';

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

export default function MyCoursesPage() {
  const { enrolledCoursesData, progress, fetchCourses } = useCourseStore();

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">My Courses</h2>
        <p className="mt-1 text-sm text-slate-500">
          {enrolledCoursesData.length} enrolled courses
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{enrolledCoursesData.length}</p>
              <p className="text-xs text-slate-500">Enrolled</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {Object.values(progress).reduce((acc, p) => acc + p.completedLessons, 0)}
              </p>
              <p className="text-xs text-slate-500">Lessons Done</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(Object.values(progress).reduce((acc, p) => acc + p.timeSpent, 0) / 3600)}h
              </p>
              <p className="text-xs text-slate-500">Time Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-4">
        {enrolledCoursesData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
            <BookOpen className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No courses yet</h3>
            <p className="mt-1 text-sm text-slate-500">Browse our catalog to find your first course</p>
            <a href="/dashboard/courses">
              <Button className="mt-4">Browse Courses</Button>
            </a>
          </div>
        ) : (
          enrolledCoursesData.map((course) => {
            const courseProgress = progress[course.id];
            const completedLessons = courseProgress?.completedLessons || 0;
            const totalLessons = courseProgress?.totalLessons || 1;
            const percent = Math.round((completedLessons / totalLessons) * 100);

            return (
              <div
                key={course.id}
                className="flex items-center gap-6 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md"
              >
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100">
                  <BookOpen className="h-8 w-8 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{course.title}</h3>
                  <p className="text-sm text-slate-500">{course.instructor.name}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <Progress value={percent} className="max-w-xs" />
                    <span className="text-sm font-medium text-slate-600">{percent}%</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {completedLessons}/{totalLessons} lessons completed
                  </p>
                </div>
                <a href={`/dashboard/courses/${course.id}/learn`}>
                  <Button>Continue</Button>
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
