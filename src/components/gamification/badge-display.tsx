'use client';

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { Badge } from '@/types';

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'sm' | 'md' | 'lg';
}

export function BadgeDisplay({ badge, size = 'md' }: BadgeDisplayProps) {
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-20 w-20',
    lg: 'h-24 w-24',
  };

  const rarityColors = {
    common: 'from-slate-400 to-slate-500',
    uncommon: 'from-green-400 to-emerald-500',
    rare: 'from-blue-400 to-indigo-500',
    epic: 'from-purple-400 to-violet-500',
    legendary: 'from-amber-400 to-orange-500',
  };

  const rarityBg = {
    common: 'bg-slate-100',
    uncommon: 'bg-green-50',
    rare: 'bg-blue-50',
    epic: 'bg-purple-50',
    legendary: 'bg-amber-50',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center rounded-xl p-4 transition-all hover:scale-105',
        rarityBg[badge.rarity],
        !badge.earnedAt && 'opacity-50 grayscale'
      )}
    >
      {badge.earnedAt && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
          rarityColors[badge.rarity],
          sizeClasses[size]
        )}
      >
        <span className={cn(
          'drop-shadow-md',
          size === 'sm' ? 'text-2xl' : size === 'md' ? 'text-3xl' : 'text-4xl'
        )}>
          {badge.icon}
        </span>
      </div>
      <p className={cn(
        'mt-2 text-center font-medium text-slate-900',
        size === 'sm' ? 'text-xs' : 'text-sm'
      )}>
        {badge.name}
      </p>
      {size !== 'sm' && (
        <p className="mt-1 text-center text-xs text-slate-500 line-clamp-2">
          {badge.description}
        </p>
      )}
      <span className={cn(
        'mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
        badge.rarity === 'common' && 'bg-slate-200 text-slate-600',
        badge.rarity === 'uncommon' && 'bg-green-200 text-green-700',
        badge.rarity === 'rare' && 'bg-blue-200 text-blue-700',
        badge.rarity === 'epic' && 'bg-purple-200 text-purple-700',
        badge.rarity === 'legendary' && 'bg-amber-200 text-amber-700',
      )}>
        {badge.rarity}
      </span>
    </div>
  );
}
