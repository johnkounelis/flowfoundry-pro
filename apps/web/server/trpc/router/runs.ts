import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@flowfoundry/db";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const runsRouter = t.router({
  list: t.procedure
    .input(z.object({ 
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
      status: z.enum(["queued", "running", "succeeded", "failed"]).optional(),
      flowId: z.string().optional(),
      timeRange: z.enum(["24h", "7d", "30d", "90d"]).optional()
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view runs." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        return { runs: [], total: 0, hasMore: false };
      }

      // Calculate date range
      let dateFilter: { gte?: Date } = {};
      if (input.timeRange) {
        const now = new Date();
        const ranges = {
          "24h": new Date(now.getTime() - 24 * 60 * 60 * 1000),
          "7d": new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          "30d": new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          "90d": new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        };
        dateFilter.gte = ranges[input.timeRange];
      }

      const where: any = {
        orgId: membership.org.id,
        ...(input.status && { status: input.status }),
        ...(input.flowId && { flowId: input.flowId }),
        ...(dateFilter.gte && { createdAt: dateFilter })
      };

      const runs = await ctx.prisma.run.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit,
        skip: input.offset,
        include: { flow: true }
      });

      const total = await ctx.prisma.run.count({ where });

      return {
        runs: runs.map((r) => ({
          id: r.id,
          flowName: r.flow.name,
          status: r.status,
          startedAt: r.startedAt ?? r.createdAt,
          finishedAt: r.finishedAt,
          tokens: r.tokens,
          costUsd: Number(r.costUsd)
        })),
        total,
        hasMore: input.offset + input.limit < total
      };
    }),
  get: t.procedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view runs." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const r = await ctx.prisma.run.findUnique({ 
      where: { id: input.id }, 
      include: { steps: true, flow: true } 
    });

    if (!r) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
    }

    if (r.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this run." });
    }

    return {
      id: r.id,
      status: r.status,
      steps: r.steps.map(s => ({ ...s, logs: s.logs as Record<string, unknown> })),
      tokens: r.tokens,
      costUsd: Number(r.costUsd),
      version: r.versionId,
      flow: r.flow.name,
      flowId: r.flowId,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      triggerPayload: r.triggerPayload as Record<string, unknown> | null
    };
  }),
  getByFlow: t.procedure.input(z.object({ flowId: z.string(), limit: z.number().min(1).max(50).optional().default(10) })).query(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view runs." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return [];
    }

    // Verify flow belongs to user's org
    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow || flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    const runs = await ctx.prisma.run.findMany({
      where: { flowId: input.flowId, orgId: membership.org.id },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      include: { flow: true }
    });

    return runs.map((r) => ({
      id: r.id,
      flowName: r.flow.name,
      status: r.status,
      startedAt: r.startedAt ?? r.createdAt,
      finishedAt: r.finishedAt,
      tokens: r.tokens,
      costUsd: Number(r.costUsd)
    }));
  }),
  getMetrics: t.procedure
    .input(z.object({ timeRange: z.enum(["24h", "7d", "30d", "90d"]).optional().default("7d") }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view metrics." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        return {
          totalRuns: 0,
          successfulRuns: 0,
          totalTokens: 0,
          totalCost: 0,
          successRate: 0,
          changeFromPrevious: {
            totalRuns: 0,
            successRate: 0,
            tokens: 0
          }
        };
      }

      const now = new Date();
      const ranges = {
        "24h": { current: new Date(now.getTime() - 24 * 60 * 60 * 1000), previous: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        "7d": { current: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), previous: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
        "30d": { current: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), previous: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
        "90d": { current: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), previous: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000) }
      };

      const range = ranges[input.timeRange];

      // Current period
      const currentRuns = await ctx.prisma.run.findMany({
        where: {
          orgId: membership.org.id,
          createdAt: { gte: range.current }
        }
      });

      const totalRuns = currentRuns.length;
      const successfulRuns = currentRuns.filter(r => r.status === "succeeded").length;
      const totalTokens = currentRuns.reduce((sum, r) => sum + r.tokens, 0);
      const totalCost = currentRuns.reduce((sum, r) => sum + Number(r.costUsd), 0);
      const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

      // Previous period
      const previousRuns = await ctx.prisma.run.findMany({
        where: {
          orgId: membership.org.id,
          createdAt: { gte: range.previous, lt: range.current }
        }
      });

      const prevTotalRuns = previousRuns.length;
      const prevSuccessfulRuns = previousRuns.filter(r => r.status === "succeeded").length;
      const prevTotalTokens = previousRuns.reduce((sum, r) => sum + r.tokens, 0);
      const prevSuccessRate = prevTotalRuns > 0 ? (prevSuccessfulRuns / prevTotalRuns) * 100 : 0;

      // Calculate percentage changes
      const changeFromPrevious = {
        totalRuns: prevTotalRuns > 0 ? ((totalRuns - prevTotalRuns) / prevTotalRuns) * 100 : (totalRuns > 0 ? 100 : 0),
        successRate: prevSuccessRate > 0 ? (successRate - prevSuccessRate) : (successRate > 0 ? 100 : 0),
        tokens: prevTotalTokens > 0 ? ((totalTokens - prevTotalTokens) / prevTotalTokens) * 100 : (totalTokens > 0 ? 100 : 0)
      };

      return {
        totalRuns,
        successfulRuns,
        totalTokens,
        totalCost,
        successRate,
        changeFromPrevious
      };
    })
});
