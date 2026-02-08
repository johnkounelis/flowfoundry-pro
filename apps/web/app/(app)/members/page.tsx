"use client";
import { trpc } from "@/lib/trpc";
import { Card, Button, Badge } from "@flowfoundry/ui";
import { useState } from "react";
import { MessageBanner } from "@/components/MessageBanner";

export default function MembersPage() {
  const { data, refetch } = trpc.orgs.members.useQuery();
  const invite = trpc.orgs.invite.useMutation();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("BUILDER");
  const [showRoleModal, setShowRoleModal] = useState<string | null>(null);

  const changeRole = trpc.orgs.changeRole.useMutation();
  const removeMember = trpc.orgs.removeMember.useMutation();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInvite = async () => {
    if (!inviteEmail) {
      setMessage({ type: "error", text: "Please enter an email address." });
      return;
    }

    try {
      await invite.mutateAsync({ email: inviteEmail, role: inviteRole });
      setShowInviteForm(false);
      setInviteEmail("");
      setMessage({ type: "success", text: "Invitation sent successfully!" });
      // Refetch members list
      refetch();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to send invitation. Please try again." });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await changeRole.mutateAsync({ userId, role: newRole });
      setMessage({ type: "success", text: `Role changed to ${newRole} successfully!` });
      setShowRoleModal(null);
      // Refetch members list
      refetch();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to change role. Please try again." });
    }
  };

  const handleRemoveMember = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove ${email} from the organization?`)) {
      return;
    }

    try {
      await removeMember.mutateAsync({ userId });
      setMessage({ type: "success", text: `Member ${email} removed successfully!` });
      // Refetch members list
      refetch();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Failed to remove member. Please try again." });
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
        <h2 className="text-2xl font-semibold">Members</h2>
        <Button onClick={() => setShowInviteForm(true)}>
          Invite teammate
        </Button>
      </div>

      {showInviteForm && (
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Invite New Member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="BUILDER">Builder</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleInvite} disabled={!inviteEmail || invite.isPending}>
                  {invite.isPending ? "Sending..." : "Send Invitation"}
                </Button>
                <Button variant="secondary" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3">
        {data?.map((m) => (
          <Card key={m.userId}>
            <div className="flex items-center justify-between p-4">
              <div>
                <div className="font-medium">{m.email}</div>
                <div className="text-sm mt-1">
                  <Badge color="blue">{m.role}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowRoleModal(m.userId)}
                >
                  Change Role
                </Button>
                {m.role !== "OWNER" && (
                  <Button 
                    variant="danger"
                    onClick={() => handleRemoveMember(m.userId, m.email)}
                    disabled={removeMember.isPending}
                  >
                    {removeMember.isPending ? "Removing..." : "Remove"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Change Role</h3>
              <p className="mb-4 text-sm text-gray-600">
                Select a new role for this member.
              </p>
              <div className="space-y-3">
                {["VIEWER", "BUILDER", "ADMIN"].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(showRoleModal, role)}
                    disabled={changeRole.isPending}
                    className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="font-medium">{role}</div>
                    <div className="text-sm text-gray-600">
                      {role === "VIEWER" && "Can view flows and runs"}
                      {role === "BUILDER" && "Can create and edit flows"}
                      {role === "ADMIN" && "Can manage organization settings"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setShowRoleModal(null)}>
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
