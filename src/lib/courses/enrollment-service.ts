import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { Enrollment, EnrollmentStatus, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type EnrollmentWithCourse = Enrollment & {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    instructor: { id: string; name: string | null; image: string | null };
    _count: { lessons: number };
  };
  user: { id: string; name: string | null; email: string; image: string | null };
};

export interface EnrollInput {
  userId: string;
  courseId: string;
}

export interface BulkEnrollInput {
  userIds: string[];
  courseId: string;
}

export interface EnrollmentFilter {
  courseId?: string;
  userId?: string;
  status?: EnrollmentStatus;
  search?: string;
  enrolledAfter?: Date;
  enrolledBefore?: Date;
  sortBy?: "enrolledAt" | "completedAt" | "progress";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  courseId: string;
  position: number;
  joinedAt: Date;
  user: { id: string; name: string | null; email: string; image: string | null };
  status: "WAITING" | "NOTIFIED" | "ENROLLED" | "EXPIRED";
}

export interface EnrollmentAnalytics {
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  averageCompletionTime: number;
  enrollmentTrend: { date: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
  topCourses: { courseId: string; title: string; enrollments: number }[];
  retentionRate: number;
}

export interface PrerequisiteCheck {
  met: boolean;
  missing: { courseId: string; title: string }[];
}

// ── Service ────────────────────────────────────────────────────────────

export const EnrollmentService = {
  async enroll(input: EnrollInput): Promise<Enrollment> {
    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.userId } }),
      prisma.course.findUnique({
        where: { id: input.courseId },
        include: { _count: { select: { enrollments: true } } },
      }),
    ]);

    if (!user) throw new Error("User not found");
    if (!course) throw new Error("Course not found");
    if (!course.isPublished) throw new Error("Course is not published");

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: input.userId,
          courseId: input.courseId,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === "ACTIVE") {
        throw new Error("User is already enrolled in this course");
      }
      if (existingEnrollment.status === "DROPPED") {
        return prisma.enrollment.update({
          where: { id: existingEnrollment.id },
          data: { status: "ACTIVE", enrolledAt: new Date() },
        });
      }
    }

    if (course.maxStudents && course._count.enrollments >= course.maxStudents) {
      throw new Error("Course has reached maximum enrollment capacity");
    }

    const prerequisiteCheck = await checkPrerequisites(input.userId, input.courseId);
    if (!prerequisiteCheck.met) {
      throw new Error(
        `Prerequisites not met. Missing: ${prerequisiteCheck.missing.map((p) => p.title).join(", ")}`
      );
    }

    return prisma.enrollment.create({
      data: {
        id: generateId(),
        userId: input.userId,
        courseId: input.courseId,
        status: "ACTIVE",
        enrolledAt: new Date(),
      },
    });
  },

  async unenroll(userId: string, courseId: string): Promise<void> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) throw new Error("Enrollment not found");

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "DROPPED", droppedAt: new Date() },
    });
  },

  async getEnrollment(userId: string, courseId: string): Promise<EnrollmentWithCourse | null> {
    return prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, image: true } },
            _count: { select: { lessons: true } },
          },
        },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });
  },

  async getUserEnrollments(
    userId: string,
    status?: EnrollmentStatus
  ): Promise<EnrollmentWithCourse[]> {
    return prisma.enrollment.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, image: true } },
            _count: { select: { lessons: true } },
          },
        },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });
  },

  async list(filters: EnrollmentFilter = {}): Promise<{
    enrollments: EnrollmentWithCourse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.EnrollmentWhereInput = {};
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.enrolledAfter) where.enrolledAt = { gte: filters.enrolledAfter };
    if (filters.enrolledBefore) where.enrolledAt = { lte: filters.enrolledBefore };
    if (filters.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
        { course: { title: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const orderBy: Prisma.EnrollmentOrderByWithRelationInput = {};
    if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder ?? "desc";
    } else {
      orderBy.enrolledAt = "desc";
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          course: {
            include: {
              instructor: { select: { id: true, name: true, image: true } },
              _count: { select: { lessons: true } },
            },
          },
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.enrollment.count({ where }),
    ]);

    return { enrollments, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // ── Bulk Enrollment ────────────────────────────────────────────────

  async bulkEnroll(
    input: BulkEnrollInput
  ): Promise<{ enrolled: number; skipped: number; errors: string[] }> {
    const course = await prisma.course.findUnique({
      where: { id: input.courseId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course) throw new Error("Course not found");
    if (!course.isPublished) throw new Error("Course is not published");

    let enrolled = 0;
    let skipped = 0;
    const errors: string[] = [];

    const existingEnrollments = await prisma.enrollment.findMany({
      where: {
        userId: { in: input.userIds },
        courseId: input.courseId,
        status: "ACTIVE",
      },
      select: { userId: true },
    });
    const existingUserIds = new Set(existingEnrollments.map((e) => e.userId));

    const usersToEnroll = input.userIds.filter((uid) => !existingUserIds.has(uid));

    if (course.maxStudents) {
      const available = course.maxStudents - course._count.enrollments;
      if (usersToEnroll.length > available) {
        throw new Error(
          `Only ${available} spots available. ${usersToEnroll.length} users requested.`
        );
      }
    }

    const results = await prisma.$transaction(
      usersToEnroll.map((userId) =>
        prisma.enrollment
          .create({
            data: {
              id: generateId(),
              userId,
              courseId: input.courseId,
              status: "ACTIVE",
              enrolledAt: new Date(),
            },
          })
          .then(() => ({ userId, success: true }))
          .catch((err) => ({ userId, success: false, error: String(err) }))
      )
    );

    for (const result of results) {
      if (result.success) {
        enrolled++;
      } else {
        skipped++;
        errors.push(`User ${result.userId}: ${result.error}`);
      }
    }

    skipped += input.userIds.length - usersToEnroll.length;

    return { enrolled, skipped, errors };
  },

  // ── Waitlist ───────────────────────────────────────────────────────

  async joinWaitlist(userId: string, courseId: string): Promise<WaitlistEntry> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error("Course not found");

    const existing = await prisma.waitlist.findFirst({
      where: { userId, courseId, status: { not: "EXPIRED" } },
    });
    if (existing) throw new Error("Already on the waitlist");

    const maxPosition = await prisma.waitlist.findFirst({
      where: { courseId, status: "WAITING" },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return prisma.waitlist.create({
      data: {
        id: generateId(),
        userId,
        courseId,
        position: (maxPosition?.position ?? 0) + 1,
        status: "WAITING",
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }) as unknown as WaitlistEntry;
  },

  async getWaitlist(courseId: string): Promise<WaitlistEntry[]> {
    return prisma.waitlist.findMany({
      where: { courseId, status: { in: ["WAITING", "NOTIFIED"] } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { position: "asc" },
    }) as unknown as WaitlistEntry[];
  },

  async removeFromWaitlist(entryId: string): Promise<void> {
    await prisma.waitlist.update({
      where: { id: entryId },
      data: { status: "EXPIRED" },
    });
  },

  async processWaitlist(courseId: string): Promise<string[]> {
    const enrolledUserIds: string[] = [];
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { _count: { select: { enrollments: true } } },
    });
    if (!course || !course.maxStudents) return enrolledUserIds;

    const available = course.maxStudents - course._count.enrollments;
    if (available <= 0) return enrolledUserIds;

    const waitlist = await prisma.waitlist.findMany({
      where: { courseId, status: "WAITING" },
      orderBy: { position: "asc" },
      take: available,
    });

    for (const entry of waitlist) {
      try {
        await this.enroll({ userId: entry.userId, courseId });
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: { status: "ENROLLED" },
        });
        enrolledUserIds.push(entry.userId);
      } catch {
        await prisma.waitlist.update({
          where: { id: entry.id },
          data: { status: "NOTIFIED" },
        });
      }
    }

    return enrolledUserIds;
  },

  // ── Prerequisites ──────────────────────────────────────────────────

  async checkPrerequisites(
    userId: string,
    courseId: string
  ): Promise<PrerequisiteCheck> {
    return checkPrerequisites(userId, courseId);
  },

  // ── Analytics ──────────────────────────────────────────────────────

  async getAnalytics(courseId?: string): Promise<EnrollmentAnalytics> {
    const where: Prisma.EnrollmentWhereInput = courseId ? { courseId } : {};

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      droppedEnrollments,
      statusCounts,
      enrollmentTrend,
      topCourses,
      allEnrollments,
    ] = await Promise.all([
      prisma.enrollment.count({ where }),
      prisma.enrollment.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { ...where, status: "COMPLETED" } }),
      prisma.enrollment.count({ where: { ...where, status: "DROPPED" } }),
      prisma.enrollment.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.enrollment.groupBy({
        by: ["enrolledAt"],
        where: { ...where, enrolledAt: { gte: thirtyDaysAgo } },
        _count: true,
        orderBy: { enrolledAt: "asc" },
      }),
      prisma.enrollment.groupBy({
        by: ["courseId"],
        where,
        _count: true,
        orderBy: { _count: { courseId: "desc" } },
        take: 5,
      }),
      prisma.enrollment.findMany({
        where,
        select: { enrolledAt: true, completedAt: true },
      }),
    ]);

    const avgCompletionTime =
      allEnrollments
        .filter((e) => e.completedAt)
        .reduce((acc, e) => {
          const diff =
            (e.completedAt!.getTime() - e.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
          return acc + diff;
        }, 0) / (completedEnrollments || 1);

    const retentionRate =
      totalEnrollments > 0
        ? ((totalEnrollments - droppedEnrollments) / totalEnrollments) * 100
        : 0;

    const topCourseIds = topCourses.map((c) => c.courseId);
    const courses = await prisma.course.findMany({
      where: { id: { in: topCourseIds } },
      select: { id: true, title: true },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c.title]));

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      droppedEnrollments,
      averageCompletionTime: Math.round(avgCompletionTime),
      enrollmentTrend: enrollmentTrend.map((e) => ({
        date: e.enrolledAt.toISOString().split("T")[0],
        count: e._count,
      })),
      statusBreakdown: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      topCourses: topCourses.map((c) => ({
        courseId: c.courseId,
        title: courseMap.get(c.courseId) ?? "Unknown",
        enrollments: c._count,
      })),
      retentionRate,
    };
  },

  async completeEnrollment(userId: string, courseId: string): Promise<Enrollment> {
    return prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

async function checkPrerequisites(
  userId: string,
  courseId: string
): Promise<PrerequisiteCheck> {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const prerequisites = (course.prerequisites as string[]) ?? [];
  if (prerequisites.length === 0) return { met: true, missing: [] };

  const completedEnrollments = await prisma.enrollment.findMany({
    where: {
      userId,
      status: "COMPLETED",
      course: { id: { in: prerequisites } },
    },
    include: { course: { select: { id: true, title: true } } },
  });

  const completedIds = new Set(completedEnrollments.map((e) => e.courseId));
  const missing = prerequisites
    .filter((prereqId) => !completedIds.has(prereqId))
    .map((prereqId) => ({ courseId: prereqId, title: "Course" }));

  if (missing.length > 0) {
    const missingCourses = await prisma.course.findMany({
      where: { id: { in: missing.map((m) => m.courseId) } },
      select: { id: true, title: true },
    });
    const titleMap = new Map(missingCourses.map((c) => [c.id, c.title]));
    missing.forEach((m) => {
      m.title = titleMap.get(m.courseId) ?? "Unknown Course";
    });
  }

  return { met: missing.length === 0, missing };
}

export default EnrollmentService;
