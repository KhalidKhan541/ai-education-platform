import { z } from "zod";

// ==================== USER VALIDATORS ====================

export const registerSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email address")
      .max(255, "Email must be at most 255 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
    firstName: z
      .string()
      .min(1, "First name is required")
      .max(100, "First name must be at most 100 characters"),
    lastName: z
      .string()
      .min(1, "Last name is required")
      .max(100, "Last name must be at most 100 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  bio: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  image: z.string().url().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(128, "New password must be at most 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        "Password must include uppercase, lowercase, number, and special character"
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const updateRoleSchema = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "TA", "ADMIN"]),
});

// ==================== COURSE VALIDATORS ====================

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(255, "Slug must be at most 255 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(500).optional(),
  price: z.number().min(0).max(99999.99).optional(),
  currency: z.string().length(3).default("USD"),
  categoryId: z.string().uuid().optional(),
  difficulty: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  maxEnrollments: z.number().int().min(1).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  prerequisites: z.array(z.string().max(200)).max(10).optional(),
  learningObjectives: z.array(z.string().max(200)).max(20).optional(),
});

export const updateCourseSchema = createCourseSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "UNDER_REVIEW"]).optional(),
  isPublished: z.boolean().optional(),
});

export const courseFilterSchema = z.object({
  search: z.string().max(255).optional(),
  categoryId: z.string().uuid().optional(),
  instructorId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "UNDER_REVIEW"]).optional(),
  difficulty: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"])
    .optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z
    .enum(["createdAt", "updatedAt", "title", "price", "rating"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const enrollmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

// ==================== COURSE MODULE VALIDATORS ====================

export const createCourseModuleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  sortOrder: z.number().int().min(0).default(0),
  moduleType: z.enum(["CHAPTER", "SECTION", "UNIT", "WORKSHOP"]).default("CHAPTER"),
  isPublished: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  duration: z.string().max(50).optional(),
});

export const updateCourseModuleSchema = createCourseModuleSchema.partial();

// ==================== LESSON VALIDATORS ====================

export const createLessonSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  moduleId: z.string().uuid().optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  lessonType: z
    .enum(["VIDEO", "TEXT", "INTERACTIVE", "QUIZ", "ASSIGNMENT", "LIVE", "DOCUMENT", "AUDIO"])
    .default("TEXT"),
  sortOrder: z.number().int().min(0).default(0),
  duration: z.number().int().min(0).optional(),
  isPublished: z.boolean().default(false),
  isRequired: z.boolean().default(true),
  allowComments: z.boolean().default(true),
  maxAttempts: z.number().int().min(1).optional(),
  passingScore: z.number().min(0).max(100).optional(),
});

export const updateLessonSchema = createLessonSchema.partial().omit({ courseId: true });

export const createLessonContentSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  contentType: z.enum(["VIDEO", "DOCUMENT", "IMAGE", "AUDIO", "INTERACTIVE", "CODE", "SCORM", "H5P"]),
  title: z.string().max(255).optional(),
  content: z.string().max(50000).optional(),
  fileUrl: z.string().url().optional(),
  fileSize: z.number().int().min(0).optional(),
  mimeType: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== ASSIGNMENT VALIDATORS ====================

export const createAssignmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(5000).optional(),
  instructions: z.string().max(10000).optional(),
  maxPoints: z.number().int().min(1).max(1000),
  passingPoints: z.number().int().min(0).optional(),
  dueDate: z.string().datetime().optional(),
  allowLateSub: z.boolean().default(true),
  latePenalty: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  isPublished: z.boolean().default(false),
  rubricId: z.string().uuid().optional(),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().omit({ courseId: true });

export const submissionSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  content: z.string().max(50000).optional(),
  fileUrls: z.array(z.string().url()).max(10).optional(),
});

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  points: z.number().min(0),
  feedback: z.string().max(5000).optional(),
  status: z.enum(["GRADED", "RETURNED"]).default("GRADED"),
});

// ==================== QUIZ VALIDATORS ====================

export const createQuizSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  lessonId: z.string().uuid().optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  instructions: z.string().max(5000).optional(),
  timeLimit: z.number().int().min(1).max(1440).optional(),
  maxAttempts: z.number().int().min(1).max(10).default(3),
  passingScore: z.number().min(0).max(100).default(70),
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  showCorrectAnswers: z.boolean().default(true),
  isPublished: z.boolean().default(false),
});

export const updateQuizSchema = createQuizSchema.partial().omit({ courseId: true });

export const createQuizQuestionSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  question: z.string().min(1, "Question is required").max(2000),
  questionType: z.enum([
    "MULTIPLE_CHOICE",
    "TRUE_FALSE",
    "SHORT_ANSWER",
    "ESSAY",
    "FILL_IN_BLANK",
    "MATCHING",
    "MULTIPLE_SELECT",
  ]),
  options: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().max(500),
        isCorrect: z.boolean().optional(),
      })
    )
    .min(2)
    .max(10)
    .optional(),
  correctAnswer: z.unknown().optional(),
  explanation: z.string().max(2000).optional(),
  points: z.number().min(0).max(100).default(1),
  sortOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
  metadata: z.record(z.unknown()).optional(),
});

