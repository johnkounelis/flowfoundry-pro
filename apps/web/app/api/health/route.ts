import { NextResponse } from "next/server";
import { prisma } from "@flowfoundry/db";
import Redis from "ioredis";
import { readEnv } from "@flowfoundry/config";

const env = readEnv();

type HealthStatus = "ok" | "degraded" | "down";

interface HealthCheck {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: HealthStatus; latencyMs?: number };
    redis: { status: HealthStatus; latencyMs?: number };
  };
}

/**
 * GET /api/health
 * Kubernetes readiness/liveness probe endpoint.
 * Returns 200 if all dependencies are reachable, 503 otherwise.
 */
export async function GET() {
  const start = Date.now();
  const health: HealthCheck = {
    status: "ok",
    version: process.env.npm_package_version ?? "0.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "ok" },
      redis: { status: "ok" },
    },
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database.latencyMs = Date.now() - dbStart;
  } catch {
    health.checks.database.status = "down";
    health.status = "degraded";
  }

  // Check Redis connectivity
  try {
    const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 3000 });
    const redisStart = Date.now();
    await redis.ping();
    health.checks.redis.latencyMs = Date.now() - redisStart;
    await redis.quit();
  } catch {
    health.checks.redis.status = "down";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
