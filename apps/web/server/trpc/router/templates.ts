import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@flowfoundry/db";
import { z } from "zod";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const templatesRouter = t.router({
  list: t.procedure.query(async () => {
    const tpls = await prisma.template.findMany();
    return tpls.map(t => ({
      ...t,
      definition: t.definition as Record<string, unknown>
    }));
  }),
  useTemplate: t.procedure.input(z.object({ key: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be signed in to use templates." });
    }

    const membership = await ctx.prisma.membership.findFirst({
      where: { userId: ctx.session.user.id },
      include: { org: true }
    });

    if (!membership) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "You must belong to an organization to use templates." });
    }

    const t = await ctx.prisma.template.findUnique({ where: { key: input.key } });
    if (!t) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
    }

    const flow = await ctx.prisma.flow.create({
      data: {
        orgId: membership.org.id,
        name: t.name,
        createdBy: ctx.session.user.id,
        versions: { create: [{ version: 1, definition: t.definition as any }] }
      }
    });
    return { flowId: flow.id };
  })
});
