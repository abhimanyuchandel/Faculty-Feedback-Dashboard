import { describe, expect, it } from "vitest";
import { redactPotentialPII } from "@/lib/privacy/redaction";

describe("redactPotentialPII", () => {
  it("redacts email addresses", () => {
    const result = redactPotentialPII("Reach me at student@example.edu");
    expect(result).toContain("[redacted-email]");
    expect(result).not.toContain("student@example.edu");
  });

  it("redacts phone numbers", () => {
    const result = redactPotentialPII("Call 212-555-0188");
    expect(result).toContain("[redacted-phone]");
    expect(result).not.toContain("212-555-0188");
  });
});
