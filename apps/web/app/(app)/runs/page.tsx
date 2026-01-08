"use client";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Card, Badge, Button } from "@flowfoundry/ui";
import { useState } from "react";

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d" | "90d" | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = trpc.runs.list.useQuery({
    limit,
    offset: page * limit,
    status: statusFilter ? statusFilter as "queued" | "running" | "succeeded" | "failed" : undefined,
    timeRange
  });

  return (
    <div className="py-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Runs</h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={timeRange || ""}
            onChange={(e) => {
              setTimeRange(e.target.value ? e.target.value as "24h" | "7d" | "30d" | "90d" : undefined);
              setPage(0);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading runs...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 mb-6">
            {data?.runs.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.flowName}</div>
                    <div className="text-sm text-gray-600">
                      Started: {new Date(r.startedAt).toLocaleString()}
                      {r.finishedAt && ` • Finished: ${new Date(r.finishedAt).toLocaleString()}`}
                    </div>
                    {r.tokens > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {r.tokens.toLocaleString()} tokens • ${r.costUsd.toFixed(4)} cost
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge color={r.status === "succeeded" ? "green" : r.status === "failed" ? "red" : r.status === "running" ? "blue" : "gray"}>
                      {r.status}
                    </Badge>
                    <Link href={`/runs/${r.id}`}>
                      <Button variant="secondary" size="sm">Details</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {data && data.runs.length === 0 && (
            <Card className="text-center py-12">
              <div className="text-gray-500">
                <div className="text-4xl mb-4">🏃</div>
                <h3 className="text-lg font-semibold mb-2">No runs found</h3>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            </Card>
          )}

          {data && data.total > limit && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} runs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={!data.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
