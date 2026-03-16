"use client";

import { useEffect, useMemo, useState } from "react";

type AccountUser = {
  id: string;
  email: string;
  name: string | null;
  mfaEnabled: boolean;
  mfaSetupAvailable: boolean;
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

type MfaSetupState = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
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

  const [mfaCurrentPassword, setMfaCurrentPassword] = useState("");
  const [mfaSetupCode, setMfaSetupCode] = useState("");
  const [mfaDisableCode, setMfaDisableCode] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MfaSetupState | null>(null);
  const [mfaMessage, setMfaMessage] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSaving, setMfaSaving] = useState(false);

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

  async function loadAccount() {
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
  }

  useEffect(() => {
    void loadAccount();
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

  async function startMfaSetup() {
    setMfaError(null);
    setMfaMessage(null);

    if (!mfaCurrentPassword) {
      setMfaError("Current password is required to start MFA setup");
      return;
    }

    setMfaSaving(true);

    const response = await fetch("/api/admin/account/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        currentPassword: mfaCurrentPassword
      })
    });

    const body = (await response.json()) as { setup?: MfaSetupState; message?: string };
    setMfaSaving(false);

    if (!response.ok || !body.setup) {
      setMfaError(body.message ?? "Failed to start MFA setup");
      return;
    }

    setMfaSetup(body.setup);
    setMfaSetupCode("");
    setMfaMessage("Scan the QR code with your authenticator app, then confirm with a 6-digit code.");
  }

  async function enableMfa() {
    setMfaError(null);
    setMfaMessage(null);

    if (!mfaCurrentPassword) {
      setMfaError("Current password is required to enable MFA");
      return;
    }

    if (!mfaSetupCode) {
      setMfaError("Enter the 6-digit authenticator code");
      return;
    }

    setMfaSaving(true);

    const response = await fetch("/api/admin/account/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enable",
        currentPassword: mfaCurrentPassword,
        code: mfaSetupCode
      })
    });

    const body = (await response.json()) as { message?: string };
    setMfaSaving(false);

    if (!response.ok) {
      setMfaError(body.message ?? "Failed to enable MFA");
      return;
    }

    setMfaSetup(null);
    setMfaSetupCode("");
    setMfaCurrentPassword("");
    setMfaMessage("Multi-factor authentication is now enabled.");
    await loadAccount();
  }

  async function disableMfa() {
    setMfaError(null);
    setMfaMessage(null);

    if (!mfaCurrentPassword) {
      setMfaError("Current password is required to disable MFA");
      return;
    }

    if (!mfaDisableCode) {
      setMfaError("Enter your current 6-digit MFA code");
      return;
    }

    setMfaSaving(true);

    const response = await fetch("/api/admin/account/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "disable",
        currentPassword: mfaCurrentPassword,
        code: mfaDisableCode
      })
    });

    const body = (await response.json()) as { message?: string };
    setMfaSaving(false);

    if (!response.ok) {
      setMfaError(body.message ?? "Failed to disable MFA");
      return;
    }

    setMfaDisableCode("");
    setMfaCurrentPassword("");
    setMfaSetup(null);
    setMfaMessage("Multi-factor authentication has been disabled.");
    await loadAccount();
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

      <div className="card">
        <h2>Multi-factor Authentication</h2>
        {!user ? <p className="muted">Loading MFA settings...</p> : null}
        {user && !user.mfaSetupAvailable ? (
          <div className="alert warn">
            MFA is disabled for this deployment because <code>MFA_ENCRYPTION_KEY</code> has not been configured yet.
          </div>
        ) : null}
        {user && user.mfaSetupAvailable ? (
          <>
            <p className="muted">
              Status: <strong>{user.mfaEnabled ? "Enabled" : "Not enabled"}</strong>
            </p>

            <div className="grid two">
              <div>
                <label className="label">Current password</label>
                <input
                  className="input"
                  type="password"
                  value={mfaCurrentPassword}
                  onChange={(event) => setMfaCurrentPassword(event.target.value)}
                />
              </div>
              {user.mfaEnabled ? (
                <div>
                  <label className="label">Current MFA code</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={mfaDisableCode}
                    onChange={(event) => setMfaDisableCode(event.target.value)}
                    placeholder="123456"
                  />
                </div>
              ) : (
                <div>
                  <label className="label">Setup verification code</label>
                  <input
                    className="input"
                    inputMode="numeric"
                    value={mfaSetupCode}
                    onChange={(event) => setMfaSetupCode(event.target.value)}
                    placeholder="123456"
                  />
                </div>
              )}
            </div>

            {!user.mfaEnabled ? (
              <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
                <button className="btn ghost" type="button" onClick={startMfaSetup} disabled={mfaSaving}>
                  {mfaSaving ? "Preparing..." : mfaSetup ? "Regenerate MFA setup" : "Generate MFA setup"}
                </button>
                <button className="btn primary" type="button" onClick={enableMfa} disabled={mfaSaving || !mfaSetup}>
                  {mfaSaving ? "Enabling..." : "Enable MFA"}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: "0.8rem" }}>
                <button className="btn ghost" type="button" onClick={disableMfa} disabled={mfaSaving}>
                  {mfaSaving ? "Disabling..." : "Disable MFA"}
                </button>
              </div>
            )}

            {mfaSetup ? (
              <div className="card" style={{ marginTop: "1rem" }}>
                <h3>Authenticator Setup</h3>
                <p className="muted">Scan this QR code in Google Authenticator, 1Password, Microsoft Authenticator, or a similar app.</p>
                <img
                  src={mfaSetup.qrCodeDataUrl}
                  alt="MFA QR code"
                  style={{ width: 220, maxWidth: "100%", height: "auto", border: "1px solid var(--line)" }}
                />
                <div style={{ marginTop: "0.8rem" }}>
                  <label className="label">Manual setup key</label>
                  <input className="input" value={mfaSetup.secret} readOnly />
                </div>
              </div>
            ) : null}

            {mfaMessage ? <div className="alert success" style={{ marginTop: "0.8rem" }}>{mfaMessage}</div> : null}
            {mfaError ? <div className="alert error" style={{ marginTop: "0.8rem" }}>{mfaError}</div> : null}
          </>
        ) : null}
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
                  <th>MFA</th>
                  <th>Status</th>
                  <th>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdminUsers ? (
                  <tr>
                    <td colSpan={6}>Loading admin users...</td>
                  </tr>
                ) : adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No admin users found.</td>
                  </tr>
                ) : (
                  adminUsers.map((adminUser) => (
                    <tr key={adminUser.id}>
                      <td>{adminUser.email}</td>
                      <td>{adminUser.name || "-"}</td>
                      <td>{adminUser.roles.join(", ")}</td>
                      <td>{adminUser.mfaEnabled ? "Enabled" : "Disabled"}</td>
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
