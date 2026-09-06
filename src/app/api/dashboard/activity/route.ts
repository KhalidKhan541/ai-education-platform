import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
  unauthorizedResponse,
  paginatedResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const type = searchParams.get("type");

    const userId = session.user.id;
    const role = session.user.role;

    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: Date;
      metadata: unknown;
    }> = [];

    const [enrollments, submissions, quizAttempts, payments, certificates] =
      await Promise.all([
        prisma.enrollment.findMany({
          where: {
            ...(role === "STUDENT" ? { userId } : {}),
            ...(role === "INSTRUCTOR"
              ? { course: { instructorId: userId } }
              : {}),
          },
          orderBy: { enrolledAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true } },
            course: { select: { id: true, title: true } },
          },
        }),
        prisma.submission.findMany({
          where: {
            ...(role === "STUDENT" ? { userId } : {}),
            ...(role === "INSTRUCTOR"
              ? { assignment: { course: { instructorId: userId } } }
              : {}),
          },
          orderBy: { submittedAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true } },
            assignment: { select: { id: true, title: true } },
          },
        }),
        prisma.quizAttempt.findMany({
          where: {
            ...(role === "STUDENT" ? { userId } : {}),
            ...(role === "INSTRUCTOR"
              ? { quiz: { course: { instructorId: userId } } }
              : {}),
          },
          orderBy: { completedAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true } },
            quiz: { select: { id: true, title: true } },
          },
        }),
        role === "ADMIN"
          ? prisma.payment.findMany({
              orderBy: { createdAt: "desc" },
              take: 10,
              include: {
                user: { select: { id: true, name: true } },
                course: { select: { id: true, title: true } },
              },
            })
          : [],
        prisma.certificate.findMany({
          where: {
            ...(role === "STUDENT" ? { userId } : {}),
            ...(role === "INSTRUCTOR"
              ? { course: { instructorId: userId } }
              : {}),
          },
          orderBy: { issuedAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true } },
            course: { select: { id: true, title: true } },
          },
        }),
      ]);

    for (const enrollment of enrollments) {
      const isOwn = enrollment.userId === userId;
      notifications.push({
        id: `enrollment-${enrollment.id}`,
        type: "ENROLLMENT",
        title: isOwn ? `Enrolled in ${enrollment.course.title}` : `${enrollment.user.name} enrolled in ${enrollment.course.title}`,
        message: isOwn
          ? `You started learning ${enrollment.course.title}`
          : `${enrollment.user.name} joined ${enrollment.course.title}`,
        read: true,
        createdAt: enrollment.enrolledAt,
        metadata: {
          courseId: enrollment.course.id,
          userId: enrollment.userId,
        },
      });
    }

    for (const submission of submissions) {
      const isOwn = submission.userId === userId;
      notifications.push({
        id: `submission-${submission.id}`,
        type: "SUBMISSION",
        title: isOwn
          ? `Submitted: ${submission.assignment.title}`
          : `New submission from ${submission.user.name}`,
        message: isOwn
          ? `Your submission was received`
          : `${submission.user.name} submitted ${submission.assignment.title}`,
        read: submission.status !== "SUBMITTED" && submission.status !== "RESUBMITTED",
        createdAt: submission.submittedAt,
        metadata: {
          assignmentId: submission.assignment.id,
          userId: submission.userId,
        },
      });
    }

    for (const attempt of quizAttempts) {
      const isOwn = attempt.userId === userId;
      notifications.push({
        id: `quiz-${attempt.id}`,
        type: "QUIZ",
        title: isOwn
          ? `Quiz: ${attempt.quiz.title} - ${attempt.passed ? "Passed!" : "Not passed"}`
          : `${attempt.user.name} attempted ${attempt.quiz.title}`,
        message: isOwn
          ? `You scored ${Math.round(attempt.score)}%`
          : `${attempt.user.name} scored ${Math.round(attempt.score)}%`,
        read: true,
        createdAt: attempt.completedAt,
        metadata: {
          quizId: attempt.quiz.id,
          userId: attempt.userId,
          score: attempt.score,
          passed: attempt.passed,
        },
      });
    }

    for (const payment of payments) {
      notifications.push({
        id: `payment-${payment.id}`,
        type: "PAYMENT",
        title: `Payment: $${payment.amount} - ${payment.status}`,
        message: `${payment.user.name} paid $${payment.amount} for ${payment.course.title}`,
        read: payment.status === "COMPLETED",
        createdAt: payment.createdAt,
        metadata: {
          courseId: payment.course.id,
          userId: payment.userId,
          amount: payment.amount,
          status: payment.status,
        },
      });
    }

    for (const cert of certificates) {
      const isOwn = cert.userId === userId;
      notifications.push({
        id: `cert-${cert.id}`,
        type: "CERTIFICATE",
        title: isOwn
          ? `Certificate earned: ${cert.course.title}`
          : `${cert.user.name} earned certificate for ${cert.course.title}`,
        message: isOwn
          ? "Congratulations on completing the course!"
          : `${cert.user.name} completed ${cert.course.title}`,
        read: true,
        createdAt: cert.issuedAt,
        metadata: {
          courseId: cert.course.id,
          userId: cert.userId,
          certificateNumber: cert.certificateNumber,
        },
      });
    }

    notifications.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const filtered = type
      ? notifications.filter((n) => n.type === type)
      : notifications;

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return paginatedResponse(paginated, filtered.length, page, limit);
  } catch (error) {
    console.error("Error fetching activity:", error);
    return serverErrorResponse("Failed to fetch activity feed");
  }
}
