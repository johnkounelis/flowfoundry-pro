import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@flowfoundry/db";
import { z } from "zod";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const orgsRouter = t.router({
  members: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view members." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: { include: { members: { include: { user: true } } } } }
    });

    if (!membership) {
      return [];
    }

    return membership.org.members.map((m) => ({
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      name: m.user.name
    }));
  }),
  invite: t.procedure.input(z.object({ email: z.string().email(), role: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to invite members." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    // Check if user already exists and is a member
    const existingUser = await ctx.prisma.user.findUnique({
      where: { email: input.email },
      include: { memberships: { where: { orgId: membership.org.id } } }
    });

    if (existingUser && existingUser.memberships.length > 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a member of this organization." });
    }

    // Generate secure token
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    await ctx.prisma.invite.create({
      data: {
        orgId: membership.org.id,
        email: input.email,
        role: input.role,
        token
      }
    });

    // In a real app, send invitation email here
    return { sent: true, token };
  }),
  changeRole: t.procedure.input(z.object({ userId: z.string(), role: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to change roles." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    // Check if requester is ADMIN or OWNER
    if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and owners can change roles." });
    }

    // Verify target user is in the same org
    const targetMembership = await ctx.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.userId,
          orgId: membership.org.id
        }
      }
    });

    if (!targetMembership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User is not a member of this organization." });
    }

    // Prevent changing owner role
    if (targetMembership.role === "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot change owner role." });
    }

    await ctx.prisma.membership.update({
      where: {
        userId_orgId: {
          userId: input.userId,
          orgId: membership.org.id
        }
      },
      data: { role: input.role }
    });

    return { success: true };
  }),
  removeMember: t.procedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to remove members." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    // Check if requester is ADMIN or OWNER
    if (membership.role !== "ADMIN" && membership.role !== "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only admins and owners can remove members." });
    }

    // Prevent removing self
    if (input.userId === ctx.session.user.id) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself. Transfer ownership first." });
    }

    // Verify target user is in the same org
    const targetMembership = await ctx.prisma.membership.findUnique({
      where: {
        userId_orgId: {
          userId: input.userId,
          orgId: membership.org.id
        }
      }
    });

    if (!targetMembership) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User is not a member of this organization." });
    }

    // Prevent removing owner
    if (targetMembership.role === "OWNER") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove owner. Transfer ownership first." });
    }

    await ctx.prisma.membership.delete({
      where: {
        userId_orgId: {
          userId: input.userId,
          orgId: membership.org.id
        }
      }
    });

    return { success: true };
  }),
  getInvites: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view invitations." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return [];
    }

    const invites = await ctx.prisma.invite.findMany({
      where: { orgId: membership.org.id },
      orderBy: { createdAt: "desc" }
    });

    return invites.map(invite => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      createdAt: invite.createdAt
    }));
  })
});
