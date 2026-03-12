import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/admin/logout-button";

export const metadata: Metadata = {
  title: "USUHS DOM- Faculty Feedback Dashboard"
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="page">
        <section className="container">{children}</section>
      </main>
    );
  }

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <strong>USUHS DOM- Faculty Feedback Dashboard</strong>
          <nav className="nav-links">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/faculty">Faculty</Link>
            <Link href="/admin/surveys">Surveys</Link>
            <Link href="/admin/feedback">Feedback</Link>
            <Link href="/admin/sessions">Sessions</Link>
            <Link href="/admin/qr">QR</Link>
            <Link href="/admin/digest">Digests</Link>
            <Link href="/admin/diagnostics">Diagnostics</Link>
            <Link href="/admin/account">Account</Link>
            <Link href="/admin/audit">Audit</Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      <main className="page">
        <section className="container">{children}</section>
      </main>
    </>
  );
}
