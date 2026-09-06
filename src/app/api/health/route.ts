import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { monitoring } from "@/lib/monitoring";

interface HealthCheck {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: string; latency?: number };
    memory: { status: string; used: number; total: number; percentage: number };
    monitoring: { status: string; errorRate: string; avgResponseTime: string };
  };
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Database check
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;

    // Memory check
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    const memPercentage = (usedMem / totalMem) * 100;

    // Monitoring check
    const monitoringStatus = monitoring.getHealthStatus();

    const dbStatus = dbLatency < 1000 ? "healthy" : dbLatency < 3000 ? "degraded" : "unhealthy";
    const memStatus = memPercentage < 80 ? "healthy" : memPercentage < 95 ? "degraded" : "unhealthy";

    const overallStatus: HealthCheck["status"] =
      dbStatus === "unhealthy" || memStatus === "unhealthy"
        ? "unhealthy"
        : dbStatus === "degraded" || memStatus === "degraded"
          ? "degraded"
          : "healthy";

    const health: HealthCheck = {
      status: overallStatus,
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
        memory: {
          status: memStatus,
          used: Math.round(usedMem / 1024 / 1024),
          total: Math.round(totalMem / 1024 / 1024),
          percentage: Math.round(memPercentage),
        },
        monitoring: {
          status: monitoringStatus.status === "healthy" ? "healthy" : "degraded",
          errorRate: monitoringStatus.checks.errorRate,
          avgResponseTime: monitoringStatus.checks.avgResponseTime,
        },
      },
    };

    monitoring.info("Health check completed", { status: overallStatus, dbLatency });

    const statusCode = overallStatus === "healthy" ? 200 : overallStatus === "degraded" ? 200 : 503;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    monitoring.error("Health check failed", { error: String(error) });

    return NextResponse.json(
      {
        status: "unhealthy",
        version: process.env.npm_package_version ?? "1.0.0",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 }
    );
  }
}
