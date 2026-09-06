import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  paginatedResponse,
  serverErrorResponse,
} from "@/lib/responses";

function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const courseId = searchParams.get("courseId");

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };

    if (courseId) {
      where.courseId = courseId;
    }

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              instructor: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.certificate.count({ where }),
    ]);

    return paginatedResponse(certificates, total, page, limit);
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return serverErrorResponse("Failed to fetch certificates");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { courseId } = body;

    if (!courseId) {
      return errorResponse("courseId is required");
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            instructor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      return notFoundResponse("You are not enrolled in this course");
    }

    if (enrollment.status !== "COMPLETED") {
      return errorResponse(
        "You must complete the course before receiving a certificate"
      );
    }

    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId,
        },
      },
    });

    if (existingCertificate) {
      return successResponse({
        certificate: existingCertificate,
        message: "Certificate already exists",
      });
    }

    const progress = await prisma.progress.findMany({
      where: {
        userId: session.user.id,
        lesson: { courseId },
        completed: true,
      },
      select: { score: true },
    });

    const scoresWithValues = progress.filter((p) => p.score !== null);
    const avgScore =
      scoresWithValues.length > 0
        ? scoresWithValues.reduce((sum, p) => sum + (p.score ?? 0), 0) /
          scoresWithValues.length
        : 100;

    const certificate = await prisma.certificate.create({
      data: {
        userId: session.user.id,
        courseId,
        certificateNumber: generateCertificateNumber(),
        finalScore: Math.round(avgScore * 10) / 10,
        issuedAt: new Date(),
        metadata: JSON.stringify({
          totalLessons: progress.length,
          completedLessons: progress.length,
        }),
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            instructor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "CERTIFICATE_ISSUED",
        title: "Certificate Issued!",
        message: `Congratulations! You've earned a certificate for "${enrollment.course.title}".`,
        metadata: JSON.stringify({ certificateId: certificate.id, courseId }),
      },
    });

    return successResponse(
      {
        certificate,
        message: "Certificate issued successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating certificate:", error);
    return serverErrorResponse("Failed to create certificate");
  }
}
