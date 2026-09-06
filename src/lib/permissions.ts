import { prisma } from "./db";

// ==================== ROLE HIERARCHY ====================

export const ROLE_HIERARCHY: Record<string, number> = {
  STUDENT: 0,
  TA: 1,
  INSTRUCTOR: 2,
  ADMIN: 3,
};

export function hasMinimumRole(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? -1;
  return userLevel >= requiredLevel;
}

// ==================== PERMISSION TYPES ====================

export type Permission =
  | "course:create"
  | "course:read"
  | "course:update"
  | "course:delete"
  | "course:publish"
  | "course:archive"
  | "course:enroll"
  | "course:unenroll"
  | "course:view_enrollments"
  | "course:view_analytics"
  | "course:export_data"
  | "module:create"
  | "module:read"
  | "module:update"
  | "module:delete"
  | "lesson:create"
  | "lesson:read"
  | "lesson:update"
  | "lesson:delete"
  | "lesson:publish"
  | "assignment:create"
  | "assignment:read"
  | "assignment:update"
  | "assignment:delete"
  | "assignment:submit"
  | "assignment:grade"
  | "assignment:view_submissions"
  | "quiz:create"
  | "quiz:read"
  | "quiz:update"
  | "quiz:delete"
  | "quiz:take"
  | "quiz:view_results"
  | "discussion:create"
  | "discussion:read"
  | "discussion:update"
  | "discussion:delete"
  | "discussion:moderate"
  | "discussion:pin"
  | "discussion:lock"
  | "live_session:create"
  | "live_session:read"
  | "live_session:update"
  | "live_session:delete"
  | "live_session:host"
  | "live_session:join"
  | "notification:read"
  | "notification:update_preferences"
  | "certificate:issue"
  | "certificate:revoke"
  | "certificate:view"
  | "certificate:download"
  | "payment:create"
  | "payment:read"
  | "payment:refund"
  | "payment:view_all"
  | "content:create"
  | "content:read"
  | "content:update"
  | "content:delete"
  | "rubric:create"
  | "rubric:read"
  | "rubric:update"
  | "rubric:delete"
  | "analytics:view_own"
  | "analytics:view_course"
  | "analytics:view_all"
  | "analytics:export"
  | "ai:use"
  | "ai:view_history"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:manage_roles"
  | "user:view_all"
  | "category:create"
  | "category:read"
  | "category:update"
  | "category:delete";

