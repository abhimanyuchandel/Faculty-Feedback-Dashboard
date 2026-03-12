import { env } from "@/lib/env";

type CaptchaResult = {
  success: boolean;
  score?: number;
};

export async function verifyCaptcha(token: string): Promise<CaptchaResult> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Explicit local fallback for development/test mode.
    return { success: process.env.NODE_ENV !== "production", score: 0.5 };
  }

  const formData = new URLSearchParams();
  formData.set("secret", env.TURNSTILE_SECRET_KEY);
  formData.set("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    return { success: false };
  }

  const data = (await response.json()) as { success: boolean; score?: number };
  return { success: data.success, score: data.score };
}
