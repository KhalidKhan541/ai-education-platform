'use client';

import { useEffect, useState } from 'react';
import { useGamificationStore, useAuthStore } from '@/store';
import { BadgeDisplay } from '@/components/gamification/badge-display';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Crown, TrendingUp, Filter, Star } from 'lucide-react';

const mockLeaderboard = [
  { rank: 1, user: { id: '1', name: 'Sarah Chen', avatar: '/avatars/sarah.jpg', xp: 8500, level: 28, streak: 45 }, coursesCompleted: 12, badges: [] },
  { rank: 2, user: { id: '2', name: 'Marcus Johnson', avatar: '/avatars/marcus.jpg', xp: 7200, level: 24, streak: 32 }, coursesCompleted: 10, badges: [] },
  { rank: 3, user: { id: '3', name: 'Elena Rodriguez', avatar: '/avatars/elena.jpg', xp: 6800, level: 22, streak: 28 }, coursesCompleted: 9, badges: [] },
  { rank: 4, user: { id: '4', name: 'David Kim', avatar: '/avatars/david.jpg', xp: 5900, level: 20, streak: 21 }, coursesCompleted: 8, badges: [] },
  { rank: 5, user: { id: '5', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', xp: 2450, level: 12, streak: 14 }, coursesCompleted: 2, badges: [] },
  { rank: 6, user: { id: '6', name: 'Jessica Lee', avatar: '/avatars/jessica.jpg', xp: 2200, level: 11, streak: 12 }, coursesCompleted: 2, badges: [] },
  { rank: 7, user: { id: '7', name: 'Ryan Patel', avatar: '/avatars/ryan.jpg', xp: 1800, level: 9, streak: 8 }, coursesCompleted: 1, badges: [] },
  { rank: 8, user: { id: '8', name: 'Sophie Martin', avatar: '/avatars/sophie.jpg', xp: 1500, level: 8, streak: 6 }, coursesCompleted: 1, badges: [] },
];

export default function LeaderboardPage() {
  const { badges, fetchBadges } = useGamificationStore();
  const { user } = useAuthStore();
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const rankIcons = {
    1: <Crown className="h-5 w-5 text-amber-500" />,
    2: <Medal className="h-5 w-5 text-slate-400" />,
    3: <Medal className="h-5 w-5 text-amber-600" />,
  };

  const rankColors = {
    1: 'bg-gradient-to-r from-amber-400 to-yellow-400',
    2: 'bg-gradient-to-r from-slate-300 to-slate-400',
    3: 'bg-gradient-to-r from-amber-600 to-amber-700',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Leaderboard</h2>
          <p className="mt-1 text-sm text-slate-500">See how you rank among other learners</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'month', 'week'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors capitalize',
                timeframe === tf
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              {tf === 'all' ? 'All Time' : tf === 'month' ? 'This Month' : 'This Week'}
            </button>
          ))}
        </div>
      </div>

      {/* Your Rank */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold backdrop-blur-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div>
              <p className="text-sm text-violet-100">Your Rank</p>
              <p className="text-3xl font-bold">#{mockLeaderboard.find((e) => e.user.name === 'Alex Johnson')?.rank || '-'}</p>
            </div>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold">{user?.xp?.toLocaleString() || '2,450'}</p>
              <p className="text-sm text-violet-100">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">Level {user?.level || 12}</p>
              <p className="text-sm text-violet-100">Current Level</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-violet-100">Courses Done</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-slate-500">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Learner</div>
            <div className="col-span-2 text-right">XP</div>
            <div className="col-span-2 text-right">Level</div>
            <div className="col-span-2 text-right">Courses</div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {mockLeaderboard.map((entry) => {
            const isCurrentUser = entry.user.name === 'Alex Johnson';
            return (
              <div
                key={entry.user.id}
                className={cn(
                  'px-6 py-4 transition-colors hover:bg-slate-50',
                  isCurrentUser && 'bg-violet-50'
                )}
              >
                <div className="grid grid-cols-12 items-center gap-4">
                  <div className="col-span-1">
                    {rankIcons[entry.rank as keyof typeof rankIcons] || (
                      <span className="text-sm font-semibold text-slate-500">#{entry.rank}</span>
                    )}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-400 text-sm font-medium text-white">
                        {entry.user.name.charAt(0)}
                      </div>
                      {entry.rank <= 3 && (
                        <div className={cn(
                          'absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                          rankColors[entry.rank as keyof typeof rankColors]
                        )}>
                          {entry.rank}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={cn('font-medium', isCurrentUser ? 'text-violet-700' : 'text-slate-900')}>
                        {entry.user.name}
                        {isCurrentUser && <span className="ml-1 text-xs text-violet-500">(You)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{entry.user.streak} day streak 🔥</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-semibold text-slate-900">{entry.user.xp.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-slate-600">Level {entry.user.level}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-slate-600">{entry.coursesCompleted}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Section */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Your Badges</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowBadges(!showBadges)}>
            {showBadges ? 'Show Less' : 'View All'}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {badges.slice(0, showBadges ? badges.length : 5).map((badge) => (
            <BadgeDisplay key={badge.id} badge={badge} />
          ))}
        </div>
      </div>
    </div>
  );
}