// ==================== ROLE PERMISSIONS ====================

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  STUDENT: [
    "course:read",
    "course:enroll",
    "course:unenroll",
    "module:read",
    "lesson:read",
    "assignment:create",
    "assignment:read",
    "assignment:submit",
    "quiz:read",
    "quiz:take",
    "quiz:view_results",
    "discussion:create",
    "discussion:read",
    "live_session:read",
    "live_session:join",
    "notification:read",
    "notification:update_preferences",
    "certificate:view",
    "certificate:download",
    "payment:create",
    "payment:read",
    "content:read",
    "analytics:view_own",
    "ai:use",
    "ai:view_history",
    "user:read",
  ],
  TA: [
    "course:read",
    "course:view_enrollments",
    "module:read",
    "lesson:read",
    "assignment:read",
    "assignment:grade",
    "assignment:view_submissions",
    "quiz:read",
    "quiz:view_results",
    "discussion:create",
    "discussion:read",
    "discussion:moderate",
    "live_session:read",
    "live_session:join",
    "notification:read",
    "notification:update_preferences",
    "certificate:view",
    "content:read",
    "analytics:view_course",
    "ai:use",
    "ai:view_history",
    "user:read",
  ],
  INSTRUCTOR: [
    "course:create",
    "course:read",
    "course:update",
    "course:publish",
    "course:archive",
    "course:view_enrollments",
    "course:view_analytics",
    "course:export_data",
    "module:create",
    "module:read",
    "module:update",
    "module:delete",
    "lesson:create",
    "lesson:read",
    "lesson:update",
    "lesson:delete",
    "lesson:publish",
    "assignment:create",
    "assignment:read",
    "assignment:update",
    "assignment:delete",
    "assignment:grade",
    "assignment:view_submissions",
    "quiz:create",
    "quiz:read",
    "quiz:update",
    "quiz:delete",
    "quiz:view_results",
    "discussion:create",
    "discussion:read",
    "discussion:update",
    "discussion:delete",
    "discussion:moderate",
    "discussion:pin",
    "discussion:lock",
    "live_session:create",
    "live_session:read",
    "live_session:update",
    "live_session:delete",
    "live_session:host",
    "notification:read",
    "notification:update_preferences",
    "certificate:issue",
    "certificate:view",
    "certificate:download",
    "content:create",
    "content:read",
    "content:update",
    "content:delete",
    "rubric:create",
    "rubric:read",
    "rubric:update",
    "rubric:delete",
    "analytics:view_course",
    "analytics:export",
    "ai:use",
    "ai:view_history",
    "user:read",
  ],
  ADMIN: [
    "course:create",
    "course:read",
    "course:update",
    "course:delete",
    "course:publish",
    "course:archive",
    "course:enroll",
    "course:unenroll",
    "course:view_enrollments",
    "course:view_analytics",
    "course:export_data",
    "module:create",
    "module:read",
    "module:update",
    "module:delete",
    "lesson:create",
    "lesson:read",
    "lesson:update",
    "lesson:delete",
    "lesson:publish",
    "assignment:create",
    "assignment:read",
    "assignment:update",
    "assignment:delete",
    "assignment:submit",
    "assignment:grade",
    "assignment:view_submissions",
    "quiz:create",
    "quiz:read",
    "quiz:update",
    "quiz:delete",
    "quiz:take",
    "quiz:view_results",
    "discussion:create",
    "discussion:read",
    "discussion:update",
    "discussion:delete",
    "discussion:moderate",
    "discussion:pin",
    "discussion:lock",
    "live_session:create",
    "live_session:read",
    "live_session:update",
    "live_session:delete",
    "live_session:host",
    "live_session:join",
    "notification:read",
    "notification:update_preferences",
    "certificate:issue",
    "certificate:revoke",
    "certificate:view",
    "certificate:download",
    "payment:create",
    "payment:read",
    "payment:refund",
    "payment:view_all",
    "content:create",
    "content:read",
    "content:update",
    "content:delete",
    "rubric:create",
    "rubric:read",
    "rubric:update",
    "rubric:delete",
    "analytics:view_own",
    "analytics:view_course",
    "analytics:view_all",
    "analytics:export",
    "ai:use",
    "ai:view_history",
    "user:read",
    "user:update",
    "user:delete",
    "user:manage_roles",
    "user:view_all",
    "category:create",
    "category:read",
    "category:update",
    "category:delete",
  ],
};

// ==================== PERMISSION CHECKS ====================

export function hasPermission(userRole: string, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) {
    return false;
  }
  return rolePermissions.includes(permission);
}

export function hasAllPermissions(
  userRole: string,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(userRole, permission));
}

export function hasAnyPermission(
  userRole: string,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(userRole, permission));
}

export function getUserPermissions(userRole: string): Permission[] {
  return ROLE_PERMISSIONS[userRole] ?? [];
}

// ==================== COURSE PERMISSION CHECKS ====================

export async function canAccessCourse(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, isPublished: true, status: true },
  });

  if (!course) {
    return false;
  }

  if (userRole === "INSTRUCTOR" && course.instructorId === userId) {
    return true;
  }

  if (userRole === "TA") {
    const isEnrolled = await prisma.courseEnrollment.findFirst({
      where: {
        courseId,
        userId,
        status: "ACTIVE",
      },
    });
    return isEnrolled !== null;
  }

  if (userRole === "STUDENT") {
    if (!course.isPublished) {
      return false;
    }

    const isEnrolled = await prisma.courseEnrollment.findFirst({
      where: {
        courseId,
        userId,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
    });
    return isEnrolled !== null;
  }

  return false;
}

