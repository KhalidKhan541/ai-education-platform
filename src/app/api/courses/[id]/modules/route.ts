import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { moduleSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  paginatedResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeUnpublished = searchParams.get("includeUnpublished") === "true";

    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = { courseId: id };

    if (!includeUnpublished || !isInstructor) {
      where.isPublished = true;
    }

    const modules = await prisma.module.findMany({
      where,
      orderBy: { order: "asc" },
      include: {
        lessons: {
          where: where.isPublished !== false ? { isPublished: true } : undefined,
          orderBy: { order: "asc" },
          select: {
            id: true,
            title: true,
            type: true,
            durationMinutes: true,
            isPublished: true,
            isFree: true,
            order: true,
          },
        },
        _count: {
          select: { lessons: true },
        },
      },
    });

    return successResponse(modules);
  } catch (error) {
    console.error("Error fetching modules:", error);
    return serverErrorResponse("Failed to fetch modules");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can create modules");
    }

    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return forbiddenResponse("You can only add modules to your own courses");
    }

    const body = await request.json();
    const validation = validateRequest(moduleSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const existingModules = await prisma.module.count({
      where: { courseId: id },
    });

    const module = await prisma.module.create({
      data: {
        ...validation.data,
        courseId: id,
        order: validation.data.order ?? existingModules,
      },
      include: {
        _count: { select: { lessons: true } },
      },
    });

    return successResponse(module, 201);
  } catch (error) {
    console.error("Error creating module:", error);
    return serverErrorResponse("Failed to create module");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can update modules");
    }

    const { id } = await params;
    const body = await request.json();
    const { moduleId, ...updateData } = body;

    if (!moduleId) {
      return errorResponse("moduleId is required");
    }

    const validation = validateRequest(moduleSchema.partial(), updateData);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { instructorId: true } } },
    });

    if (!existingModule) {
      return notFoundResponse("Module not found");
    }

    if (
      existingModule.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only update your own modules");
    }

    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data: validation.data,
      include: {
        _count: { select: { lessons: true } },
      },
    });

    return successResponse(updatedModule);
  } catch (error) {
    console.error("Error updating module:", error);
    return serverErrorResponse("Failed to update module");
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can delete modules");
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const moduleId = searchParams.get("moduleId");

    if (!moduleId) {
      return errorResponse("moduleId query parameter is required");
    }

    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: { select: { instructorId: true } },
        _count: { select: { lessons: true, enrollments: true } },
      },
    });

    if (!existingModule) {
      return notFoundResponse("Module not found");
    }

    if (
      existingModule.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only delete your own modules");
    }

    if (existingModule._count.enrollments > 0) {
      return errorResponse(
        "Cannot delete module with active enrollments. Archive it instead."
      );
    }

    await prisma.module.delete({ where: { id: moduleId } });

    return successResponse({ message: "Module deleted successfully" });
  } catch (error) {
    console.error("Error deleting module:", error);
    return serverErrorResponse("Failed to delete module");
  }
}
