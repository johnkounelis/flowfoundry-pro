"use client";
import { useState } from "react";
import { Button, Card, Badge } from "@flowfoundry/ui";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { MessageBanner } from "@/components/MessageBanner";
import { useRouter } from "next/navigation";

export default function FlowDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: flow, isLoading: loadingFlow } = trpc.flows.getById.useQuery({ id: params.id });
  const { data: recentRuns, isLoading: loadingRuns } = trpc.runs.getByFlow.useQuery({ flowId: params.id, limit: 10 });
  const triggerFlow = trpc.flows.trigger.useMutation();
  const duplicateFlow = trpc.flows.duplicate.useMutation();

  const handleRunFlow = async () => {
    try {
      await triggerFlow.mutateAsync({ flowId: params.id, payload: {} });
      setMessage({ type: "success", text: "Flow executed successfully! Check the runs page for details." });
      // Refresh runs after a short delay
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to execute flow. Please try again." });
    }
  };

  const handleDuplicateFlow = async () => {
    try {
      const result = await duplicateFlow.mutateAsync({ flowId: params.id });
      setMessage({ type: "success", text: "Flow duplicated successfully!" });
      setTimeout(() => {
        router.push(`/flows/${result.id}`);
      }, 1000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to duplicate flow. Please try again." });
    }
  };

  const handleExportFlow = () => {
    if (!flow) return;
    const dataStr = JSON.stringify(flow.definition, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${flow.name.replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Flow exported successfully!" });
  };

  if (loadingFlow) {
    return (
      <div className="py-10">
        <div className="text-center">Loading flow...</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="py-10">
        <div className="text-center text-red-600">Flow not found</div>
      </div>
    );
  }

  const successfulRuns = recentRuns?.filter(r => r.status === "succeeded").length || 0;
  const totalRuns = recentRuns?.length || 0;
  const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

  return (
    <div className="py-10">
      {message && (
        <MessageBanner
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold">{flow.name}</h1>
            <Badge color="blue">v{flow.currentVersion}</Badge>
          </div>
          <p className="text-gray-600">
            Created {new Date(flow.createdAt).toLocaleDateString()} • 
            Last updated {new Date(flow.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={handleRunFlow}
            disabled={triggerFlow.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {triggerFlow.isPending ? "Running..." : "Run Flow"}
          </Button>
          <Link href={`/flows/builder?flowId=${flow.id}`}>
            <Button variant="secondary">Edit Flow</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Flow Details */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Flow Definition</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 overflow-x-auto">
                  {JSON.stringify(flow.definition, null, 2)}
                </pre>
              </div>
            </div>
          </Card>

          {/* Recent Runs */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Runs</h3>
              {loadingRuns ? (
                <div className="text-center py-8 text-gray-500">Loading runs...</div>
              ) : recentRuns && recentRuns.length > 0 ? (
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <Link key={run.id} href={`/runs/${run.id}`}>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            run.status === 'succeeded' ? 'bg-green-500' : 
                            run.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <p className="font-medium text-sm">{run.flowName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(run.startedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge color={
                          run.status === 'succeeded' ? 'green' : 
                          run.status === 'failed' ? 'red' : 'blue'
                        }>
                          {run.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">🏃</div>
                  <p>No runs yet</p>
                  <p className="text-sm">Execute the flow to see run history</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Flow Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge color="green">Active</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version</span>
                  <span className="font-medium">v{flow.currentVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">{new Date(flow.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="font-medium">{new Date(flow.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  onClick={handleRunFlow}
                  disabled={triggerFlow.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {triggerFlow.isPending ? "Running..." : "Run Flow"}
                </Button>
                <Link href={`/flows/builder?flowId=${flow.id}`}>
                  <Button variant="secondary" className="w-full">
                    Edit Flow
                  </Button>
                </Link>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={handleDuplicateFlow}
                  disabled={duplicateFlow.isPending}
                >
                  {duplicateFlow.isPending ? "Duplicating..." : "Duplicate Flow"}
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full"
                  onClick={handleExportFlow}
                >
                  Export Flow
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Runs</span>
                  <span className="font-medium">{totalRuns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate</span>
                  <span className="font-medium">{successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Run</span>
                  <span className="font-medium">
                    {recentRuns && recentRuns.length > 0 
                      ? new Date(recentRuns[0]?.startedAt || new Date()).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}