// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, string[]>;
  stack?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage?: number;
  prevPage?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Auth API
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: UserSummary;
  tokens: TokenPair;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// User types
export type UserRole = "student" | "instructor" | "admin";

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: UserRole;
}

export interface User extends UserSummary {
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  company?: string;
  title?: string;
  socialLinks?: Record<string, string>;
  preferences: UserPreferences;
  stats: UserStats;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  courseUpdates: boolean;
  assignmentReminders: boolean;
  gradeNotifications: boolean;
  marketingEmails: boolean;
}

export interface UserStats {
  coursesEnrolled: number;
  coursesCompleted: number;
  totalLearningTime: number;
  certificates: number;
  averageScore: number;
  streak: number;
}

// Course API
export interface GetCoursesParams extends PaginationParams {
  category?: string;
  level?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  language?: string;
  search?: string;
  instructorId?: string;
  isPublished?: boolean;
}

export interface GetCourseParams {
  id: string;
  include?: string[];
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  shortDescription: string;
  categoryId: string;
  level: string;
  language: string;
  price: number;
  currency?: string;
  prerequisites?: string[];
  learningObjectives?: string[];
  tags?: string[];
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  thumbnail?: string;
  previewVideo?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
}

// Enrollment API
export interface EnrollCourseRequest {
  courseId: string;
  paymentMethodId?: string;
  couponCode?: string;
}

export interface EnrollmentListParams extends PaginationParams {
  status?: string;
  courseId?: string;
}

// Progress API
export interface UpdateProgressRequest {
  lessonId: string;
  status: "started" | "completed";
  videoPosition?: number;
  timeSpent?: number;
}

export interface ProgressResponse {
  courseId: string;
  overall: number;
  modules: ModuleProgressResponse[];
  completedLessons: string[];
  completedAssignments: string[];
  completedQuizzes: string[];
  totalTimeSpent: number;
}

export interface ModuleProgressResponse {
  moduleId: string;
  completed: number;
  total: number;
  percentage: number;
}

// Assignment API
export interface SubmitAssignmentRequest {
  assignmentId: string;
  content: {
    type: string;
    text?: string;
    fileUrls?: string[];
    url?: string;
    code?: string;
    language?: string;
  };
}

export interface GradeAssignmentRequest {
  submissionId: string;
  score: number;
  rubricScores?: Array<{
    rubricItemId: string;
    points: number;
    comment?: string;
  }>;
  feedback?: string;
  passed?: boolean;
}

// Quiz API
export interface StartQuizRequest {
  quizId: string;
}

export interface SubmitQuizRequest {
  attemptId: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  timeSpent: number;
}

export interface QuizResultResponse {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswer: string | string[];
    explanation?: string;
  }>;
}

// Search API
export interface SearchRequest {
  query: string;
  type?: "courses" | "lessons" | "instructors" | "all";
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  query: string;
  suggestions: string[];
  facets: SearchFacet[];
}

export interface SearchFacet {
  name: string;
  values: Array<{ value: string; count: number }>;
}

// Analytics API
export interface AnalyticsDashboardResponse {
  overview: AnalyticsOverview;
  trends: AnalyticsTrend[];
  topCourses: AnalyticsCourse[];
  recentActivity: AnalyticsActivity[];
}

export interface AnalyticsOverview {
  totalStudents: number;
  activeStudents: number;
  totalCourses: number;
  completionRate: number;
  averageScore: number;
  totalRevenue: number;
}

export interface AnalyticsTrend {
  date: string;
  value: number;
  label: string;
}

export interface AnalyticsCourse {
  courseId: string;
  title: string;
  enrollments: number;
  completionRate: number;
  averageScore: number;
  revenue: number;
}

export interface AnalyticsActivity {
  type: string;
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

// File upload
export interface UploadPresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

// Notification API
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | "course-update"
  | "assignment-due"
  | "grade-posted"
  | "certificate-issued"
  | "enrollment"
  | "announcement"
  | "system";

export interface NotificationListParams extends PaginationParams {
  read?: boolean;
  type?: NotificationType;
}

// Webhook API
export interface WebhookEvent {
  id: string;
  type: string;
  data: unknown;
  createdAt: string;
}

// Health check
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  uptime: number;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: "up" | "down" | "degraded";
  latency?: number;
  error?: string;
}

// Rate limiting
export interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

// Batch operations
export interface BatchRequest<T> {
  operations: Array<{
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    path: string;
    body?: T;
  }>;
}

export interface BatchResponse {
  results: Array<{
    status: number;
    data?: unknown;
    error?: ApiError;
  }>;
}
