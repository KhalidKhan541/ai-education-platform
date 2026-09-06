// ==================== BASE APPLICATION ERROR ====================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      isOperational: this.isOperational,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

// ==================== HTTP ERRORS ====================

export class BadRequestError extends AppError {
  constructor(
    message: string = "Bad request",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 400, "BAD_REQUEST", true, details, requestId);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(
    message: string = "Unauthorized",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 401, "UNAUTHORIZED", true, details, requestId);
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = "Forbidden",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 403, "FORBIDDEN", true, details, requestId);
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(
    resource: string = "Resource",
    id?: string,
    requestId?: string
  ) {
    const message = id
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND", true, { resource, id }, requestId);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string = "Conflict",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 409, "CONFLICT", true, details, requestId);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message: string = "Unprocessable entity",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 422, "UNPROCESSABLE_ENTITY", true, details, requestId);
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string = "Too many requests",
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, 429, "TOO_MANY_REQUESTS", true, { retryAfter }, requestId);
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message: string = "Internal server error",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 500, "INTERNAL_ERROR", false, details, requestId);
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string = "Service unavailable",
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, 503, "SERVICE_UNAVAILABLE", true, { retryAfter }, requestId);
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

// ==================== VALIDATION ERRORS ====================

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    errors: Record<string, string[]>,
    message: string = "Validation failed",
    requestId?: string
  ) {
    super(message, 400, "VALIDATION_ERROR", true, { errors }, requestId);
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  static fromZodError(zodError: {
    issues: Array<{
      path: (string | number)[];
      message: string;
    }>;
  }): ValidationError {
    const errors: Record<string, string[]> = {};

    for (const issue of zodError.issues) {
      const path = issue.path.join(".");
      const key = path || "_root";
      if (!errors[key]) {
        errors[key] = [];
      }
      errors[key].push(issue.message);
    }

    return new ValidationError(errors);
  }
}

export class SchemaValidationError extends ValidationError {
  constructor(
    field: string,
    message: string,
    requestId?: string
  ) {
    super({ [field]: [message] }, `Schema validation failed for field: ${field}`, requestId);
    Object.setPrototypeOf(this, SchemaValidationError.prototype);
  }
}

// ==================== AUTH ERRORS ====================

