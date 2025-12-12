import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@flowfoundry/db";
import { readEnv } from "@flowfoundry/config";
import bcrypt from "bcryptjs";

const env = readEnv();

type SessionUser = DefaultSession["user"] & { id: string };

// Helper function to ensure a user has at least one organization
async function ensureUserHasOrganization(userId: string) {
  try {
    // Check if user already has a membership
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { org: true }
    });

    if (membership) {
      return; // User already has an organization
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return; // User doesn't exist
    }

    // Create a default organization for the user
    const orgName = user.name 
      ? `${user.name}'s Organization` 
      : `${user.email.split('@')[0]}'s Organization`;
    const baseSlug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    
    // Check if slug exists and make it unique if needed
    let existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      let counter = 1;
      while (existing && counter < 100) {
        slug = `${baseSlug}-${counter}`;
        existing = await prisma.organization.findUnique({ where: { slug } });
        counter++;
      }
    }

    // Create organization
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: slug,
      }
    });

    // Add user as owner
    await prisma.membership.create({
      data: {
        userId: user.id,
        orgId: org.id,
        role: "OWNER"
      }
    });

    // Create default subscription
    await prisma.subscription.upsert({
      where: { id: org.id },
      update: {},
      create: {
        id: org.id,
        orgId: org.id,
        plan: "FREE",
        status: "active"
      }
    });
  } catch (error) {
    console.error("Error ensuring user has organization:", error);
    // Don't throw - we don't want to block sign in if this fails
  }
}

// Build providers array
const providers: Array<any> = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      try {
        if (!credentials?.email || !credentials?.password) {
          console.error("Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user) {
          console.error("User not found:", credentials.email);
          return null;
        }

        if (!user.password) {
          console.error("User has no password (OAuth user?)");
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) {
          console.error("Invalid password");
          return null;
        }

        // Return user object with required fields for JWT
        return {
          id: user.id,
          email: user.email || "",
          name: user.name || null,
          image: user.image || null
        };
      } catch (error) {
        console.error("Error in authorize:", error);
        return null;
      }
    }
  })
];

// Add Google provider if credentials are available
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile https://www.googleapis.com/auth/gmail.send"
        }
      }
    })
  );
}

// Add GitHub provider if credentials are available
if (env.GITHUB_ID && env.GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  session: { 
    strategy: "jwt", // Use JWT for credentials provider compatibility
    maxAge: 30 * 24 * 60 * 60 // 30 days default
  },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error"
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async jwt({ token, user, account }) {
      // When user signs in, add user info to token
      if (user) {
        token.id = user.id;
        token.email = user.email || "";
        token.name = user.name || null;
        token.image = user.image || null;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID from token to session
      if (token && session.user) {
        (session.user as SessionUser).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        
        // Ensure user has an organization (non-blocking, runs in background)
        if (token.id) {
          // Don't await - let it run in background to avoid blocking session creation
          ensureUserHasOrganization(token.id as string).catch(err => {
            console.error("Background org check failed:", err);
          });
        }
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user, account, profile }) {
      // For Credentials provider, user is already verified in authorize()
      // Allow sign in - JWT will be created automatically
      if (account?.provider === "credentials" && user?.id) {
        // Ensure user has at least one organization (non-blocking)
        // If this fails, it will be retried in the session callback
        ensureUserHasOrganization(user.id).catch(err => {
          console.error("Error ensuring organization in signIn callback:", err);
        });
        return true;
      }
      
      // For OAuth providers, the organization will be created in the session callback
      // after PrismaAdapter creates the user and account
      // Allow sign in for all providers
      // OAuth tokens are automatically stored in the Account table by PrismaAdapter
      return true;
    }
  }
});
