import type {
  User as PrismaUser,
  Course as PrismaCourse,
  CourseModule as PrismaCourseModule,
  CourseEnrollment as PrismaCourseEnrollment,
  Lesson as PrismaLesson,
  LessonContent as PrismaLessonContent,
  LessonProgress as PrismaLessonProgress,
  Assignment as PrismaAssignment,
  AssignmentSubmission as PrismaAssignmentSubmission,
  AssignmentGrade as PrismaAssignmentGrade,
  Quiz as PrismaQuiz,
  QuizQuestion as PrismaQuizQuestion,
  QuizAttempt as PrismaQuizAttempt,
  QuizAnswer as PrismaQuizAnswer,
  Discussion as PrismaDiscussion,
  DiscussionPost as PrismaDiscussionPost,
  DiscussionReply as PrismaDiscussionReply,
  LiveSession as PrismaLiveSession,
  LiveSessionRecording as PrismaLiveSessionRecording,
  Notification as PrismaNotification,
  NotificationPreference as PrismaNotificationPreference,
  Certificate as PrismaCertificate,
  CertificateTemplate as PrismaCertificateTemplate,
  Payment as PrismaPayment,
  Invoice as PrismaInvoice,
  Content as PrismaContent,
  ContentVersion as PrismaContentVersion,
  Rubric as PrismaRubric,
  RubricCriterion as PrismaRubricCriterion,
  Analytics as PrismaAnalytics,
  LearningAnalytics as PrismaLearningAnalytics,
  AIConversation as PrismaAIConversation,
  AIMessage as PrismaAIMessage,
  CourseCategory as PrismaCourseCategory,
} from "@prisma/client";

// ==================== ENUMS ====================

export type UserRole = "STUDENT" | "INSTRUCTOR" | "TA" | "ADMIN";

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "UNDER_REVIEW";

export type LessonType =
  | "VIDEO"
  | "TEXT"
  | "INTERACTIVE"
  | "QUIZ"
  | "ASSIGNMENT"
  | "LIVE"
  | "DOCUMENT"
  | "AUDIO";

export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "LATE"
  | "GRADED"
  | "RETURNED"
  | "RESUBMITTED";

export type GradeStatus = "PENDING" | "GRADED" | "APPEALED" | "FINAL";

export type DiscussionStatus = "OPEN" | "CLOSED" | "PINNED" | "ARCHIVED";

export type PaymentStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "PARTIALLY_REFUNDED";

export type NotificationType =
  | "COURSE_UPDATE"
  | "ASSIGNMENT_DUE"
  | "GRADE_POSTED"
  | "DISCUSSION_REPLY"
  | "LIVE_SESSION_START"
  | "CERTIFICATE_ISSUED"
  | "PAYMENT_CONFIRMED"
  | "SYSTEM"
  | "AI_RESPONSE"
  | "ENROLLMENT"
  | "REMINDER";

export type ContentType =
  | "VIDEO"
  | "DOCUMENT"
  | "IMAGE"
  | "AUDIO"
  | "INTERACTIVE"
  | "CODE"
  | "SCORM"
  | "H5P";

export type AnalyticsEventType =
  | "PAGE_VIEW"
  | "LESSON_START"
  | "LESSON_COMPLETE"
  | "VIDEO_PLAY"
  | "VIDEO_PAUSE"
  | "VIDEO_SEEK"
  | "QUIZ_START"
  | "QUIZ_COMPLETE"
  | "ASSIGNMENT_SUBMIT"
  | "DISCUSSION_POST"
  | "AI_INTERACTION"
  | "FILE_DOWNLOAD"
  | "SEARCH"
  | "BOOKMARK";

export type CertificateStatus = "PENDING" | "ISSUED" | "REVOKED" | "EXPIRED";

export type LiveSessionStatus =
  | "SCHEDULED"
  | "LIVE"
  | "ENDED"
  | "CANCELLED";

export type EnrollmentStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "DROPPED"
  | "SUSPENDED"
  | "PENDING";

