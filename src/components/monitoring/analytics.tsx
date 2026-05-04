"use client";

import Script from "next/script";
import { useReportWebVitals } from "next/web-vitals";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function sendAnalyticsEvent(name: string, payload: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true") {
    return;
  }

  const body = JSON.stringify({
    name,
    payload,
    path: window.location.pathname
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics/event", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/analytics/event", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-StyleMate-Client": "web"
    },
    body,
    keepalive: true
  });
}

export function Analytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useReportWebVitals((metric) => {
    sendAnalyticsEvent("web_vital", {
      id: metric.id,
      name: metric.name,
      rating: metric.rating,
      value: metric.value
    });

    if (window.gtag) {
      window.gtag("event", metric.name, {
        event_category: "Web Vitals",
        event_label: metric.id,
        value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
        non_interaction: true
      });
    }
  });

  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || !measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="stylemate-ga" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
