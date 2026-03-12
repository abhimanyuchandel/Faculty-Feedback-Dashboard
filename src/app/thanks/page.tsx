import Link from "next/link";

export default async function ThanksPage(props: { searchParams: Promise<{ digest?: string }> }) {
  const searchParams = await props.searchParams;
  const digestState = searchParams.digest;

  let message = "Thank you for your anonymous feedback.";
  let tone = "success";

  if (digestState === "unsubscribed") {
    message = "You have been unsubscribed from digest emails.";
  } else if (digestState === "resubscribed") {
    message = "You are now re-subscribed to digest emails.";
  } else if (digestState === "invalid") {
    message = "That link is invalid or expired.";
    tone = "warn";
  }

  return (
    <main className="page">
      <section className="container" style={{ maxWidth: "640px" }}>
        <div className="card">
          <h1>Confirmation</h1>
          <div className={`alert ${tone}`}>{message}</div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            Individual submissions are never shown to faculty. Feedback is sent only in anonymized digest batches.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <Link href="/" className="btn ghost">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
