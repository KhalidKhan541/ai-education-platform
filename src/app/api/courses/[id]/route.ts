import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { updateCourseSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
            bio: true,
          },
        },
        modules: {
          where: { isPublished: true },
          orderBy: { order: "asc" },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                type: true,
                durationMinutes: true,
                isFree: true,
                order: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            reviews: true,
          },
        },
      },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    const stats = await prisma.review.aggregate({
      where: { courseId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return successResponse({
      ...course,
      averageRating: stats._avg.rating ?? 0,
      totalReviews: stats._count.rating,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return serverErrorResponse("Failed to fetch course");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true },
    });

    if (!existingCourse) {
      return notFoundResponse("Course not found");
    }

    if (
      existingCourse.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only edit your own courses");
    }

    const body = await request.json();
    const validation = validateRequest(updateCourseSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };

    if (validation.data.tags) {
      updateData.tags = JSON.stringify(validation.data.tags);
    }
    if (validation.data.prerequisites) {
      updateData.prerequisites = JSON.stringify(validation.data.prerequisites);
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: updateData,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return successResponse(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    return serverErrorResponse("Failed to update course");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const existingCourse = await prisma.course.findUnique({
      where: { id },
      select: {
        instructorId: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!existingCourse) {
      return notFoundResponse("Course not found");
    }

    if (
      existingCourse.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only delete your own courses");
    }

    if (existingCourse._count.enrollments > 0) {
      return errorResponse(
        "Cannot delete course with active enrollments. Archive it instead."
      );
    }

    await prisma.course.delete({ where: { id } });

    return successResponse({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    return serverErrorResponse("Failed to delete course");
  }
}