export class AuthenticationError extends AppError {
  constructor(
    message: string = "Authentication failed",
    details?: Record<string, unknown>,
    requestId?: string
  ) {
    super(message, 401, "AUTHENTICATION_ERROR", true, details, requestId);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(requestId?: string) {
    super("Invalid email or password", undefined, requestId);
    this.code = "INVALID_CREDENTIALS";
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(requestId?: string) {
    super("Token has expired", undefined, requestId);
    this.code = "TOKEN_EXPIRED";
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(requestId?: string) {
    super("Invalid token", undefined, requestId);
    this.code = "INVALID_TOKEN";
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class AccountLockedError extends AuthenticationError {
  constructor(
    unlockAt: Date,
    requestId?: string
  ) {
    super("Account is locked", undefined, requestId);
    this.code = "ACCOUNT_LOCKED";
    this.details = { unlockAt: unlockAt.toISOString() };
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

export class EmailNotVerifiedError extends AuthenticationError {
  constructor(requestId?: string) {
    super("Email not verified", undefined, requestId);
    this.code = "EMAIL_NOT_VERIFIED";
    Object.setPrototypeOf(this, EmailNotVerifiedError.prototype);
  }
}

// ==================== COURSE ERRORS ====================

export class CourseNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Course", id, requestId);
    this.code = "COURSE_NOT_FOUND";
    Object.setPrototypeOf(this, CourseNotFoundError.prototype);
  }
}

export class CourseNotPublishedError extends AppError {
  constructor(courseId: string, requestId?: string) {
    super("Course is not published", 400, "COURSE_NOT_PUBLISHED", true, { courseId }, requestId);
    Object.setPrototypeOf(this, CourseNotPublishedError.prototype);
  }
}

export class CourseFullError extends AppError {
  constructor(courseId: string, maxEnrollments: number, requestId?: string) {
    super("Course is full", 400, "COURSE_FULL", true, { courseId, maxEnrollments }, requestId);
    Object.setPrototypeOf(this, CourseFullError.prototype);
  }
}

export class AlreadyEnrolledError extends ConflictError {
  constructor(courseId: string, requestId?: string) {
    super("Already enrolled in this course", { courseId }, requestId);
    this.code = "ALREADY_ENROLLED";
    Object.setPrototypeOf(this, AlreadyEnrolledError.prototype);
  }
}

export class NotEnrolledError extends ForbiddenError {
  constructor(courseId: string, requestId?: string) {
    super("Not enrolled in this course", { courseId }, requestId);
    this.code = "NOT_ENROLLED";
    Object.setPrototypeOf(this, NotEnrolledError.prototype);
  }
}

export class EnrollmentDroppedError extends AppError {
  constructor(courseId: string, requestId?: string) {
    super("Enrollment has been dropped", 400, "ENROLLMENT_DROPPED", true, { courseId }, requestId);
    Object.setPrototypeOf(this, EnrollmentDroppedError.prototype);
  }
}

// ==================== LESSON ERRORS ====================

export class LessonNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Lesson", id, requestId);
    this.code = "LESSON_NOT_FOUND";
    Object.setPrototypeOf(this, LessonNotFoundError.prototype);
  }
}

export class LessonNotPublishedError extends AppError {
  constructor(lessonId: string, requestId?: string) {
    super("Lesson is not published", 400, "LESSON_NOT_PUBLISHED", true, { lessonId }, requestId);
    Object.setPrototypeOf(this, LessonNotPublishedError.prototype);
  }
}

export class LessonRequiredError extends AppError {
  constructor(lessonId: string, requestId?: string) {
    super("This lesson is required and must be completed", 400, "LESSON_REQUIRED", true, { lessonId }, requestId);
    Object.setPrototypeOf(this, LessonRequiredError.prototype);
  }
}

// ==================== ASSIGNMENT ERRORS ====================

export class AssignmentNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Assignment", id, requestId);
    this.code = "ASSIGNMENT_NOT_FOUND";
    Object.setPrototypeOf(this, AssignmentNotFoundError.prototype);
  }
}

export class AssignmentPastDueError extends AppError {
  constructor(assignmentId: string, dueDate: Date, requestId?: string) {
    super("Assignment is past due", 400, "ASSIGNMENT_PAST_DUE", true, { assignmentId, dueDate: dueDate.toISOString() }, requestId);
    Object.setPrototypeOf(this, AssignmentPastDueError.prototype);
  }
}

export class MaxAttemptsReachedError extends AppError {
  constructor(assignmentId: string, maxAttempts: number, requestId?: string) {
    super("Maximum submission attempts reached", 400, "MAX_ATTEMPTS_REACHED", true, { assignmentId, maxAttempts }, requestId);
    Object.setPrototypeOf(this, MaxAttemptsReachedError.prototype);
  }
}

export class LateSubmissionError extends AppError {
  constructor(
    assignmentId: string,
    latePenalty: number,
    requestId?: string
  ) {
    super("Late submission penalty applied", 400, "LATE_SUBMISSION", true, { assignmentId, latePenalty }, requestId);
    Object.setPrototypeOf(this, LateSubmissionError.prototype);
  }
}

// ==================== QUIZ ERRORS ====================

export class QuizNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Quiz", id, requestId);
    this.code = "QUIZ_NOT_FOUND";
    Object.setPrototypeOf(this, QuizNotFoundError.prototype);
  }
}

export class QuizTimeLimitExceededError extends AppError {
  constructor(quizId: string, timeLimit: number, requestId?: string) {
    super("Quiz time limit exceeded", 400, "QUIZ_TIME_LIMIT_EXCEEDED", true, { quizId, timeLimit }, requestId);
    Object.setPrototypeOf(this, QuizTimeLimitExceededError.prototype);
  }
}

export class QuizAttemptLimitError extends AppError {
  constructor(quizId: string, maxAttempts: number, requestId?: string) {
    super("Quiz attempt limit reached", 400, "QUIZ_ATTEMPT_LIMIT", true, { quizId, maxAttempts }, requestId);
    Object.setPrototypeOf(this, QuizAttemptLimitError.prototype);
  }
}

export class QuizNotPublishedError extends AppError {
  constructor(quizId: string, requestId?: string) {
    super("Quiz is not published", 400, "QUIZ_NOT_PUBLISHED", true, { quizId }, requestId);
    Object.setPrototypeOf(this, QuizNotPublishedError.prototype);
  }
}

// ==================== DISCUSSION ERRORS ====================

export class DiscussionNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Discussion", id, requestId);
    this.code = "DISCUSSION_NOT_FOUND";
    Object.setPrototypeOf(this, DiscussionNotFoundError.prototype);
  }
}

