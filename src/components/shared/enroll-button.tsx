'use client';

import { useState } from 'react';
import { useCourseStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2, ShoppingCart } from 'lucide-react';

interface EnrollButtonProps {
  courseId: string;
  price: number;
  className?: string;
}

export function EnrollButton({ courseId, price, className }: EnrollButtonProps) {
  const { enrolledCourses, enrollInCourse } = useCourseStore();
  const [loading, setLoading] = useState(false);
  const isEnrolled = enrolledCourses.includes(courseId);

  const handleEnroll = async () => {
    if (isEnrolled) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    await enrollInCourse(courseId);
    setLoading(false);
  };

  if (isEnrolled) {
    return (
      <Button
        variant="outline"
        className={cn('border-green-200 bg-green-50 text-green-700 hover:bg-green-100', className)}
        disabled
      >
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Enrolled
      </Button>
    );
  }

  return (
    <Button
      onClick={handleEnroll}
      disabled={loading}
      className={cn('bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700', className)}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enrolling...
        </>
      ) : (
        <>
          <ShoppingCart className="mr-2 h-4 w-4" />
          {price === 0 ? 'Enroll Free' : `Enroll for $${price}`}
        </>
      )}
    </Button>
  );
}
