"use client";
import Link from "next/link";
import { Button, Card, Badge } from "@flowfoundry/ui";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { MessageBanner } from "@/components/MessageBanner";
import { useRouter } from "next/navigation";

function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return past.toLocaleDateString();
}

export default function FlowsPage() {
  const router = useRouter();
  const { data, refetch } = trpc.flows.list.useQuery();
  const createFlow = trpc.flows.create.useMutation();
  const duplicateFlow = trpc.flows.duplicate.useMutation();
  const archiveFlow = trpc.flows.archive.useMutation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      setMessage({ type: "error", text: "Please enter a flow name." });
      return;
    }

    try {
      const result = await createFlow.mutateAsync({
        name: newFlowName,
        description: newFlowDescription,
        definition: {
          nodes: [
            {
              id: "trigger-1",
              type: "TRIGGER",
              name: "Start",
              position: { x: 100, y: 100 },
              data: {}
            }
          ],
          edges: []
        }
      });
      setShowCreateModal(false);
      setNewFlowName("");
      setNewFlowDescription("");
      setMessage({ type: "success", text: "Flow created successfully!" });
      refetch();
      // Redirect to flow builder
      setTimeout(() => {
        router.push(`/flows/builder?flowId=${result.id}`);
      }, 1000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to create flow. Please try again." });
    }
  };

  const handleDuplicate = async (flowId: string, flowName: string) => {
    try {
      const result = await duplicateFlow.mutateAsync({ flowId });
      setMessage({ type: "success", text: `Flow "${flowName}" duplicated successfully!` });
      refetch();
      setTimeout(() => {
        router.push(`/flows/${result.id}`);
      }, 1000);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to duplicate flow. Please try again." });
    }
  };

  const handleArchive = async (flowId: string, flowName: string) => {
    if (!confirm(`Are you sure you want to archive "${flowName}"?`)) {
      return;
    }

    try {
      await archiveFlow.mutateAsync({ flowId, archived: true });
      setMessage({ type: "success", text: `Flow "${flowName}" archived successfully!` });
      refetch();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to archive flow. Please try again." });
    }
  };

  const getFlowStatus = (flow: any) => {
    // Mock status based on flow data
    if (flow.currentVersion > 1) return "published";
    return "draft";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "green";
      case "draft": return "blue";
      case "archived": return "gray";
      default: return "gray";
    }
  };

  return (
    <div className="py-10">
      {message && (
        <MessageBanner
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Flows</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          New Flow
        </Button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Create New Flow</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Flow Name
                  </label>
                  <input
                    type="text"
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="My Awesome Flow"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newFlowDescription}
                    onChange={(e) => setNewFlowDescription(e.target.value)}
                    placeholder="Describe what this flow does..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <Button 
                  onClick={handleCreateFlow}
                  disabled={!newFlowName.trim() || createFlow.isPending}
                  className="flex-1"
                >
                  {createFlow.isPending ? "Creating..." : "Create Flow"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {data?.map((f) => {
          const status = getFlowStatus(f);
          return (
            <Card key={f.id} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{f.name}</h3>
                      <Badge color={getStatusColor(status)}>
                        {status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Version {f.currentVersion} • Last updated {timeAgo(f.updatedAt)}
                    </div>
                    <div className="text-sm text-gray-500">
                      No description provided
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link href={`/flows/${f.id}`}>
                      <Button variant="secondary">
                        Open
                      </Button>
                    </Link>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => handleDuplicate(f.id, f.name)}
                      disabled={duplicateFlow.isPending}
                    >
                      {duplicateFlow.isPending ? "..." : "Duplicate"}
                    </Button>
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleArchive(f.id, f.name)}
                      disabled={archiveFlow.isPending}
                    >
                      {archiveFlow.isPending ? "..." : "Archive"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {data?.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold mb-2">No flows yet</h3>
            <p className="text-sm mb-4">
              Create your first flow to automate your workflows
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Flow
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
