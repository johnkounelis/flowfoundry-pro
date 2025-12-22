import { prisma } from "@flowfoundry/db";
import { type inferAsyncReturnType } from "@trpc/server";
import { readEnv } from "@flowfoundry/config";
import Redis from "ioredis";
import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";

const env = readEnv();

export async function createContext(_opts: { req: Request }) {
  try {
    // Get session using NextAuth - it will read cookies from the request automatically
    const session = await auth();
    const redis = new Redis(env.REDIS_URL);
    
    // Get user's organization if session exists
    let organization = null;
    if (session?.user?.id) {
      const membership = await prisma.membership.findFirst({
        where: { userId: session.user.id },
        include: { org: true }
      });
      organization = membership?.org || null;
    }
    
    return { prisma, session, redis, env, organization };
  } catch (error) {
    console.error("Context creation error:", error);
    // Return context without session if auth fails
    const redis = new Redis(env.REDIS_URL);
    return { prisma, session: null, redis, env, organization: null };
  }
}
export type Context = inferAsyncReturnType<typeof createContext>;