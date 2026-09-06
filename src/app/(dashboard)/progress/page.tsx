'use client';

import { useEffect } from 'react';
import { useCourseStore, useGamificationStore } from '@/store';
import { ProgressChart } from '@/components/analytics/progress-chart';
import { CircularProgress } from '@/components/lessons/progress-bar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Target,
  Flame,
  Zap,
  Trophy,
  Calendar,
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

export default function ProgressPage() {
  const { enrolledCoursesData, progress, fetchCourses } = useCourseStore();
  const { badges, xp, level, streak, fetchBadges } = useGamificationStore();

  useEffect(() => {
    fetchCourses();
    fetchBadges();
  }, [fetchCourses, fetchBadges]);

  const totalLessonsCompleted = Object.values(progress).reduce((acc, p) => acc + p.completedLessons, 0);
  const totalQuizzesPassed = Object.values(progress).reduce((acc, p) => acc + p.quizzesPassed, 0);
  const totalTimeSpent = Object.values(progress).reduce((acc, p) => acc + p.timeSpent, 0);
  const averageScore = Object.values(progress).reduce((acc, p) => acc + p.averageScore, 0) / (Object.values(progress).length || 1);

  const weeklyData = [
    { day: 'Mon', hours: 2.5 },
    { day: 'Tue', hours: 3.2 },
    { day: 'Wed', hours: 1.8 },
    { day: 'Thu', hours: 4.1 },
    { day: 'Fri', hours: 2.9 },
    { day: 'Sat', hours: 5.2 },
    { day: 'Sun', hours: 3.8 },
  ];

  const monthlyData = [
    { month: 'Sep', courses: 1, lessons: 8 },
    { month: 'Oct', courses: 1, lessons: 15 },
    { month: 'Nov', courses: 2, lessons: 22 },
    { month: 'Dec', courses: 1, lessons: 12 },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Learning Progress</h2>
        <p className="mt-1 text-sm text-slate-500">Track your achievements and growth</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
              <BookOpen className="h-6 w-6 text-violet-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{totalLessonsCompleted}</p>
          <p className="text-sm text-slate-500">Lessons Completed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">
            {Math.round(totalTimeSpent / 3600)}h
          </p>
          <p className="text-sm text-slate-500">Hours Learned</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{totalQuizzesPassed}</p>
          <p className="text-sm text-slate-500">Quizzes Passed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <Target className="h-6 w-6 text-amber-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <p className="mt-4 text-3xl font-bold text-slate-900">{Math.round(averageScore)}%</p>
          <p className="text-sm text-slate-500">Average Score</p>
        </div>
      </div>

      {/* XP and Level */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total XP</p>
              <p className="text-2xl font-bold text-slate-900">{xp.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-slate-500">Level {level}</span>
              <span className="text-slate-500">{xp % 500}/500 XP to next level</span>
            </div>
            <Progress value={(xp % 500) / 5} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500">
              <Flame className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Day Streak</p>
              <p className="text-2xl font-bold text-slate-900">{streak} days</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-8 w-full rounded-md',
                  i < streak % 7 ? 'bg-orange-400' : 'bg-slate-100'
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Last 7 days activity</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Badges Earned</p>
              <p className="text-2xl font-bold text-slate-900">{badges.filter((b) => b.earnedAt).length}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges
              .filter((b) => b.earnedAt)
              .slice(0, 6)
              .map((badge) => (
                <div
                  key={badge.id}
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl"
                  title={badge.name}
                >
                  {badge.icon}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Weekly Activity</h3>
          <div className="flex items-end justify-between gap-2" style={{ height: '200px' }}>
            {weeklyData.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs text-slate-500">{day.hours}h</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-600 transition-all"
                  style={{ height: `${(day.hours / 6) * 100}%` }}
                />
                <span className="text-xs text-slate-500">{day.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Course Progress</h3>
          <div className="space-y-4">
            {enrolledCoursesData.map((course) => {
              const courseProgress = progress[course.id];
              const percent = courseProgress
                ? Math.round((courseProgress.completedLessons / courseProgress.totalLessons) * 100)
                : 0;

              return (
                <div key={course.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{course.title}</span>
                    <span className="text-sm text-slate-500">{percent}%</span>
                  </div>
                  <Progress value={percent} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Course Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Detailed Progress</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="pb-3 text-sm font-medium text-slate-500">Course</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Lessons</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Quizzes</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Assignments</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Avg Score</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Time Spent</th>
                <th className="pb-3 text-sm font-medium text-slate-500">Progress</th>
              </tr>
            </thead>
            <tbody>
              {enrolledCoursesData.map((course) => {
                const p = progress[course.id];
                if (!p) return null;
                const percent = Math.round((p.completedLessons / p.totalLessons) * 100);

                return (
                  <tr key={course.id} className="border-b border-slate-100">
                    <td className="py-4">
                      <p className="font-medium text-slate-900">{course.title}</p>
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {p.completedLessons}/{p.totalLessons}
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {p.quizzesPassed}/{p.totalQuizzes}
                    </td>
                    <td className="py-4 text-sm text-slate-600">
                      {p.assignmentsSubmitted}/{p.totalAssignments}
                    </td>
                    <td className="py-4 text-sm text-slate-600">{p.averageScore}%</td>
                    <td className="py-4 text-sm text-slate-600">
                      {Math.round(p.timeSpent / 3600)}h {Math.round((p.timeSpent % 3600) / 60)}m
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <Progress value={percent} className="w-20" />
                        <span className="text-xs text-slate-500">{percent}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