export async function isCourseInstructor(
  userId: string,
  courseId: string
): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  return course?.instructorId === userId;
}

export async function isCourseEnrolled(
  userId: string,
  courseId: string
): Promise<boolean> {
  const enrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId,
      courseId,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
  });

  return enrollment !== null;
}

export async function canEnrollInCourse(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole !== "STUDENT") {
    return false;
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      isPublished: true,
      maxEnrollments: true,
      price: true,
      _count: { select: { enrollments: true } },
    },
  });

  if (!course || !course.isPublished) {
    return false;
  }

  if (
    course.maxEnrollments &&
    course._count.enrollments >= course.maxEnrollments
  ) {
    return false;
  }

  const existingEnrollment = await prisma.courseEnrollment.findFirst({
    where: {
      userId,
      courseId,
      status: { not: "DROPPED" },
    },
  });

  return existingEnrollment === null;
}

export async function canEditCourseContent(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  return false;
}

export async function canGradeInCourse(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  if (userRole === "TA") {
    const isEnrolled = await prisma.courseEnrollment.findFirst({
      where: {
        courseId,
        userId,
        status: "ACTIVE",
      },
    });
    return isEnrolled !== null;
  }

  return false;
}

// ==================== ENROLLMENT PERMISSION CHECKS ====================

export async function canViewEnrollments(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  if (userRole === "TA") {
    return canGradeInCourse(userId, courseId, userRole);
  }

  return false;
}

export async function canManageEnrollment(
  userId: string,
  courseId: string,
  enrollmentUserId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  if (userId === enrollmentUserId) {
    return true;
  }

  return false;
}

// ==================== ASSIGNMENT PERMISSION CHECKS ====================

export async function canSubmitAssignment(
  userId: string,
  assignmentId: string,
  userRole: string
): Promise<boolean> {
  if (userRole !== "STUDENT") {
    return false;
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      courseId: true,
      isPublished: true,
      dueDate: true,
    },
  });

  if (!assignment || !assignment.isPublished) {
    return false;
  }

  const isEnrolled = await isCourseEnrolled(userId, assignment.courseId);
  if (!isEnrolled) {
    return false;
  }

  if (assignment.dueDate && new Date() > assignment.dueDate) {
    const course = await prisma.course.findUnique({
      where: { id: assignment.courseId },
      select: { instructorId: true },
    });

    if (course?.instructorId !== userId) {
      return false;
    }
  }

  return true;
}

export async function canGradeAssignment(
  userId: string,
  assignmentId: string,
  userRole: string
): Promise<boolean> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { courseId: true },
  });

  if (!assignment) {
    return false;
  }

  return canGradeInCourse(userId, assignment.courseId, userRole);
}

// ==================== QUIZ PERMISSION CHECKS ====================

export async function canTakeQuiz(
  userId: string,
  quizId: string,
  userRole: string
): Promise<boolean> {
  if (userRole !== "STUDENT") {
    return false;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: {
      courseId: true,
      isPublished: true,
    },
  });

  if (!quiz || !quiz.isPublished) {
    return false;
  }

  return isCourseEnrolled(userId, quiz.courseId);
}

export async function canViewQuizResults(
  userId: string,
  quizId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { courseId: true },
  });

  if (!quiz) {
    return false;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, quiz.courseId);
  }

  if (userRole === "STUDENT") {
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        quizId,
        userId,
      },
    });
    return attempt !== null;
  }

  return false;
}

// ==================== DISCUSSION PERMISSION CHECKS ====================

export async function canModerateDiscussion(
  userId: string,
  discussionId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: { courseId: true },
  });

  if (!discussion) {
    return false;
  }

  return canGradeInCourse(userId, discussion.courseId, userRole);
}

export async function canPostInDiscussion(
  userId: string,
  discussionId: string,
  userRole: string
): Promise<boolean> {
  const discussion = await prisma.discussion.findUnique({
    where: { id: discussionId },
    select: { courseId: true, isLocked: true, status: true },
  });

  if (!discussion || discussion.isLocked || discussion.status !== "OPEN") {
    return false;
  }

  return canAccessCourse(userId, discussion.courseId, userRole);
}

