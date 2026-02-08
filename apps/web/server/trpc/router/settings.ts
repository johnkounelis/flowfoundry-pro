import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@flowfoundry/db";
import crypto from "crypto";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

async function getOrgSettings(orgId: string) {
  const entry = await prisma.auditLog.findFirst({
    where: { orgId, action: "settings.update" },
    orderBy: { createdAt: "desc" }
  });

  const defaults = {
    dataRetention: "30",
    notifications: { email: true, slack: false, webhook: false }
  };

  if (!entry || !entry.metadata) return defaults;

  const meta = entry.metadata as any;
  return {
    dataRetention: meta.dataRetention ?? defaults.dataRetention,
    notifications: {
      email: meta.notifications?.email ?? defaults.notifications.email,
      slack: meta.notifications?.slack ?? defaults.notifications.slack,
      webhook: meta.notifications?.webhook ?? defaults.notifications.webhook
    }
  };
}

async function saveOrgSettings(orgId: string, userId: string, settings: { dataRetention?: string; notifications?: { email?: boolean; slack?: boolean; webhook?: boolean } }) {
  const current = await getOrgSettings(orgId);
  const merged = {
    dataRetention: settings.dataRetention ?? current.dataRetention,
    notifications: {
      email: settings.notifications?.email ?? current.notifications.email,
      slack: settings.notifications?.slack ?? current.notifications.slack,
      webhook: settings.notifications?.webhook ?? current.notifications.webhook
    }
  };

  await prisma.auditLog.create({
    data: {
      orgId,
      userId,
      action: "settings.update",
      entity: "organization",
      metadata: merged
    }
  });

  return merged;
}

export const settingsRouter = t.router({
  getSettings: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view settings." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return {
        dataRetention: "30",
        notifications: { email: true, slack: false, webhook: false }
      };
    }

    return getOrgSettings(membership.org.id);
  }),
  updateDataRetention: t.procedure
    .input(z.object({ days: z.enum(["7", "30", "90", "365", "forever"]) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to update settings." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and owners can update settings." });
      }

      await saveOrgSettings(membership.org.id, ctx.session.user.id, { dataRetention: input.days });
      return { success: true };
    }),
  updateNotifications: t.procedure
    .input(
      z.object({
        email: z.boolean().optional(),
        slack: z.boolean().optional(),
        webhook: z.boolean().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to update settings." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      await saveOrgSettings(membership.org.id, ctx.session.user.id, { notifications: input });
      return { success: true };
    }),
  generateApiKey: t.procedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to generate API keys." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      const apiKey = `ff_live_${crypto.randomBytes(32).toString("hex")}`;
      const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

      await ctx.prisma.apiKey.create({
        data: {
          userId: ctx.session.user.id,
          orgId: membership.org.id,
          name: input.name,
          hashedKey
        }
      });

      return { apiKey, name: input.name };
    }),
  listApiKeys: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view API keys." });
    }

    const keys = await ctx.prisma.apiKey.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "desc" }
    });

    return keys.map(key => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      masked: "ff_live_••••••••••••••••"
    }));
  }),
  deleteApiKey: t.procedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to delete API keys." });
    }

    const key = await ctx.prisma.apiKey.findUnique({ where: { id: input.id } });

    if (!key) {
      throw new TRPCError({ code: "NOT_FOUND", message: "API key not found." });
    }

    if (key.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this API key." });
    }

    await ctx.prisma.apiKey.delete({ where: { id: input.id } });
    return { success: true };
  }),
  exportData: t.procedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to export data." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const orgId = membership.org.id;

    // Gather all user/org data for export
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { id: true, email: true, name: true, createdAt: true }
    });

    const flows = await ctx.prisma.flow.findMany({
      where: { orgId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });

    const runs = await ctx.prisma.run.findMany({
      where: { orgId },
      include: { steps: true },
      take: 1000,
      orderBy: { createdAt: "desc" }
    });

    const connectors = await ctx.prisma.connector.findMany({
      where: { orgId },
      select: { id: true, type: true, name: true, createdAt: true }
    });

    // Record the export event
    await ctx.prisma.auditLog.create({
      data: {
        orgId,
        userId: ctx.session.user.id,
        action: "data.export",
        entity: "organization",
        metadata: {
          flowCount: flows.length,
          runCount: runs.length,
          exportedAt: new Date().toISOString()
        }
      }
    });

    return {
      success: true,
      data: {
        user,
        organization: { id: orgId, name: membership.org.name },
        flows: flows.map(f => ({
          id: f.id,
          name: f.name,
          definition: f.versions[0]?.definition,
          createdAt: f.createdAt
        })),
        runs: runs.map(r => ({
          id: r.id,
          flowId: r.flowId,
          status: r.status,
          tokens: r.tokens,
          costUsd: Number(r.costUsd),
          startedAt: r.startedAt,
          finishedAt: r.finishedAt,
          steps: r.steps.map(s => ({
            name: s.name,
            type: s.type,
            status: s.status,
            logs: s.logs
          }))
        })),
        connectors,
        exportedAt: new Date().toISOString()
      }
    };
  }),
  deleteAccount: t.procedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to delete your account." });
    }

    // Record deletion event before soft-deleting
    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (membership) {
      await ctx.prisma.auditLog.create({
        data: {
          orgId: membership.org.id,
          userId: ctx.session.user.id,
          action: "account.delete",
          entity: "user",
          metadata: { deletedAt: new Date().toISOString() }
        }
      });
    }

    // Soft delete user
    await ctx.prisma.user.update({
      where: { id: ctx.session.user.id },
      data: { deletedAt: new Date() }
    });

    return { success: true, message: "Account deletion initiated. You will receive a confirmation email." };
  })
});
