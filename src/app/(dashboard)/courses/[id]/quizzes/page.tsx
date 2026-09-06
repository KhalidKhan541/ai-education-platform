'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuizStore, useCourseStore } from '@/store';
import { QuizPlayer } from '@/components/quizzes/quiz-player';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { HelpCircle, Clock, Trophy, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

export default function QuizzesPage() {
  const params = useParams();
  const courseId = params.id as string;
  const { quizzes, fetchQuizzes, currentQuiz, startQuiz } = useQuizStore();
  const { courses, fetchCourses } = useCourseStore();
  const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
    fetchQuizzes(courseId);
  }, [fetchCourses, fetchQuizzes, courseId]);

  const course = courses.find((c) => c.id === courseId);

  if (currentQuiz) {
    return <QuizPlayer />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Quizzes</h2>
        <p className="mt-1 text-sm text-slate-500">{course?.title || 'Course Quizzes'}</p>
      </div>

      <div className="space-y-4">
        {quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16">
            <HelpCircle className="h-12 w-12 text-slate-300" />
            <h3 className="mt-4 text-lg font-medium text-slate-900">No quizzes available</h3>
            <p className="mt-1 text-sm text-slate-500">Quizzes will appear here once available</p>
          </div>
        ) : (
          quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-xl border border-slate-200 bg-white p-6 transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100">
                    <HelpCircle className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{quiz.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{quiz.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="h-4 w-4" />
                        {quiz.questions.length} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {quiz.timeLimit} minutes
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="h-4 w-4" />
                        {quiz.passingScore}% to pass
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Attempts: {quiz.attempts}/{quiz.maxAttempts}
                      </span>
                      {quiz.attempts >= quiz.maxAttempts && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                          No attempts remaining
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => startQuiz(quiz.id)}
                  disabled={quiz.attempts >= quiz.maxAttempts}
                >
                  {quiz.attempts > 0 ? (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retake
                    </>
                  ) : (
                    'Start Quiz'
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
