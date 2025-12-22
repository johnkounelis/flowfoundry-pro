import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { prisma } from "@flowfoundry/db";
import type { Context } from "../context";
import { flowsRouter } from "./flows";
import { runsRouter } from "./runs";
import { templatesRouter } from "./templates";
import { connectorsRouter } from "./connectors";
import { billingRouter } from "./billing";
import { orgsRouter } from "./orgs";
import { aiRouter } from "./ai";
import { settingsRouter } from "./settings";
import { onboardingRouter } from "./onboarding";

const t = initTRPC.context<Context>().create();

export const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  flows: flowsRouter,
  runs: runsRouter,
  templates: templatesRouter,
  connectors: connectorsRouter,
  billing: billingRouter,
  orgs: orgsRouter,
  ai: aiRouter,
  settings: settingsRouter,
  onboarding: onboardingRouter
});
export type AppRouter = typeof appRouter;
