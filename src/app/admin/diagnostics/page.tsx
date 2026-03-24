import { prisma } from "@/lib/db/prisma";
import { requireAdminPageSession } from "@/lib/auth/guards";

export default async function DiagnosticsPage() {
  await requireAdminPageSession("/admin/diagnostics");

  let dbStatus = "ok";
  let dbMessage = "Database reachable";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = "error";
    dbMessage = error instanceof Error ? error.message : "Unknown database error";
  }

  const emailProvider = process.env.EMAIL_PROVIDER ?? "noop";
  const envChecks: Array<[string, boolean]> = [
    ["DATABASE_URL", Boolean(process.env.DATABASE_URL)],
    ["NEXTAUTH_SECRET", Boolean(process.env.NEXTAUTH_SECRET)],
    ["APP_BASE_URL", Boolean(process.env.APP_BASE_URL)],
    ["EMAIL_PROVIDER", Boolean(process.env.EMAIL_PROVIDER)],
    ...(emailProvider === "postmark"
      ? ([
          ["POSTMARK_API_TOKEN", Boolean(process.env.POSTMARK_API_TOKEN)],
          ["POSTMARK_SENDER_EMAIL", Boolean(process.env.POSTMARK_SENDER_EMAIL)]
        ] as Array<[string, boolean]>)
      : []),
    ...(emailProvider === "sendgrid"
      ? ([
          ["SENDGRID_API_KEY", Boolean(process.env.SENDGRID_API_KEY)],
          ["SENDGRID_FROM_EMAIL", Boolean(process.env.SENDGRID_FROM_EMAIL)]
        ] as Array<[string, boolean]>)
      : []),
    ...(emailProvider === "resend"
      ? ([
          ["RESEND_API_KEY", Boolean(process.env.RESEND_API_KEY)],
          ["RESEND_FROM_EMAIL", Boolean(process.env.RESEND_FROM_EMAIL)]
        ] as Array<[string, boolean]>)
      : []),
    ["TURNSTILE_SITE_KEY", Boolean(process.env.TURNSTILE_SITE_KEY)],
    ["TURNSTILE_SECRET_KEY", Boolean(process.env.TURNSTILE_SECRET_KEY)],
    ["MFA_ENCRYPTION_KEY", Boolean(process.env.MFA_ENCRYPTION_KEY)],
    ["CRON_SECRET", Boolean(process.env.CRON_SECRET)]
  ];

  return (
    <div className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h2>Health Diagnostics</h2>
        <p>
          Database: <strong>{dbStatus}</strong>
        </p>
        <p className="muted">{dbMessage}</p>
      </div>

      <div className="card">
        <h2>Environment Checks</h2>
        <p className="muted">Resolved email provider: {emailProvider}</p>
        <table className="table">
          <thead>
            <tr>
              <th>Variable</th>
              <th>Configured</th>
            </tr>
          </thead>
          <tbody>
            {envChecks.map(([name, configured]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>
                  <span className={`badge ${configured ? "green" : "gray"}`}>{configured ? "Yes" : "No"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
