'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Star, Users, Clock, BookOpen } from 'lucide-react';
import type { Course } from '@/types';

interface CourseCardProps {
  course: Course;
  isEnrolled?: boolean;
}

export function CourseCard({ course, isEnrolled = false }: CourseCardProps) {
  const levelColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-amber-100 text-amber-700',
    advanced: 'bg-red-100 text-red-700',
  };

  return (
    <Link
      href={`/dashboard/courses/${course.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-violet-200 hover:shadow-lg"
    >
      <div className="relative aspect-video bg-gradient-to-br from-violet-100 to-indigo-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-violet-300" />
        </div>
        <div className="absolute left-3 top-3">
          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', levelColors[course.level])}>
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
        </div>
        {isEnrolled && (
          <div className="absolute right-3 top-3">
            <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-medium text-white">
              Enrolled
            </span>
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {course.category}
          </span>
        </div>
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-slate-900 group-hover:text-violet-700">
          {course.title}
        </h3>
        <p className="mb-4 line-clamp-2 text-sm text-slate-500">{course.description}</p>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-[10px] font-medium text-white">
            {course.instructor.name.charAt(0)}
          </div>
          <span className="text-sm text-slate-600">{course.instructor.name}</span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {course.enrolledCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {course.duration}
            </span>
          </div>
          <span className="text-lg font-bold text-slate-900">
            {course.price === 0 ? 'Free' : `$${course.price}`}
          </span>
        </div>
      </div>
    </Link>
  );
}
