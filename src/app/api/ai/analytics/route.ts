import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "overview";
    const courseId = searchParams.get("courseId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    if (type === "overview") {
      const whereBase: Record<string, unknown> = {};
      if (courseId) whereBase.courseId = courseId;

      const enrollments = await prisma.enrollment.findMany({
        where: {
          ...whereBase,
          ...(hasDateFilter ? { enrolledAt: dateFilter } : {}),
        },
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          completedAt: true,
        },
      });

      const totalEnrollments = enrollments.length;
      const activeEnrollments = enrollments.filter(
        (e) => e.status === "ACTIVE"
      ).length;
      const completedEnrollments = enrollments.filter(
        (e) => e.status === "COMPLETED"
      ).length;

      const avgCompletionTime =
        completedEnrollments > 0
          ? enrollments
              .filter((e) => e.completedAt)
              .reduce((sum, e) => {
                const diff =
                  new Date(e.completedAt!).getTime() -
                  new Date(e.enrolledAt).getTime();
                return sum + diff / (1000 * 60 * 60 * 24);
              }, 0) / completedEnrollments
          : 0;

      const discussions = await prisma.discussion.findMany({
        where: {
          ...whereBase,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: { id: true },
      });

      const replies = await prisma.reply.findMany({
        where: {
          discussion: whereBase,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: { id: true },
      });

      return successResponse({
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments,
          completed: completedEnrollments,
          completionRate:
            totalEnrollments > 0
              ? Math.round((completedEnrollments / totalEnrollments) * 100)
              : 0,
          avgCompletionDays: Math.round(avgCompletionTime),
        },
        engagement: {
          discussions: discussions.length,
          replies: replies.length,
          avgRepliesPerDiscussion:
            discussions.length > 0
              ? Math.round((replies.length / discussions.length) * 10) / 10
              : 0,
        },
        period: {
          start: startDate ?? "all-time",
          end: endDate ?? "now",
        },
      });
    }

    if (type === "learning-paths") {
      const enrollments = await prisma.enrollment.findMany({
        where: {
          ...(courseId ? { courseId } : {}),
          userId: isInstructor ? undefined : session.user.id,
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              level: true,
            },
          },
          progress: {
            select: {
              completed: true,
              score: true,
              timeSpentSeconds: true,
            },
          },
        },
      });

      const pathAnalysis = enrollments.map((enrollment) => {
        const totalLessons = enrollment.progress.length;
        const completedLessons = enrollment.progress.filter(
          (p) => p.completed
        ).length;
        const avgScore =
          enrollment.progress.filter((p) => p.score !== null).length > 0
            ? enrollment.progress
                .filter((p) => p.score !== null)
                .reduce((sum, p) => sum + (p.score ?? 0), 0) /
              enrollment.progress.filter((p) => p.score !== null).length
            : 0;
        const totalTime = enrollment.progress.reduce(
          (sum, p) => sum + (p.timeSpentSeconds ?? 0),
          0
        );

        return {
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          category: enrollment.course.category,
          level: enrollment.course.level,
          progress: {
            totalLessons,
            completedLessons,
            percentage:
              totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0,
          },
          avgScore: Math.round(avgScore * 10) / 10,
          totalTimeMinutes: Math.round(totalTime / 60),
          status: enrollment.status,
        };
      });

      return successResponse({ learningPaths: pathAnalysis });
    }

    if (type === "performance") {
      const submissions = await prisma.submission.findMany({
        where: {
          ...(courseId
            ? { assignment: { courseId } }
            : {}),
          userId: isInstructor ? undefined : session.user.id,
          status: "GRADED",
          ...(hasDateFilter ? { gradedAt: dateFilter } : {}),
        },
        select: {
          score: true,
          gradedAt: true,
          assignment: {
            select: { title: true, maxScore: true },
          },
        },
        orderBy: { gradedAt: "desc" },
      });

      const quizAttempts = await prisma.quizAttempt.findMany({
        where: {
          ...(courseId
            ? { quiz: { courseId } }
            : {}),
          userId: isInstructor ? undefined : session.user.id,
          ...(hasDateFilter ? { completedAt: dateFilter } : {}),
        },
        select: {
          score: true,
          passed: true,
          completedAt: true,
          quiz: {
            select: { title: true, passingScore: true },
          },
        },
        orderBy: { completedAt: "desc" },
      });

      const assignmentScores = submissions.map((s) => s.score ?? 0);
      const quizScores = quizAttempts.map((a) => a.score);

      const avgAssignmentScore =
        assignmentScores.length > 0
          ? assignmentScores.reduce((a, b) => a + b, 0) /
            assignmentScores.length
          : 0;
      const avgQuizScore =
        quizScores.length > 0
          ? quizScores.reduce((a, b) => a + b, 0) / quizScores.length
          : 0;

      return successResponse({
        performance: {
          assignments: {
            total: submissions.length,
            avgScore: Math.round(avgAssignmentScore * 10) / 10,
            recentGrades: submissions.slice(0, 10).map((s) => ({
              title: s.assignment.title,
              score: s.score,
              maxScore: s.assignment.maxScore,
              gradedAt: s.gradedAt,
            })),
          },
          quizzes: {
            total: quizAttempts.length,
            avgScore: Math.round(avgQuizScore * 10) / 10,
            passRate:
              quizAttempts.length > 0
                ? Math.round(
                    (quizAttempts.filter((a) => a.passed).length /
                      quizAttempts.length) *
                      100
                  )
                : 0,
            recentAttempts: quizAttempts.slice(0, 10).map((a) => ({
              title: a.quiz.title,
              score: a.score,
              passed: a.passed,
              completedAt: a.completedAt,
            })),
          },
        },
      });
    }

    if (type === "ai-usage") {
      const interactions = await prisma.aIInteraction.findMany({
        where: {
          userId: session.user.id,
          ...(hasDateFilter ? { createdAt: dateFilter } : {}),
        },
        select: {
          type: true,
          createdAt: true,
        },
      });

      const typeCounts = interactions.reduce(
        (acc, i) => {
          acc[i.type] = (acc[i.type] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return successResponse({
        aiUsage: {
          totalInteractions: interactions.length,
          byType: typeCounts,
          avgInteractionsPerDay:
            interactions.length > 0
              ? Math.round(
                  (interactions.length /
                    Math.max(
                      1,
                      (Date.now() -
                        new Date(
                          interactions[interactions.length - 1]!.createdAt
                        ).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )) *
                    10
                ) / 10
              : 0,
        },
      });
    }

    return errorResponse("Invalid analytics type");
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return serverErrorResponse("Failed to fetch analytics");
  }
}
