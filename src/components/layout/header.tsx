'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Search,
  Bell,
  ChevronDown,
  Sparkles,
  LogOut,
  Settings,
  User,
} from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { notifications, markNotificationRead, unreadCount } = useDashboardStore();
  const { user } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Overview',
      '/dashboard/courses': 'Course Catalog',
      '/dashboard/my-courses': 'My Courses',
      '/dashboard/calendar': 'Calendar',
      '/dashboard/progress': 'Learning Progress',
      '/dashboard/certificates': 'Certificates',
      '/dashboard/leaderboard': 'Leaderboard',
      '/dashboard/ai-tutor': 'AI Tutor',
      '/dashboard/messages': 'Messages',
      '/dashboard/settings': 'Settings',
    };
    return titles[pathname] || 'Dashboard';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-slate-900">{getPageTitle()}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses, lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-300"
          />
        </div>

        {/* AI Tutor Quick Access */}
        <Link href="/dashboard/ai-tutor">
          <Button variant="ghost" size="icon" className="text-violet-600 hover:bg-violet-50 hover:text-violet-700">
            <Sparkles className="h-5 w-5" />
          </Button>
        </Link>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount() > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadCount()}
              </span>
            )}
          </Button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                  <span className="text-xs text-slate-500">{unreadCount()} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markNotificationRead(notification.id)}
                      className={cn(
                        'cursor-pointer border-b border-slate-50 px-4 py-3 transition-colors hover:bg-slate-50',
                        !notification.isRead && 'bg-violet-50/50'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'mt-0.5 h-2 w-2 flex-shrink-0 rounded-full',
                            notification.type === 'info' && 'bg-blue-500',
                            notification.type === 'success' && 'bg-green-500',
                            notification.type === 'warning' && 'bg-amber-500',
                            notification.type === 'error' && 'bg-red-500'
                          )}
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-2">
                  <Link
                    href="/dashboard/settings"
                    className="block rounded-lg px-3 py-2 text-center text-sm font-medium text-violet-600 hover:bg-violet-50"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-sm font-medium text-white">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-slate-900">{user?.name || 'Alex Johnson'}</p>
              <p className="text-xs text-slate-500">Level {user?.level || 12} • {user?.xp?.toLocaleString() || '2,450'} XP</p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-slate-400 md:block" />
          </button>

          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 p-4">
                  <p className="font-medium text-slate-900">{user?.name || 'Alex Johnson'}</p>
                  <p className="text-sm text-slate-500">{user?.email || 'alex@example.com'}</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <hr className="my-2 border-slate-100" />
                  <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
