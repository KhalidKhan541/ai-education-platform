import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { progressUpdateSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; lessonId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, lessonId } = await params;
    const body = await request.json();

    const validation = validateRequest(progressUpdateSchema, {
      ...body,
      lessonId,
    });

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId, courseId: id },
      select: { id: true, isPublished: true },
    });

    if (!lesson) {
      return notFoundResponse("Lesson not found");
    }

    if (!lesson.isPublished) {
      return errorResponse("Cannot track progress for unpublished lessons");
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
      select: { id: true, status: true },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return errorResponse("You must be actively enrolled to track progress");
    }

    const existingProgress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
    });

    let progress;

    if (existingProgress) {
      progress = await prisma.progress.update({
        where: { id: existingProgress.id },
        data: {
          completed: validation.data.completed,
          completedAt: validation.data.completed ? new Date() : null,
          timeSpentSeconds: validation.data.timeSpentSeconds
            ? {
                increment: validation.data.timeSpentSeconds,
              }
            : undefined,
          score: validation.data.score,
        },
      });
    } else {
      progress = await prisma.progress.create({
        data: {
          userId: session.user.id,
          lessonId,
          enrollmentId: enrollment.id,
          completed: validation.data.completed,
          completedAt: validation.data.completed ? new Date() : null,
          timeSpentSeconds: validation.data.timeSpentSeconds ?? 0,
          score: validation.data.score,
        },
      });
    }

    const totalLessons = await prisma.lesson.count({
      where: { courseId: id, isPublished: true },
    });

    const completedLessons = await prisma.progress.count({
      where: {
        userId: session.user.id,
        completed: true,
        lesson: { courseId: id, isPublished: true },
      },
    });

    const courseProgress = totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

    if (courseProgress === 100) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    return successResponse({
      progress,
      courseProgress: {
        completedLessons,
        totalLessons,
        percentage: courseProgress,
      },
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return serverErrorResponse("Failed to update progress");
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, lessonId } = await params;

    const progress = await prisma.progress.findUnique({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId,
        },
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            type: true,
            durationMinutes: true,
          },
        },
      },
    });

    if (!progress) {
      return successResponse({
        completed: false,
        timeSpentSeconds: 0,
        score: null,
      });
    }

    return successResponse(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return serverErrorResponse("Failed to fetch progress");
  }
}
