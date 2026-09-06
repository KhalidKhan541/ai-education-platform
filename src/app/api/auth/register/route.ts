import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { registerSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  conflictResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(registerSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { name, email, password, role } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return conflictResponse("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role ?? "STUDENT",
        emailVerified: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return successResponse(
      {
        user,
        message: "Account created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return serverErrorResponse("Failed to create account");
  }
}
