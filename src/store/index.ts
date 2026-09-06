import { create } from 'zustand';
import type {
  User,
  Course,
  Assignment,
  Quiz,
  Discussion,
  Certificate,
  Badge,
  CalendarEvent,
  Message,
  TutorMessage,
  Notification,
  ProgressData,
  DashboardTab,
} from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email: string, _password: string) => {
    const mockUser: User = {
      id: '1',
      name: 'Alex Johnson',
      email,
      avatar: '/avatars/alex.jpg',
      role: 'student',
      joinedAt: '2024-01-15',
      xp: 2450,
      level: 12,
      streak: 14,
    };
    set({ user: mockUser, isAuthenticated: true });
  },
  register: async (name: string, email: string, _password: string) => {
    const mockUser: User = {
      id: '1',
      name,
      email,
      avatar: '/avatars/default.jpg',
      role: 'student',
      joinedAt: new Date().toISOString(),
      xp: 0,
      level: 1,
      streak: 0,
    };
    set({ user: mockUser, isAuthenticated: true });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));

interface DashboardState {
  activeTab: DashboardTab;
  sidebarOpen: boolean;
  notifications: Notification[];
  setActiveTab: (tab: DashboardTab) => void;
  toggleSidebar: () => void;
  markNotificationRead: (id: string) => void;
  unreadCount: () => number;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  activeTab: 'overview',
  sidebarOpen: true,
  notifications: [
    {
      id: '1',
      title: 'Assignment Due Tomorrow',
      message: 'React Fundamentals Quiz is due tomorrow',
      type: 'warning',
      isRead: false,
      createdAt: '2024-12-01T10:00:00Z',
    },
    {
      id: '2',
      title: 'New Course Available',
      message: 'Advanced TypeScript Patterns has been published',
      type: 'info',
      isRead: false,
      createdAt: '2024-12-01T08:00:00Z',
    },
    {
      id: '3',
      title: 'Achievement Unlocked!',
      message: 'You earned the "7-Day Streak" badge',
      type: 'success',
      isRead: true,
      createdAt: '2024-11-30T18:00:00Z',
    },
  ],
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
}));

interface CourseState {
  courses: Course[];
  enrolledCourses: string[];
  enrolledCoursesData: Course[];
  progress: Record<string, ProgressData>;
  fetchCourses: () => Promise<void>;
  enrollInCourse: (courseId: string) => Promise<void>;
  getCourseById: (id: string) => Course | undefined;
}

