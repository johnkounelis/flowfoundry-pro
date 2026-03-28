import { prisma } from "@flowfoundry/db";
import { type inferAsyncReturnType } from "@trpc/server";
import { readEnv } from "@flowfoundry/config";
import Redis from "ioredis";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";

const env = readEnv();

/** Dependencies that can be injected for testing or overridden per-request */
export interface ContextDeps {
  db: typeof prisma;
  redis: Redis;
  env: ReturnType<typeof readEnv>;
}

/** Default dependency factory - used in production */
function createDefaultDeps(): ContextDeps {
  return {
    db: prisma,
    redis: new Redis(env.REDIS_URL),
    env,
  };
}

export async function createContext(
  _opts: { req: Request },
  depsOverride?: Partial<ContextDeps>
) {
  const deps = { ...createDefaultDeps(), ...depsOverride };

  try {
    // Get session using NextAuth - it will read cookies from the request automatically
    const session = await auth();

    // Get user's organization if session exists
    let organization = null;
    if (session?.user?.id) {
      const membership = await deps.db.membership.findFirst({
        where: { userId: session.user.id },
        include: { org: true }
      });
      organization = membership?.org || null;
    }

    return { prisma: deps.db, session, redis: deps.redis, env: deps.env, organization };
  } catch (error) {
    console.error("Context creation error:", error);
    // Return context without session if auth fails
    return { prisma: deps.db, session: null, redis: deps.redis, env: deps.env, organization: null };
  }
}
export type Context = inferAsyncReturnType<typeof createContext>;