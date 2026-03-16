import { headers } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { requireAdminPageSession } from "@/lib/auth/guards";
import { facultyFeedbackUrl } from "@/services/qr-service";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function QrAdminPage({ searchParams }: Props) {
  await requireAdminPageSession("/admin/qr");

  const q = (await searchParams).q?.trim() ?? "";
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : undefined;

  const faculty = q
    ? await prisma.faculty.findMany({
        where: {
          activeStatus: true,
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { primaryEmail: { contains: q, mode: "insensitive" } },
            { secondaryEmail: { contains: q, mode: "insensitive" } }
          ]
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 50
      })
    : [];

  return (
    <div className="card">
      <h2>Faculty QR Codes</h2>
      <p className="muted">Search by name or email to load up to 50 faculty sorted alphabetically by last name.</p>
      <form method="GET" style={{ marginBottom: "0.8rem", display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="input"
          name="q"
          defaultValue={q}
          placeholder="Search by last name or email"
          style={{ minWidth: "320px" }}
        />
        <button className="btn primary" type="submit">
          Search
        </button>
        {q ? (
          <a className="btn ghost" href="/admin/qr">
            Clear
          </a>
        ) : null}
      </form>
      {!q ? <p className="muted">No faculty are shown until you run a search.</p> : null}
      {q && faculty.length === 0 ? <p className="muted">No matching faculty found.</p> : null}
      {faculty.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th>Faculty</th>
              <th>Feedback URL</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {faculty.map((member) => (
              <tr key={member.id}>
                <td>
                  {member.firstName} {member.lastName}
                </td>
                <td>{facultyFeedbackUrl(member.publicToken, baseUrl)}</td>
                <td>
                  <a className="btn ghost" href={`/api/admin/qr/faculty/${member.id}`}>
                    Download PNG
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