const mockCourses: Course[] = [
  {
    id: '1',
    title: 'React Fundamentals',
    description: 'Master React from zero to hero with hands-on projects and real-world examples. Learn hooks, context, and modern patterns.',
    thumbnail: '/courses/react.jpg',
    instructor: { id: '1', name: 'Sarah Chen', avatar: '/avatars/sarah.jpg' },
    category: 'Frontend',
    level: 'beginner',
    duration: '8 weeks',
    enrolledCount: 2340,
    rating: 4.8,
    price: 49.99,
    tags: ['React', 'JavaScript', 'Frontend'],
    updatedAt: '2024-11-28',
    createdAt: '2024-01-15',
    modules: [
      {
        id: 'm1',
        title: 'Getting Started',
        description: 'Introduction to React',
        order: 1,
        lessons: [
          { id: 'l1', title: 'What is React?', description: 'Overview of React', type: 'video', duration: '15 min', isCompleted: true, order: 1 },
          { id: 'l2', title: 'Setting Up', description: 'Create React App', type: 'interactive', duration: '20 min', isCompleted: true, order: 2 },
          { id: 'l3', title: 'Your First Component', description: 'Building components', type: 'video', duration: '25 min', isCompleted: false, order: 3 },
        ],
      },
      {
        id: 'm2',
        title: 'Components & Props',
        description: 'Understanding components',
        order: 2,
        lessons: [
          { id: 'l4', title: 'Component Lifecycle', description: 'Lifecycle methods', type: 'video', duration: '30 min', isCompleted: false, order: 1 },
          { id: 'l5', title: 'Props Deep Dive', description: 'Passing data', type: 'article', duration: '15 min', isCompleted: false, order: 2 },
          { id: 'l6', title: 'Module Quiz', description: 'Test your knowledge', type: 'quiz', duration: '10 min', isCompleted: false, order: 3 },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'TypeScript Mastery',
    description: 'Deep dive into TypeScript with advanced types, generics, and utility types for building robust applications.',
    thumbnail: '/courses/typescript.jpg',
    instructor: { id: '2', name: 'Mike Johnson', avatar: '/avatars/mike.jpg' },
    category: 'Languages',
    level: 'intermediate',
    duration: '6 weeks',
    enrolledCount: 1890,
    rating: 4.9,
    price: 59.99,
    tags: ['TypeScript', 'JavaScript', 'Types'],
    updatedAt: '2024-11-25',
    createdAt: '2024-02-01',
    modules: [],
  },
  {
    id: '3',
    title: 'Node.js Backend',
    description: 'Build scalable backend services with Node.js, Express, and MongoDB. Learn REST APIs and GraphQL.',
    thumbnail: '/courses/nodejs.jpg',
    instructor: { id: '3', name: 'Emily Davis', avatar: '/avatars/emily.jpg' },
    category: 'Backend',
    level: 'intermediate',
    duration: '10 weeks',
    enrolledCount: 1560,
    rating: 4.7,
    price: 69.99,
    tags: ['Node.js', 'Express', 'MongoDB'],
    updatedAt: '2024-11-20',
    createdAt: '2024-03-01',
    modules: [],
  },
  {
    id: '4',
    title: 'CSS Grid & Flexbox',
    description: 'Master modern CSS layout techniques with practical projects and animations.',
    thumbnail: '/courses/css.jpg',
    instructor: { id: '4', name: 'Lisa Wang', avatar: '/avatars/lisa.jpg' },
    category: 'Frontend',
    level: 'beginner',
    duration: '4 weeks',
    enrolledCount: 3200,
    rating: 4.6,
    price: 39.99,
    tags: ['CSS', 'Grid', 'Flexbox'],
    updatedAt: '2024-11-18',
    createdAt: '2024-04-01',
    modules: [],
  },
  {
    id: '5',
    title: 'Python for Data Science',
    description: 'Learn Python programming with focus on data analysis, visualization, and machine learning basics.',
    thumbnail: '/courses/python.jpg',
    instructor: { id: '5', name: 'James Wilson', avatar: '/avatars/james.jpg' },
    category: 'Data Science',
    level: 'beginner',
    duration: '12 weeks',
    enrolledCount: 4100,
    rating: 4.8,
    price: 79.99,
    tags: ['Python', 'Data Science', 'ML'],
    updatedAt: '2024-11-15',
    createdAt: '2024-01-10',
    modules: [],
  },
  {
    id: '6',
    title: 'DevOps Fundamentals',
    description: 'Introduction to CI/CD, Docker, Kubernetes, and cloud deployment strategies.',
    thumbnail: '/courses/devops.jpg',
    instructor: { id: '6', name: 'Tom Brown', avatar: '/avatars/tom.jpg' },
    category: 'DevOps',
    level: 'advanced',
    duration: '8 weeks',
    enrolledCount: 980,
    rating: 4.5,
    price: 89.99,
    tags: ['DevOps', 'Docker', 'Kubernetes'],
    updatedAt: '2024-11-10',
    createdAt: '2024-05-01',
    modules: [],
  },
];

const mockProgress: Record<string, ProgressData> = {
  '1': {
    courseId: '1',
    completedLessons: 2,
    totalLessons: 6,
    quizzesPassed: 0,
    totalQuizzes: 1,
    assignmentsSubmitted: 0,
    totalAssignments: 2,
    averageScore: 0,
    timeSpent: 3420,
    lastAccessed: '2024-12-01',
  },
};

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  enrolledCourses: ['1'],
  enrolledCoursesData: [mockCourses[0]],
  progress: mockProgress,
  fetchCourses: async () => {
    set({ courses: mockCourses });
  },
  enrollInCourse: async (courseId: string) => {
    const state = get();
    if (!state.enrolledCourses.includes(courseId)) {
      const course = state.courses.find((c) => c.id === courseId);
      set({
        enrolledCourses: [...state.enrolledCourses, courseId],
        enrolledCoursesData: course
          ? [...state.enrolledCoursesData, course]
          : state.enrolledCoursesData,
      });
    }
  },
  getCourseById: (id) => {
    return get().courses.find((c) => c.id === id);
  },
}));

