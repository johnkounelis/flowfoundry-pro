import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@flowfoundry/db";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const onboardingRouter = t.router({
  saveOnboarding: t.procedure
    .input(
      z.object({
        useCase: z.string().optional(),
        teamSize: z.string().optional(),
        industry: z.string().optional(),
        integrations: z.array(z.string()).optional(),
        experience: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to save onboarding data." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      // Store onboarding data as an audit log entry with action "onboarding.save"
      // Upsert by deleting any previous onboarding entry and creating a new one
      await ctx.prisma.auditLog.deleteMany({
        where: {
          orgId: membership.org.id,
          userId: ctx.session.user.id,
          action: "onboarding.save"
        }
      });

      await ctx.prisma.auditLog.create({
        data: {
          orgId: membership.org.id,
          userId: ctx.session.user.id,
          action: "onboarding.save",
          entity: "user",
          metadata: {
            useCase: input.useCase,
            teamSize: input.teamSize,
            industry: input.industry,
            integrations: input.integrations,
            experience: input.experience
          }
        }
      });

      return { success: true };
    }),
  getOnboarding: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      return null;
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return null;
    }

    const entry = await ctx.prisma.auditLog.findFirst({
      where: {
        orgId: membership.org.id,
        userId: ctx.session.user.id,
        action: "onboarding.save"
      },
      orderBy: { createdAt: "desc" }
    });

    if (!entry || !entry.metadata) {
      return null;
    }

    return entry.metadata as {
      useCase?: string;
      teamSize?: string;
      industry?: string;
      integrations?: string[];
      experience?: string;
    };
  }),
  completeOnboarding: t.procedure.mutation(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    // Record onboarding completion
    await ctx.prisma.auditLog.create({
      data: {
        orgId: membership.org.id,
        userId: ctx.session.user.id,
        action: "onboarding.complete",
        entity: "user",
        metadata: { completedAt: new Date().toISOString() }
      }
    });

    return { success: true };
  })
});
