import { z } from "zod";
import { readEnv } from "@flowfoundry/config";
import Stripe from "stripe";
import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const billingRouter = t.router({
  checkout: t.procedure.input(z.object({ plan: z.enum(["PRO", "BUSINESS"]) })).mutation(async ({ input, ctx }) => {
    const env = readEnv();
    
    // Only use mock mode if explicitly enabled
    if (env.STRIPE_MOCK === "1") {
      return { url: "/billing?mock=1" };
    }

    // Validate Stripe configuration - throw error if not configured
    if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY === "sk_test_xxx") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stripe secret key is not configured. Please set STRIPE_SECRET_KEY environment variable."
      });
    }

    const priceId = input.plan === "PRO" ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_BUSINESS;
    if (!priceId || priceId === "price_pro_test" || priceId === "price_business_test") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Stripe price ID for ${input.plan} plan is not configured. Please set STRIPE_PRICE_${input.plan} environment variable.`
      });
    }

    // Get user session for customer email
    let customerEmail: string | undefined;
    let customerId: string | undefined;
    
    if (ctx.session?.user?.id) {
      try {
        // Get user's organization
        const membership = await ctx.prisma.membership.findFirst({
          where: { userId: ctx.session.user.id },
          include: { org: { include: { subscriptions: { where: { status: "active" }, take: 1 } } } }
        });

        if (membership?.org) {
          // Check if we already have a Stripe customer ID
          const existingSubscription = membership.org.subscriptions[0];
          if (existingSubscription?.stripeCustomerId) {
            customerId = existingSubscription.stripeCustomerId;
          }
        }

        // Get user email
        if (ctx.session?.user?.email) {
          customerEmail = ctx.session.user.email;
        }
      } catch (error) {
        console.error("Error getting user info for checkout:", error);
        // Continue without customer info - Stripe will create customer during checkout
      }
    }

    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
      
      // Create or find customer
      if (!customerId && customerEmail) {
        // Try to find existing customer by email
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0 && existingCustomers.data[0]) {
          customerId = existingCustomers.data[0].id;
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: customerEmail,
            metadata: {
              userId: ctx.session?.user?.id || "unknown",
            }
          });
          customerId = customer.id;
        }
      }
      
      // Create checkout session
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${env.APP_URL || "http://localhost:3000"}/billing?success=1`,
        cancel_url: `${env.APP_URL || "http://localhost:3000"}/billing?canceled=1`
      };

      // Add customer if we have one
      if (customerId) {
        sessionConfig.customer = customerId;
      } else if (customerEmail) {
        sessionConfig.customer_email = customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe checkout session URL is missing"
        });
      }

      return { url: session.url };
    } catch (error: any) {
      console.error("Checkout error:", error);
      
      // If it's a Stripe error, provide more details
      if (error?.type === "StripeInvalidRequestError" || error?.type === "StripeAuthenticationError") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stripe error: ${error.message || "Invalid request. Please check your Stripe configuration."}`
        });
      }

      // Re-throw TRPCErrors
      if (error instanceof TRPCError) {
        throw error;
      }

      // For unexpected errors, provide a generic message
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create checkout session: ${error.message || "Unknown error"}`
      });
    }
  }),
  portal: t.procedure.mutation(async ({ ctx }) => {
    const env = readEnv();
    
    // Only use mock mode if explicitly enabled
    if (env.STRIPE_MOCK === "1") {
      return { url: "/billing?portal=mock" };
    }

    // Validate Stripe configuration - throw error if not configured
    if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY === "sk_test_xxx") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stripe secret key is not configured. Please set STRIPE_SECRET_KEY environment variable."
      });
    }

    // Get user session
    if (!ctx.session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be signed in to manage your subscription."
      });
    }

    try {
      const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
      
      // Try to get customer ID from database first
      let customerId: string | null = null;
      
      // Get user's organization
      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: { include: { subscriptions: { where: { status: "active" }, take: 1 } } } }
      });

      if (membership?.org) {
        // Get active subscription from database
        const subscription = membership.org.subscriptions[0];
        if (subscription?.stripeCustomerId) {
          customerId = subscription.stripeCustomerId;
        }
      }

      // If no customer ID in database, try to find by user email
      if (!customerId && ctx.session.user.email) {
        try {
          const customers = await stripe.customers.list({
            email: ctx.session.user.email || undefined,
            limit: 1
          });
          
          if (customers.data.length > 0 && customers.data[0]) {
            customerId = customers.data[0].id;
            
            // Update database with customer ID if we found it
            if (membership?.org) {
              // Check if subscription exists
              const existingSub = await ctx.prisma.subscription.findFirst({
                where: { orgId: membership.org.id }
              });
              
              if (existingSub) {
                await ctx.prisma.subscription.update({
                  where: { id: existingSub.id },
                  data: { stripeCustomerId: customerId }
                });
              } else {
                await ctx.prisma.subscription.create({
                  data: {
                    orgId: membership.org.id,
                    stripeCustomerId: customerId,
                    plan: "FREE",
                    status: "active"
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error("Error finding customer by email:", error);
        }
      }

      if (!customerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active subscription found. Please subscribe to a plan first."
        });
      }
      
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${env.APP_URL || "http://localhost:3000"}/billing`
      });

      if (!portal.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe portal URL is missing"
        });
      }

      return { url: portal.url };
    } catch (error: any) {
      console.error("Portal error:", error);
      
      // Re-throw TRPCErrors
      if (error instanceof TRPCError) {
        throw error;
      }

      // If it's a Stripe error, provide more details
      if (error?.type === "StripeInvalidRequestError" || error?.type === "StripeAuthenticationError") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stripe error: ${error.message || "Invalid request. Please check your Stripe configuration."}`
        });
      }

      // For unexpected errors, provide a generic message
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to create portal session: ${error.message || "Unknown error"}`
      });
    }
  }),
  usage: t.procedure.query(async ({ ctx }) => {
    // Get user session
    if (!ctx.session?.user?.id) {
      // Return default values if not authenticated
      return {
        flows: { used: 0, limit: 2, unlimited: false },
        runs: { used: 0, limit: 100, unlimited: false },
        tokens: { used: 0, unlimited: true },
        cost: 0,
        plan: "FREE",
        hasActiveSubscription: false
      };
    }

    try {
      // Get user's organization
      const membership = await ctx.prisma.membership.findFirst({
        where: { userId: ctx.session.user.id },
        include: { org: true }
      });

      if (!membership) {
        // Return default values if no organization
        return {
          flows: { used: 0, limit: 2, unlimited: false },
          runs: { used: 0, limit: 100, unlimited: false },
          tokens: { used: 0, unlimited: true },
          cost: 0,
          plan: "FREE",
          hasActiveSubscription: false
        };
      }

      const orgId = membership.org.id;

      // Get current month's start
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get flows count
      const flowsCount = await ctx.prisma.flow.count({
        where: { orgId }
      });

      // Get runs this month
      const runs = await ctx.prisma.run.findMany({
        where: {
          orgId,
          createdAt: { gte: monthStart }
        },
        select: {
          tokens: true,
          costUsd: true
        }
      });

      const runsCount = runs.length;
      const totalTokens = runs.reduce((sum, run) => sum + (run.tokens || 0), 0);
      const totalCost = runs.reduce((sum, run) => sum + Number(run.costUsd || 0), 0);

      // Get subscription to determine limits
      const subscription = await ctx.prisma.subscription.findFirst({
        where: { orgId, status: "active" }
      });

      const plan = subscription?.plan || "FREE";
      
      // Plan limits (from config)
      const limits: Record<string, { flows: number; runs: number }> = {
        FREE: { flows: 2, runs: 100 },
        PRO: { flows: 20, runs: 10000 },
        BUSINESS: { flows: 9999, runs: 50000 }
      };

      const planLimits = limits[plan] || limits.FREE || { flows: 2, runs: 100 };

      // Check if subscription has Stripe customer ID (indicates active paid subscription)
      const hasStripeCustomer = subscription?.stripeCustomerId ? true : false;

      return {
        flows: {
          used: flowsCount,
          limit: planLimits.flows === 9999 ? null : planLimits.flows,
          unlimited: planLimits.flows === 9999
        },
        runs: {
          used: runsCount,
          limit: planLimits.runs,
          unlimited: false
        },
        tokens: {
          used: totalTokens,
          unlimited: true
        },
        cost: totalCost,
        plan,
        hasActiveSubscription: hasStripeCustomer && (plan === "PRO" || plan === "BUSINESS")
      };
    } catch (error: any) {
      console.error("Usage error:", error);
      
      // Return default values on error instead of throwing
      // This allows the page to still render
      return {
        flows: { used: 0, limit: 2, unlimited: false },
        runs: { used: 0, limit: 100, unlimited: false },
        tokens: { used: 0, unlimited: true },
        cost: 0,
        plan: "FREE",
        hasActiveSubscription: false
      };
    }
  })
});