interface AssignmentState {
  assignments: Assignment[];
  fetchAssignments: (courseId?: string) => Promise<void>;
  submitAssignment: (id: string, url: string) => Promise<void>;
}

const mockAssignments: Assignment[] = [
  {
    id: 'a1',
    title: 'Build a React Component Library',
    description: 'Create a reusable component library with at least 5 components including Button, Input, Card, Modal, and Table.',
    dueDate: '2024-12-15',
    status: 'pending',
    maxGrade: 100,
    courseId: '1',
    lessonId: 'l3',
  },
  {
    id: 'a2',
    title: 'State Management Project',
    description: 'Build a todo app using React Context and useReducer. Include CRUD operations and filtering.',
    dueDate: '2024-12-20',
    status: 'submitted',
    maxGrade: 100,
    courseId: '1',
    lessonId: 'l4',
    submissionUrl: 'https://github.com/user/todo-app',
  },
  {
    id: 'a3',
    title: 'API Integration Challenge',
    description: 'Connect to a public API and build a dashboard displaying the data with charts and filters.',
    dueDate: '2024-12-25',
    status: 'pending',
    maxGrade: 100,
    courseId: '1',
    lessonId: 'l5',
  },
];

export const useAssignmentStore = create<AssignmentState>((set) => ({
  assignments: [],
  fetchAssignments: async (courseId?: string) => {
    const filtered = courseId
      ? mockAssignments.filter((a) => a.courseId === courseId)
      : mockAssignments;
    set({ assignments: filtered });
  },
  submitAssignment: async (id: string, url: string) => {
    set((state) => ({
      assignments: state.assignments.map((a) =>
        a.id === id
          ? { ...a, status: 'submitted' as const, submissionUrl: url }
          : a
      ),
    }));
  },
}));

interface QuizState {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  currentAttempt: QuizAttempt | null;
  fetchQuizzes: (courseId?: string) => Promise<void>;
  startQuiz: (quizId: string) => void;
  submitQuiz: () => void;
  answerQuestion: (questionId: string, answer: string | string[]) => void;
}

const mockQuizzes: Quiz[] = [
  {
    id: 'q1',
    title: 'React Basics Quiz',
    description: 'Test your understanding of React fundamentals',
    timeLimit: 30,
    passingScore: 70,
    attempts: 0,
    maxAttempts: 3,
    courseId: '1',
    lessonId: 'l6',
    questions: [
      {
        id: 'q1-1',
        question: 'What is the primary purpose of React?',
        type: 'multiple-choice',
        options: ['Server-side rendering', 'Building user interfaces', 'Database management', 'Network requests'],
        correctAnswer: 'Building user interfaces',
        explanation: 'React is a JavaScript library for building user interfaces.',
        points: 10,
      },
      {
        id: 'q1-2',
        question: 'JSX stands for JavaScript XML.',
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'JSX allows us to write HTML in JavaScript.',
        points: 10,
      },
      {
        id: 'q1-3',
        question: 'Which hook is used for side effects in React?',
        type: 'multiple-choice',
        options: ['useState', 'useEffect', 'useContext', 'useReducer'],
        correctAnswer: 'useEffect',
        explanation: 'useEffect is used for side effects like data fetching and subscriptions.',
        points: 10,
      },
    ],
  },
];