export type ModuleType = "CHAPTER" | "SECTION" | "UNIT" | "WORKSHOP";

// ==================== USER TYPES ====================

export type User = PrismaUser;

export type UserWithoutPassword = Omit<User, "passwordHash">;

export type SafeUser = Pick<
  User,
  | "id"
  | "email"
  | "name"
  | "firstName"
  | "lastName"
  | "image"
  | "role"
  | "isEmailVerified"
  | "createdAt"
>;

export interface UserWithRelations extends User {
  accounts?: Account[];
  sessions?: Session[];
  enrollments?: CourseEnrollment[];
  certificates?: Certificate[];
  payments?: Payment[];
  notifications?: Notification[];
}

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  _count?: {
    enrollments: number;
    submissions: number;
    discussions: number;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  bio: string | null;
  phone: string | null;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  enrolledCourses?: number;
  completedCourses?: number;
  certificates?: number;
  averageScore?: number;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

// ==================== COURSE TYPES ====================

export type Course = PrismaCourse;

export type CourseWithRelations = Course & {
  instructor: SafeUser;
  category?: CourseCategory | null;
  modules?: CourseModule[];
  enrollments?: CourseEnrollment[];
  _count?: {
    enrollments: number;
    lessons: number;
    assignments: number;
    quizzes: number;
    discussions: number;
  };
};

export type CourseListItem = Pick<
  Course,
  | "id"
  | "title"
  | "slug"
  | "description"
  | "shortDescription"
  | "imageUrl"
  | "price"
  | "currency"
  | "difficulty"
  | "estimatedHours"
  | "status"
  | "isPublished"
  | "publishedAt"
  | "tags"
  | "createdAt"
  | "updatedAt"
> & {
  instructor: Pick<SafeUser, "id" | "name" | "firstName" | "lastName" | "image">;
  category?: Pick<CourseCategory, "id" | "name" | "slug"> | null;
  _count?: {
    enrollments: number;
    lessons: number;
  };
};

export interface CourseWithModules extends Course {
  instructor: SafeUser;
  modules: (CourseModule & {
    lessons: Lesson[];
  })[];
}

export interface CourseDetails extends Course {
  instructor: SafeUser;
  category?: CourseCategory | null;
  modules: CourseModuleWithLessons[];
  enrollments: CourseEnrollment[];
  assignments: Assignment[];
  quizzes: Quiz[];
  discussions: Discussion[];
  _count: {
    enrollments: number;
    lessons: number;
    assignments: number;
    quizzes: number;
    discussions: number;
  };
}

export type CourseCategory = PrismaCourseCategory;

export type CourseCategoryWithChildren = CourseCategory & {
  children: CourseCategory[];
  _count?: {
    courses: number;
  };
};

// ==================== COURSE MODULE TYPES ====================

export type CourseModule = PrismaCourseModule;

export type CourseModuleWithLessons = CourseModule & {
  lessons: Lesson[];
};

// ==================== ENROLLMENT TYPES ====================

export type CourseEnrollment = PrismaCourseEnrollment;

export type EnrollmentWithRelations = CourseEnrollment & {
  course: CourseListItem;
  user: SafeUser;
  certificate?: Certificate | null;
};

export interface EnrollmentStats {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  averageProgress: number;
  averageGrade: number | null;
}

// ==================== LESSON TYPES ====================

export type Lesson = PrismaLesson;

export type LessonWithRelations = Lesson & {
  course?: Pick<Course, "id" | "title" | "slug">;
  module?: Pick<CourseModule, "id" | "title"> | null;
  contents?: LessonContent[];
  progress?: LessonProgress[];
  quiz?: Quiz | null;
  createdBy?: SafeUser | null;
};

export type LessonListItem = Pick<
  Lesson,
  | "id"
  | "title"
  | "description"
  | "lessonType"
  | "sortOrder"
  | "duration"
  | "isPublished"
  | "isRequired"
  | "createdAt"
>;

export type LessonContent = PrismaLessonContent;

export type LessonProgress = PrismaLessonProgress;

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress | null;
  contents: LessonContent[];
  quiz?: Quiz | null;
}