// ==================== LIVE SESSION PERMISSION CHECKS ====================

export async function canHostLiveSession(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  return false;
}

export async function canJoinLiveSession(
  userId: string,
  sessionId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const session = await prisma.liveSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true, hostId: true, maxParticipants: true },
  });

  if (!session) {
    return false;
  }

  if (session.hostId === userId) {
    return true;
  }

  return canAccessCourse(userId, session.courseId, userRole);
}

// ==================== CERTIFICATE PERMISSION CHECKS ====================

export async function canIssueCertificate(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  return false;
}

export async function canRevokeCertificate(
  userId: string,
  certificateId: string,
  userRole: string
): Promise<boolean> {
  if (userRole !== "ADMIN") {
    return false;
  }

  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: { courseId: true },
  });

  return certificate !== null;
}

// ==================== PAYMENT PERMISSION CHECKS ====================

export async function canViewPayment(
  userId: string,
  paymentId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { userId: true },
  });

  return payment?.userId === userId;
}

export async function canRefundPayment(
  userId: string,
  paymentId: string,
  userRole: string
): Promise<boolean> {
  if (userRole !== "ADMIN") {
    return false;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { status: true },
  });

  return payment?.status === "COMPLETED";
}

// ==================== ANALYTICS PERMISSION CHECKS ====================

export async function canViewCourseAnalytics(
  userId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userRole === "INSTRUCTOR") {
    return isCourseInstructor(userId, courseId);
  }

  return false;
}

export async function canViewStudentAnalytics(
  userId: string,
  studentId: string,
  courseId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  if (userId === studentId) {
    return true;
  }

  if (userRole === "INSTRUCTOR" || userRole === "TA") {
    return canGradeInCourse(userId, courseId, userRole);
  }

  return false;
}

// ==================== USER MANAGEMENT PERMISSION CHECKS ====================

export function canManageUser(
  currentUserRole: string,
  targetUserRole: string
): boolean {
  if (currentUserRole !== "ADMIN") {
    return false;
  }

  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const targetLevel = ROLE_HIERARCHY[targetUserRole] ?? 0;

  return currentLevel > targetLevel;
}

export function canChangeUserRole(
  currentUserRole: string,
  newRole: string
): boolean {
  if (currentUserRole !== "ADMIN") {
    return false;
  }

  const currentLevel = ROLE_HIERARCHY[currentUserRole] ?? 0;
  const newLevel = ROLE_HIERARCHY[newRole] ?? 0;

  return currentLevel >= newLevel;
}

// ==================== CONTENT PERMISSION CHECKS ====================

export async function canAccessContent(
  userId: string,
  contentId: string,
  userRole: string
): Promise<boolean> {
  if (userRole === "ADMIN") {
    return true;
  }

  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { uploadedById: true },
  });

  if (!content) {
    return false;
  }

  if (content.uploadedById === userId) {
    return true;
  }

  return userRole === "INSTRUCTOR" || userRole === "TA";
}

// ==================== PERMISSION MATRIX ====================

export function getPermissionMatrix(): Record<string, Record<string, boolean>> {
  const matrix: Record<string, Record<string, boolean>> = {};

  for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
    matrix[role] = {};
    for (const permission of permissions) {
      matrix[role][permission] = true;
    }
  }

  return matrix;
}

export function getRoleComparison(
  role1: string,
  role2: string
): {
  level1: number;
  level2: number;
  isHigher: boolean;
  isLower: boolean;
  isEqual: boolean;
} {
  const level1 = ROLE_HIERARCHY[role1] ?? -1;
  const level2 = ROLE_HIERARCHY[role2] ?? -1;

  return {
    level1,
    level2,
    isHigher: level1 > level2,
    isLower: level1 < level2,
    isEqual: level1 === level2,
  };
}
