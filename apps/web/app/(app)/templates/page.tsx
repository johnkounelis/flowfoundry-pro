"use client";
import { trpc } from "@/lib/trpc";
import { Card, Button, Badge } from "@flowfoundry/ui";
import { useState } from "react";
import { MessageBanner } from "@/components/MessageBanner";
import { useRouter } from "next/navigation";

const templateIcons: Record<string, string> = {
  "support-triage-ai": "🎫",
  "lead-notify": "📈",
  "webhook-to-slack": "🔗",
  "api-monitor": "🔍",
  "email-digest": "📬"
};

export default function TemplatesPage() {
  const router = useRouter();
  const { data, isLoading } = trpc.templates.list.useQuery();
  const useTemplate = trpc.templates.useTemplate.useMutation();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const handleUseTemplate = async (key: string, name: string) => {
    setLoadingKey(key);
    try {
      const result = await useTemplate.mutateAsync({ key });
      setMessage({ type: "success", text: `Template "${name}" applied successfully!` });
      setTimeout(() => {
        router.push(`/flows/builder?flowId=${result.flowId}`);
      }, 800);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to use template. Please try again." });
    } finally {
      setLoadingKey(null);
    }
  };

  const getNodeCount = (template: any): number => {
    const def = template.definition as any;
    return def?.nodes?.length || 0;
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
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Templates</h2>
        <p className="text-gray-600 mt-1">Get started quickly with pre-built workflow templates</p>
      </div>
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((t) => (
            <Card key={t.key} className="hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{templateIcons[t.key] || "📋"}</span>
                  <Badge color="blue">{getNodeCount(t)} nodes</Badge>
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{t.description}</p>
                <Button
                  onClick={() => handleUseTemplate(t.key, t.name)}
                  disabled={loadingKey === t.key}
                  className="w-full"
                >
                  {loadingKey === t.key ? "Creating flow..." : "Use Template"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {data && data.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-semibold mb-2">No templates available</h3>
            <p className="text-sm">Run the database seed to populate templates.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
