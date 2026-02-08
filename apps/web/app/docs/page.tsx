"use client";
import { Card, Button } from "@flowfoundry/ui";

export default function Docs() {
  const docs = [
    {
      title: "Quickstart",
      description: "Get up and running with FlowFoundry Pro in minutes",
      href: "/docs/quickstart"
    },
    {
      title: "Architecture",
      description: "Understand the system architecture and components",
      href: "/docs/architecture"
    },
    {
      title: "Connector SDK",
      description: "Build custom connectors and integrations",
      href: "/docs/connector-sdk"
    },
    {
      title: "Deploy",
      description: "Deployment guides for production environments",
      href: "/docs/deploy"
    },
    {
      title: "Security",
      description: "Security best practices and compliance",
      href: "/docs/security"
    },
    {
      title: "Billing & Limits",
      description: "Understanding pricing, limits, and usage",
      href: "/docs/billing-limits"
    }
  ];

  return (
    <div className="py-10">
      <h2 className="mb-6 text-2xl font-semibold">Documentation</h2>
      <p className="mb-8 text-gray-700">
        Comprehensive guides to help you get the most out of FlowFoundry Pro.
      </p>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Card key={doc.title} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <h3 className="mb-2 text-lg font-semibold">{doc.title}</h3>
              <p className="mb-4 text-sm text-gray-600">{doc.description}</p>
              <Button 
                variant="secondary" 
                onClick={() => window.open(doc.href, '_blank')}
                className="w-full"
              >
                Read Guide
              </Button>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 rounded-lg bg-indigo-50 p-6">
        <h3 className="mb-2 text-lg font-semibold text-indigo-900">Need Help?</h3>
        <p className="mb-4 text-indigo-800">
          Can&apos;t find what you&apos;re looking for? Check out our comprehensive guides or reach out to our support team.
        </p>
        <div className="flex gap-4">
          <Button variant="secondary" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
            Contact Support
          </Button>
          <Button variant="secondary" className="border-indigo-300 text-indigo-700 hover:bg-indigo-100">
            Community Forum
          </Button>
        </div>
      </div>
    </div>
  );
}
