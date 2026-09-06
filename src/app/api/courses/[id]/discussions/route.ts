import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { discussionSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  paginatedResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
    const search = searchParams.get("search") ?? "";
    const tag = searchParams.get("tag") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";

    const where: Record<string, unknown> = { courseId: id };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    const orderBy: Record<string, string> =
      sortBy === "replies"
        ? { replies: { _count: "desc" } }
        : sortBy === "votes"
          ? { votes: { _count: "desc" } }
          : sortBy === "pinned"
            ? { isPinned: "desc" }
            : { createdAt: "desc" };

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        orderBy: [
          { isPinned: "desc" },
          orderBy,
        ],
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
            select: {
              replies: true,
              votes: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.discussion.count({ where }),
    ]);

    const session = await getServerSession(authOptions);

    const enrichedDiscussions = await Promise.all(
      discussions.map(async (discussion) => {
        let userVote = null;
        if (session?.user) {
          const vote = await prisma.discussionVote.findUnique({
            where: {
              userId_discussionId: {
                userId: session.user.id,
                discussionId: discussion.id,
              },
            },
            select: { type: true },
          });
          userVote = vote?.type ?? null;
        }

        const lastReply = await prisma.reply.findFirst({
          where: { discussionId: discussion.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, image: true },
            },
          },
        });

        return {
          ...discussion,
          tags:
            typeof discussion.tags === "string"
              ? JSON.parse(discussion.tags)
              : discussion.tags,
          userVote,
          lastReply,
        };
      })
    );

    return paginatedResponse(enrichedDiscussions, total, page, limit);
  } catch (error) {
    console.error("Error fetching discussions:", error);
    return serverErrorResponse("Failed to fetch discussions");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await request.json();

    const validation = validateRequest(discussionSchema, body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
      select: { status: true },
    });

    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    if (!enrollment && !isInstructor) {
      return errorResponse("You must be enrolled to start discussions");
    }

    const discussion = await prisma.discussion.create({
      data: {
        ...validation.data,
        courseId: id,
        authorId: session.user.id,
        tags: JSON.stringify(validation.data.tags),
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
          select: {
            replies: true,
            votes: true,
          },
        },
      },
    });

    return successResponse(
      {
        ...discussion,
        tags: validation.data.tags,
        userVote: null,
        lastReply: null,
      },
      201
    );
  } catch (error) {
    console.error("Error creating discussion:", error);
    return serverErrorResponse("Failed to create discussion");
  }
}