export class DiscussionLockedError extends AppError {
  constructor(discussionId: string, requestId?: string) {
    super("Discussion is locked", 400, "DISCUSSION_LOCKED", true, { discussionId }, requestId);
    Object.setPrototypeOf(this, DiscussionLockedError.prototype);
  }
}

export class DiscussionClosedError extends AppError {
  constructor(discussionId: string, requestId?: string) {
    super("Discussion is closed", 400, "DISCUSSION_CLOSED", true, { discussionId }, requestId);
    Object.setPrototypeOf(this, DiscussionClosedError.prototype);
  }
}

// ==================== PAYMENT ERRORS ====================

export class PaymentNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Payment", id, requestId);
    this.code = "PAYMENT_NOT_FOUND";
    Object.setPrototypeOf(this, PaymentNotFoundError.prototype);
  }
}

export class PaymentFailedError extends AppError {
  constructor(
    paymentId: string,
    reason?: string,
    requestId?: string
  ) {
    super("Payment failed", 400, "PAYMENT_FAILED", true, { paymentId, reason }, requestId);
    Object.setPrototypeOf(this, PaymentFailedError.prototype);
  }
}

export class PaymentAlreadyProcessedError extends ConflictError {
  constructor(paymentId: string, requestId?: string) {
    super("Payment has already been processed", { paymentId }, requestId);
    this.code = "PAYMENT_ALREADY_PROCESSED";
    Object.setPrototypeOf(this, PaymentAlreadyProcessedError.prototype);
  }
}

export class RefundNotAvailableError extends AppError {
  constructor(paymentId: string, reason: string, requestId?: string) {
    super("Refund not available", 400, "REFUND_NOT_AVAILABLE", true, { paymentId, reason }, requestId);
    Object.setPrototypeOf(this, RefundNotAvailableError.prototype);
  }
}

// ==================== CERTIFICATE ERRORS ====================

export class CertificateNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Certificate", id, requestId);
    this.code = "CERTIFICATE_NOT_FOUND";
    Object.setPrototypeOf(this, CertificateNotFoundError.prototype);
  }
}

export class CertificateRevokedError extends AppError {
  constructor(certificateId: string, requestId?: string) {
    super("Certificate has been revoked", 400, "CERTIFICATE_REVOKED", true, { certificateId }, requestId);
    Object.setPrototypeOf(this, CertificateRevokedError.prototype);
  }
}

export class CertificateExpiredError extends AppError {
  constructor(certificateId: string, expiresAt: Date, requestId?: string) {
    super("Certificate has expired", 400, "CERTIFICATE_EXPIRED", true, { certificateId, expiresAt: expiresAt.toISOString() }, requestId);
    Object.setPrototypeOf(this, CertificateExpiredError.prototype);
  }
}

export class CertificateTemplateNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Certificate template", id, requestId);
    this.code = "CERTIFICATE_TEMPLATE_NOT_FOUND";
    Object.setPrototypeOf(this, CertificateTemplateNotFoundError.prototype);
  }
}

// ==================== CONTENT ERRORS ====================

export class ContentNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Content", id, requestId);
    this.code = "CONTENT_NOT_FOUND";
    Object.setPrototypeOf(this, ContentNotFoundError.prototype);
  }
}

export class FileTooLargeError extends AppError {
  constructor(
    fileSize: number,
    maxSize: number,
    requestId?: string
  ) {
    super("File too large", 400, "FILE_TOO_LARGE", true, { fileSize, maxSize }, requestId);
    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}

export class InvalidFileTypeError extends AppError {
  constructor(
    fileType: string,
    allowedTypes: string[],
    requestId?: string
  ) {
    super("Invalid file type", 400, "INVALID_FILE_TYPE", true, { fileType, allowedTypes }, requestId);
    Object.setPrototypeOf(this, InvalidFileTypeError.prototype);
  }
}

// ==================== LIVE SESSION ERRORS ====================

export class LiveSessionNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Live session", id, requestId);
    this.code = "LIVE_SESSION_NOT_FOUND";
    Object.setPrototypeOf(this, LiveSessionNotFoundError.prototype);
  }
}

export class LiveSessionNotStartedError extends AppError {
  constructor(sessionId: string, requestId?: string) {
    super("Live session has not started yet", 400, "LIVE_SESSION_NOT_STARTED", true, { sessionId }, requestId);
    Object.setPrototypeOf(this, LiveSessionNotStartedError.prototype);
  }
}

