import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <strong>USUHS DOM- Faculty Feedback</strong>
          <div className="nav-links">
            <Link href="/search">Find Faculty</Link>
            <Link href="/admin">Admin Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="container grid two">
          <article className="card">
            <h1>USUHS DOM- Faculty Feedback</h1>
            <p className="muted">
              Students can submit anonymous feedback by scanning a faculty QR code or searching for a faculty member.
            </p>
            <p>
              No student login is required. No student-identifying data is collected by the application.
            </p>
            <Link className="btn primary" href="/search">
              Search Faculty
            </Link>
          </article>

          <article className="card">
            <h2>How it works</h2>
            <ol>
              <li>Choose a faculty member</li>
              <li>Select curriculum phase</li>
              <li>Complete current survey</li>
              <li>Submit anonymously</li>
            </ol>
            <p className="muted">Faculty receive aggregate digest emails only.</p>
          </article>
        </section>
      </main>
    </>
  );
}