interface DiscussionState {
  discussions: Discussion[];
  fetchDiscussions: (courseId?: string) => Promise<void>;
  createDiscussion: (discussion: Omit<Discussion, 'id' | 'replies' | 'likes' | 'isLiked' | 'isPinned' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addReply: (discussionId: string, content: string) => Promise<void>;
  toggleLike: (discussionId: string) => void;
}

const mockDiscussions: Discussion[] = [
  {
    id: 'd1',
    title: 'Best practices for React hooks?',
    content: 'I\'m struggling with when to use useState vs useReducer. Can someone explain the best use cases for each?',
    author: { id: '2', name: 'John Smith', avatar: '/avatars/john.jpg', email: 'john@example.com', role: 'student', joinedAt: '2024-03-15', xp: 1200, level: 8, streak: 7 },
    courseId: '1',
    replies: [
      {
        id: 'r1',
        content: 'Use useState for simple state, useReducer for complex state logic. If you find yourself passing too many props, consider useReducer.',
        author: { id: '3', name: 'Emily Davis', avatar: '/avatars/emily.jpg', email: 'emily@example.com', role: 'instructor', joinedAt: '2024-01-10', xp: 5000, level: 20, streak: 30 },
        likes: 12,
        isLiked: false,
        createdAt: '2024-11-30T14:00:00Z',
        updatedAt: '2024-11-30T14:00:00Z',
      },
    ],
    likes: 8,
    isLiked: false,
    isPinned: true,
    tags: ['hooks', 'best-practices'],
    createdAt: '2024-11-28T10:00:00Z',
    updatedAt: '2024-11-28T10:00:00Z',
  },
  {
    id: 'd2',
    title: 'Can\'t render list of components',
    content: 'I keep getting an error when trying to render a list. What am I doing wrong?',
    author: { id: '4', name: 'Sarah Lee', avatar: '/avatars/sarah-lee.jpg', email: 'sarah@example.com', role: 'student', joinedAt: '2024-06-20', xp: 450, level: 4, streak: 3 },
    courseId: '1',
    replies: [],
    likes: 3,
    isLiked: false,
    isPinned: false,
    tags: ['error', 'arrays'],
    createdAt: '2024-12-01T08:00:00Z',
    updatedAt: '2024-12-01T08:00:00Z',
  },
];

const mockCertificates: Certificate[] = [
  {
    id: 'c1',
    courseId: '1',
    courseName: 'React Fundamentals',
    issuedAt: '2024-11-15',
    credentialId: 'CERT-REACT-2024-001',
    verificationUrl: 'https://platform.example.com/verify/CERT-REACT-2024-001',
    skills: ['React', 'JavaScript', 'Component Architecture', 'State Management'],
  },
  {
    id: 'c2',
    courseId: '4',
    courseName: 'CSS Grid & Flexbox',
    issuedAt: '2024-10-01',
    credentialId: 'CERT-CSS-2024-002',
    verificationUrl: 'https://platform.example.com/verify/CERT-CSS-2024-002',
    skills: ['CSS Grid', 'Flexbox', 'Responsive Design', 'Layout'],
  },
];

interface CertificateState {
  certificates: Certificate[];
  fetchCertificates: () => Promise<void>;
}

export const useCertificateStore = create<CertificateState>((set) => ({
  certificates: [],
  fetchCertificates: async () => {
    set({ certificates: mockCertificates });
  },
}));

const mockBadges: Badge[] = [
  { id: 'b1', name: 'First Course', description: 'Complete your first course', icon: '🎓', category: 'completion', earnedAt: '2024-11-15', rarity: 'common' },
  { id: 'b2', name: '7-Day Streak', description: 'Learn for 7 consecutive days', icon: '🔥', category: 'streak', earnedAt: '2024-12-01', rarity: 'uncommon' },
  { id: 'b3', name: 'Quiz Master', description: 'Score 100% on 5 quizzes', icon: '🏆', category: 'achievement', earnedAt: '2024-11-20', rarity: 'rare' },
  { id: 'b4', name: 'Helpful Peer', description: 'Get 10 likes on your answers', icon: '🤝', category: 'social', rarity: 'epic' },
  { id: 'b5', name: 'Code Warrior', description: 'Submit 50 assignments', icon: '⚔️', category: 'achievement', rarity: 'legendary' },
];

interface GamificationState {
  badges: Badge[];
  xp: number;
  level: number;
  streak: number;
  fetchBadges: () => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  badges: [],
  xp: 2450,
  level: 12,
  streak: 14,
  fetchBadges: async () => {
    set({ badges: mockBadges });
  },
}));

