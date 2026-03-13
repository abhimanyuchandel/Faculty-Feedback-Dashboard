import { prisma } from "@/lib/db/prisma";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function AuditLogsPage() {
  await requireAdminPageSession("/admin/audit");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      adminUser: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });

  return (
    <div className="card">
      <h2>Audit Logs</h2>
      <p className="muted">Tracks administrative actions for accountability and compliance.</p>
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Admin</th>
            <th>Action</th>
            <th>Entity</th>
            <th>Entity ID</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.adminUser?.email ?? "system"}</td>
              <td>{log.action}</td>
              <td>{log.entityType}</td>
              <td>{log.entityId ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