export interface LessonStats {
  totalLessons: number;
  publishedLessons: number;
  byType: Record<LessonType, number>;
  totalDuration: number;
}

// ==================== ASSIGNMENT TYPES ====================

export type Assignment = PrismaAssignment;

export type AssignmentWithRelations = Assignment & {
  course?: Pick<Course, "id" | "title" | "slug">;
  submissions?: AssignmentSubmission[];
  grades?: AssignmentGrade[];
  rubric?: Rubric | null;
  createdBy?: SafeUser | null;
  _count?: {
    submissions: number;
  };
};

export type AssignmentListItem = Pick<
  Assignment,
  | "id"
  | "title"
  | "description"
  | "maxPoints"
  | "passingPoints"
  | "dueDate"
  | "isPublished"
  | "createdAt"
> & {
  _count?: {
    submissions: number;
  };
};

export type AssignmentSubmission = PrismaAssignmentSubmission;

export type SubmissionWithRelations = AssignmentSubmission & {
  assignment?: Assignment;
  user?: SafeUser;
  grade?: AssignmentGrade | null;
};

export type AssignmentGrade = PrismaAssignmentGrade;

export type GradeWithRelations = AssignmentGrade & {
  submission?: AssignmentSubmission;
  grader?: SafeUser;
};

// ==================== QUIZ TYPES ====================

export type Quiz = PrismaQuiz;

export type QuizWithRelations = Quiz & {
  course?: Pick<Course, "id" | "title" | "slug">;
  lesson?: Pick<Lesson, "id" | "title"> | null;
  questions?: QuizQuestion[];
  attempts?: QuizAttempt[];
  createdBy?: SafeUser | null;
  _count?: {
    questions: number;
    attempts: number;
  };
};

export type QuizListItem = Pick<
  Quiz,
  | "id"
  | "title"
  | "description"
  | "timeLimit"
  | "maxAttempts"
  | "passingScore"
  | "isPublished"
  | "createdAt"
> & {
  _count?: {
    questions: number;
    attempts: number;
  };
};

export type QuizQuestion = PrismaQuizQuestion;

export type QuizQuestionWithAnswers = QuizQuestion & {
  answers?: QuizAnswer[];
};

export type QuizAttempt = PrismaQuizAttempt;

export type AttemptWithRelations = QuizAttempt & {
  quiz?: Quiz;
  user?: SafeUser;
  answers?: QuizAnswer[];
};

export type QuizAnswer = PrismaQuizAnswer;

export interface QuizResults {
  attempt: QuizAttempt;
  questions: (QuizQuestion & {
    userAnswer: QuizAnswer | null;
    isCorrect: boolean;
  })[];
  score: number;
  passed: boolean;
  timeSpent: number;
}

// ==================== DISCUSSION TYPES ====================

export type Discussion = PrismaDiscussion;

export type DiscussionWithRelations = Discussion & {
  course?: Pick<Course, "id" | "title" | "slug">;
  author?: SafeUser;
  posts?: DiscussionPostWithRelations[];
  _count?: {
    posts: number;
  };
};

export type DiscussionListItem = Pick<
  Discussion,
  | "id"
  | "title"
  | "description"
  | "status"
  | "isPinned"
  | "isLocked"
  | "postCount"
  | "lastPostAt"
  | "createdAt"
> & {
  author?: Pick<SafeUser, "id" | "name" | "firstName" | "lastName" | "image">;
  _count?: {
    posts: number;
  };
};

export type DiscussionPost = PrismaDiscussionPost;

export type DiscussionPostWithRelations = DiscussionPost & {
  discussion?: Pick<Discussion, "id" | "title">;
  user?: SafeUser;
  replies?: DiscussionReplyWithRelations[];
  _count?: {
    replies: number;
  };
};

export type DiscussionReply = PrismaDiscussionReply;

