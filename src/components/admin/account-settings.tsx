"use client";

import { useEffect, useMemo, useState } from "react";

type AccountUser = {
  id: string;
  email: string;
  name: string | null;
  mfaEnabled: boolean;
  activeStatus: boolean;
  lastLoginAt: string | null;
  roles: string[];
};

type ManagedAdminUser = {
  id: string;
  email: string;
  name: string | null;
  activeStatus: boolean;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  roles: string[];
};

export function AccountSettingsPanel() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [adminUsers, setAdminUsers] = useState<ManagedAdminUser[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminIsAdminRole, setNewAdminIsAdminRole] = useState(true);
  const [newAdminIsReportingRole, setNewAdminIsReportingRole] = useState(true);
  const [adminCreateMessage, setAdminCreateMessage] = useState<string | null>(null);
  const [adminCreateError, setAdminCreateError] = useState<string | null>(null);
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const canManageAdmins = useMemo(() => Boolean(user?.roles.includes("admin")), [user?.roles]);

  async function loadAdminUsers() {
    setLoadingAdminUsers(true);
    const response = await fetch("/api/admin/admin-users");
    const body = (await response.json()) as { users?: ManagedAdminUser[]; message?: string };

    setLoadingAdminUsers(false);

    if (!response.ok) {
      setAdminCreateError(body.message ?? "Failed to load admin users");
      return;
    }

    setAdminUsers(body.users ?? []);
  }

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/account");
      const body = (await response.json()) as { user?: AccountUser | null; message?: string };

      if (!response.ok || !body.user) {
        setError(body.message ?? "Failed to load account settings");
        return;
      }

      setUser(body.user);
      setEmail(body.user.email);
      setName(body.user.name ?? "");

      if (body.user.roles.includes("admin")) {
        await loadAdminUsers();
      }
    })();
  }, []);

  async function save() {
    setError(null);
    setMessage(null);

    if (!currentPassword) {
      setError("Current password is required");
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError("New password and confirmation do not match");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        email,
        name,
        newPassword: newPassword || undefined
      })
    });

    const body = (await response.json()) as { user?: AccountUser; message?: string };

    setSaving(false);

    if (!response.ok || !body.user) {
      setError(body.message ?? "Failed to save account settings");
      return;
    }

    setUser(body.user);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Account settings updated successfully");
  }

  async function createAdminUser() {
    setAdminCreateError(null);
    setAdminCreateMessage(null);

    const roles = [
      ...(newAdminIsAdminRole ? ["admin"] : []),
      ...(newAdminIsReportingRole ? ["reporting"] : [])
    ];

    if (roles.length === 0) {
      setAdminCreateError("Select at least one role");
      return;
    }

    if (!newAdminEmail || !newAdminPassword) {
      setAdminCreateError("Email and temporary password are required");
      return;
    }

    setCreatingAdmin(true);

    const response = await fetch("/api/admin/admin-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newAdminEmail,
        name: newAdminName,
        password: newAdminPassword,
        roles
      })
    });

    const body = (await response.json()) as { user?: ManagedAdminUser; message?: string };
    setCreatingAdmin(false);

    if (!response.ok || !body.user) {
      setAdminCreateError(body.message ?? "Failed to create admin user");
      return;
    }

    setNewAdminEmail("");
    setNewAdminName("");
    setNewAdminPassword("");
    setNewAdminIsAdminRole(true);
    setNewAdminIsReportingRole(true);
    setAdminCreateMessage(`Admin user created: ${body.user.email}`);
    await loadAdminUsers();
  }

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Admin Account Settings</h2>
        {user ? (
          <p className="muted">
            Logged in as <strong>{user.email}</strong>
          </p>
        ) : (
          <p className="muted">Loading account...</p>
        )}

        <div className="grid two">
          <div>
            <label className="label">Username (email)</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label">Display name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Change Password</h2>
        <div className="grid two">
          <div>
            <label className="label">Current password</label>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">New password (optional)</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: "0.8rem" }}>
          <button className="btn primary" type="button" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save account settings"}
          </button>
        </div>

        {message ? <div className="alert success" style={{ marginTop: "0.8rem" }}>{message}</div> : null}
        {error ? <div className="alert error" style={{ marginTop: "0.8rem" }}>{error}</div> : null}
      </div>

      {canManageAdmins ? (
        <div className="card">
          <h2>Admin User Management</h2>
          <p className="muted">Create additional admin/reporting users.</p>

          <div className="grid two">
            <div>
              <label className="label">New admin email</label>
              <input
                className="input"
                type="email"
                value={newAdminEmail}
                onChange={(event) => setNewAdminEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="label">Display name (optional)</label>
              <input className="input" value={newAdminName} onChange={(event) => setNewAdminName(event.target.value)} />
            </div>
            <div>
              <label className="label">Temporary password</label>
              <input
                className="input"
                type="password"
                value={newAdminPassword}
                onChange={(event) => setNewAdminPassword(event.target.value)}
              />
            </div>
            <div>
              <label className="label">Roles</label>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={newAdminIsAdminRole}
                    onChange={(event) => setNewAdminIsAdminRole(event.target.checked)}
                  />
                  <span>Admin</span>
                </label>
                <label style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={newAdminIsReportingRole}
                    onChange={(event) => setNewAdminIsReportingRole(event.target.checked)}
                  />
                  <span>Reporting</span>
                </label>
              </div>
            </div>
          </div>

          <div style={{ marginTop: "0.8rem" }}>
            <button className="btn primary" type="button" onClick={createAdminUser} disabled={creatingAdmin}>
              {creatingAdmin ? "Creating..." : "Add admin user"}
            </button>
          </div>

          {adminCreateMessage ? <div className="alert success" style={{ marginTop: "0.8rem" }}>{adminCreateMessage}</div> : null}
          {adminCreateError ? <div className="alert error" style={{ marginTop: "0.8rem" }}>{adminCreateError}</div> : null}

          <div style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdminUsers ? (
                  <tr>
                    <td colSpan={5}>Loading admin users...</td>
                  </tr>
                ) : adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No admin users found.</td>
                  </tr>
                ) : (
                  adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td>{adminUser.email}</td>
                      <td>{adminUser.name || "-"}</td>
                      <td>{adminUser.roles.join(", ")}</td>
                      <td>{adminUser.activeStatus ? "Active" : "Inactive"}</td>
                      <td>{adminUser.lastLoginAt ? new Date(adminUser.lastLoginAt).toLocaleString() : "Never"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
