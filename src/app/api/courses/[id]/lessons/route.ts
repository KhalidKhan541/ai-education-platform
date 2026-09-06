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

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");
    const includeUnpublished = searchParams.get("includeUnpublished") === "true";

    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = { courseId: id };

    if (moduleId) {
      where.moduleId = moduleId;
    }

    if (!includeUnpublished || !isInstructor) {
      where.isPublished = true;
    }

    const lessons = await prisma.lesson.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            order: true,
          },
        },
        _count: {
          select: {
            progress: true,
          },
        },
      },
    });

    return successResponse(lessons);
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return serverErrorResponse("Failed to fetch lessons");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can create lessons");
    }

    const { id } = await params;
    const body = await request.json();
    const { moduleId, ...lessonData } = body;

    if (!moduleId) {
      return errorResponse("moduleId is required");
    }

    const validation = validateRequest(lessonSchema, lessonData);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return forbiddenResponse("You can only add lessons to your own courses");
    }

    const module = await prisma.module.findUnique({
      where: { id: moduleId, courseId: id },
    });

    if (!module) {
      return notFoundResponse("Module not found in this course");
    }

    const existingLessons = await prisma.lesson.count({
      where: { moduleId },
    });

    const lesson = await prisma.lesson.create({
      data: {
        ...validation.data,
        courseId: id,
        moduleId,
        order: validation.data.order ?? existingLessons,
        resources: JSON.stringify(validation.data.resources),
      },
      include: {
        module: {
          select: { id: true, title: true },
        },
      },
    });

    return successResponse(lesson, 201);
  } catch (error) {
    console.error("Error creating lesson:", error);
    return serverErrorResponse("Failed to create lesson");
  }
}
