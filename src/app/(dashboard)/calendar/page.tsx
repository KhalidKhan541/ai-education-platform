'use client';

import { useEffect, useState } from 'react';
import { useCalendarStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const { events, fetchEvents } = useCalendarStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const startingDay = firstDayOfMonth.getDay();
  const totalDays = lastDayOfMonth.getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]!;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const eventColors = {
    assignment: 'bg-blue-500',
    quiz: 'bg-amber-500',
    'live-session': 'bg-green-500',
    deadline: 'bg-red-500',
    reminder: 'bg-slate-500',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Calendar</h2>
        <p className="mt-1 text-sm text-slate-500">Track your learning schedule</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              {MONTHS[month]} {year}
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-slate-500">
                {day}
              </div>
            ))}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 rounded-lg bg-slate-50 p-2" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dayEvents = getEventsForDate(date);
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const isSelected =
                selectedDate?.getDate() === day &&
                selectedDate?.getMonth() === month &&
                selectedDate?.getFullYear() === year;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'h-24 rounded-lg border p-2 text-left transition-all hover:border-violet-200',
                    isToday && 'border-violet-400 bg-violet-50',
                    isSelected && 'ring-2 ring-violet-500',
                    !isToday && !isSelected && 'border-slate-100'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isToday ? 'text-violet-600' : 'text-slate-700'
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'h-1.5 w-full rounded-full',
                          eventColors[event.type]
                        )}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-slate-400">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                : 'Select a date'}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                {selectedDate ? 'No events on this day' : 'Click a date to view events'}
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('mt-0.5 h-3 w-3 flex-shrink-0 rounded-full', eventColors[event.type])} />
                      <div>
                        <p className="font-medium text-slate-900">{event.title}</p>
                        <p className="text-xs text-slate-500">{event.courseName}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </span>
                          <span className="capitalize">{event.type.replace('-', ' ')}</span>
                        </div>
                        {event.description && (
                          <p className="mt-2 text-xs text-slate-500">{event.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Upcoming Events</h3>
            <div className="space-y-3">
              {events
                .filter((e) => !e.isCompleted)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((event) => (
                  <div key={event.id} className="flex items-center gap-3">
                    <div className={cn('h-2 w-2 flex-shrink-0 rounded-full', eventColors[event.type])} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • {event.time}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Legend */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Legend</h3>
            <div className="space-y-2">
              {Object.entries(eventColors).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn('h-2.5 w-2.5 rounded-full', color)} />
                  <span className="text-xs text-slate-600 capitalize">{type.replace('-', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
