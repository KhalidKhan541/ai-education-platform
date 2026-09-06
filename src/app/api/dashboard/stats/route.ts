import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const userId = session.user.id;
    const role = session.user.role;

    if (role === "STUDENT") {
      const [
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        totalProgress,
        recentSubmissions,
        pendingAssignments,
        quizAttempts,
        certificates,
        recentActivity,
      ] = await Promise.all([
        prisma.enrollment.count({
          where: { userId },
        }),
        prisma.enrollment.count({
          where: { userId, status: "ACTIVE" },
        }),
        prisma.enrollment.count({
          where: { userId, status: "COMPLETED" },
        }),
        prisma.progress.aggregate({
          where: {
            userId,
            completed: true,
          },
          _count: { id: true },
          _sum: { timeSpentSeconds: true },
          _avg: { score: true },
        }),
        prisma.submission.count({
          where: { userId, status: { in: ["SUBMITTED", "RESUBMITTED"] } },
        }),
        prisma.assignment.count({
          where: {
            isPublished: true,
            course: {
              enrollments: {
                some: { userId, status: "ACTIVE" },
              },
            },
            submissions: { none: { userId } },
          },
        }),
        prisma.quizAttempt.aggregate({
          where: { userId },
          _count: { id: true },
          _avg: { score: true },
        }),
        prisma.certificate.count({
          where: { userId },
        }),
        prisma.progress.findMany({
          where: { userId },
          orderBy: { completedAt: "desc" },
          take: 5,
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                course: { select: { id: true, title: true } },
              },
            },
          },
        }),
      ]);

      const avgScore = totalProgress._avg.score
        ? Math.round(totalProgress._avg.score * 10) / 10
        : 0;
      const totalHours = totalProgress._sum.timeSpentSeconds
        ? Math.round(totalProgress._sum.timeSpentSeconds / 3600 * 10) / 10
        : 0;

      return successResponse({
        student: {
          enrollments: {
            total: totalEnrollments,
            active: activeEnrollments,
            completed: completedEnrollments,
            completionRate:
              totalEnrollments > 0
                ? Math.round((completedEnrollments / totalEnrollments) * 100)
                : 0,
          },
          progress: {
            completedLessons: totalProgress._count.id,
            totalHoursStudied: totalHours,
            averageScore: avgScore,
          },
          assignments: {
            pending: pendingAssignments,
            submitted: recentSubmissions,
          },
          quizzes: {
            totalAttempts: quizAttempts._count.id,
            averageScore: quizAttempts._avg.score
              ? Math.round(quizAttempts._avg.score * 10) / 10
              : 0,
          },
          certificates: certificates,
          recentActivity: recentActivity.map((a) => ({
            id: a.id,
            lessonTitle: a.lesson.title,
            courseId: a.lesson.course.id,
            courseTitle: a.lesson.course.title,
            completedAt: a.completedAt,
            score: a.score,
          })),
        },
      });
    }

    if (role === "INSTRUCTOR") {
      const [
        totalCourses,
        publishedCourses,
        totalStudents,
        totalRevenue,
        recentEnrollments,
        courseStats,
        recentSubmissions,
      ] = await Promise.all([
        prisma.course.count({
          where: { instructorId: userId },
        }),
        prisma.course.count({
          where: { instructorId: userId, isPublished: true },
        }),
        prisma.enrollment.count({
          where: {
            course: { instructorId: userId },
            status: { in: ["ACTIVE", "COMPLETED"] },
          },
        }),
        prisma.payment.aggregate({
          where: {
            course: { instructorId: userId },
            status: "COMPLETED",
          },
          _sum: { amount: true },
        }),
        prisma.enrollment.findMany({
          where: {
            course: { instructorId: userId },
          },
          orderBy: { enrolledAt: "desc" },
          take: 5,
          include: {
            user: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, title: true } },
          },
        }),
        prisma.course.findMany({
          where: { instructorId: userId },
          select: {
            id: true,
            title: true,
            _count: {
              select: {
                enrollments: true,
                modules: true,
                lessons: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.submission.findMany({
          where: {
            assignment: { course: { instructorId: userId } },
            status: { in: ["SUBMITTED", "RESUBMITTED"] },
          },
          orderBy: { submittedAt: "desc" },
          take: 5,
          include: {
            user: { select: { id: true, name: true, email: true } },
            assignment: { select: { id: true, title: true, courseId: true } },
          },
        }),
      ]);

      return successResponse({
        instructor: {
          courses: {
            total: totalCourses,
            published: publishedCourses,
          },
          students: totalStudents,
          revenue: totalRevenue._sum.amount ?? 0,
          recentEnrollments: recentEnrollments.map((e) => ({
            id: e.id,
            userName: e.user.name,
            userEmail: e.user.email,
            courseTitle: e.course.title,
            enrolledAt: e.enrolledAt,
          })),
          courseStats: courseStats.map((c) => ({
            id: c.id,
            title: c.title,
            enrollments: c._count.enrollments,
            modules: c._count.modules,
            lessons: c._count.lessons,
          })),
          pendingReviews: recentSubmissions.length,
          recentSubmissions: recentSubmissions.map((s) => ({
            id: s.id,
            studentName: s.user.name,
            assignmentTitle: s.assignment.title,
            submittedAt: s.submittedAt,
          })),
        },
      });
    }

    if (role === "ADMIN") {
      const [
        totalUsers,
        totalCourses,
        totalEnrollments,
        totalRevenue,
        newUsersThisMonth,
        activeStudents,
        topCourses,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.course.count(),
        prisma.enrollment.count(),
        prisma.payment.aggregate({
          where: { status: "COMPLETED" },
          _sum: { amount: true },
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(1)),
            },
          },
        }),
        prisma.enrollment.count({
          where: {
            status: "ACTIVE",
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.course.findMany({
          select: {
            id: true,
            title: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: {
            enrollments: { _count: "desc" },
          },
          take: 5,
        }),
      ]);

      return successResponse({
        admin: {
          users: {
            total: totalUsers,
            newThisMonth: newUsersThisMonth,
          },
          courses: {
            total: totalCourses,
          },
          enrollments: {
            total: totalEnrollments,
            activeStudents,
          },
          revenue: totalRevenue._sum.amount ?? 0,
          topCourses: topCourses.map((c) => ({
            id: c.id,
            title: c.title,
            enrollments: c._count.enrollments,
          })),
        },
      });
    }

    return successResponse({});
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return serverErrorResponse("Failed to fetch dashboard statistics");
  }
}
