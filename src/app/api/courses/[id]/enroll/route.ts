import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  conflictResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const course = await prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        isPublished: true,
        price: true,
        maxEnrollments: true,
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    if (!course.isPublished) {
      return errorResponse("This course is not yet available for enrollment");
    }

    if (
      course.maxEnrollments &&
      course._count.enrollments >= course.maxEnrollments
    ) {
      return errorResponse("This course has reached its maximum enrollment capacity");
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
    });

    if (existingEnrollment) {
      if (existingEnrollment.status === "ACTIVE") {
        return conflictResponse("You are already enrolled in this course");
      }
      if (existingEnrollment.status === "COMPLETED") {
        return conflictResponse("You have already completed this course");
      }

      const reactivated = await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: { status: "ACTIVE", enrolledAt: new Date() },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              price: true,
            },
          },
        },
      });

      return successResponse({
        enrollment: reactivated,
        message: "Enrollment reactivated successfully",
      });
    }

    if (course.price > 0) {
      const payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          courseId: id,
          amount: course.price,
          status: "PENDING",
          method: "STRIPE",
        },
      });

      return successResponse({
        requiresPayment: true,
        paymentId: payment.id,
        amount: course.price,
        message: "Payment required to enroll in this course",
      });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: session.user.id,
        courseId: id,
        status: "ACTIVE",
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
    });

    return successResponse(
      {
        enrollment,
        message: "Successfully enrolled in the course",
      },
      201
    );
  } catch (error) {
    console.error("Error enrolling in course:", error);
    return serverErrorResponse("Failed to enroll in course");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
    });

    if (!enrollment) {
      return notFoundResponse("Enrollment not found");
    }

    if (enrollment.status === "COMPLETED") {
      return errorResponse("Cannot unenroll from a completed course");
    }

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "DROPPED" },
    });

    return successResponse({ message: "Successfully unenrolled from the course" });
  } catch (error) {
    console.error("Error unenrolling from course:", error);
    return serverErrorResponse("Failed to unenroll from course");
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            description: true,
            instructor: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        progress: {
          select: {
            lessonId: true,
            completed: true,
            completedAt: true,
          },
        },
      },
    });

    if (!enrollment) {
      return notFoundResponse("You are not enrolled in this course");
    }

    return successResponse(enrollment);
  } catch (error) {
    console.error("Error fetching enrollment:", error);
    return serverErrorResponse("Failed to fetch enrollment");
  }
}
