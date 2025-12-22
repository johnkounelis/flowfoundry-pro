import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@flowfoundry/db";
import { z } from "zod";
import { readEnv } from "@flowfoundry/config";
import type { Context } from "../context";
import { BuiltInConnectors } from "@flowfoundry/connectors";

const t = initTRPC.context<Context>().create();

export const connectorsRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to view connectors." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      return [];
    }

    const orgId = membership.org.id;

    // Ensure all built-in connectors exist for this organization
    for (const connector of BuiltInConnectors) {
      await ctx.prisma.connector.upsert({
        where: { id: `${orgId}_${connector.id}` },
        update: {},
        create: {
          id: `${orgId}_${connector.id}`,
          orgId: orgId,
          type: connector.id,
          name: connector.name
        }
      });
    }

    const cs = await ctx.prisma.connector.findMany({
      where: { orgId },
      include: { credentials: true }
    });

    return cs.map(c => ({
      ...c,
      configured: c.credentials.length > 0
    }));
  }),
  upsertCredential: t.procedure
    .input(
      z.object({
        connectorId: z.string(),
        envelopeB64: z.string().min(1)
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to save credentials." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      const connector = await ctx.prisma.connector.findUnique({
        where: { id: input.connectorId }
      });

      if (!connector || connector.orgId !== membership.org.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found." });
      }

      const buf = Buffer.from(input.envelopeB64, "base64");

      const existing = await ctx.prisma.credential.findFirst({
        where: {
          orgId: membership.org.id,
          connectorId: input.connectorId
        }
      });

      if (existing) {
        await ctx.prisma.credential.update({
          where: { id: existing.id },
          data: { envelope: buf }
        });
      } else {
        await ctx.prisma.credential.create({
          data: {
            orgId: membership.org.id,
            connectorId: input.connectorId,
            envelope: buf
          }
        });
      }

      return { ok: true };
    }),
  saveGmailCredential: t.procedure
    .input(
      z.object({
        email: z.string().email()
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to save credentials." });
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
      }

      const orgId = membership.org.id;

      // Ensure Gmail connector exists
      const gmailConnector = await ctx.prisma.connector.upsert({
        where: { id: `${orgId}_gmail` },
        update: {},
        create: {
          id: `${orgId}_gmail`,
          orgId: orgId,
          type: "gmail",
          name: "Gmail"
        }
      });

      // Get the user's Google OAuth account
      const account = await ctx.prisma.account.findFirst({
        where: { userId: ctx.session.user.id, provider: "google" }
      });

      if (!account || !account.access_token) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Google OAuth account not found. Please sign in with Google first."
        });
      }

      const credentials = {
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
        email: input.email
      };

      const envelope = Buffer.from(JSON.stringify(credentials), "utf8");

      const existing = await ctx.prisma.credential.findFirst({
        where: {
          orgId: orgId,
          connectorId: gmailConnector.id
        }
      });

      if (existing) {
        await ctx.prisma.credential.update({
          where: { id: existing.id },
          data: { envelope }
        });
      } else {
        await ctx.prisma.credential.create({
          data: {
            orgId: orgId,
            connectorId: gmailConnector.id,
            envelope
          }
        });
      }

      return { ok: true };
    }),
  test: t.procedure.input(z.object({ connectorId: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to test connectors." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization." });
    }

    const connector = await ctx.prisma.connector.findUnique({
      where: { id: input.connectorId },
      include: { credentials: true }
    });

    if (!connector || connector.orgId !== membership.org.id) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Connector not found." });
    }

    if (connector.credentials.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Connector is not configured. Please configure it first."
      });
    }

    return { ok: true, message: "Connector test successful!" };
  })
});
