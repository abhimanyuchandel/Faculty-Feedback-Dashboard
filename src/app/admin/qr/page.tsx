import { prisma } from "@/lib/db/prisma";
import { facultyFeedbackUrl } from "@/services/qr-service";

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function QrAdminPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() ?? "";

  const faculty = await prisma.faculty.findMany({
    where: {
      activeStatus: true,
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { primaryEmail: { contains: q, mode: "insensitive" } },
              { secondaryEmail: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 1000
  });

  return (
    <div className="card">
      <h2>Faculty QR Codes</h2>
      <p className="muted">Download individual QR images or use session pages for bulk printable packets.</p>
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
              <td>{facultyFeedbackUrl(member.publicToken)}</td>
              <td>
                <a className="btn ghost" href={`/api/admin/qr/faculty/${member.id}`}>
                  Download PNG
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
