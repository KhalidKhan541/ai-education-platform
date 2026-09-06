import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { settingsSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        notifications: true,
        preferences: true,
      },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    return successResponse({
      ...user,
      notifications:
        typeof user.notifications === "string"
          ? JSON.parse(user.notifications)
          : user.notifications ?? {
              email: true,
              push: true,
              courseUpdates: true,
              assignmentReminders: true,
              discussionReplies: true,
              gradeNotifications: true,
            },
      preferences:
        typeof user.preferences === "string"
          ? JSON.parse(user.preferences)
          : user.preferences ?? {
              theme: "system",
              language: "en",
              timezone: "UTC",
              fontSize: "medium",
            },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return serverErrorResponse("Failed to fetch settings");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = validateRequest(settingsSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { name, email, bio, avatar, notifications, preferences } =
      validation.data;

    if (email && email !== session.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existingUser) {
        return errorResponse("This email is already in use");
      }
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.image = avatar;

    if (notifications) {
      const currentSettings = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { notifications: true },
      });

      const currentNotifications =
        typeof currentSettings?.notifications === "string"
          ? JSON.parse(currentSettings.notifications)
          : currentSettings?.notifications ?? {};

      updateData.notifications = JSON.stringify({
        ...currentNotifications,
        ...notifications,
      });
    }

    if (preferences) {
      const currentSettings = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { preferences: true },
      });

      const currentPreferences =
        typeof currentSettings?.preferences === "string"
          ? JSON.parse(currentSettings.preferences)
          : currentSettings?.preferences ?? {};

      updateData.preferences = JSON.stringify({
        ...currentPreferences,
        ...preferences,
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        role: true,
        notifications: true,
        preferences: true,
      },
    });

    return successResponse({
      ...updatedUser,
      notifications:
        typeof updatedUser.notifications === "string"
          ? JSON.parse(updatedUser.notifications)
          : updatedUser.notifications,
      preferences:
        typeof updatedUser.preferences === "string"
          ? JSON.parse(updatedUser.preferences)
          : updatedUser.preferences,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return serverErrorResponse("Failed to update settings");
  }
}
