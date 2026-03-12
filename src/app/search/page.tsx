import Link from "next/link";
import { FacultySearch } from "@/components/public/faculty-search";

export default function SearchPage() {
  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1rem" }}>
          <Link href="/" className="btn ghost">
            Home
          </Link>
        </div>
        <FacultySearch />
      </section>
    </main>
  );
}
