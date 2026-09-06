import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="relative hidden w-1/2 bg-gradient-to-br from-violet-600 to-indigo-700 lg:block">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LearnHub</span>
          </Link>
          
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Start your journey to mastering new skills with AI-powered learning.
            </h1>
            <p className="mt-4 text-lg text-violet-100">
              Join over 50,000 learners who are building their future with personalized education.
            </p>
          </div>
          
          <div className="flex items-center gap-8 text-white/80">
            <div>
              <p className="text-2xl font-bold text-white">500+</p>
              <p className="text-sm">Expert Courses</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-white">95%</p>
              <p className="text-sm">Completion Rate</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-white">4.8</p>
              <p className="text-sm">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex w-full items-center justify-center bg-white px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">LearnHub</span>
            </Link>
          </div>
          {children}
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              © 2024 LearnHub. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