const mockCalendarEvents: CalendarEvent[] = [
  { id: 'e1', title: 'React Quiz Due', type: 'quiz', date: '2024-12-10', time: '23:59', courseId: '1', courseName: 'React Fundamentals', isCompleted: false },
  { id: 'e2', title: 'Assignment Submission', type: 'assignment', date: '2024-12-15', time: '18:00', courseId: '1', courseName: 'React Fundamentals', description: 'Component Library Project', isCompleted: false },
  { id: 'e3', title: 'Live Session', type: 'live-session', date: '2024-12-12', time: '14:00', courseId: '2', courseName: 'TypeScript Mastery', description: 'Q&A with instructor', isCompleted: false },
  { id: 'e4', title: 'Project Deadline', type: 'deadline', date: '2024-12-20', time: '23:59', courseId: '1', courseName: 'React Fundamentals', isCompleted: false },
];

interface CalendarState {
  events: CalendarEvent[];
  fetchEvents: () => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  fetchEvents: async () => {
    set({ events: mockCalendarEvents });
  },
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
}));

const mockMessages: Message[] = [
  {
    id: 'm1',
    sender: { id: '3', name: 'Emily Davis', avatar: '/avatars/emily.jpg', email: 'emily@example.com', role: 'instructor', joinedAt: '2024-01-10', xp: 5000, level: 20, streak: 30 },
    recipient: { id: '1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', email: 'alex@example.com', role: 'student', joinedAt: '2024-01-15', xp: 2450, level: 12, streak: 14 },
    content: 'Great progress on your last assignment! Keep up the good work.',
    isRead: false,
    createdAt: '2024-12-01T10:30:00Z',
    courseId: '1',
  },
  {
    id: 'm2',
    sender: { id: '2', name: 'John Smith', avatar: '/avatars/john.jpg', email: 'john@example.com', role: 'student', joinedAt: '2024-03-15', xp: 1200, level: 8, streak: 7 },
    recipient: { id: '1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', email: 'alex@example.com', role: 'student', joinedAt: '2024-01-15', xp: 2450, level: 12, streak: 14 },
    content: 'Hey, do you want to study together for the quiz tomorrow?',
    isRead: true,
    createdAt: '2024-11-30T16:00:00Z',
  },
];

interface MessageState {
  messages: Message[];
  fetchMessages: () => Promise<void>;
  sendMessage: (recipientId: string, content: string) => Promise<void>;
  markAsRead: (id: string) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  fetchMessages: async () => {
    set({ messages: mockMessages });
  },
  sendMessage: async (recipientId: string, content: string) => {
    const newMessage: Message = {
      id: `m${Date.now()}`,
      sender: { id: '1', name: 'Alex Johnson', avatar: '/avatars/alex.jpg', email: 'alex@example.com', role: 'student', joinedAt: '2024-01-15', xp: 2450, level: 12, streak: 14 },
      recipient: { id: recipientId, name: 'Unknown', email: '', role: 'student', joinedAt: '', xp: 0, level: 0, streak: 0 },
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ messages: [newMessage, ...state.messages] }));
  },
  markAsRead: (id) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isRead: true } : m
      ),
    })),
}));

interface TutorState {
  messages: TutorMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
}

export const useTutorStore = create<TutorState>((set) => ({
  messages: [
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI tutor. I can help you understand course concepts, explain difficult topics, or quiz you on what you\'ve learned. What would you like to work on today?',
      timestamp: new Date().toISOString(),
    },
  ],
  isLoading: false,
  sendMessage: async (content: string) => {
    const userMessage: TutorMessage = {
      id: `t${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMessage], isLoading: true }));
    
    await new Promise((r) => setTimeout(r, 1500));
    
    const responses = [
      'That\'s a great question! Let me break it down for you...',
      'I understand the concept you\'re asking about. Here\'s how it works:',
      'This is a common point of confusion. Let me clarify:',
      'Great thinking! You\'re on the right track. Here\'s some additional context:',
    ];
    
    const assistantMessage: TutorMessage = {
      id: `t${Date.now() + 1}`,
      role: 'assistant',
      content: responses[Math.floor(Math.random() * responses.length)] + '\n\n' + 'The concept you\'re asking about is fundamental to understanding this topic. Would you like me to provide some practice exercises to help solidify your understanding?',
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, assistantMessage], isLoading: false }));
  },
}));
