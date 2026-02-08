"use client";
import { Card, Button } from "@flowfoundry/ui";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MessageBanner } from "@/components/MessageBanner";

export default function SettingsPage() {
  const [dataRetention, setDataRetention] = useState("30");
  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
    webhook: false
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; createdAt: string | Date; masked: string }>>([]);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const { data: settings } = trpc.settings.getSettings.useQuery();
  const updateDataRetention = trpc.settings.updateDataRetention.useMutation();
  const updateNotifications = trpc.settings.updateNotifications.useMutation();
  const generateApiKey = trpc.settings.generateApiKey.useMutation();
  const { data: keysData, refetch: refetchKeys } = trpc.settings.listApiKeys.useQuery();
  const deleteApiKey = trpc.settings.deleteApiKey.useMutation();
  const exportData = trpc.settings.exportData.useMutation();
  const deleteAccount = trpc.settings.deleteAccount.useMutation();

  useEffect(() => {
    if (settings) {
      setDataRetention(settings.dataRetention || "30");
      setNotifications(settings.notifications || { email: true, slack: false, webhook: false });
    }
  }, [settings]);

  useEffect(() => {
    if (keysData) {
      setApiKeys(keysData);
    }
  }, [keysData]);

  const handleSaveDataRetention = async () => {
    try {
      await updateDataRetention.mutateAsync({ days: dataRetention as "7" | "30" | "90" | "365" | "forever" });
      setMessage({ type: "success", text: "Data retention settings saved successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to save settings. Please try again." });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotifications.mutateAsync(notifications);
      setMessage({ type: "success", text: "Notification settings saved successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to save settings. Please try again." });
    }
  };

  const handleGenerateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      setMessage({ type: "error", text: "Please enter a name for the API key." });
      return;
    }

    try {
      const result = await generateApiKey.mutateAsync({ name: newApiKeyName });
      setNewApiKey(result.apiKey);
      setShowApiKeyModal(true);
      setNewApiKeyName("");
      refetchKeys();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to generate API key. Please try again." });
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteApiKey.mutateAsync({ id });
      setMessage({ type: "success", text: "API key deleted successfully!" });
      refetchKeys();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to delete API key. Please try again." });
    }
  };

  const handleExportData = async () => {
    try {
      const result = await exportData.mutateAsync();
      if (result.data) {
        const dataStr = JSON.stringify(result.data, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `flowfoundry-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      setMessage({ type: "success", text: "Data exported successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to export data. Please try again." });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteAccount.mutateAsync();
      setMessage({ type: "success", text: "Account deletion initiated. You will receive a confirmation email." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to delete account. Please try again." });
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
      <h2 className="mb-6 text-2xl font-semibold">Settings</h2>
      
      <div className="space-y-6">
        <Card>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Data Retention</h3>
            <p className="mb-4 text-sm text-gray-600">
              Choose how long to retain run logs and execution data.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retention Period
              </label>
              <select 
                value={dataRetention} 
                onChange={(e) => setDataRetention(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="forever">Forever</option>
              </select>
            </div>
            <Button 
              onClick={handleSaveDataRetention} 
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={updateDataRetention.isPending}
            >
              {updateDataRetention.isPending ? "Saving..." : "Save Data Retention Settings"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Notifications</h3>
            <p className="mb-4 text-sm text-gray-600">
              Configure how you want to receive notifications about flow runs and system events.
            </p>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({...notifications, email: e.target.checked})}
                  className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Email notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifications.slack}
                  onChange={(e) => setNotifications({...notifications, slack: e.target.checked})}
                  className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Slack notifications</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={notifications.webhook}
                  onChange={(e) => setNotifications({...notifications, webhook: e.target.checked})}
                  className="mr-3 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Webhook notifications</span>
              </label>
            </div>
            <Button 
              onClick={handleSaveNotifications} 
              className="mt-4 bg-indigo-600 hover:bg-indigo-700"
              disabled={updateNotifications.isPending}
            >
              {updateNotifications.isPending ? "Saving..." : "Save Notification Settings"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">API Keys</h3>
            <p className="mb-4 text-sm text-gray-600">
              Manage your API keys for programmatic access to FlowFoundry Pro.
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={newApiKeyName}
                onChange={(e) => setNewApiKeyName(e.target.value)}
                placeholder="API key name"
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none mb-3"
              />
              <Button 
                variant="secondary"
                onClick={handleGenerateApiKey}
                disabled={generateApiKey.isPending || !newApiKeyName.trim()}
              >
                {generateApiKey.isPending ? "Generating..." : "Generate New Key"}
              </Button>
            </div>
            {apiKeys.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold mb-2">Existing Keys</h4>
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{key.name}</div>
                        <div className="text-xs text-gray-500">{key.masked}</div>
                        <div className="text-xs text-gray-400">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteApiKey(key.id)}
                        disabled={deleteApiKey.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showApiKeyModal && newApiKey && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm font-semibold mb-2">New API Key Generated:</p>
                <code className="block p-2 bg-white rounded border text-sm mb-2">{newApiKey}</code>
                <p className="text-xs text-yellow-800 mb-2">
                  Save this key now. You won&apos;t be able to see it again!
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowApiKeyModal(false);
                    setNewApiKey(null);
                  }}
                >
                  I&apos;ve saved it
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold text-red-600">Danger Zone</h3>
            <p className="mb-4 text-sm text-gray-600">
              Irreversible actions that will permanently affect your account.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleteAccount.isPending}
              >
                {deleteAccount.isPending ? "Processing..." : "Delete Account"}
              </Button>
              <Button 
                variant="secondary"
                onClick={handleExportData}
                disabled={exportData.isPending}
              >
                {exportData.isPending ? "Processing..." : "Export Data"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
