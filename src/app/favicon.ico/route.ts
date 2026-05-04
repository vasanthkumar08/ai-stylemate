import { NextResponse } from "next/server";

export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#05070d"/>
    <path d="M22 20h20l6 10-7 4v18H23V34l-7-4 6-10Z" fill="#fff"/>
    <path d="M25 20c1.5 3.5 4 5.2 7 5.2s5.5-1.7 7-5.2" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
