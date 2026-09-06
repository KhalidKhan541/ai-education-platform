import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["STUDENT", "INSTRUCTOR", "ADMIN"]).optional().default("STUDENT"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const courseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
  shortDescription: z.string().max(500).optional(),
  category: z.string().min(1, "Category is required"),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  price: z.number().min(0, "Price must be non-negative").max(99999),
  currency: z.string().default("USD"),
  thumbnail: z.string().url("Invalid thumbnail URL").optional(),
  prerequisites: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(false),
  estimatedHours: z.number().min(0).optional(),
  maxEnrollments: z.number().int().min(0).optional(),
});

export const updateCourseSchema = courseSchema.partial();

export const moduleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0),
  isPublished: z.boolean().default(false),
});

export const lessonSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["VIDEO", "TEXT", "INTERACTIVE", "QUIZ", "ASSIGNMENT"]),
  order: z.number().int().min(0),
  durationMinutes: z.number().int().min(0).optional(),
  videoUrl: z.string().url("Invalid video URL").optional(),
  isPublished: z.boolean().default(false),
  isFree: z.boolean().default(false),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(["PDF", "LINK", "FILE"]),
      })
    )
    .default([]),
});

export const assignmentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(10, "Description must be at least 10 characters"),
  instructions: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  maxScore: z.number().int().min(1).default(100),
  allowLateSubmission: z.boolean().default(false),
  lateSubmissionPenalty: z.number().min(0).max(100).default(0),
  attachments: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(["PDF", "CODE", "FILE", "LINK"]),
      })
    )
    .default([]),
  rubric: z
    .array(
      z.object({
        criterion: z.string(),
        points: z.number().int().min(1),
        description: z.string().optional(),
      })
    )
    .default([]),
  submissionType: z.enum(["FILE", "TEXT", "CODE", "URL"]).default("TEXT"),
  allowedFileTypes: z.array(z.string()).default([]),
  maxFileSize: z.number().int().min(0).default(10 * 1024 * 1024),
});

export const quizSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  timeLimitMinutes: z.number().int().min(1).optional(),
  maxAttempts: z.number().int().min(1).default(1),
  passingScore: z.number().min(0).max(100).default(70),
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(false),
  showCorrectAnswers: z.boolean().default(true),
  questions: z.array(
    z.object({
      type: z.enum(["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER", "ESSAY"]),
      question: z.string().min(1),
      options: z
        .array(
          z.object({
            text: z.string(),
            isCorrect: z.boolean(),
          })
        )
        .optional(),
      correctAnswer: z.string().optional(),
      points: z.number().int().min(1).default(1),
      explanation: z.string().optional(),
    })
  ),
});

export const submissionSchema = z.object({
  content: z.string().min(1, "Submission content is required"),
  attachments: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        type: z.enum(["PDF", "CODE", "FILE", "LINK"]),
      })
    )
    .default([]),
});

export const quizAttemptSchema = z.object({
  answers: z.array(
    z.object({
      questionIndex: z.number().int().min(0),
      answer: z.string(),
      timeSpentSeconds: z.number().int().min(0).optional(),
    })
  ),
  timeTakenSeconds: z.number().int().min(0),
});

export const discussionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().min(1, "Content is required").max(10000),
  isPinned: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const replySchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  parentReplyId: z.string().uuid().optional(),
});

export const progressUpdateSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  completed: z.boolean(),
  timeSpentSeconds: z.number().int().min(0).optional(),
  score: z.number().min(0).max(100).optional(),
});

export const aiTutorSchema = z.object({
  question: z.string().min(1, "Question is required").max(5000),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  context: z.string().max(10000).optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

export const aiContentSchema = z.object({
  type: z.enum(["SUMMARY", "QUIZ_QUESTIONS", "EXPLANATION", "FLASHCARDS", "OUTLINE"]),
  content: z.string().min(1, "Content is required").max(50000),
  parameters: z
    .object({
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
      count: z.number().int().min(1).max(50).optional(),
      format: z.enum(["BULLET_POINTS", "PARAGRAPHS", "NUMBERED_LIST"]).optional(),
    })
    .default({}),
});

export const aiGradingSchema = z.object({
  assignmentId: z.string().uuid("Invalid assignment ID"),
  submissionId: z.string().uuid("Invalid submission ID"),
  rubric: z
    .array(
      z.object({
        criterion: z.string(),
        points: z.number().int().min(1),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export const settingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      courseUpdates: z.boolean().optional(),
      assignmentReminders: z.boolean().optional(),
      discussionReplies: z.boolean().optional(),
      gradeNotifications: z.boolean().optional(),
    })
    .optional(),
  preferences: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      fontSize: z.enum(["small", "medium", "large"]).optional(),
    })
    .optional(),
});

export const paymentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  paymentMethod: z.enum(["CREDIT_CARD", "DEBIT_CARD", "PAYPAL", "STRIPE"]),
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  paypalEmail: z.string().email().optional(),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return { success: false as const, errors };
  }
  return { success: true as const, data: result.data };
}
