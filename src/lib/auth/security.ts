import { cookies, headers } from "next/headers";
import { env } from "@/config/env";
import { verifySignedCsrfToken } from "@/lib/auth/csrf-token";
import { CSRF_COOKIE_NAME } from "./constants";
import type { AuthActionState } from "./action-state";

const authActionAttempts = new Map<string, { count: number; resetAt: number }>();

export type { AuthActionState };

export async function verifyCsrfToken(formData: FormData) {
  const cookieStore = await cookies();
  const submittedToken = formData.get("csrfToken");
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (
    typeof submittedToken !== "string" ||
    submittedToken.length < 32 ||
    (submittedToken !== cookieToken && !verifySignedCsrfToken(submittedToken))
  ) {
    throw new Error("Your secure form session expired. Refresh the page and try again.");
  }
}

export async function verifySameOriginRequest() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (!origin) {
    return;
  }

  const appOrigin = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  const requestOrigin = getOriginFromHeaders(headerStore);

  if (origin !== requestOrigin && origin !== appOrigin) {
    throw new Error("This authentication request was blocked because it came from another site.");
  }
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (origin) {
    return origin;
  }

  return getOriginFromHeaders(headerStore);
}

function getOriginFromHeaders(headerStore: Headers) {
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");

  if (!host) {
    return new URL(env.NEXT_PUBLIC_APP_URL).origin;
  }

  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (host.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

export async function enforceAuthActionRateLimit(action: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headerStore.get("x-real-ip") || "unknown";
  const key = `${action}:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;
  const maxAttempts = 8;
  const current = authActionAttempts.get(key);

  if (!current || current.resetAt <= now) {
    authActionAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= maxAttempts) {
    throw new Error("Too many attempts. Please wait a minute before trying again.");
  }

  current.count += 1;
}

export async function validateAuthAction(action: string, formData: FormData) {
  await enforceAuthActionRateLimit(action);
  await verifySameOriginRequest();
  await verifyCsrfToken(formData);
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
