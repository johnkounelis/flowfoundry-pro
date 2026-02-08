"use client";
import { trpc } from "@/lib/trpc";
import { Card, Button, Badge } from "@flowfoundry/ui";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageBanner } from "@/components/MessageBanner";

function ConnectorsPageContent() {
  const { data: session } = useSession();
  const { data: connectors, refetch, isLoading } = trpc.connectors.list.useQuery();
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [configData, setConfigData] = useState<Record<string, any>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const saveGmailCredential = trpc.connectors.saveGmailCredential.useMutation();
  const upsertCredential = trpc.connectors.upsertCredential.useMutation();
  const testConnector = trpc.connectors.test.useMutation();

  // Handle OAuth callback for Gmail connector
  useEffect(() => {
    const connectorId = searchParams.get("connector");
    const email = searchParams.get("email");
    
    if (connectorId && email && connectorId.includes("gmail") && session?.user?.id) {
      const handleOAuthCallback = async () => {
        try {
          await saveGmailCredential.mutateAsync({
            email: decodeURIComponent(email)
          });
          
          setMessage({ type: "success", text: "Gmail connector configured successfully!" });
          refetch();
          router.replace("/connectors");
          setShowConfigModal(null);
        } catch (error: any) {
          setMessage({ type: "error", text: `Failed to save Gmail credentials: ${error.message}` });
        }
      };
      
      handleOAuthCallback();
    }
  }, [searchParams, router, saveGmailCredential, session?.user?.id, refetch]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleConfigure = (connectorId: string) => {
    setShowConfigModal(connectorId);
    setConfigData({});
  };

  const handleSaveConfig = async (connectorId: string) => {
    const connectorType = connectors?.find(c => c.id === connectorId)?.type;
    
    if (!connectorType) {
      setMessage({ type: "error", text: "Connector type not found." });
      return;
    }

    try {
      if (connectorType === "gmail") {
        const email = configData.email;
        if (!email) {
          setMessage({ type: "error", text: "Please enter your Gmail address." });
          return;
        }
        // Redirect to OAuth flow with connector context
        window.location.href = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(`/connectors?connector=${connectorId}&email=${encodeURIComponent(email)}`)}`;
      } else if (connectorType === "slack") {
        const webhookUrl = configData.webhookUrl;
        if (!webhookUrl) {
          setMessage({ type: "error", text: "Please enter the Slack Webhook URL." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({ 
          webhookUrl, 
          defaultChannel: configData.defaultChannel || "#general" 
        })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: "Slack connector configured successfully!" });
        refetch();
        setShowConfigModal(null);
      } else if (connectorType === "http") {
        const baseUrl = configData.baseUrl;
        if (!baseUrl) {
          setMessage({ type: "error", text: "Please enter the Base URL for HTTP connector." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({ 
          baseUrl, 
          apiKey: configData.apiKey || "" 
        })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: "HTTP connector configured successfully!" });
        refetch();
        setShowConfigModal(null);
      } else if (connectorType === "webhook") {
        const webhookUrl = configData.webhookUrl;
        if (!webhookUrl) {
          setMessage({ type: "error", text: "Please enter the Webhook URL." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({
          webhookUrl,
          secret: configData.secret || ""
        })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: "Webhook connector configured successfully!" });
        refetch();
        setShowConfigModal(null);
      } else if (connectorType === "notion") {
        const apiKey = configData.apiKey;
        if (!apiKey) {
          setMessage({ type: "error", text: "Please enter your Notion Integration Token." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({
          apiKey,
          databaseId: configData.databaseId || ""
        })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: "Notion connector configured successfully!" });
        refetch();
        setShowConfigModal(null);
      } else if (connectorType === "sheets") {
        const serviceAccountKey = configData.serviceAccountKey;
        if (!serviceAccountKey) {
          setMessage({ type: "error", text: "Please enter your Google Service Account JSON Key." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({
          serviceAccountKey,
          spreadsheetId: configData.spreadsheetId || ""
        })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: "Google Sheets connector configured successfully!" });
        refetch();
        setShowConfigModal(null);
      } else {
        // Generic connector - save apiKey
        const apiKey = configData.apiKey;
        if (!apiKey) {
          setMessage({ type: "error", text: "Please enter credentials." });
          return;
        }
        const envelope = Buffer.from(JSON.stringify({ apiKey })).toString("base64");
        await upsertCredential.mutateAsync({ connectorId, envelopeB64: envelope });
        setMessage({ type: "success", text: `${connectorType} connector configured successfully!` });
        refetch();
        setShowConfigModal(null);
      }
    } catch (error: any) {
      setMessage({ type: "error", text: `Failed to save configuration: ${error.message}` });
    }
  };

  const handleTestConnector = async (connectorId: string) => {
    try {
      const result = await testConnector.mutateAsync({ connectorId });
      setMessage({ type: "success", text: `Test successful: ${result.message}` });
    } catch (error: any) {
      setMessage({ type: "error", text: `Test failed: ${error.message}` });
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case "slack":
        return "💬";
      case "gmail":
        return "📧";
      case "http":
        return "🌐";
      case "webhook":
        return "🔗";
      case "notion":
        return "📝";
      case "sheets":
        return "📊";
      default:
        return "🔌";
    }
  };

  const getConnectorDescription = (type: string) => {
    switch (type) {
      case "slack":
        return "Send messages to Slack channels and threads";
      case "gmail":
        return "Send emails via Gmail API";
      case "http":
        return "Make HTTP requests to any API";
      case "webhook":
        return "Trigger external webhooks";
      case "notion":
        return "Create pages and databases in Notion";
      case "sheets":
        return "Read and write Google Sheets data";
      default:
        return "Connect to external services";
    }
  };

  const renderConfigForm = (connectorId: string, connectorType: string) => {
    switch (connectorType) {
      case "slack":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, webhookUrl: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Channel
              </label>
              <input
                type="text"
                placeholder="#general"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, defaultChannel: e.target.value})}
              />
            </div>
          </div>
        );
      case "gmail":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gmail Account
              </label>
              <input
                type="email"
                placeholder="user@gmail.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, email: e.target.value})}
              />
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-800">
                You&apos;ll be redirected to Google OAuth to authorize Gmail access.
              </p>
            </div>
          </div>
        );
      case "http":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base URL
              </label>
              <input
                type="url"
                placeholder="https://api.example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, baseUrl: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key (optional)
              </label>
              <input
                type="password"
                placeholder="Your API key"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, apiKey: e.target.value})}
              />
            </div>
          </div>
        );
      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/webhook"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, webhookUrl: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secret (optional)
              </label>
              <input
                type="password"
                placeholder="Webhook signing secret"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, secret: e.target.value})}
              />
            </div>
          </div>
        );
      case "notion":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notion Integration Token
              </label>
              <input
                type="password"
                placeholder="secret_..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, apiKey: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Database ID (optional)
              </label>
              <input
                type="text"
                placeholder="abc123def456..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, databaseId: e.target.value})}
              />
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-800">
                Create an internal integration at notion.so/my-integrations and share the target pages/databases with it.
              </p>
            </div>
          </div>
        );
      case "sheets":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google Service Account JSON Key
              </label>
              <textarea
                placeholder='{"type": "service_account", ...}'
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, serviceAccountKey: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Spreadsheet ID (optional)
              </label>
              <input
                type="text"
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, spreadsheetId: e.target.value})}
              />
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-800">
                Share your Google Sheet with the service account email to grant access.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Configuration for {connectorType} connector. Enter your credentials below.
            </p>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                placeholder="Enter API key"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => setConfigData({...configData, apiKey: e.target.value})}
              />
            </div>
          </div>
        );
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
        <h2 className="text-2xl font-semibold">Connectors</h2>
        <Button variant="secondary">
          Add Custom Connector
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading connectors...</div>
      ) : connectors && connectors.length > 0 ? (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connectors.map((c) => (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getConnectorIcon(c.type)}</span>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color="gray">
                        {c.type}
                      </Badge>
                      {c.configured && (
                        <Badge color="green">
                          Configured
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {getConnectorDescription(c.type)}
              </p>
              
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => handleConfigure(c.id)}
                  className="flex-1"
                  disabled={upsertCredential.isPending || saveGmailCredential.isPending}
                >
                  Configure
                </Button>
                <Button 
                  variant="secondary" 
                  className="px-3"
                  onClick={() => handleTestConnector(c.id)}
                  disabled={testConnector.isPending || !c.configured}
                >
                  {testConnector.isPending ? "Testing..." : "Test"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      ) : (
        <Card className="text-center py-12">
          <div className="text-gray-500">
            <div className="text-4xl mb-4">🔌</div>
            <h3 className="text-lg font-semibold mb-2">No connectors available</h3>
            <p className="text-sm">Connectors will be available once your organization is set up.</p>
          </div>
        </Card>
      )}

      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">
                Configure {connectors?.find(c => c.id === showConfigModal)?.name}
              </h3>
              {renderConfigForm(showConfigModal, connectors?.find(c => c.id === showConfigModal)?.type || "")}
              <div className="mt-6 flex gap-3">
                <Button 
                  onClick={() => handleSaveConfig(showConfigModal)}
                  className="flex-1"
                  disabled={upsertCredential.isPending || saveGmailCredential.isPending}
                >
                  {upsertCredential.isPending || saveGmailCredential.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => setShowConfigModal(null)}
                  className="flex-1"
                  disabled={upsertCredential.isPending || saveGmailCredential.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ConnectorsPage() {
  return (
    <Suspense fallback={
      <div className="py-10">
        <h2 className="mb-6 text-2xl font-semibold">Connectors</h2>
        <div className="text-center py-8 text-gray-600">Loading connectors...</div>
      </div>
    }>
      <ConnectorsPageContent />
    </Suspense>
  );
}
