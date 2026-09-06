import { Prisma, PrismaClient } from "@prisma/client";

// ==================== PRISMA SINGLETON ====================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// ==================== SOFT DELETE MIDDLEWARE ====================

type SoftDeletableModel = "User" | "Course" | "CourseModule" | "Lesson" | "Assignment" | "Quiz" | "Discussion" | "DiscussionPost" | "DiscussionReply" | "Content" | "AIConversation";

const softDeleteModels: SoftDeletableModel[] = [
  "User",
  "Course",
  "CourseModule",
  "Lesson",
  "Assignment",
  "Quiz",
  "Discussion",
  "DiscussionPost",
  "DiscussionReply",
  "Content",
  "AIConversation",
];

prisma.$use(async (params, next) => {
  const { action, model } = params;

  if (model && softDeleteModels.includes(model as SoftDeletableModel)) {
    if (action === "findUnique" || action === "findFirst") {
      params.args.where = {
        ...params.args.where,
        deletedAt: null,
      };
    }

    if (action === "findMany") {
      if (!params.args.where) {
        params.args.where = {};
      }
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    if (action === "delete") {
      params.action = "update";
      params.args = {
        ...params.args,
        data: { deletedAt: new Date() },
      };
    }

    if (action === "deleteMany") {
      params.action = "updateMany";
      if (!params.args.data) {
        params.args.data = {};
      }
      params.args.data = {
        ...params.args.data,
        deletedAt: new Date(),
      };
    }
  }

  return next(params);
});

// ==================== PAGINATION ====================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function paginate<T>(
  model: { findMany: (args: Prisma.Args<T, "findMany">) => Promise<T[]>; count: (args: Prisma.Args<T, "count">) => Promise<number> },
  options: PaginationOptions = {},
  where?: Prisma.Args<T, "findMany">["where"],
  include?: Prisma.Args<T, "findMany">["include"],
  select?: Prisma.Args<T, "findMany">["select"]
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = options;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      } as Prisma.Args<T, "findMany">["orderBy"],
    } as Prisma.Args<T, "findMany">),
    model.count({ where } as Prisma.Args<T, "count">),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

// ==================== TRANSACTION HELPERS ====================

export async function transaction<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    return fn(tx as PrismaClient);
  });
}

export async function transactionWithRetry<T>(
  fn: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await transaction(fn);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

// ==================== QUERY HELPERS ====================

export async function findUniqueOrThrow<T>(
  model: { findUnique: (args: { where: Record<string, unknown> }) => Promise<T | null> },
  where: Record<string, unknown>,
  errorMessage?: string
): Promise<T> {
  const result = await model.findUnique({ where });
  if (!result) {
    throw new Error(errorMessage ?? `Record not found`);
  }
  return result;
}

export async function upsert<T>(
  model: {
    upsert: (args: {
      where: Record<string, unknown>;
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<T>;
  },
  where: Record<string, unknown>,
  create: Record<string, unknown>,
  update: Record<string, unknown>
): Promise<T> {
  return model.upsert({ where, create, update });
}

// ==================== DATABASE HEALTH CHECK ====================

export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  latency: number;
  timestamp: string;
}> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;

    return {
      status: "healthy",
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }
}

// ==================== SEED HELPER ====================

export async function seedDatabase<T>(
  model: {
    create: (args: { data: T }) => Promise<unknown>;
    count: () => Promise<number>;
  },
  data: T[],
  options?: { skipIfNotEmpty?: boolean }
): Promise<{ created: number; skipped: boolean }> {
  if (options?.skipIfNotEmpty) {
    const count = await model.count();
    if (count > 0) {
      return { created: 0, skipped: true };
    }
  }

  let created = 0;
  for (const item of data) {
    try {
      await model.create({ data: item });
      created++;
    } catch (error) {
      console.error(`Failed to seed record:`, error);
    }
  }

  return { created, skipped: false };
}

// ==================== EXPORTS ====================

export { Prisma };
export type { PrismaClient };
