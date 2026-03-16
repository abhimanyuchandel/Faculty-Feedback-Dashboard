import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "crypto";
import QRCode from "qrcode";
import { env } from "@/lib/env";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const MFA_ISSUER = "Faculty Teaching Feedback";
const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;
const TOTP_WINDOW_STEPS = 1;

type MfaSetup = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
};

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let encoded = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      encoded += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    encoded += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return encoded;
}

function base32Decode(value: string): Buffer {
  const normalized = value.toUpperCase().replace(/[\s-]/g, "").replace(/=+$/g, "");

  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error("Invalid base32 secret");
    }

    accumulator = (accumulator << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function deriveEncryptionKey(): Buffer {
  if (!env.MFA_ENCRYPTION_KEY) {
    throw new Error("MFA encryption key is not configured");
  }

  return createHash("sha256").update(env.MFA_ENCRYPTION_KEY).digest();
}

function hotp(secret: string, counter: bigint): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);

  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

function normalizeTotpCode(code: string): string {
  return code.replace(/\s+/g, "");
}

export function isMfaAvailable(): boolean {
  return Boolean(env.MFA_ENCRYPTION_KEY);
}

export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function generateTotpCode(secret: string, at = new Date()): string {
  const counter = BigInt(Math.floor(at.getTime() / 1000 / TOTP_PERIOD_SECONDS));
  return hotp(secret, counter);
}

export function verifyTotpCode(secret: string, code: string, at = new Date()): boolean {
  const normalizedCode = normalizeTotpCode(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    const comparisonTime = new Date(at.getTime() + offset * TOTP_PERIOD_SECONDS * 1000);
    const expectedCode = generateTotpCode(secret, comparisonTime);
    const expected = Buffer.from(expectedCode);
    const provided = Buffer.from(normalizedCode);

    if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
      return true;
    }
  }

  return false;
}

export function encryptMfaSecret(secret: string): string {
  const key = deriveEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${ciphertext.toString("base64url")}:${authTag.toString("base64url")}`;
}

export function decryptMfaSecret(payload: string): string {
  const [version, rawIv, rawCiphertext, rawAuthTag] = payload.split(":");

  if (version !== "v1" || !rawIv || !rawCiphertext || !rawAuthTag) {
    throw new Error("Invalid MFA secret payload");
  }

  const key = deriveEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(rawIv, "base64url"));
  decipher.setAuthTag(Buffer.from(rawAuthTag, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(rawCiphertext, "base64url")),
    decipher.final()
  ]);

  return plaintext.toString("utf8");
}

export async function createMfaSetup(email: string): Promise<MfaSetup> {
  const secret = generateTotpSecret();
  const label = encodeURIComponent(`${MFA_ISSUER}:${email}`);
  const issuer = encodeURIComponent(MFA_ISSUER);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240
  });

  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl
  };
}
