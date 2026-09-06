import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { replySchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; discussionId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id, discussionId } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, courseId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
                role: true,
              },
            },
            _count: {
              select: { votes: true },
            },
          },
        },
        votes: {
          select: {
            userId: true,
            type: true,
          },
        },
        _count: {
          select: {
            replies: true,
            votes: true,
          },
        },
      },
    });

    if (!discussion) {
      return notFoundResponse("Discussion not found");
    }

    const session = await getServerSession(authOptions);

    let userVote = null;
    if (session?.user) {
      const vote = await prisma.discussionVote.findUnique({
        where: {
          userId_discussionId: {
            userId: session.user.id,
            discussionId,
          },
        },
        select: { type: true },
      });
      userVote = vote?.type ?? null;
    }

    const upvotes = discussion.votes.filter((v) => v.type === "UP").length;
    const downvotes = discussion.votes.filter((v) => v.type === "DOWN").length;

    return successResponse({
      ...discussion,
      tags:
        typeof discussion.tags === "string"
          ? JSON.parse(discussion.tags)
          : discussion.tags,
      userVote,
      upvotes,
      downvotes,
      replies: discussion.replies.map((reply) => ({
        ...reply,
        votes: undefined,
        replyCount: reply._count.votes,
      })),
    });
  } catch (error) {
    console.error("Error fetching discussion:", error);
    return serverErrorResponse("Failed to fetch discussion");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, discussionId } = await params;
    const body = await request.json();

    const validation = validateRequest(replySchema, body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, courseId: id },
      select: { id: true, authorId: true },
    });

    if (!discussion) {
      return notFoundResponse("Discussion not found");
    }

    if (validation.data.parentReplyId) {
      const parentReply = await prisma.reply.findUnique({
        where: { id: validation.data.parentReplyId, discussionId },
        select: { id: true },
      });

      if (!parentReply) {
        return errorResponse("Parent reply not found in this discussion");
      }
    }

    const reply = await prisma.reply.create({
      data: {
        content: validation.data.content,
        discussionId,
        authorId: session.user.id,
        parentReplyId: validation.data.parentReplyId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
        _count: {
          select: { votes: true },
        },
      },
    });

    if (discussion.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: discussion.authorId,
          type: "DISCUSSION_REPLY",
          title: "New Reply to Your Discussion",
          message: `${session.user.name ?? "Someone"} replied to your discussion.`,
          metadata: JSON.stringify({
            discussionId,
            replyId: reply.id,
          }),
        },
      });
    }

    return successResponse(
      {
        ...reply,
        replyCount: reply._count.votes,
      },
      201
    );
  } catch (error) {
    console.error("Error creating reply:", error);
    return serverErrorResponse("Failed to create reply");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, discussionId } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, courseId: id },
      select: { authorId: true },
    });

    if (!discussion) {
      return notFoundResponse("Discussion not found");
    }

    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    if (action === "vote") {
      const { type } = data;
      if (!type || !["UP", "DOWN"].includes(type)) {
        return errorResponse("Vote type must be UP or DOWN");
      }

      const existingVote = await prisma.discussionVote.findUnique({
        where: {
          userId_discussionId: {
            userId: session.user.id,
            discussionId,
          },
        },
      });

      if (existingVote) {
        if (existingVote.type === type) {
          await prisma.discussionVote.delete({
            where: { id: existingVote.id },
          });
          return successResponse({ message: "Vote removed", userVote: null });
        }

        await prisma.discussionVote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        return successResponse({ message: "Vote updated", userVote: type });
      }

      await prisma.discussionVote.create({
        data: {
          userId: session.user.id,
          discussionId,
          type,
        },
      });

      return successResponse({ message: "Vote recorded", userVote: type }, 201);
    }

    if (action === "pin") {
      if (!isInstructor) {
        return forbiddenResponse("Only instructors can pin discussions");
      }

      await prisma.discussion.update({
        where: { id: discussionId },
        data: { isPinned: !data.isPinned },
      });

      return successResponse({ message: "Discussion pinned/unpinned" });
    }

    if (discussion.authorId !== session.user.id && !isInstructor) {
      return forbiddenResponse("You can only edit your own discussions");
    }

    const updateData: Record<string, unknown> = {};
    if (data.title) updateData.title = data.title;
    if (data.content) updateData.content = data.content;
    if (data.tags) updateData.tags = JSON.stringify(data.tags);

    const updatedDiscussion = await prisma.discussion.update({
      where: { id: discussionId },
      data: updateData,
    });

    return successResponse(updatedDiscussion);
  } catch (error) {
    console.error("Error updating discussion:", error);
    return serverErrorResponse("Failed to update discussion");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, discussionId } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { id: discussionId, courseId: id },
      include: {
        course: { select: { instructorId: true } },
      },
    });

    if (!discussion) {
      return notFoundResponse("Discussion not found");
    }

    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    if (discussion.authorId !== session.user.id && !isInstructor) {
      return forbiddenResponse("You can only delete your own discussions");
    }

    await prisma.discussion.delete({ where: { id: discussionId } });

    return successResponse({ message: "Discussion deleted successfully" });
  } catch (error) {
    console.error("Error deleting discussion:", error);
    return serverErrorResponse("Failed to delete discussion");
  }
}
