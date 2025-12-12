"use client";
import { Button, Card, Badge } from "@flowfoundry/ui";
import Link from "next/link";

export default function LandingPage() {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      title: "AI-Powered Automation",
      description: "Classify, summarize, and extract data with built-in AI steps powered by GPT-4.",
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      title: "100+ Integrations",
      description: "Connect Slack, Gmail, Notion, Sheets, Webhooks, and more out of the box.",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Visual Flow Builder",
      description: "Drag and drop nodes, connect them visually, and deploy complex workflows in minutes.",
      color: "bg-amber-50 text-amber-600",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: "Real-time Observability",
      description: "Monitor runs, track token usage, costs, and success rates with OTEL integration.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      title: "Team Collaboration",
      description: "Role-based access control with Owner, Admin, Builder, and Viewer roles.",
      color: "bg-purple-50 text-purple-600",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      title: "Enterprise Security",
      description: "OWASP ASVS L2, encrypted secrets, CodeQL scanning, audit logs, and SOC 2 posture.",
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Get started with basic automation",
      features: ["5 flows", "100 runs/month", "Basic connectors", "Community support"],
      cta: "Get Started Free",
      popular: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "month",
      description: "For growing teams",
      features: ["Unlimited flows", "10,000 runs/month", "All connectors", "AI steps included", "Priority support"],
      cta: "Start Pro Trial",
      popular: true,
    },
    {
      name: "Business",
      price: "$99",
      period: "month",
      description: "For enterprises at scale",
      features: ["Everything in Pro", "Unlimited runs", "Custom connectors", "Team management", "SSO & 24/7 support"],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900">FlowFoundry Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <Link href="/docs" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Docs</Link>
              <Link href="/auth/signin" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Sign In</Link>
              <Link href="/auth/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-cyan-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center max-w-4xl mx-auto">
            <Badge color="indigo" className="mb-6 px-3 py-1">Open Source Workflow Platform</Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
              Automate anything with{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                AI-powered workflows
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Connect your apps, add AI intelligence, and build powerful automations
              that run 24/7. Visual builder, real-time monitoring, team collaboration.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="px-8 py-3 text-base">Start Building Free</Button>
              </Link>
              <Link href="/docs">
                <Button variant="secondary" size="lg" className="px-8 py-3 text-base">
                  Read the Docs
                </Button>
              </Link>
            </div>
            <p className="text-sm text-gray-400 mt-6">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything you need to automate
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A full-stack platform built with Next.js, tRPC, Prisma, Inngest, and Stripe.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <Card key={i} className="p-6 hover:shadow-card-hover transition-shadow group">
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">Built with modern technologies</p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-gray-400 text-sm font-medium">
            {["Next.js 14", "TypeScript", "tRPC", "Prisma", "Tailwind CSS", "Inngest", "Stripe", "NextAuth.js", "Playwright", "Docker", "Kubernetes", "Terraform"].map((t) => (
              <span key={t} className="hover:text-gray-600 transition-colors">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free, scale as you grow</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card key={i} className={`p-8 relative ${plan.popular ? "ring-2 ring-indigo-600 shadow-lg" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge color="indigo" className="px-3 py-1">Most Popular</Badge>
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 text-left">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-3 text-sm text-gray-600">
                        <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/signup" className="block">
                    <Button className="w-full" variant={plan.popular ? "primary" : "secondary"}>
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to automate your workflows?
          </h2>
          <p className="text-lg text-indigo-100 mb-10 max-w-2xl mx-auto">
            Join teams already using FlowFoundry Pro to save time and scale operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button variant="secondary" size="lg" className="px-8 py-3 text-base">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-white">FlowFoundry Pro</span>
              </div>
              <p className="text-sm">AI-powered workflow automation platform for modern teams.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">API Docs</Link></li>
                <li><a href="https://github.com/johnkounelis/flowfoundry-pro" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>&copy; 2026 John Kounelis. MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
