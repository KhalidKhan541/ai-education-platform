import { PrismaClient, UserPoints, Badge, Achievement, LeaderboardEntry, UserStreak, UserLevel, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { addDays, differenceInDays, startOfDay, subDays } from "date-fns";

export interface PointsAwardParams {
  userId: string;
  points: number;
  type: PointsType;
  description: string;
  metadata?: Record<string, unknown>;
  referenceId?: string;
  referenceType?: string;
}

export type PointsType =
  | "COURSE_COMPLETED"
  | "LESSON_COMPLETED"
  | "QUIZ_PASSED"
  | "ASSIGNMENT_SUBMITTED"
  | "FORUM_POST"
  | "HELPING_OTHERS"
  | "STREAK_BONUS"
  | "CERTIFICATE_EARNED"
  | "REFERRAL"
  | "DAILY_LOGIN"
  | "CUSTOM";

export interface BadgeAwardParams {
  userId: string;
  badgeId: string;
  metadata?: Record<string, unknown>;
}

export interface LeaderboardEntryWithUser extends LeaderboardEntry {
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface LeaderboardFilters {
  type: "GLOBAL" | "COURSE" | "WEEKLY" | "MONTHLY";
  courseId?: string;
  limit?: number;
  offset?: number;
}

export interface UserStats {
  userId: string;
  totalPoints: number;
  level: number;
  levelProgress: number;
  badges: Badge[];
  recentAchievements: Achievement[];
  streak: {
    current: number;
    longest: number;
    lastActive: Date;
  };
  rank: number;
  pointsHistory: Array<{ date: string; points: number }>;
}

export interface LevelConfig {
  level: number;
  requiredPoints: number;
  title: string;
  perks: string[];
}

const prisma = new PrismaClient();

const LEVEL_CONFIGS: LevelConfig[] = [
  { level: 1, requiredPoints: 0, title: "Newcomer", perks: ["Basic access"] },
  { level: 2, requiredPoints: 100, title: "Explorer", perks: ["Profile customization"] },
  { level: 3, requiredPoints: 300, title: "Learner", perks: ["Forum posting"] },
  { level: 4, requiredPoints: 600, title: "Student", perks: ["Peer reviews"] },
  { level: 5, requiredPoints: 1000, title: "Scholar", perks: ["Mentor access"] },
  { level: 6, requiredPoints: 1500, title: "Achiever", perks: ["Beta features"] },
  { level: 7, requiredPoints: 2200, title: "Expert", perks: ["Priority support"] },
  { level: 8, requiredPoints: 3000, title: "Master", perks: ["Exclusive content"] },
  { level: 9, requiredPoints: 4000, title: "Sage", perks: ["Create courses"] },
  { level: 10, requiredPoints: 5500, title: "Legend", perks: ["All perks", "VIP badge"] },
];

export class GamificationService {
  private static instance: GamificationService;
  private constructor() {}

  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }

  async awardPoints(params: PointsAwardParams): Promise<UserPoints> {
    const user = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const pointsRecord = await prisma.userPoints.create({
      data: {
        userId: params.userId,
        points: params.points,
        type: params.type,
        description: params.description,
        metadata: params.metadata as Prisma.InputJsonValue,
        referenceId: params.referenceId,
        referenceType: params.referenceType,
      },
    });

    await prisma.user.update({
      where: { id: params.userId },
      data: {
        totalPoints: { increment: params.points },
      },
    });

    await this.updateLevel(params.userId);
    await this.checkAndAwardBadges(params.userId);
    await this.updateStreak(params.userId);

    return pointsRecord;
  }

  async batchAwardPoints(
    awards: PointsAwardParams[]
  ): Promise<{ successful: UserPoints[]; failed: Array<{ userId: string; error: string }> }> {
    const successful: UserPoints[] = [];
    const failed: Array<{ userId: string; error: string }> = [];

    for (const award of awards) {
      try {
        const pointsRecord = await this.awardPoints(award);
        successful.push(pointsRecord);
      } catch (error) {
        failed.push({
          userId: award.userId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  async getUserPoints(
    userId: string,
    options?: { type?: PointsType; startDate?: Date; endDate?: Date; limit?: number }
  ): Promise<UserPoints[]> {
    const where: Prisma.UserPointsWhereInput = {
      userId,
      ...(options?.type && { type: options.type }),
      ...(options?.startDate || options?.endDate
        ? {
            createdAt: {
              ...(options.startDate && { gte: options.startDate }),
              ...(options.endDate && { lte: options.endDate }),
            },
          }
        : {}),
    };

    return prisma.userPoints.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit || 100,
    });
  }

  async getPointsSummary(userId: string): Promise<{
    totalPoints: number;
    pointsByType: Record<string, number>;
    recentPoints: UserPoints[];
    monthlyPoints: number;
  }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const thirtyDaysAgo = subDays(new Date(), 30);

    const [allPoints, monthlyPoints] = await Promise.all([
      prisma.userPoints.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.userPoints.aggregate({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { points: true },
      }),
    ]);

    const pointsByType: Record<string, number> = {};
    allPoints.forEach((p) => {
      pointsByType[p.type] = (pointsByType[p.type] || 0) + p.points;
    });

    return {
      totalPoints: user.totalPoints,
      pointsByType,
      recentPoints: allPoints.slice(0, 10),
      monthlyPoints: monthlyPoints._sum.points || 0,
    };
  }

  async getAvailableBadges(): Promise<Badge[]> {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { category: "asc" },
    });
  }

  async getUserBadges(userId: string): Promise<Badge[]> {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { awardedAt: "desc" },
    });

    return userBadges.map((ub) => ub.badge);
  }

  async awardBadge(params: BadgeAwardParams): Promise<Achievement | null> {
    const existingAchievement = await prisma.achievement.findFirst({
      where: {
        userId: params.userId,
        badgeId: params.badgeId,
      },
    });

    if (existingAchievement) {
      return null;
    }

    const badge = await prisma.badge.findUnique({
      where: { id: params.badgeId },
    });

    if (!badge) {
      throw new Error("Badge not found");
    }

    const achievement = await prisma.achievement.create({
      data: {
        userId: params.userId,
        badgeId: params.badgeId,
        metadata: params.metadata as Prisma.InputJsonValue,
      },
      include: {
        badge: true,
      },
    });

    await prisma.userBadge.create({
      data: {
        userId: params.userId,
        badgeId: params.badgeId,
      },
    });

    if (badge.pointsReward > 0) {
      await this.awardPoints({
        userId: params.userId,
        points: badge.pointsReward,
        type: "CUSTOM",
        description: `Badge earned: ${badge.name}`,
        metadata: { badgeId: badge.id },
      });
    }

    return achievement;
  }

  private async checkAndAwardBadges(userId: string): Promise<void> {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
    });

    const userStats = await this.getUserStats(userId);

    for (const badge of badges) {
      const alreadyEarned = await prisma.achievement.findFirst({
        where: {
          userId,
          badgeId: badge.id,
        },
      });

      if (alreadyEarned) continue;

      const criteria = badge.criteria as Record<string, unknown>;
      const earned = this.evaluateBadgeCriteria(criteria, userStats);

      if (earned) {
        await this.awardBadge({ userId, badgeId: badge.id });
      }
    }
  }

  private evaluateBadgeCriteria(
    criteria: Record<string, unknown>,
    stats: UserStats
  ): boolean {
    if (criteria.totalPoints && stats.totalPoints < (criteria.totalPoints as number)) {
      return false;
    }

    if (criteria.streakDays && stats.streak.current < (criteria.streakDays as number)) {
      return false;
    }

    if (criteria.level && stats.level < (criteria.level as number)) {
      return false;
    }

    return true;
  }

  async updateStreak(userId: string): Promise<UserStreak> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const existingStreak = await prisma.userStreak.findUnique({
      where: { userId },
    });

    const today = startOfDay(new Date());
    const lastActive = existingStreak?.lastActive
      ? startOfDay(existingStreak.lastActive)
      : null;

    if (!existingStreak) {
      return prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActive: today,
          streakStartDate: today,
        },
      });
    }

    if (!lastActive) {
      return prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActive: today,
          streakStartDate: today,
        },
      });
    }

    const daysSinceLastActive = differenceInDays(today, lastActive);

    if (daysSinceLastActive === 0) {
      return existingStreak;
    }

    if (daysSinceLastActive === 1) {
      const newStreak = existingStreak.currentStreak + 1;
      const newLongest = Math.max(newStreak, existingStreak.longestStreak);

      return prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastActive: today,
        },
      });
    }

    return prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        lastActive: today,
        streakStartDate: today,
      },
    });
  }

  async getStreak(userId: string): Promise<UserStreak | null> {
    return prisma.userStreak.findUnique({ where: { userId } });
  }

  async calculateStreakBonus(userId: string): Promise<number> {
    const streak = await this.getStreak(userId);
    if (!streak) return 0;

    const currentStreak = streak.currentStreak;

    if (currentStreak >= 30) return 200;
    if (currentStreak >= 14) return 100;
    if (currentStreak >= 7) return 50;
    if (currentStreak >= 3) return 20;

    return 0;
  }

  async updateLevel(userId: string): Promise<UserLevel> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found");
    }

    const totalPoints = user.totalPoints;
    let newLevel = 1;
    let requiredForNext = LEVEL_CONFIGS[1]?.requiredPoints || 100;

    for (let i = LEVEL_CONFIGS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVEL_CONFIGS[i].requiredPoints) {
        newLevel = LEVEL_CONFIGS[i].level;
        requiredForNext = LEVEL_CONFIGS[i + 1]?.requiredPoints || LEVEL_CONFIGS[i].requiredPoints;
        break;
      }
    }

    const currentLevel = LEVEL_CONFIGS.find((l) => l.level === newLevel);
    const previousLevel = LEVEL_CONFIGS.find((l) => l.level === newLevel - 1);

    const pointsInLevel = totalPoints - (previousLevel?.requiredPoints || 0);
    const pointsNeeded = requiredForNext - (previousLevel?.requiredPoints || 0);
    const progress = Math.min(100, Math.floor((pointsInLevel / pointsNeeded) * 100));

    const existingLevel = await prisma.userLevel.findUnique({
      where: { userId },
    });

    if (existingLevel) {
      const levelChanged = existingLevel.level !== newLevel;

      return prisma.userLevel.update({
        where: { userId },
        data: {
          level: newLevel,
          title: currentLevel?.title || "Newcomer",
          experience: totalPoints,
          progress,
          ...(levelChanged && {
            levelUpAt: new Date(),
          }),
        },
      });
    }

    return prisma.userLevel.create({
      data: {
        userId,
        level: newLevel,
        title: currentLevel?.title || "Newcomer",
        experience: totalPoints,
        progress,
        levelUpAt: new Date(),
      },
    });
  }

  async getLevel(userId: string): Promise<(UserLevel & { config: LevelConfig }) | null> {
    const level = await prisma.userLevel.findUnique({ where: { userId } });
    if (!level) return null;

    const config = LEVEL_CONFIGS.find((l) => l.level === level.level) || LEVEL_CONFIGS[0];
    return { ...level, config };
  }

  async getLevelConfigs(): Promise<LevelConfig[]> {
    return LEVEL_CONFIGS;
  }

  async getLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardEntryWithUser[]> {
    const limit = filters.limit || 10;
    const offset = filters.offset || 0;

    if (filters.type === "WEEKLY" || filters.type === "MONTHLY") {
      const startDate =
        filters.type === "WEEKLY" ? subDays(new Date(), 7) : subDays(new Date(), 30);

      const weeklyPoints = await prisma.userPoints.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
          ...(filters.courseId && {
            metadata: { path: ["courseId"], equals: filters.courseId },
          }),
        },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: limit,
        skip: offset,
      });

      const userIds = weeklyPoints.map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, image: true },
      });

      return weeklyPoints.map((entry, index) => ({
        id: `leaderboard-${filters.type}-${entry.userId}`,
        userId: entry.userId,
        score: entry._sum.points || 0,
        period: filters.type === "WEEKLY" ? "weekly" : "monthly",
        periodStart: startDate,
        periodEnd: new Date(),
        rank: offset + index + 1,
        user: users.find((u) => u.id === entry.userId) || {
          id: entry.userId,
          name: "Unknown",
          image: null,
        },
        createdAt: new Date(),
      }));
    }

    const where: Prisma.LeaderboardEntryWhereInput = {
      period: filters.type.toLowerCase(),
      ...(filters.courseId && { courseId: filters.courseId }),
    };

    return prisma.leaderboardEntry.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { rank: "asc" },
      take: limit,
      skip: offset,
    });
  }

  async getUserRank(
    userId: string,
    type: "GLOBAL" | "COURSE" | "WEEKLY" | "MONTHLY",
    courseId?: string
  ): Promise<{ rank: number; totalParticipants: number; score: number }> {
    const period = type.toLowerCase();
    const startDate =
      type === "WEEKLY"
        ? subDays(new Date(), 7)
        : type === "MONTHLY"
          ? subDays(new Date(), 30)
        : new Date(0);

    if (type === "WEEKLY" || type === "MONTHLY") {
      const allPoints = await prisma.userPoints.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
          ...(courseId && {
            metadata: { path: ["courseId"], equals: courseId },
          }),
        },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
      });

      const userEntry = allPoints.find((p) => p.userId === userId);
      const rank = allPoints.findIndex((p) => p.userId === userId) + 1;

      return {
        rank: rank || allPoints.length + 1,
        totalParticipants: allPoints.length,
        score: userEntry?._sum.points || 0,
      };
    }

    const entry = await prisma.leaderboardEntry.findFirst({
      where: {
        userId,
        period,
        ...(courseId && { courseId }),
      },
    });

    const totalParticipants = await prisma.leaderboardEntry.count({
      where: {
        period,
        ...(courseId && { courseId }),
      },
    });

    return {
      rank: entry?.rank || totalParticipants + 1,
      totalParticipants,
      score: entry?.score || 0,
    };
  }

  async updateLeaderboards(): Promise<void> {
    const periods = ["daily", "weekly", "monthly", "alltime"] as const;

    for (const period of periods) {
      const startDate =
        period === "daily"
          ? subDays(new Date(), 1)
          : period === "weekly"
            ? subDays(new Date(), 7)
          : period === "monthly"
            ? subDays(new Date(), 30)
          : new Date(0);

      const pointsData = await prisma.userPoints.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { points: true },
        orderBy: { _sum: { points: "desc" } },
        take: 100,
      });

      const userIds = pointsData.map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true },
      });

      for (let i = 0; i < pointsData.length; i++) {
        const entry = pointsData[i];
        if (!users.find((u) => u.id === entry.userId)) continue;

        await prisma.leaderboardEntry.upsert({
          where: {
            userId_period: {
              userId: entry.userId,
              period,
            },
          },
          update: {
            score: entry._sum.points || 0,
            rank: i + 1,
            periodStart: startDate,
            periodEnd: new Date(),
          },
          create: {
            userId: entry.userId,
            score: entry._sum.points || 0,
            rank: i + 1,
            period,
            periodStart: startDate,
            periodEnd: new Date(),
          },
        });
      }
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const [user, points, badges, achievements, streak, level, rankData, pointsHistory] =
      await Promise.all([
        prisma.user.findUnique({ where: { id: userId } }),
        this.getPointsSummary(userId),
        this.getUserBadges(userId),
        prisma.achievement.findMany({
          where: { userId },
          include: { badge: true },
          orderBy: { awardedAt: "desc" },
          take: 10,
        }),
        this.getStreak(userId),
        this.getLevel(userId),
        this.getUserRank(userId, "GLOBAL"),
        prisma.userPoints.findMany({
          where: { userId },
          select: {
            createdAt: true,
            points: true,
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

    if (!user) {
      throw new Error("User not found");
    }

    const dailyPoints = new Map<string, number>();
    pointsHistory.forEach((p) => {
      const date = p.createdAt.toISOString().split("T")[0] || "";
      dailyPoints.set(date, (dailyPoints.get(date) || 0) + p.points);
    });

    return {
      userId,
      totalPoints: user.totalPoints,
      level: level?.level || 1,
      levelProgress: level?.progress || 0,
      badges,
      recentAchievements: achievements,
      streak: {
        current: streak?.currentStreak || 0,
        longest: streak?.longestStreak || 0,
        lastActive: streak?.lastActive || new Date(),
      },
      rank: rankData.rank,
      pointsHistory: Array.from(dailyPoints.entries()).map(([date, pts]) => ({
        date,
        points: pts,
      })),
    };
  }

  async createBadge(data: {
    name: string;
    description: string;
    iconUrl: string;
    category: string;
    criteria: Record<string, unknown>;
    pointsReward?: number;
    isActive?: boolean;
  }): Promise<Badge> {
    return prisma.badge.create({
      data: {
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        category: data.category,
        criteria: data.criteria as Prisma.InputJsonValue,
        pointsReward: data.pointsReward || 0,
        isActive: data.isActive !== false,
      },
    });
  }

  async updateBadge(
    badgeId: string,
    data: Partial<{
      name: string;
      description: string;
      iconUrl: string;
      category: string;
      criteria: Record<string, unknown>;
      pointsReward: number;
      isActive: boolean;
    }>
  ): Promise<Badge> {
    return prisma.badge.update({
      where: { id: badgeId },
      data: {
        ...data,
        criteria: data.criteria as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async getEngagementMetrics(): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageStreak: number;
    topEarners: Array<{ userId: string; name: string; points: number }>;
    badgesAwardedToday: number;
  }> {
    const today = startOfDay(new Date());
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    const [dailyUsers, weeklyUsers, monthlyUsers, averageStreak, topEarnersRaw, badgesToday] =
      await Promise.all([
        prisma.userPoints.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: today } },
        }),
        prisma.userPoints.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: weekAgo } },
        }),
        prisma.userPoints.groupBy({
          by: ["userId"],
          where: { createdAt: { gte: monthAgo } },
        }),
        prisma.userStreak.aggregate({
          _avg: { currentStreak: true },
        }),
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            totalPoints: true,
          },
          orderBy: { totalPoints: "desc" },
          take: 10,
        }),
        prisma.achievement.count({
          where: {
            awardedAt: { gte: today },
          },
        }),
      ]);

    return {
      dailyActiveUsers: dailyUsers.length,
      weeklyActiveUsers: weeklyUsers.length,
      monthlyActiveUsers: monthlyUsers.length,
      averageStreak: averageStreak._avg.currentStreak || 0,
      topEarners: topEarnersRaw.map((u) => ({
        userId: u.id,
        name: u.name || "Unknown",
        points: u.totalPoints,
      })),
      badgesAwardedToday: badgesToday,
    };
  }
}

export const gamificationService = GamificationService.getInstance();
