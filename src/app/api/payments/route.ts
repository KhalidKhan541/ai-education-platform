import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { paymentSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
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
    const status = searchParams.get("status");
    const courseId = searchParams.get("courseId");

    const where: Record<string, unknown> = {};

    if (session.user.role === "ADMIN") {
      if (searchParams.get("all") === "true") {
        // Admin can see all payments
      } else {
        where.userId = session.user.id;
      }
    } else {
      where.userId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return paginatedResponse(payments, total, page, limit);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return serverErrorResponse("Failed to fetch payments");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = validateRequest(paymentSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { courseId, paymentMethod } = validation.data;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        price: true,
        isPublished: true,
        instructorId: true,
      },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    if (!course.isPublished) {
      return errorResponse("This course is not available for purchase");
    }

    if (course.price <= 0) {
      return errorResponse("This course is free and does not require payment");
    }

    if (course.instructorId === session.user.id) {
      return errorResponse("Instructors cannot purchase their own courses");
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: { in: ["PENDING", "COMPLETED"] },
      },
    });

    if (existingPayment?.status === "COMPLETED") {
      return errorResponse("You have already purchased this course");
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return errorResponse("You are already enrolled in this course");
    }

    let payment;

    if (existingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          method: paymentMethod,
          amount: course.price,
        },
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          courseId,
          amount: course.price,
          method: paymentMethod,
          status: "PENDING",
        },
      });
    }

    const simulatePaymentSuccess = true;

    if (simulatePaymentSuccess) {
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          transactionId: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          completedAt: new Date(),
        },
      });

      await prisma.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          status: "ACTIVE",
          paymentId: payment.id,
        },
      });

      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: "PAYMENT_SUCCESS",
          title: "Payment Successful",
          message: `Your payment for "${course.title}" has been processed. You are now enrolled!`,
          metadata: JSON.stringify({
            paymentId: payment.id,
            courseId,
            amount: course.price,
          }),
        },
      });
    }

    return successResponse(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          transactionId: payment.transactionId,
          completedAt: payment.completedAt,
        },
        course: {
          id: course.id,
          title: course.title,
        },
        message: simulatePaymentSuccess
          ? "Payment processed and enrollment complete"
          : "Payment initiated",
      },
      201
    );
  } catch (error) {
    console.error("Error processing payment:", error);
    return serverErrorResponse("Failed to process payment");
  }
}
