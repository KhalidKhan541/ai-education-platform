import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  successResponse,
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

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            level: true,
            estimatedHours: true,
            instructor: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!certificate) {
      return notFoundResponse("Certificate not found");
    }

    if (
      certificate.userId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only view your own certificates");
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify/${certificate.certificateNumber}`;

    return successResponse({
      ...certificate,
      verificationUrl,
      metadata:
        typeof certificate.metadata === "string"
          ? JSON.parse(certificate.metadata)
          : certificate.metadata,
    });
  } catch (error) {
    console.error("Error fetching certificate:", error);
    return serverErrorResponse("Failed to fetch certificate");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only admins can revoke certificates");
    }

    const { id } = await params;

    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!certificate) {
      return notFoundResponse("Certificate not found");
    }

    await prisma.certificate.delete({ where: { id } });

    return successResponse({ message: "Certificate revoked successfully" });
  } catch (error) {
    console.error("Error revoking certificate:", error);
    return serverErrorResponse("Failed to revoke certificate");
  }
}
