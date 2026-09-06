import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  Brain,
  Trophy,
  Users,
  ArrowRight,
  Play,
  Star,
  BookOpen,
  Zap,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Tutoring',
    description: 'Get personalized explanations and help from our intelligent tutor that adapts to your learning style.',
  },
  {
    icon: Trophy,
    title: 'Gamified Learning',
    description: 'Earn XP, badges, and climb the leaderboard as you complete courses and master new skills.',
  },
  {
    icon: BookOpen,
    title: 'Expert-Led Courses',
    description: 'Learn from industry professionals with real-world experience and proven teaching methods.',
  },
  {
    icon: Zap,
    title: 'Interactive Projects',
    description: 'Build real projects with hands-on coding exercises and immediate feedback.',
  },
  {
    icon: Users,
    title: 'Community Discussions',
    description: 'Connect with fellow learners, ask questions, and share knowledge in course forums.',
  },
  {
    icon: Shield,
    title: 'Certified Learning',
    description: 'Earn recognized certificates to showcase your skills to employers.',
  },
];

const stats = [
  { value: '50,000+', label: 'Active Learners' },
  { value: '500+', label: 'Expert Courses' },
  { value: '95%', label: 'Completion Rate' },
  { value: '4.8/5', label: 'Average Rating' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Frontend Developer',
    content: 'The AI tutor explained React hooks in a way that finally clicked. I went from confused to confident in just two weeks!',
    avatar: '/avatars/sarah.jpg',
  },
  {
    name: 'Marcus Johnson',
    role: 'Career Switcher',
    content: 'Thanks to LearnHub, I transitioned from marketing to software engineering. The structured path made all the difference.',
    avatar: '/avatars/marcus.jpg',
  },
  {
    name: 'Elena Rodriguez',
    role: 'Computer Science Student',
    content: 'The gamification keeps me motivated. I love earning badges and competing on the leaderboard with my classmates.',
    avatar: '/avatars/elena.jpg',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">LearnHub</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <a href="#courses" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Courses
            </a>
            <a href="#testimonials" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Testimonials
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-indigo-200/30 blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-1.5 text-sm font-medium text-violet-700">
                <Zap className="h-4 w-4" />
                AI-Powered Learning Experience
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Master New Skills with{' '}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Intelligent Tutoring
                </span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                Experience personalized learning with AI that adapts to your pace. Earn certifications,
                track your progress, and join a community of 50,000+ learners transforming their careers.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/register">
                  <Button size="xl" className="w-full sm:w-auto">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-indigo-400"
                    />
                  ))}
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">2,500+</span> learners joined this week
                </div>
              </div>
            </div>
            
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl bg-white p-2 shadow-2xl shadow-slate-200/50 ring-1 ring-slate-900/5">
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 p-8">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
                      <Brain className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">AI Tutor Active</h3>
                      <p className="text-sm text-slate-500">Personalized learning path ready</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
                        ✓
                      </div>
                      <span className="text-sm text-slate-700">React Hooks Deep Dive</span>
                      <span className="ml-auto text-xs text-green-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                        ▶
                      </div>
                      <span className="text-sm text-slate-700">State Management Patterns</span>
                      <span className="ml-auto text-xs text-blue-600">In Progress</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        ○
                      </div>
                      <span className="text-sm text-slate-700">Performance Optimization</span>
                      <span className="ml-auto text-xs text-slate-400">Up Next</span>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-between rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 p-4 text-white">
                    <div>
                      <p className="text-sm font-medium opacity-90">Current Streak</p>
                      <p className="text-2xl font-bold">14 Days 🔥</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium opacity-90">XP Earned</p>
                      <p className="text-2xl font-bold">2,450</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need to Succeed
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Our platform combines cutting-edge AI with proven learning methodologies to help you master any skill faster.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Loved by Learners Worldwide
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Join thousands of success stories from learners who transformed their careers with LearnHub.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-900/5"
              >
                <div className="mb-4 flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-400" />
                  <div>
                    <p className="font-medium text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl">
            <div className="relative px-6 py-16 sm:px-12 sm:py-20 lg:px-16">
              <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="relative text-center">
                <h2 className="text-3xl font-bold text-white sm:text-4xl">
                  Ready to Start Your Learning Journey?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-violet-100">
                  Join over 50,000 learners who are already building their future with AI-powered education.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/register">
                    <Button
                      size="xl"
                      className="bg-white text-violet-600 hover:bg-violet-50"
                    >
                      Create Free Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="xl"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    View All Courses
                  </Button>
                </div>
                <p className="mt-6 text-sm text-violet-200">
                  No credit card required • Start learning in minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
                  <GraduationCap className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">LearnHub</span>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                AI-powered education for the modern learner.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Platform</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-900">Browse Courses</a></li>
                <li><a href="#" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-900">For Teams</a></li>
                <li><a href="#" className="hover:text-slate-900">Become an Instructor</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-900">Blog</a></li>
                <li><a href="#" className="hover:text-slate-900">Documentation</a></li>
                <li><a href="#" className="hover:text-slate-900">Community</a></li>
                <li><a href="#" className="hover:text-slate-900">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900">Terms of Service</a></li>
                <li><a href="#" className="hover:text-slate-900">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
            © 2024 LearnHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
