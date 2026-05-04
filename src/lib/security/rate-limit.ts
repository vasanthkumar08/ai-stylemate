import type { NextRequest } from "next/server";
import { getClientIp } from "./http";

type RateLimitConfig = {
  bucket: string;
  windowMs: number;
  max: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(request: NextRequest, config: RateLimitConfig) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const key = `${config.bucket}:${ip}:${userAgent.slice(0, 80)}`;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: now + config.windowMs,
      key
    };
  }

  if (current.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      key
    };
  }

  current.count += 1;

  return {
    allowed: true,
    remaining: config.max - current.count,
    resetAt: current.resetAt,
    key
  };
}
