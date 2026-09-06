'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, ExternalLink, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import type { Assignment } from '@/types';

interface AssignmentCardProps {
  assignment: Assignment;
}

export function AssignmentCard({ assignment }: AssignmentCardProps) {
  const statusConfig = {
    pending: {
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
      label: 'Pending',
    },
    submitted: {
      color: 'bg-blue-100 text-blue-700',
      icon: Send,
      label: 'Submitted',
    },
    graded: {
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
      label: 'Graded',
    },
    late: {
      color: 'bg-red-100 text-red-700',
      icon: AlertCircle,
      label: 'Late',
    },
  };

  const status = statusConfig[assignment.status];
  const StatusIcon = status.icon;

  const daysUntilDue = Math.ceil(
    (new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{assignment.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{assignment.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {daysUntilDue > 0 && assignment.status === 'pending' && (
                <span className="text-amber-600">
                  {daysUntilDue} days remaining
                </span>
              )}
              {daysUntilDue <= 0 && assignment.status === 'pending' && (
                <span className="text-red-600">Overdue</span>
              )}
              <span>Max grade: {assignment.maxGrade}</span>
            </div>
          </div>
        </div>
        <span className={cn('flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium', status.color)}>
          <StatusIcon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      {assignment.submissionUrl && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">Submission</p>
          <a
            href={assignment.submissionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
          >
            {assignment.submissionUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {assignment.grade !== undefined && (
        <div className="mt-4 rounded-lg bg-green-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-700">Grade</span>
            <span className="text-lg font-bold text-green-700">
              {assignment.grade}/{assignment.maxGrade}
            </span>
          </div>
          {assignment.feedback && (
            <p className="mt-2 text-sm text-green-600">{assignment.feedback}</p>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {assignment.status === 'pending' && (
          <>
            <Button size="sm">Start Assignment</Button>
            <Button size="sm" variant="outline">View Details</Button>
          </>
        )}
        {assignment.status === 'submitted' && (
          <Button size="sm" variant="outline">View Submission</Button>
        )}
        {assignment.status === 'graded' && (
          <Button size="sm" variant="outline">View Feedback</Button>
        )}
      </div>
    </div>
  );
}