export class LiveSessionEndedError extends AppError {
  constructor(sessionId: string, requestId?: string) {
    super("Live session has ended", 400, "LIVE_SESSION_ENDED", true, { sessionId }, requestId);
    Object.setPrototypeOf(this, LiveSessionEndedError.prototype);
  }
}

export class LiveSessionFullError extends AppError {
  constructor(sessionId: string, maxParticipants: number, requestId?: string) {
    super("Live session is full", 400, "LIVE_SESSION_FULL", true, { sessionId, maxParticipants }, requestId);
    Object.setPrototypeOf(this, LiveSessionFullError.prototype);
  }
}

// ==================== USER ERRORS ====================

export class UserNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("User", id, requestId);
    this.code = "USER_NOT_FOUND";
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class UserAlreadyExistsError extends ConflictError {
  constructor(email: string, requestId?: string) {
    super("User with this email already exists", { email }, requestId);
    this.code = "USER_ALREADY_EXISTS";
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

export class UserDeactivatedError extends ForbiddenError {
  constructor(userId: string, requestId?: string) {
    super("User account has been deactivated", { userId }, requestId);
    this.code = "USER_DEACTIVATED";
    Object.setPrototypeOf(this, UserDeactivatedError.prototype);
  }
}

// ==================== RUBRIC ERRORS ====================

export class RubricNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Rubric", id, requestId);
    this.code = "RUBRIC_NOT_FOUND";
    Object.setPrototypeOf(this, RubricNotFoundError.prototype);
  }
}

// ==================== CATEGORY ERRORS ====================

export class CategoryNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("Category", id, requestId);
    this.code = "CATEGORY_NOT_FOUND";
    Object.setPrototypeOf(this, CategoryNotFoundError.prototype);
  }
}

export class CategoryHasCoursesError extends AppError {
  constructor(categoryId: string, courseCount: number, requestId?: string) {
    super("Category has associated courses", 400, "CATEGORY_HAS_COURSES", true, { categoryId, courseCount }, requestId);
    Object.setPrototypeOf(this, CategoryHasCoursesError.prototype);
  }
}

// ==================== AI ERRORS ====================

export class AIConversationNotFoundError extends NotFoundError {
  constructor(id?: string, requestId?: string) {
    super("AI conversation", id, requestId);
    this.code = "AI_CONVERSATION_NOT_FOUND";
    Object.setPrototypeOf(this, AIConversationNotFoundError.prototype);
  }
}

export class AITooManyRequestsError extends TooManyRequestsError {
  constructor(retryAfter: number = 60, requestId?: string) {
    super("AI request limit exceeded. Please try again later.", retryAfter, requestId);
    this.code = "AI_TOO_MANY_REQUESTS";
    Object.setPrototypeOf(this, AITooManyRequestsError.prototype);
  }
}

export class AIApiError extends AppError {
  constructor(
    message: string,
    provider: string,
    statusCode: number = 502,
    requestId?: string
  ) {
    super(message, statusCode, "AI_API_ERROR", true, { provider }, requestId);
    Object.setPrototypeOf(this, AIApiError.prototype);
  }
}

// ==================== ANALYTICS ERRORS ====================

export class AnalyticsNotAvailableError extends AppError {
  constructor(requestId?: string) {
    super("Analytics data is not available", 400, "ANALYTICS_NOT_AVAILABLE", true, undefined, requestId);
    Object.setPrototypeOf(this, AnalyticsNotAvailableError.prototype);
  }
}

export class ExportFailedError extends AppError {
  constructor(format: string, reason?: string, requestId?: string) {
    super("Export failed", 500, "EXPORT_FAILED", false, { format, reason }, requestId);
    Object.setPrototypeOf(this, ExportFailedError.prototype);
  }
}

// ==================== ERROR HANDLING UTILITIES ====================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return "INTERNAL_ERROR";
}

export function formatErrorForClient(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details as Record<string, unknown> | undefined,
    };
  }

  if (error instanceof Error) {
    return {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
      statusCode: 500,
    };
  }

  return {
    message: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}

export function createErrorFromStatus(statusCode: number, message?: string): AppError {
  switch (statusCode) {
    case 400:
      return new BadRequestError(message);
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message ?? "Resource");
    case 409:
      return new ConflictError(message);
    case 422:
      return new UnprocessableEntityError(message);
    case 429:
      return new TooManyRequestsError(message);
    case 500:
      return new InternalServerError(message);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new AppError(message ?? "Error", statusCode);
  }
}