export type DiscussionReplyWithRelations = DiscussionReply & {
  post?: Pick<DiscussionPost, "id" | "content">;
  user?: SafeUser;
};

// ==================== LIVE SESSION TYPES ====================

export type LiveSession = PrismaLiveSession;

export type LiveSessionWithRelations = LiveSession & {
  course?: Pick<Course, "id" | "title" | "slug">;
  host?: SafeUser;
  recordings?: LiveSessionRecording[];
  participants?: SafeUser[];
};

export type LiveSessionListItem = Pick<
  LiveSession,
  | "id"
  | "title"
  | "description"
  | "scheduledAt"
  | "startedAt"
  | "endedAt"
  | "duration"
  | "status"
  | "meetingUrl"
  | "maxParticipants"
  | "createdAt"
> & {
  host?: Pick<SafeUser, "id" | "name" | "firstName" | "lastName" | "image">;
};

export type LiveSessionRecording = PrismaLiveSessionRecording;

// ==================== NOTIFICATION TYPES ====================

export type Notification = PrismaNotification;

export type NotificationWithRelations = Notification & {
  user?: SafeUser;
};

export type NotificationPreference = PrismaNotificationPreference;

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationCounts {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ==================== CERTIFICATE TYPES ====================

export type Certificate = PrismaCertificate;

export type CertificateWithRelations = Certificate & {
  template?: CertificateTemplate;
  user?: SafeUser;
  course?: Pick<Course, "id" | "title" | "slug">;
  enrollment?: CourseEnrollment;
};

export type CertificateTemplate = PrismaCertificateTemplate;

export type CertificateTemplateWithRelations = CertificateTemplate & {
  course?: Pick<Course, "id" | "title" | "slug"> | null;
  certificates?: Certificate[];
  _count?: {
    certificates: number;
  };
};

export interface CertificateData {
  certificateNumber: string;
  recipientName: string;
  courseName: string;
  completionDate: Date;
  issuerName: string;
  issuerTitle: string | null;
  expiresAt: Date | null;
}

// ==================== PAYMENT TYPES ====================

export type Payment = PrismaPayment;

export type PaymentWithRelations = Payment & {
  user?: SafeUser;
  course?: Pick<Course, "id" | "title" | "slug"> | null;
  invoice?: Invoice | null;
};

export type Invoice = PrismaInvoice;

export type InvoiceWithRelations = Invoice & {
  payment?: Payment;
};

export interface PaymentSummary {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  byMonth: {
    month: string;
    revenue: number;
    transactions: number;
  }[];
}

// ==================== CONTENT TYPES ====================

export type Content = PrismaContent;

export type ContentWithRelations = Content & {
  uploadedBy?: SafeUser;
  versions?: ContentVersion[];
  _count?: {
    versions: number;
  };
};

export type ContentVersion = PrismaContentVersion;

// ==================== RUBRIC TYPES ====================

export type Rubric = PrismaRubric;

export type RubricWithCriteria = Rubric & {
  criteria: RubricCriterion[];
  createdBy?: SafeUser | null;
};

export type RubricCriterion = PrismaRubricCriterion;

// ==================== ANALYTICS TYPES ====================

export type Analytics = PrismaAnalytics;

export type LearningAnalytics = PrismaLearningAnalytics;

export interface CourseAnalytics {
  overview: {
    totalStudents: number;
    activeStudents: number;
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
    revenue: number;
  };
  enrollmentTrends: {
    date: string;
    enrollments: number;
    dropouts: number;
  }[];
  completionRates: {
    lessonId: string;
    lessonTitle: string;
    completionRate: number;
  }[];
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  engagementMetrics: {
    date: string;
    pageViews: number;
    uniqueVisitors: number;
    averageTimeOnPage: number;
  }[];
  topPerformers: {
    userId: string;
    name: string;
    image: string | null;
    averageScore: number;
    completedLessons: number;
  }[];
}

export interface StudentAnalytics {
  overview: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
    averageScore: number;
    totalHoursLearned: number;
    certificatesEarned: number;
  };
  courseProgress: {
    courseId: string;
    courseName: string;
    progress: number;
    lastAccessedAt: Date;
  }[];
  performanceOverTime: {
    date: string;
    score: number;
    timeSpent: number;
  }[];
  activityHeatmap: {
    day: string;
    hour: number;
    count: number;
  }[];
  strengths: string[];
  areasForImprovement: string[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  courses: {
    courseId: string;
    courseName: string;
    order: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  }[];
  estimatedDuration: number;
  difficulty: string;
}

// ==================== AI TYPES ====================

export type AIConversation = PrismaAIConversation;

export type AIConversationWithRelations = AIConversation & {
  user?: SafeUser;
  messages?: AIMessage[];
  _count?: {
    messages: number;
  };
};

export type AIMessage = PrismaAIMessage;

export type AIMessageWithRelations = AIMessage & {
  conversation?: Pick<AIConversation, "id" | "title">;
};

export interface AIResponse {
  id: string;
  content: string;
  model: string;
  tokenCount: number;
  createdAt: Date;
}

export interface AIConversationContext {
  courseId?: string;
  lessonId?: string;
  assignmentId?: string;
  quizId?: string;
  previousMessages?: {
    role: "user" | "assistant";
    content: string;
  }[];
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

// ==================== UTILITY TYPES ====================

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Nullable<T> = T | null;

export type AsyncReturnType<T extends (...args: unknown[]) => Promise<unknown>> =
  T extends (...args: unknown[]) => Promise<infer R> ? R : never;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithSoftDelete<T> = T & {
  deletedAt: Date | null;
};

// ==================== HOOK TYPES ====================

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

export interface UseSearchOptions<T> {
  query: string;
  filters?: Partial<T>;
  debounceMs?: number;
}

export interface UseSearchReturn<T> {
  results: T[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refetch: () => void;
}

// ==================== COMPONENT PROPS TYPES ====================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export interface ButtonProps extends BaseComponentProps {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

export interface CardProps extends BaseComponentProps {
  variant?: "default" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
}

export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// ==================== SOCKET TYPES ====================

export interface SocketEvents {
  "user:join": (userId: string) => void;
  "user:leave": (userId: string) => void;
  "session:start": (sessionId: string) => void;
  "session:end": (sessionId: string) => void;
  "session:join": (sessionId: string, userId: string) => void;
  "session:leave": (sessionId: string, userId: string) => void;
  "message:send": (data: { conversationId: string; content: string }) => void;
  "message:receive": (data: { conversationId: string; message: AIMessage }) => void;
  "notification:receive": (notification: Notification) => void;
  "progress:update": (data: { lessonId: string; progress: number }) => void;
  "quiz:submit": (data: { quizId: string; answers: QuizAnswer[] }) => void;
  "quiz:result": (results: QuizResults) => void;
}

export interface SocketMessage {
  id: string;
  event: string;
  data: unknown;
  timestamp: Date;
  userId: string;
}

// ==================== FILTER & SORT TYPES ====================

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterOption {
  field: string;
  operator:
    | "equals"
    | "contains"
    | "startsWith"
    | "endsWith"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "notIn";
  value: unknown;
}

export interface SearchFilters {
  query?: string;
  sort?: SortOption;
  filters?: FilterOption[];
  page?: number;
  limit?: number;
}

// ==================== EXPORT ALL TYPES ====================

export type {
  PrismaUser as UserFromPrisma,
  PrismaCourse as CourseFromPrisma,
  PrismaLesson as LessonFromPrisma,
  PrismaAssignment as AssignmentFromPrisma,
  PrismaQuiz as QuizFromPrisma,
  PrismaDiscussion as DiscussionFromPrisma,
  PrismaCertificate as CertificateFromPrisma,
  PrismaPayment as PaymentFromPrisma,
  PrismaContent as ContentFromPrisma,
  PrismaRubric as RubricFromPrisma,
  PrismaAnalytics as AnalyticsFromPrisma,
  PrismaAIConversation as AIConversationFromPrisma,
};
