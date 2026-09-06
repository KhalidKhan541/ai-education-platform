'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store';
import {
  Home,
  BookOpen,
  Library,
  Calendar,
  BarChart3,
  Award,
  Users,
  MessageSquare,
  Bot,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  GraduationCap,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Home },
  { label: 'Course Catalog', href: '/dashboard/courses', icon: BookOpen },
  { label: 'My Courses', href: '/dashboard/my-courses', icon: Library },
  { label: 'Calendar', href: '/dashboard/calendar', icon: Calendar },
  { label: 'Progress', href: '/dashboard/progress', icon: BarChart3 },
];

const learningNav: NavItem[] = [
  { label: 'Certificates', href: '/dashboard/certificates', icon: Award },
  { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: Users },
  { label: 'AI Tutor', href: '/dashboard/ai-tutor', icon: Bot },
  { label: 'Messages', href: '/dashboard/messages', icon: MessageSquare, badge: 2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useDashboardStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="text-lg font-bold text-slate-900">LearnHub</span>
          )}
        </Link>
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
        <div className="mb-6">
          {sidebarOpen && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Main
            </p>
          )}
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    !sidebarOpen && 'justify-center px-2'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive(item.href)
                        ? 'text-violet-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-xs font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          {sidebarOpen && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Learning
            </p>
          )}
          <ul className="space-y-1">
            {learningNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-violet-50 text-violet-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    !sidebarOpen && 'justify-center px-2'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive(item.href)
                        ? 'text-violet-600'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 p-3">
        <Link
          href="/dashboard/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            isActive('/dashboard/settings') && 'bg-slate-50 text-slate-900',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          <Settings className="h-5 w-5 flex-shrink-0 text-slate-400" />
          {sidebarOpen && <span>Settings</span>}
        </Link>
        <button
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50',
            !sidebarOpen && 'justify-center px-2'
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
