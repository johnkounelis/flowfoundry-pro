"use client";
import { Card, Button, Badge } from "@flowfoundry/ui";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d">("7d");
  const [flowPage, setFlowPage] = useState(0);
  const flowsPerPage = 3;

  const { data: metrics, isLoading: metricsLoading } = trpc.runs.getMetrics.useQuery({ timeRange });
  const { data: runsData, isLoading: runsLoading } = trpc.runs.list.useQuery({ limit: 5, timeRange });
  const { data: flowsData, isLoading: flowsLoading } = trpc.flows.list.useQuery({ take: flowsPerPage, skip: flowPage * flowsPerPage });

  const recentRuns = runsData?.runs || [];
  const recentFlows = flowsData?.flows ?? [];
  const hasMoreFlows = flowsData?.hasMore ?? false;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "succeeded": return "green";
      case "failed": return "red";
      case "running": return "blue";
      default: return "gray";
    }
  };

  const metricCards = [
    {
      label: "Total Runs",
      value: metricsLoading ? "..." : (metrics?.totalRuns || 0).toLocaleString(),
      change: metrics?.changeFromPrevious?.totalRuns,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />,
    },
    {
      label: "Success Rate",
      value: metricsLoading ? "..." : `${Math.round(metrics?.successRate || 0)}%`,
      change: metrics?.changeFromPrevious?.successRate,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
    },
    {
      label: "Tokens Used",
      value: metricsLoading ? "..." : (metrics?.totalTokens || 0).toLocaleString(),
      change: metrics?.changeFromPrevious?.tokens,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />,
    },
    {
      label: "Total Cost",
      value: metricsLoading ? "..." : `$${(metrics?.totalCost || 0).toFixed(2)}`,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back! Here&apos;s an overview of your workflows.</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((m, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{m.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
                {m.change !== undefined && (
                  <p className={`text-xs mt-1 ${m.change >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {m.change >= 0 ? "+" : ""}{m.change.toFixed(0)}% vs last period
                  </p>
                )}
              </div>
              <div className={`w-10 h-10 ${m.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <svg className={`w-5 h-5 ${m.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {m.icon}
                </svg>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Runs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Recent Runs</h2>
            <Link href="/runs">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {runsLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : recentRuns.length > 0 ? (
              recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{run.flowName || "Unknown"}</p>
                      <p className="text-xs text-gray-400">{new Date(run.startedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Badge color={getStatusColor(run.status)}>{run.status}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm text-gray-400">No runs yet</p>
              </div>
            )}
          </div>
        </Card>

        {/* Active Flows */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">Active Flows</h2>
            <Link href="/flows">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
          <div className="space-y-2">
            {flowsLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
            ) : recentFlows.length > 0 ? (
              recentFlows.map((flow) => (
                <Link key={flow.id} href={`/flows/${flow.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{flow.name}</p>
                      <p className="text-xs text-gray-400">v{flow.currentVersion}</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))
            ) : (
              <div className="text-center py-10">
                <svg className="w-10 h-10 mx-auto text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-sm text-gray-400">No flows yet</p>
              </div>
            )}
          </div>
          {/* Pagination controls */}
          {(flowPage > 0 || hasMoreFlows) && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <Button variant="ghost" size="sm" disabled={flowPage === 0} onClick={() => setFlowPage((p) => Math.max(0, p - 1))}>
                Previous
              </Button>
              <span className="text-xs text-gray-400">Page {flowPage + 1}</span>
              <Button variant="ghost" size="sm" disabled={!hasMoreFlows} onClick={() => setFlowPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { href: "/flows/builder", label: "Create New Flow", desc: "Build a workflow from scratch", bg: "bg-indigo-50", color: "text-indigo-600", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /> },
            { href: "/templates", label: "Use Template", desc: "Start from a pre-built template", bg: "bg-emerald-50", color: "text-emerald-600", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
            { href: "/connectors", label: "Configure Connectors", desc: "Set up your integrations", bg: "bg-purple-50", color: "text-purple-600", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> },
          ].map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="p-5 hover:shadow-card-hover transition-all hover:border-gray-300 cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <svg className={`w-5 h-5 ${action.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {action.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
