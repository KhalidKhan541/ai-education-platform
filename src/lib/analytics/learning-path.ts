import { PrismaClient, LearningPath, LearningPathNode, LearningPathProgress, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

export interface CreateLearningPathParams {
  title: string;
  description: string;
  thumbnail?: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  estimatedHours: number;
  tags?: string[];
  isPublished?: boolean;
  createdBy: string;
}

export interface LearningPathNodeData {
  courseId: string;
  order: number;
  isRequired: boolean;
  prerequisites?: string[];
  estimatedDuration?: number;
}

export interface LearningPathWithNodes extends LearningPath {
  nodes: (LearningPathNode & {
    course: {
      id: string;
      title: string;
      thumbnail: string | null;
      duration: number;
      difficulty: string;
    };
  })[];
  _count: {
    nodes: number;
    enrollments: number;
  };
}

export interface AdaptivePathRecommendation {
  pathId: string;
  pathTitle: string;
  reason: string;
  estimatedCompletionTime: number;
  matchScore: number;
  nodes: Array<{
    courseId: string;
    courseName: string;
    status: "recommended" | "optional" | "skip";
    reason: string;
  }>;
}

export interface PathProgressDetails {
  pathId: string;
  userId: string;
  currentNodeId: string | null;
  completedNodes: string[];
  totalNodes: number;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  startedAt: Date;
  lastAccessedAt: Date;
  completedAt: Date | null;
  streakDays: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export interface LearningPathFilters {
  difficulty?: string;
  tags?: string[];
  isPublished?: boolean;
  createdBy?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "popular" | "newest" | "rating" | "difficulty";
}

export interface PaginatedLearningPaths {
  paths: LearningPathWithNodes[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PathAnalytics {
  totalEnrollments: number;
  completionRate: number;
  averageTimeToComplete: number;
  averageRating: number;
  dropoffPoints: Array<{
    nodeId: string;
    courseName: string;
    dropoffRate: number;
  }>;
  enrollmentTrend: Array<{ date: string; count: number }>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    progress: number;
    completedAt: Date | null;
  }>;
}

const prisma = new PrismaClient();

export class LearningPathService {
  private static instance: LearningPathService;
  private constructor() {}

  static getInstance(): LearningPathService {
    if (!LearningPathService.instance) {
      LearningPathService.instance = new LearningPathService();
    }
    return LearningPathService.instance;
  }

  async createLearningPath(params: CreateLearningPathParams): Promise<LearningPath> {
    const slug = this.generateSlug(params.title);

    const existingSlug = await prisma.learningPath.findUnique({
      where: { slug },
    });

    const finalSlug = existingSlug ? `${slug}-${nanoid(6)}` : slug;

    return prisma.learningPath.create({
      data: {
        title: params.title,
        description: params.description,
        thumbnail: params.thumbnail,
        slug: finalSlug,
        difficulty: params.difficulty,
        estimatedHours: params.estimatedHours,
        tags: params.tags || [],
        isPublished: params.isPublished || false,
        createdBy: params.createdBy,
      },
    });
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async updateLearningPath(
    pathId: string,
    data: Partial<CreateLearningPathParams>
  ): Promise<LearningPath> {
    const updateData: Prisma.LearningPathUpdateInput = {};

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.thumbnail) updateData.thumbnail = data.thumbnail;
    if (data.difficulty) updateData.difficulty = data.difficulty;
    if (data.estimatedHours) updateData.estimatedHours = data.estimatedHours;
    if (data.tags) updateData.tags = data.tags;
    if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;

    return prisma.learningPath.update({
      where: { id: pathId },
      data: updateData,
    });
  }

  async deleteLearningPath(pathId: string): Promise<void> {
    const enrollments = await prisma.learningPathProgress.count({
      where: { pathId },
    });

    if (enrollments > 0) {
      throw new Error("Cannot delete learning path with active enrollments");
    }

    await prisma.learningPathNode.deleteMany({
      where: { pathId },
    });

    await prisma.learningPath.delete({
      where: { id: pathId },
    });
  }

  async addNodeToPath(
    pathId: string,
    nodeData: LearningPathNodeData
  ): Promise<LearningPathNode> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { nodes: true },
    });

    if (!path) {
      throw new Error("Learning path not found");
    }

    const course = await prisma.course.findUnique({
      where: { id: nodeData.courseId },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    const existingNode = await prisma.learningPathNode.findFirst({
      where: {
        pathId,
        courseId: nodeData.courseId,
      },
    });

    if (existingNode) {
      throw new Error("Course already exists in this learning path");
    }

    if (nodeData.prerequisites && nodeData.prerequisites.length > 0) {
      for (const prereqId of nodeData.prerequisites) {
        const prereqNode = await prisma.learningPathNode.findUnique({
          where: { id: prereqId },
        });

        if (!prereqNode || prereqNode.pathId !== pathId) {
          throw new Error(`Prerequisite node ${prereqId} not found in this path`);
        }
      }

      const wouldCreateCycle = await this.detectCycle(pathId, nodeData.courseId, nodeData.prerequisites);
      if (wouldCreateCycle) {
        throw new Error("Adding this node would create a circular dependency");
      }
    }

    return prisma.learningPathNode.create({
      data: {
        pathId,
        courseId: nodeData.courseId,
        order: nodeData.order,
        isRequired: nodeData.isRequired,
        prerequisites: nodeData.prerequisites || [],
        estimatedDuration: nodeData.estimatedDuration,
      },
      include: {
        course: true,
      },
    });
  }

  private async detectCycle(
    pathId: string,
    courseId: string,
    prerequisites: string[]
  ): Promise<boolean> {
    const visited = new Set<string>();
    const stack = [...prerequisites];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;
      if (nodeId === courseId) return true;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = await prisma.learningPathNode.findUnique({
        where: { id: nodeId },
      });

      if (node && node.pathId === pathId) {
        const nodePrereqs = node.prerequisites as string[];
        stack.push(...nodePrereqs);
      }
    }

    return false;
  }

  async updateNode(
    nodeId: string,
    data: Partial<LearningPathNodeData>
  ): Promise<LearningPathNode> {
    const updateData: Prisma.LearningPathNodeUpdateInput = {};

    if (data.order !== undefined) updateData.order = data.order;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.prerequisites) updateData.prerequisites = data.prerequisites;
    if (data.estimatedDuration) updateData.estimatedDuration = data.estimatedDuration;

    return prisma.learningPathNode.update({
      where: { id: nodeId },
      data: updateData,
      include: {
        course: true,
      },
    });
  }

  async removeNodeFromPath(nodeId: string): Promise<void> {
    const node = await prisma.learningPathNode.findUnique({
      where: { id: nodeId },
      include: {
        dependents: true,
      },
    });

    if (!node) {
      throw new Error("Node not found");
    }

    if (node.dependents && node.dependents.length > 0) {
      throw new Error(
        "Cannot remove node that has dependent nodes. Remove dependents first."
      );
    }

    await prisma.learningPathNode.delete({
      where: { id: nodeId },
    });
  }

  async reorderNodes(
    pathId: string,
    nodeOrders: Array<{ nodeId: string; order: number }>
  ): Promise<void> {
    const updates = nodeOrders.map((item) =>
      prisma.learningPathNode.update({
        where: { id: item.nodeId },
        data: { order: item.order },
      })
    );

    await prisma.$transaction(updates);
  }

  async getLearningPath(pathIdOrSlug: string): Promise<LearningPathWithNodes | null> {
    return prisma.learningPath.findFirst({
      where: {
        OR: [
          { id: pathIdOrSlug },
          { slug: pathIdOrSlug },
        ],
      },
      include: {
        nodes: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                duration: true,
                difficulty: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            nodes: true,
            enrollments: true,
          },
        },
      },
    });
  }

  async getLearningPaths(
    filters?: LearningPathFilters
  ): Promise<PaginatedLearningPaths> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.LearningPathWhereInput = {
      ...(filters?.difficulty && { difficulty: filters.difficulty }),
      ...(filters?.isPublished !== undefined && { isPublished: filters.isPublished }),
      ...(filters?.createdBy && { createdBy: filters.createdBy }),
      ...(filters?.tags && filters.tags.length > 0 && { tags: { hasSome: filters.tags } }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    };

    const orderBy: Prisma.LearningPathOrderByWithRelationInput =
      filters?.sortBy === "popular"
        ? { enrollments: { _count: "desc" } }
        : filters?.sortBy === "newest"
          ? { createdAt: "desc" }
        : filters?.sortBy === "difficulty"
          ? { difficulty: "asc" }
        : { createdAt: "desc" };

    const [paths, total] = await Promise.all([
      prisma.learningPath.findMany({
        where,
        include: {
          nodes: {
            include: {
              course: {
                select: {
                  id: true,
                  title: true,
                  thumbnail: true,
                  duration: true,
                  difficulty: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          _count: {
            select: {
              nodes: true,
              enrollments: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.learningPath.count({ where }),
    ]);

    return {
      paths,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enrollInPath(pathId: string, userId: string): Promise<LearningPathProgress> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { nodes: { orderBy: { order: "asc" } } },
    });

    if (!path) {
      throw new Error("Learning path not found");
    }

    const existingEnrollment = await prisma.learningPathProgress.findFirst({
      where: { pathId, userId },
    });

    if (existingEnrollment) {
      throw new Error("Already enrolled in this learning path");
    }

    const firstNode = path.nodes[0];

    return prisma.learningPathProgress.create({
      data: {
        pathId,
        userId,
        currentNodeId: firstNode?.id,
        status: "IN_PROGRESS",
        enrolledAt: new Date(),
        lastAccessedAt: new Date(),
      },
    });
  }

  async getPathProgress(pathId: string, userId: string): Promise<PathProgressDetails> {
    const progress = await prisma.learningPathProgress.findFirst({
      where: { pathId, userId },
      include: {
        completedNodes: true,
        path: {
          include: {
            nodes: true,
          },
        },
      },
    });

    if (!progress) {
      throw new Error("Not enrolled in this learning path");
    }

    const totalNodes = progress.path.nodes.length;
    const completedNodes = (progress.completedNodes as string[]) || [];
    const progressPercentage =
      totalNodes > 0 ? (completedNodes.length / totalNodes) * 100 : 0;

    const remainingNodes = totalNodes - completedNodes.length;
    const estimatedTimePerNode =
      progress.path.estimatedHours * 60 / (totalNodes || 1);
    const estimatedTimeRemaining = remainingNodes * estimatedTimePerNode;

    const startDate = progress.enrolledAt;
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      pathId,
      userId,
      currentNodeId: progress.currentNodeId,
      completedNodes,
      totalNodes,
      progressPercentage,
      estimatedTimeRemaining,
      startedAt: progress.enrolledAt,
      lastAccessedAt: progress.lastAccessedAt,
      completedAt: progress.completedAt,
      streakDays: diffDays,
      weeklyGoal: 3,
      weeklyProgress: Math.min(completedNodes.length, 3),
    };
  }

  async completeNode(
    pathId: string,
    userId: string,
    nodeId: string
  ): Promise<LearningPathProgress> {
    const progress = await prisma.learningPathProgress.findFirst({
      where: { pathId, userId },
    });

    if (!progress) {
      throw new Error("Not enrolled in this learning path");
    }

    const node = await prisma.learningPathNode.findUnique({
      where: { id: nodeId },
    });

    if (!node || node.pathId !== pathId) {
      throw new Error("Node not found in this learning path");
    }

    const completedNodes = (progress.completedNodes as string[]) || [];

    if (completedNodes.includes(nodeId)) {
      throw new Error("Node already completed");
    }

    const nodePrerequisites = node.prerequisites as string[];
    const unmetPrerequisites = nodePrerequisites.filter(
      (prereqId) => !completedNodes.includes(prereqId)
    );

    if (unmetPrerequisites.length > 0) {
      throw new Error("Prerequisites not met for this node");
    }

    const updatedCompletedNodes = [...completedNodes, nodeId];

    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { nodes: true },
    });

    const isPathComplete = path
      ? updatedCompletedNodes.length >= path.nodes.length
      : false;

    const nextNode = await this.findNextAvailableNode(
      pathId,
      updatedCompletedNodes
    );

    return prisma.learningPathProgress.update({
      where: { id: progress.id },
      data: {
        completedNodes: updatedCompletedNodes,
        currentNodeId: nextNode?.id || progress.currentNodeId,
        lastAccessedAt: new Date(),
        status: isPathComplete ? "COMPLETED" : "IN_PROGRESS",
        ...(isPathComplete && { completedAt: new Date() }),
      },
    });
  }

  private async findNextAvailableNode(
    pathId: string,
    completedNodes: string[]
  ): Promise<LearningPathNode | null> {
    const availableNodes = await prisma.learningPathNode.findMany({
      where: {
        pathId,
        id: { notIn: completedNodes },
      },
      orderBy: { order: "asc" },
    });

    for (const node of availableNodes) {
      const prerequisites = node.prerequisites as string[];
      const allPrereqsMet = prerequisites.every((prereqId) =>
        completedNodes.includes(prereqId)
      );

      if (allPrereqsMet) {
        return node;
      }
    }

    return null;
  }

  async getPrerequisiteMap(pathId: string): Promise<{
    nodes: Array<{
      id: string;
      courseId: string;
      courseName: string;
      order: number;
      prerequisites: string[];
      isRequired: boolean;
    }>;
    edges: Array<{ from: string; to: string }>;
  }> {
    const nodes = await prisma.learningPathNode.findMany({
      where: { pathId },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { order: "asc" },
    });

    const edges: Array<{ from: string; to: string }> = [];

    nodes.forEach((node) => {
      const prerequisites = node.prerequisites as string[];
      prerequisites.forEach((prereqId) => {
        edges.push({ from: prereqId, to: node.id });
      });
    });

    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        courseId: n.courseId,
        courseName: n.course.title,
        order: n.order,
        prerequisites: n.prerequisites as string[],
        isRequired: n.isRequired,
      })),
      edges,
    };
  }

  async generateAdaptivePath(
    userId: string,
    preferences: {
      interests?: string[];
      currentLevel?: string;
      timeAvailable?: number;
      goals?: string[];
    }
  ): Promise<AdaptivePathRecommendation[]> {
    const userEnrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: { course: true },
    });

    const completedCourseIds = userEnrollments
      .filter((e) => e.status === "COMPLETED")
      .map((e) => e.courseId);

    const inProgressCourseIds = userEnrollments
      .filter((e) => e.status === "IN_PROGRESS")
      .map((e) => e.courseId);

    const paths = await prisma.learningPath.findMany({
      where: {
        isPublished: true,
        ...(preferences.currentLevel && { difficulty: preferences.currentLevel }),
      },
      include: {
        nodes: {
          include: {
            course: true,
          },
        },
      },
    });

    const recommendations: AdaptivePathRecommendation[] = [];

    for (const path of paths) {
      const completedInPath = path.nodes.filter((n) =>
        completedCourseIds.includes(n.courseId)
      ).length;

      const inProgressInPath = path.nodes.filter((n) =>
        inProgressCourseIds.includes(n.courseId)
      ).length;

      const matchScore = this.calculatePathMatchScore(path, preferences, completedInPath);

      if (matchScore > 0.3) {
        const nodes = path.nodes
          .sort((a, b) => a.order - b.order)
          .map((node) => ({
            courseId: node.courseId,
            courseName: node.course.title,
            status: completedCourseIds.includes(node.courseId)
              ? ("skip" as const)
              : inProgressCourseIds.includes(node.courseId)
                ? ("optional" as const)
                : ("recommended" as const),
            reason: completedCourseIds.includes(node.courseId)
              ? "Already completed"
              : "Part of learning path",
          }));

        recommendations.push({
          pathId: path.id,
          pathTitle: path.title,
          reason: this.generateRecommendationReason(path, matchScore, completedInPath),
          estimatedCompletionTime: path.estimatedHours,
          matchScore,
          nodes,
        });
      }
    }

    return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  private calculatePathMatchScore(
    path: LearningPath & { nodes: Array<{ course: { title: string } }> },
    preferences: {
      interests?: string[];
      currentLevel?: string;
      timeAvailable?: number;
      goals?: string[];
    },
    completedCourses: number
  ): number {
    let score = 0;

    if (preferences.currentLevel) {
      const levelMatch =
        path.difficulty === preferences.currentLevel ? 0.3 : 0.1;
      score += levelMatch;
    }

    if (preferences.interests && preferences.interests.length > 0) {
      const pathTags = (path.tags as string[]) || [];
      const matchingInterests = preferences.interests.filter((interest) =>
        pathTags.some((tag) =>
          tag.toLowerCase().includes(interest.toLowerCase())
        )
      );
      score += (matchingInterests.length / preferences.interests.length) * 0.3;
    }

    if (preferences.timeAvailable) {
      const timeRatio = path.estimatedHours / preferences.timeAvailable;
      if (timeRatio <= 1) score += 0.2;
      else if (timeRatio <= 1.5) score += 0.1;
    }

    if (completedCourses > 0) {
      const completionRatio = completedCourses / path.nodes.length;
      score += completionRatio * 0.2;
    } else {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private generateRecommendationReason(
    path: LearningPath,
    matchScore: number,
    completedCourses: number
  ): string {
    if (completedCourses > 0) {
      return `You've already started this path (${completedCourses} courses completed)`;
    }
    if (matchScore > 0.7) {
      return "Strong match based on your interests and goals";
    }
    if (matchScore > 0.5) {
      return "Good match for your learning style";
    }
    return "Recommended based on your profile";
  }

  async getPathAnalytics(pathId: string): Promise<PathAnalytics> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: {
        nodes: {
          include: { course: true },
        },
        enrollments: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!path) {
      throw new Error("Learning path not found");
    }

    const totalEnrollments = path.enrollments.length;
    const completedEnrollments = path.enrollments.filter(
      (e) => e.status === "COMPLETED"
    );
    const completionRate =
      totalEnrollments > 0
        ? (completedEnrollments.length / totalEnrollments) * 100
        : 0;

    const completionTimes = completedEnrollments
      .filter((e) => e.completedAt)
      .map((e) => {
        const start = new Date(e.enrolledAt).getTime();
        const end = new Date(e.completedAt!).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      });

    const averageTimeToComplete =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    const topPerformers = path.enrollments
      .sort((a, b) => {
        const aCompleted = (a.completedNodes as string[]).length;
        const bCompleted = (b.completedNodes as string[]).length;
        return bCompleted - aCompleted;
      })
      .slice(0, 10)
      .map((e) => ({
        userId: e.userId,
        userName: e.user.name || "Unknown",
        progress:
          path.nodes.length > 0
            ? ((e.completedNodes as string[]).length / path.nodes.length) * 100
            : 0,
        completedAt: e.completedAt,
      }));

    return {
      totalEnrollments,
      completionRate,
      averageTimeToComplete,
      averageRating: path.rating || 0,
      dropoffPoints: [],
      enrollmentTrend: [],
      topPerformers,
    };
  }

  async getPopularPaths(limit: number = 10): Promise<LearningPathWithNodes[]> {
    return prisma.learningPath.findMany({
      where: { isPublished: true },
      include: {
        nodes: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                duration: true,
                difficulty: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            nodes: true,
            enrollments: true,
          },
        },
      },
      orderBy: {
        enrollments: { _count: "desc" },
      },
      take: limit,
    });
  }

  async duplicateLearningPath(
    pathId: string,
    newTitle: string,
    createdBy: string
  ): Promise<LearningPath> {
    const originalPath = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { nodes: true },
    });

    if (!originalPath) {
      throw new Error("Original learning path not found");
    }

    const newPath = await this.createLearningPath({
      title: newTitle,
      description: originalPath.description,
      thumbnail: originalPath.thumbnail || undefined,
      difficulty: originalPath.difficulty as CreateLearningPathParams["difficulty"],
      estimatedHours: originalPath.estimatedHours,
      tags: (originalPath.tags as string[]) || [],
      isPublished: false,
      createdBy,
    });

    for (const node of originalPath.nodes) {
      await this.addNodeToPath(newPath.id, {
        courseId: node.courseId,
        order: node.order,
        isRequired: node.isRequired,
        prerequisites: node.prerequisites as string[],
        estimatedDuration: node.estimatedDuration,
      });
    }

    return newPath;
  }
}

export const learningPathService = LearningPathService.getInstance();
