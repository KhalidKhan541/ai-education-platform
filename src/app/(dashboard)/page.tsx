'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useCourseStore, useAssignmentStore, useGamificationStore, useCalendarStore } from '@/store';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Clock,
  Award,
  Flame,
  TrendingUp,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  Trophy,
  Zap,
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

const statCards = [
  { label: 'Enrolled Courses', value: '3', icon: BookOpen, color: 'bg-violet-100 text-violet-600', trend: '+1 this week' },
  { label: 'Hours Learned', value: '42', icon: Clock, color: 'bg-blue-100 text-blue-600', trend: '+5h this week' },
  { label: 'Certificates', value: '2', icon: Award, color: 'bg-green-100 text-green-600', trend: '1 pending' },
  { label: 'Day Streak', value: '14', icon: Flame, color: 'bg-orange-100 text-orange-600', trend: 'Personal best!' },
];

export default function DashboardOverview() {
  const { enrolledCoursesData, progress } = useCourseStore();
  const { assignments } = useAssignmentStore();
  const { badges, xp, level, streak } = useGamificationStore();
  const { events } = useCalendarStore();

  useEffect(() => {
    useAssignmentStore.getState().fetchAssignments();
    useGamificationStore.getState().fetchBadges();
    useCalendarStore.getState().fetchEvents();
  }, []);

  const upcomingAssignments = assignments
    .filter((a) => a.status === 'pending')
    .slice(0, 3);

  const upcomingEvents = events
    .filter((e) => !e.isCompleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const earnedBadges = badges.filter((b) => b.earnedAt).slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, Alex! 👋</h2>
            <p className="mt-2 text-violet-100">
              You&apos;re on a <span className="font-semibold text-white">14-day streak</span>. Keep it up!
            </p>
            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-300" />
                <span className="font-semibold">{xp.toLocaleString()} XP</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-300" />
                <span className="font-semibold">Level {level}</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/courses">
            <Button className="bg-white text-violet-600 hover:bg-violet-50">
              Browse Courses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-1 text-xs text-green-600">{stat.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Continue Learning */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Continue Learning</h3>
              <Link href="/dashboard/my-courses" className="text-sm font-medium text-violet-600 hover:text-violet-700">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {enrolledCoursesData.map((course) => {
                const courseProgress = progress[course.id];
                const completedPercent = courseProgress
                  ? Math.round((courseProgress.completedLessons / courseProgress.totalLessons) * 100)
                  : 0;

                return (
                  <Link
                    key={course.id}
                    href={`/dashboard/courses/${course.id}/learn`}
                    className="group flex items-center gap-4 rounded-xl border border-slate-100 p-4 transition-all hover:border-violet-200 hover:bg-violet-50/50"
                  >
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100">
                      <BookOpen className="h-7 w-7 text-violet-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 group-hover:text-violet-700">
                        {course.title}
                      </h4>
                      <p className="text-sm text-slate-500">{course.instructor.name}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress value={completedPercent} className="flex-1" />
                        <span className="text-xs font-medium text-slate-600">{completedPercent}%</span>
                      </div>
                    </div>
                    <Play className="h-5 w-5 text-slate-400 group-hover:text-violet-600" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Upcoming</h3>
            <Link href="/dashboard/calendar" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">No upcoming events</p>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <div className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                    event.type === 'assignment' && 'bg-blue-100 text-blue-600',
                    event.type === 'quiz' && 'bg-amber-100 text-amber-600',
                    event.type === 'live-session' && 'bg-green-100 text-green-600',
                    event.type === 'deadline' && 'bg-red-100 text-red-600',
                    event.type === 'reminder' && 'bg-slate-100 text-slate-600',
                  )}>
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.courseName}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {event.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Assignments */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Pending Assignments</h3>
            <Link href="/dashboard/courses/1/assignments" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingAssignments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">All caught up! 🎉</p>
            ) : (
              upcomingAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{assignment.title}</p>
                    <p className="text-xs text-slate-500">
                      Due {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Start
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Earned Badges */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Recent Badges</h3>
            <Link href="/dashboard/leaderboard" className="text-sm font-medium text-violet-600 hover:text-violet-700">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {earnedBadges.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Complete courses to earn badges</p>
            ) : (
              earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-2xl">
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{badge.name}</p>
                    <p className="text-xs text-slate-500">{badge.description}</p>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    badge.rarity === 'common' && 'bg-slate-100 text-slate-600',
                    badge.rarity === 'uncommon' && 'bg-green-100 text-green-700',
                    badge.rarity === 'rare' && 'bg-blue-100 text-blue-700',
                    badge.rarity === 'epic' && 'bg-purple-100 text-purple-700',
                    badge.rarity === 'legendary' && 'bg-amber-100 text-amber-700',
                  )}>
                    {badge.rarity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
