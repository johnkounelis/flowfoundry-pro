"use client";
import { Button, Card, Badge } from "@flowfoundry/ui";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout = trpc.billing.checkout.useMutation();
  const portal = trpc.billing.portal.useMutation();
  const usage = trpc.billing.usage.useQuery();
  const [currentPlan, setCurrentPlan] = useState("FREE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Update current plan and subscription status from usage data
  useEffect(() => {
    if (usage.data) {
      setCurrentPlan(usage.data.plan);
      // Check if user has an active subscription (with Stripe customer)
      setHasActiveSubscription(usage.data.hasActiveSubscription || false);
    }
  }, [usage.data]);

  // Handle URL parameters for success/cancel messages
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const mock = searchParams.get("mock");
    const portalMock = searchParams.get("portal");

    if (success === "1") {
      setMessage({ type: "success", text: "Payment successful! Your subscription has been activated." });
      // Clear the URL parameter
      router.replace("/billing");
    } else if (canceled === "1") {
      setMessage({ type: "error", text: "Checkout was canceled. No charges were made." });
      router.replace("/billing");
    } else if (mock === "1") {
      setMessage({ type: "success", text: "Mock checkout completed! (Stripe is in mock mode)" });
      router.replace("/billing");
    } else if (portalMock === "mock") {
      setMessage({ type: "success", text: "Mock portal opened! (Stripe is in mock mode)" });
      router.replace("/billing");
    }
  }, [searchParams, router]);

  // Handle checkout success/error
  useEffect(() => {
    if (checkout.isSuccess && checkout.data?.url) {
      setIsProcessing(true);
      // Redirect to Stripe checkout or mock page
      if (checkout.data.url.startsWith("http")) {
        window.location.href = checkout.data.url;
      } else {
        router.push(checkout.data.url);
      }
    }
    if (checkout.isError) {
      setIsProcessing(false);
      const errorMessage = checkout.error?.message || "Failed to start checkout. Please try again.";
      setMessage({ type: "error", text: errorMessage });
    }
  }, [checkout.isSuccess, checkout.isError, checkout.data, checkout.error, router]);

  // Handle portal success/error
  useEffect(() => {
    if (portal.isSuccess && portal.data?.url) {
      setIsProcessing(true);
      // Redirect to Stripe portal or mock page
      if (portal.data.url.startsWith("http")) {
        window.location.href = portal.data.url;
      } else {
        router.push(portal.data.url);
      }
    }
    if (portal.isError) {
      setIsProcessing(false);
      const errorMessage = portal.error?.message || "Failed to open customer portal. Please try again.";
      // Show helpful message if no subscription found
      if (errorMessage.includes("No active subscription") || errorMessage.includes("No organization")) {
        setMessage({ 
          type: "error", 
          text: "You don't have an active subscription. Please subscribe to a plan first." 
        });
      } else {
        setMessage({ type: "error", text: errorMessage });
      }
    }
  }, [portal.isSuccess, portal.isError, portal.data, portal.error, router]);

  const handleUpgrade = async (plan: "PRO" | "BUSINESS") => {
    setIsProcessing(true);
    checkout.mutate({ plan });
  };

  const handleManageSubscription = () => {
    setIsProcessing(true);
    portal.mutate();
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      features: ["5 flows", "100 runs/month", "Basic connectors", "Community support"],
      current: currentPlan === "FREE"
    },
    {
      name: "Pro",
      price: "$29",
      period: "per month",
      features: ["Unlimited flows", "10,000 runs/month", "All connectors", "AI steps", "Priority support"],
      current: currentPlan === "PRO"
    },
    {
      name: "Business",
      price: "$99",
      period: "per month",
      features: ["Everything in Pro", "Unlimited runs", "Custom connectors", "Team management", "SSO", "24/7 support"],
      current: currentPlan === "BUSINESS"
    }
  ];

  return (
    <div className="py-10">
      <h2 className="mb-6 text-2xl font-semibold">Billing & Plans</h2>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === "success" 
            ? "bg-green-50 border border-green-200 text-green-800" 
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mb-8">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-lg">Current Plan</div>
                <div className="text-sm text-gray-600 mt-1">
                  {currentPlan === "FREE" && "You're on the Free plan"}
                  {currentPlan === "PRO" && "You're on the Pro plan"}
                  {currentPlan === "BUSINESS" && "You're on the Business plan"}
                </div>
              </div>
              <Badge color={currentPlan === "FREE" ? "gray" : "blue"}>
                {currentPlan}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.current ? 'ring-2 ring-indigo-500' : ''}`}>
            <div className="p-6">
              {plan.current && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge color="blue">Current Plan</Badge>
                </div>
              )}
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold mb-1">{plan.price}</div>
                <div className="text-sm text-gray-600 mb-6">{plan.period}</div>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <div className="text-center">
                {plan.current ? (
                  <Button variant="secondary" disabled className="w-full">
                    Current Plan
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleUpgrade(plan.name.toUpperCase() as "PRO" | "BUSINESS")}
                    className="w-full"
                    variant={plan.name === "Pro" ? "primary" : "secondary"}
                    disabled={isProcessing || checkout.isPending}
                  >
                    {isProcessing || checkout.isPending 
                      ? "Processing..." 
                      : plan.name === "Free" 
                        ? "Downgrade" 
                        : `Upgrade to ${plan.name}`
                    }
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method</span>
                <span className="font-medium">**** **** **** 4242</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Next Billing Date</span>
                <span className="font-medium">Dec 1, 2025</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Billing Address</span>
                <span className="font-medium">123 Main St, City, State</span>
              </div>
            </div>
            <Button 
              variant="secondary" 
              onClick={handleManageSubscription}
              className="mt-4 w-full"
              disabled={isProcessing || portal.isPending || !hasActiveSubscription}
            >
              {isProcessing || portal.isPending ? "Processing..." : "Manage Subscription"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Usage This Month</h3>
            {usage.isLoading ? (
              <div className="text-center py-4 text-gray-600">Loading usage...</div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Flows</span>
                    <span className="font-medium">
                      {usage.data?.flows.used || 0} / {usage.data?.flows.unlimited ? "Unlimited" : (usage.data?.flows.limit || 2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Runs</span>
                    <span className="font-medium">
                      {(usage.data?.runs.used || 0).toLocaleString()} / {(usage.data?.runs.limit || 100).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tokens</span>
                    <span className="font-medium">
                      {Math.round((usage.data?.tokens.used || 0) / 1000).toLocaleString()}k / Unlimited
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cost</span>
                    <span className="font-medium">${(usage.data?.cost || 0).toFixed(2)}</span>
                  </div>
                </div>
                <Button 
                  variant="secondary" 
                  className="mt-4 w-full"
                  onClick={() => router.push("/runs")}
                >
                  View Detailed Usage
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="py-10">
        <h2 className="mb-6 text-2xl font-semibold">Billing & Plans</h2>
        <div className="text-center py-8">Loading...</div>
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}
