import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
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
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnail: true,
            instructor: {
              select: { id: true, name: true },
            },
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
    });

    if (!payment) {
      return notFoundResponse("Payment not found");
    }

    if (
      payment.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only view your own payments");
    }

    return successResponse(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    return serverErrorResponse("Failed to fetch payment");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { action } = body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, price: true } },
      },
    });

    if (!payment) {
      return notFoundResponse("Payment not found");
    }

    if (
      payment.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only manage your own payments");
    }

    if (action === "refund") {
      if (payment.status !== "COMPLETED") {
        return errorResponse("Only completed payments can be refunded");
      }

      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: payment.userId,
            courseId: payment.courseId,
          },
        },
        select: { enrolledAt: true },
      });

      if (enrollment) {
        const hoursSinceEnrollment =
          (Date.now() - new Date(enrollment.enrolledAt).getTime()) /
          (1000 * 60 * 60);

        if (hoursSinceEnrollment > 30 * 24) {
          return errorResponse(
            "Refund window has expired (30-day policy)"
          );
        }
      }

      const updatedPayment = await prisma.payment.update({
        where: { id },
        data: {
          status: "REFUNDED",
          refundedAt: new Date(),
        },
      });

      await prisma.enrollment.updateMany({
        where: {
          userId: payment.userId,
          courseId: payment.courseId,
          paymentId: id,
        },
        data: { status: "REFUNDED" },
      });

      await prisma.notification.create({
        data: {
          userId: payment.userId,
          type: "PAYMENT_REFUND",
          title: "Payment Refunded",
          message: `Your payment of $${payment.amount} for "${payment.course.title}" has been refunded.`,
          metadata: JSON.stringify({
            paymentId: id,
            courseId: payment.courseId,
            amount: payment.amount,
          }),
        },
      });

      return successResponse({
        payment: updatedPayment,
        message: "Payment refunded successfully",
      });
    }

    if (action === "retry") {
      if (payment.status !== "FAILED") {
        return errorResponse("Only failed payments can be retried");
      }

      const updatedPayment = await prisma.payment.update({
        where: { id },
        data: {
          status: "PENDING",
          completedAt: null,
        },
      });

      return successResponse({
        payment: updatedPayment,
        message: "Payment retry initiated",
      });
    }

    return errorResponse("Invalid action. Use 'refund' or 'retry'");
  } catch (error) {
    console.error("Error managing payment:", error);
    return serverErrorResponse("Failed to manage payment");
  }
}
