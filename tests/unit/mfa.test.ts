import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    MFA_ENCRYPTION_KEY: "test-mfa-encryption-key",
    NEXTAUTH_SECRET: "test-nextauth-secret-1234567890"
  }
}));

import {
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpCode,
  generateTotpSecret,
  verifyTotpCode
} from "@/lib/mfa";

describe("mfa helpers", () => {
  it("encrypts and decrypts MFA secrets", () => {
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret);

    expect(decryptMfaSecret(encrypted)).toBe(secret);
  });

  it("verifies a valid TOTP code", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const at = new Date("2026-03-16T16:00:00.000Z");
    const code = generateTotpCode(secret, at);

    expect(verifyTotpCode(secret, code, at)).toBe(true);
  });
});
