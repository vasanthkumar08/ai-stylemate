import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
import { CSRF_COOKIE_NAME } from "./constants";

const CSRF_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function getCsrfToken() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? createSignedCsrfToken();
}

export function createSignedCsrfToken() {
  const nonce = randomBytes(24).toString("base64url");
  const expiresAt = Date.now() + CSRF_TOKEN_TTL_MS;
  const payload = `${nonce}.${expiresAt}`;
  const signature = signCsrfPayload(payload);

  return `${payload}.${signature}`;
}

export function verifySignedCsrfToken(token: string) {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [nonce, expiresAtText, signature] = parts;
  const expiresAt = Number(expiresAtText);

  if (!nonce || !signature || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  const expectedSignature = signCsrfPayload(`${nonce}.${expiresAtText}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  return (
    signatureBuffer.length === expectedSignatureBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  );
}

function signCsrfPayload(payload: string) {
  return createHmac("sha256", getCsrfSecret()).update(payload).digest("base64url");
}

function getCsrfSecret() {
  return (
    env.SUPABASE_SERVICE_ROLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_APP_URL
  );
}
