export * from "./course";
export * from "./lesson";
export * from "./assignment";
export * from "./quiz";
export * from "./certificate";
export * from "./api";

// Re-export commonly used types for convenience
export type {
  Course,
  CourseModule,
  CourseLesson,
  CourseAssignment,
  CourseQuiz,
  CourseLevel,
  LessonType,
  AssignmentType,
  Enrollment,
  EnrollmentStatus,
  EnrollmentProgress,
  CreateCourseInput,
  UpdateCourseInput,
} from "./course";

export type {
  Lesson,
  LessonProgress,
  LessonStatus,
  LessonNavigation,
  LessonNote,
  LessonBookmark,
  VideoTranscript,
  CreateLessonInput,
} from "./lesson";

export type {
  Assignment,
  AssignmentSubmission,
  SubmissionStatus,
  SubmissionContent,
  GradingResult,
  CreateAssignmentInput,
} from "./assignment";

export type {
  Quiz,
  QuizQuestion,
  QuestionType,
  QuizAttempt,
  AttemptStatus,
  QuizResult,
  CreateQuizInput,
  SubmitQuizAttemptInput,
} from "./quiz";

export type {
  Certificate,
  CertificateStatus,
  CertificateCollection,
  GenerateCertificateInput,
  VerificationResult,
} from "./certificate";

export type {
  ApiResponse,
  ApiErrorResponse,
  ApiError,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UserSummary,
  UserRole,
  Notification,
  NotificationType,
  SearchRequest,
  SearchResponse,
} from "./api";
