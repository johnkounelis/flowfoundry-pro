"use client";
import { trpc } from "@/lib/trpc";
import { useParams } from "next/navigation";
import { Card, Badge } from "@flowfoundry/ui";
import Link from "next/link";

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = trpc.runs.get.useQuery({ id });

  const formatDuration = (startedAt?: Date | string | null, finishedAt?: Date | string | null) => {
    if (!startedAt || !finishedAt) return "N/A";
    const start = new Date(startedAt);
    const finish = new Date(finishedAt);
    const ms = finish.getTime() - start.getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="text-center">Loading run details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8">
        <div className="text-center text-red-600">Run not found</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-2 text-2xl font-semibold">Run Details</h2>
          <div className="flex items-center gap-3">
            <Badge color={data.status === "succeeded" ? "green" : data.status === "failed" ? "red" : data.status === "running" ? "blue" : "gray"}>
              {data.status}
            </Badge>
            {data.flowId && (
              <Link href={`/flows/${data.flowId}`} className="text-sm text-indigo-600 hover:underline">
                View Flow: {data.flow}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Tokens</div>
            <div className="text-2xl font-bold">{data.tokens?.toLocaleString() || 0}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Cost</div>
            <div className="text-2xl font-bold">${data.costUsd?.toFixed(4) || "0.0000"}</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-sm text-gray-500 mb-1">Duration</div>
            <div className="text-2xl font-bold">
              {formatDuration(data.startedAt, data.finishedAt)}
            </div>
          </div>
        </Card>
      </div>

      {data.startedAt && (
        <Card className="mb-6">
          <div className="p-4">
            <h3 className="font-semibold mb-3">Execution Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium">{new Date(data.startedAt).toLocaleString()}</span>
              </div>
              {data.finishedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Finished:</span>
                  <span className="font-medium">{new Date(data.finishedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <h3 className="font-semibold mb-4 p-4 border-b">Execution Steps</h3>
        {data.steps && Array.isArray(data.steps) && data.steps.length > 0 ? (
          <div className="divide-y">
            {data.steps.map((step: any, index: number) => (
              <div key={step.id || index} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{step.name || `Step ${index + 1}`}</span>
                      <Badge 
                        color={
                          step.status === "succeeded" ? "green" : 
                          step.status === "failed" ? "red" : 
                          step.status === "running" ? "blue" : 
                          "gray"
                        }
                      >
                        {step.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Type: {step.type || "unknown"}
                      {step.startedAt && (
                        <> • Started: {new Date(step.startedAt).toLocaleString()}</>
                      )}
                      {step.finishedAt && (
                        <> • Duration: {formatDuration(step.startedAt, step.finishedAt)}</>
                      )}
                    </div>
                  </div>
                </div>
                {step.error && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Error:</strong> {step.error}
                  </div>
                )}
                {step.logs && typeof step.logs === "object" && Object.keys(step.logs).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-indigo-600 cursor-pointer hover:underline">
                      View logs
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-48">
                      {JSON.stringify(step.logs, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>No execution steps available</p>
          </div>
        )}
      </Card>

      {data.triggerPayload && (
        <Card>
          <h3 className="font-semibold mb-2 p-4 border-b">Trigger Payload</h3>
          <div className="p-4">
            <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-96">
              {JSON.stringify(data.triggerPayload, null, 2)}
            </pre>
          </div>
        </Card>
      )}
    </div>
  );
}
