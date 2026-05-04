import { NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/http";

export function GET() {
  return applySecurityHeaders(
    NextResponse.json({
      ok: true,
      service: "StyleMate AI",
      timestamp: new Date().toISOString()
    })
  );
}
