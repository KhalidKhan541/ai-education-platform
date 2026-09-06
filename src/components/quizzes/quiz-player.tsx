'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuizStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';

export function QuizPlayer() {
  const { currentQuiz, answerQuestion, submitQuiz, currentAttempt } = useQuizStore();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (currentQuiz) {
      setTimeLeft(currentQuiz.timeLimit * 60);
    }
  }, [currentQuiz]);

  useEffect(() => {
    if (timeLeft <= 0 || showResults) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, showResults]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleAnswer = useCallback((questionId: string, answer: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentQuiz) return;
    currentQuiz.questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (userAnswer) {
        answerQuestion(q.id, userAnswer as string);
      }
    });
    submitQuiz();
    setShowResults(true);
  }, [currentQuiz, answers, answerQuestion, submitQuiz]);

  if (!currentQuiz) return null;

  const currentQuestion = currentQuiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / currentQuiz.questions.length) * 100;

  if (showResults && currentAttempt) {
    const correctAnswers = currentAttempt.answers.filter((a) => a.isCorrect).length;
    const passed = currentAttempt.passed;

    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
        <div className={cn(
          'rounded-2xl p-8 text-center',
          passed ? 'bg-green-50' : 'bg-red-50'
        )}>
          <div className={cn(
            'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
            passed ? 'bg-green-100' : 'bg-red-100'
          )}>
            {passed ? (
              <Trophy className="h-10 w-10 text-green-600" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600" />
            )}
          </div>
          <h2 className={cn(
            'text-2xl font-bold',
            passed ? 'text-green-700' : 'text-red-700'
          )}>
            {passed ? 'Congratulations! 🎉' : 'Keep Practicing!'}
          </h2>
          <p className={cn(
            'mt-2',
            passed ? 'text-green-600' : 'text-red-600'
          )}>
            {passed
              ? 'You passed the quiz!'
              : `You need ${currentQuiz.passingScore}% to pass. Try again!`}
          </p>
          <div className="mt-6 flex justify-center gap-8">
            <div>
              <p className="text-3xl font-bold text-slate-900">{currentAttempt.score}%</p>
              <p className="text-sm text-slate-500">Your Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{currentQuiz.passingScore}%</p>
              <p className="text-sm text-slate-500">Passing Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{correctAnswers}/{currentQuiz.questions.length}</p>
              <p className="text-sm text-slate-500">Correct</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {currentQuiz.questions.map((question, i) => {
            const userAnswer = currentAttempt.answers[i];
            const isCorrect = userAnswer?.isCorrect;
            return (
              <div
                key={question.id}
                className={cn(
                  'rounded-xl border p-4',
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                )}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{question.question}</p>
                    {!isCorrect && (
                      <p className="mt-1 text-sm text-slate-600">
                        Your answer: {String(userAnswer?.answer)}
                        <br />
                        Correct answer: {String(question.correctAnswer)}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">{question.explanation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center gap-4">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Retake Quiz
          </Button>
          <Button onClick={() => window.history.back()}>Back to Course</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fadeIn">
      {/* Quiz Header */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h2 className="font-semibold text-slate-900">{currentQuiz.title}</h2>
          <p className="text-sm text-slate-500">
            Question {currentQuestionIndex + 1} of {currentQuiz.questions.length}
          </p>
        </div>
        <div className={cn(
          'flex items-center gap-2 rounded-lg px-3 py-2 font-mono text-lg font-bold',
          timeLeft < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'
        )}>
          <Clock className="h-5 w-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {currentQuestion.points} points
          </span>
          <span className="text-xs text-slate-500 capitalize">{currentQuestion.type}</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{currentQuestion.question}</h3>

        {currentQuestion.type === 'multiple-choice' && (
          <div className="mt-4 space-y-2">
            {currentQuestion.options?.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                className={cn(
                  'w-full rounded-lg border-2 p-4 text-left transition-all',
                  answers[currentQuestion.id] === option
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {currentQuestion.type === 'true-false' && (
          <div className="mt-4 flex gap-4">
            {['True', 'False'].map((option) => (
              <button
                key={option}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                className={cn(
                  'flex-1 rounded-lg border-2 p-4 text-center font-medium transition-all',
                  answers[currentQuestion.id] === option
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>
        <div className="flex gap-2">
          {currentQuiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQuestionIndex(i)}
              className={cn(
                'h-3 w-3 rounded-full transition-colors',
                i === currentQuestionIndex
                  ? 'bg-violet-600'
                  : answers[currentQuiz.questions[i].id]
                  ? 'bg-green-400'
                  : 'bg-slate-200'
              )}
            />
          ))}
        </div>
        {currentQuestionIndex === currentQuiz.questions.length - 1 ? (
          <Button onClick={handleSubmit} variant="success">
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(currentQuiz.questions.length - 1, prev + 1))}
          >
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
