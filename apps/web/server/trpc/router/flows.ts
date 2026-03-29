import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@flowfoundry/db";
import { inngestClient } from "@/server/inngest/client";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

// Shared validation schemas for flow endpoints
const flowNameSchema = z.string().min(1, "Flow name is required").max(100, "Flow name must be under 100 characters").trim();
const flowDescriptionSchema = z.string().max(500, "Description must be under 500 characters").trim().optional();
const flowIdSchema = z.string().uuid("Invalid flow ID format");
const paginationSchema = z.object({
  take: z.number().int().min(1).max(100).default(20),
  skip: z.number().int().min(0).default(0),
});

export const flowsRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return [];
    }

    const flows = await ctx.prisma.flow.findMany({
      where: { orgId: membership.org.id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });
    return flows.map((f) => ({ id: f.id, name: f.name, currentVersion: f.versions[0]?.version ?? 0, updatedAt: f.updatedAt }));
  }),
  create: t.procedure.input(z.object({ name: z.string(), description: z.string().optional(), definition: z.any() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to create flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization to create flows." });
    }

    const flow = await ctx.prisma.flow.create({ 
      data: { 
        orgId: membership.org.id, 
        name: input.name,
        createdBy: ctx.session.user.id
      } 
    });
    await ctx.prisma.flowVersion.create({ 
      data: { 
        flowId: flow.id, 
        version: 1, 
        definition: input.definition 
      } 
    });
    return { id: flow.id, name: flow.name, currentVersion: 1 };
  }),
  get: t.procedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({ 
      where: { id: input.id },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });
    
    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    return {
      id: flow.id,
      name: flow.name,
      definition: flow.versions[0]?.definition as Record<string, unknown> | null,
      currentVersion: flow.versions[0]?.version ?? 0
    };
  }),
  getById: t.procedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return null;
    }

    const flow = await ctx.prisma.flow.findUnique({ 
      where: { id: input.id }, 
      include: { 
        versions: { orderBy: { version: "desc" }, take: 1 } 
      } 
    });
    
    if (!flow) return null;

    if (flow.orgId !== membership.org.id) {
      return null;
    }

    return {
      id: flow.id,
      name: flow.name,
      currentVersion: flow.versions[0]?.version ?? 0,
      definition: flow.versions[0]?.definition as Record<string, unknown> | null,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt
    };
  }),
  saveVersion: t.procedure.input(z.object({ flowId: z.string(), definition: z.any() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to save flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    const last = await ctx.prisma.flowVersion.findFirst({ 
      where: { flowId: input.flowId }, 
      orderBy: { version: "desc" } 
    });
    const next = (last?.version ?? 0) + 1;
    await ctx.prisma.flowVersion.create({ 
      data: { 
        flowId: input.flowId, 
        version: next, 
        definition: input.definition 
      } 
    });
    return { version: next };
  }),
  trigger: t.procedure.input(z.object({ flowId: z.string(), payload: z.any().optional() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to test flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    await inngestClient.send({ name: "flow.triggered", data: { flowId: input.flowId, payload: input.payload ?? {} } });
    return { queued: true };
  }),
  duplicate: t.procedure.input(z.object({ flowId: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to duplicate flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const originalFlow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });

    if (!originalFlow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (originalFlow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    const newFlow = await ctx.prisma.flow.create({
      data: {
        orgId: membership.org.id,
        name: `${originalFlow.name} (Copy)`,
        createdBy: ctx.session.user.id
      }
    });

    if (originalFlow.versions[0]) {
      await ctx.prisma.flowVersion.create({
        data: {
          flowId: newFlow.id,
          version: 1,
          definition: originalFlow.versions[0].definition ?? {}
        }
      });
    }

    return { id: newFlow.id, name: newFlow.name };
  }),
  archive: t.procedure.input(z.object({ flowId: z.string(), archived: z.boolean() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to archive flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    // Archive by deleting associated runs/steps then the flow
    // First delete run steps for runs of this flow
    const runs = await ctx.prisma.run.findMany({
      where: { flowId: input.flowId },
      select: { id: true }
    });

    if (runs.length > 0) {
      await ctx.prisma.runStep.deleteMany({
        where: { runId: { in: runs.map(r => r.id) } }
      });
      await ctx.prisma.run.deleteMany({
        where: { flowId: input.flowId }
      });
    }

    // Delete versions
    await ctx.prisma.flowVersion.deleteMany({
      where: { flowId: input.flowId }
    });

    // Delete the flow itself
    await ctx.prisma.flow.delete({
      where: { id: input.flowId }
    });

    // Record in audit log
    await ctx.prisma.auditLog.create({
      data: {
        orgId: flow.orgId,
        userId: ctx.session.user.id,
        action: "flow.archive",
        entity: "flow",
        metadata: { flowId: input.flowId, flowName: flow.name }
      }
    });

    return { success: true };
  }),
  delete: t.procedure.input(z.object({ flowId: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to delete flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    await ctx.prisma.flow.delete({
      where: { id: input.flowId }
    });

    return { success: true };
  }),
  update: t.procedure.input(z.object({ flowId: z.string(), name: z.string().optional(), description: z.string().optional() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to update flows." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const flow = await ctx.prisma.flow.findUnique({
      where: { id: input.flowId }
    });

    if (!flow) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Flow not found." });
    }

    if (flow.orgId !== membership.org.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this flow." });
    }

    const updated = await ctx.prisma.flow.update({
      where: { id: input.flowId },
      data: {
        ...(input.name && { name: input.name })
      }
    });

    return { id: updated.id, name: updated.name };
  })
});
