import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { lessonSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; lessonId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id, lessonId } = await params;

    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = {
      id: lessonId,
      courseId: id,
    };

    if (!isInstructor) {
      where.isPublished = true;
    }

    const lesson = await prisma.lesson.findUnique({
      where,
      include: {
        module: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
        progress: session?.user
          ? {
              where: { userId: session.user.id },
              select: {
                completed: true,
                completedAt: true,
                timeSpentSeconds: true,
                score: true,
              },
            }
          : false,
        _count: {
          select: {
            progress: true,
          },
        },
      },
    });

    if (!lesson) {
      return notFoundResponse("Lesson not found");
    }

    if (!isInstructor && session?.user) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: id,
          },
        },
        select: { status: true },
      });

      if (!enrollment || enrollment.status !== "ACTIVE") {
        if (!lesson.isFree) {
          return errorResponse("You must be enrolled to access this lesson", 403);
        }
      }
    }

    const nextLesson = await prisma.lesson.findFirst({
      where: {
        courseId: id,
        moduleId: lesson.moduleId,
        isPublished: true,
        order: { gt: lesson.order },
      },
      orderBy: { order: "asc" },
      select: { id: true, title: true },
    });

    const prevLesson = await prisma.lesson.findFirst({
      where: {
        courseId: id,
        isPublished: true,
        order: { lt: lesson.order },
      },
      orderBy: { order: "desc" },
      select: { id: true, title: true },
    });

    return successResponse({
      ...lesson,
      nextLesson,
      prevLesson,
      resources: typeof lesson.resources === "string"
        ? JSON.parse(lesson.resources)
        : lesson.resources,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    return serverErrorResponse("Failed to fetch lesson");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can update lessons");
    }

    const { id, lessonId } = await params;
    const body = await request.json();

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId, courseId: id },
      include: { course: { select: { instructorId: true } } },
    });

    if (!existingLesson) {
      return notFoundResponse("Lesson not found");
    }

    if (
      existingLesson.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only update your own lessons");
    }

    const validation = validateRequest(lessonSchema.partial(), body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.resources) {
      updateData.resources = JSON.stringify(validation.data.resources);
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
      include: {
        module: {
          select: { id: true, title: true },
        },
      },
    });

    return successResponse(updatedLesson);
  } catch (error) {
    console.error("Error updating lesson:", error);
    return serverErrorResponse("Failed to update lesson");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can delete lessons");
    }

    const { id, lessonId } = await params;

    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId, courseId: id },
      include: {
        course: { select: { instructorId: true } },
        _count: { select: { progress: true } },
      },
    });

    if (!existingLesson) {
      return notFoundResponse("Lesson not found");
    }

    if (
      existingLesson.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only delete your own lessons");
    }

    if (existingLesson._count.progress > 0) {
      return errorResponse(
        "Cannot delete lesson with student progress. Archive it instead."
      );
    }

    await prisma.lesson.delete({ where: { id: lessonId } });

    return successResponse({ message: "Lesson deleted successfully" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    return serverErrorResponse("Failed to delete lesson");
  }
}