export const submitQuizSchema = z.object({
  quizId: z.string().uuid("Invalid quiz ID"),
  answers: z.array(
    z.object({
      questionId: z.string().uuid("Invalid question ID"),
      answer: z.unknown(),
    })
  ),
});

// ==================== DISCUSSION VALIDATORS ====================

export const createDiscussionSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
});

export const updateDiscussionSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["OPEN", "CLOSED", "PINNED", "ARCHIVED"]).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export const createDiscussionPostSchema = z.object({
  discussionId: z.string().uuid("Invalid discussion ID"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(10000, "Content must be at most 10000 characters"),
});

export const createDiscussionReplySchema = z.object({
  postId: z.string().uuid("Invalid post ID"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content must be at most 5000 characters"),
});

// ==================== LIVE SESSION VALIDATORS ====================

export const createLiveSessionSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime("Invalid date format"),
  duration: z.number().int().min(15).max(480).optional(),
  meetingUrl: z.string().url().optional(),
  maxParticipants: z.number().int().min(1).max(10000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateLiveSessionSchema = z.object({
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().int().min(15).max(480).optional(),
  status: z.enum(["SCHEDULED", "LIVE", "ENDED", "CANCELLED"]).optional(),
  meetingUrl: z.string().url().optional(),
  maxParticipants: z.number().int().min(1).max(10000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== CERTIFICATE VALIDATORS ====================

export const createCertificateSchema = z.object({
  templateId: z.string().uuid("Invalid template ID"),
  userId: z.string().uuid("Invalid user ID"),
  courseId: z.string().uuid("Invalid course ID"),
});

export const createCertificateTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  description: z.string().max(1000).optional(),
  templateData: z.record(z.unknown()),
  courseId: z.string().uuid().optional(),
  issuerName: z.string().max(255),
  issuerTitle: z.string().max(255).optional(),
  expiryDays: z.number().int().min(1).optional(),
  isActive: z.boolean().default(true),
});

// ==================== PAYMENT VALIDATORS ====================

export const createPaymentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  paymentMethod: z.string().max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const processPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  transactionId: z.string().max(255).optional(),
  stripePaymentId: z.string().max(255).optional(),
});

export const refundPaymentSchema = z.object({
  paymentId: z.string().uuid("Invalid payment ID"),
  amount: z.number().min(0.01).optional(),
  reason: z.string().max(500).optional(),
});

// ==================== NOTIFICATION VALIDATORS ====================

export const updateNotificationPreferenceSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional(),
  types: z.array(z.string()).optional(),
  quietHoursStart: z.string().max(5).optional(),
  quietHoursEnd: z.string().max(5).optional(),
  timezone: z.string().max(50).optional(),
});

// ==================== ANALYTICS VALIDATORS ====================

export const analyticsQuerySchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(["day", "week", "month"]).default("day"),
});

export const learningAnalyticsSchema = z.object({
  eventType: z.enum([
    "PAGE_VIEW",
    "LESSON_START",
    "LESSON_COMPLETE",
    "VIDEO_PLAY",
    "VIDEO_PAUSE",
    "VIDEO_SEEK",
    "QUIZ_START",
    "QUIZ_COMPLETE",
    "ASSIGNMENT_SUBMIT",
    "DISCUSSION_POST",
    "AI_INTERACTION",
    "FILE_DOWNLOAD",
    "SEARCH",
    "BOOKMARK",
  ]),
  entityId: z.string().uuid().optional(),
  entityType: z.string().max(50).optional(),
  courseId: z.string().uuid().optional(),
  duration: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== AI VALIDATORS ====================

export const createAIConversationSchema = z.object({
  title: z.string().max(255).optional(),
  model: z.string().max(100).default("gpt-4"),
  context: z.record(z.unknown()).optional(),
});

export const sendAIMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z
    .string()
    .min(1, "Message is required")
    .max(10000, "Message must be at most 10000 characters"),
});

// ==================== RUBRIC VALIDATORS ====================

export const createRubricSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  totalPoints: z.number().int().min(1).max(1000),
  criteria: z.array(
    z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(1000).optional(),
      maxPoints: z.number().min(0).max(100),
      sortOrder: z.number().int().min(0).default(0),
    })
  ),
});

export const updateRubricSchema = createRubricSchema.partial();

// ==================== CONTENT VALIDATORS ====================

export const createContentSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title must be at most 255 characters"),
  description: z.string().max(2000).optional(),
  contentType: z.enum(["VIDEO", "DOCUMENT", "IMAGE", "AUDIO", "INTERACTIVE", "CODE", "SCORM", "H5P"]),
  fileUrl: z.string().url("Invalid file URL"),
  fileSize: z.number().int().min(0),
  mimeType: z.string().max(100),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== PAGINATION VALIDATORS ====================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  sortBy: z.string().max(100).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(255),
  type: z.enum(["courses", "lessons", "assignments", "quizzes", "discussions", "users"]).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(50).default(10),
});

// ==================== CATEGORY VALIDATORS ====================

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain only lowercase letters, numbers, and hyphens"
    ),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  parentId: z.string().uuid().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();
