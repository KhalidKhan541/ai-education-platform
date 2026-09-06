'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAssignmentStore, useCourseStore } from '@/store';
import { AssignmentCard } from '@/components/assignments/assignment-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Filter, Plus } from 'lucide-react';

export default function AssignmentsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { assignments, fetchAssignments } = useAssignmentStore();
  const { courses, fetchCourses } = useCourseStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchCourses();
    fetchAssignments(courseId);
  }, [fetchCourses, fetchAssignments, courseId]);

  const course = courses.find((c) => c.id === courseId);

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const statusCounts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === 'pending').length,
    submitted: assignments.filter((a) => a.status === 'submitted').length,
    graded: assignments.filter((a) => a.status === 'graded').length,
    late: assignments.filter((a) => a.status === 'late').length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Assignments</h2>
          <p className="mt-1 text-sm text-slate-500">
            {course?.title || 'Course Assignments'}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Submit Assignment
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {(['all', 'pending', 'submitted', 'graded', 'late'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors',
              statusFilter === status
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            )}
          >
            <span className="capitalize">{status}</span>
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              statusFilter === status
                ? 'bg-white/20'
                : 'bg-slate-100 text-slate-500'
            )}>
              {statusCounts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
            <Filter className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No assignments found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {statusFilter === 'all'
                ? 'No assignments for this course yet'
                : `No ${statusFilter} assignments`}
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))
        )}
      </div>
    </div>
  );
}
