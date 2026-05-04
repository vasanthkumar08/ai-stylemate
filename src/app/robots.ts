import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/env-url";

export default function robots(): MetadataRoute.Robots {
  const appUrl = getAppUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api", "/login", "/signup", "/reset-password", "/forgot-password"]
    },
    sitemap: `${appUrl}/sitemap.xml`
  };
}
