import sgMail from "@sendgrid/mail";
import { env } from "@/lib/env";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendTransactionalEmail(payload: EmailPayload): Promise<string | null> {
  if (env.EMAIL_PROVIDER === "noop") {
    console.info("[email] noop delivery", {
      to: payload.to,
      subject: payload.subject
    });
    return `noop-${Date.now()}`;
  }

  if (env.EMAIL_PROVIDER === "sendgrid") {
    if (!env.SENDGRID_API_KEY) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[email] SENDGRID_API_KEY missing; skipping send in non-production mode.");
        return `dev-noop-sendgrid-${Date.now()}`;
      }
      throw new Error("SENDGRID_API_KEY missing");
    }

    sgMail.setApiKey(env.SENDGRID_API_KEY);
    const [response] = await sgMail.send({
      to: payload.to,
      from: env.POSTMARK_SENDER_EMAIL ?? "noreply@example.org",
      subject: payload.subject,
      html: payload.html,
      text: payload.text
    });

    return response.headers["x-message-id"] ?? null;
  }

  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[email] Resend config missing; skipping send in non-production mode.");
        return `dev-noop-resend-${Date.now()}`;
      }
      throw new Error("Resend configuration missing");
    }

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        })
      });
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[email] Resend network error in non-production; skipping send.", error);
        return `dev-noop-resend-network-${Date.now()}`;
      }
      throw error;
    }

    if (!response.ok) {
      const body = await response.text();
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[email] Resend non-2xx in non-production; skipping send. ${response.status} ${body}`);
        return `dev-noop-resend-status-${Date.now()}`;
      }
      throw new Error(`Resend send failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as { id?: string };
    return data.id ?? null;
  }

  // Postmark fallback via direct API call keeps dependencies minimal.
  if (!env.POSTMARK_API_TOKEN || !env.POSTMARK_SENDER_EMAIL) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] Postmark config missing; skipping send in non-production mode.");
      return `dev-noop-postmark-${Date.now()}`;
    }
    throw new Error("Postmark configuration missing");
  }

  let response: Response;
  try {
    response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Postmark-Server-Token": env.POSTMARK_API_TOKEN
      },
      body: JSON.stringify({
        From: env.POSTMARK_SENDER_EMAIL,
        To: payload.to,
        Subject: payload.subject,
        HtmlBody: payload.html,
        TextBody: payload.text,
        MessageStream: process.env.NODE_ENV === "production" ? "outbound" : "broadcast"
      })
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[email] Postmark network error in non-production; skipping send.", error);
      return `dev-noop-postmark-network-${Date.now()}`;
    }
    throw error;
  }

  if (!response.ok) {
    const body = await response.text();
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email] Postmark non-2xx in non-production; skipping send. ${response.status} ${body}`);
      return `dev-noop-postmark-status-${Date.now()}`;
    }
    throw new Error(`Postmark send failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as { MessageID?: string };
  return data.MessageID ?? null;
}
