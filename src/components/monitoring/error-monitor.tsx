"use client";

import { useEffect } from "react";

function reportError(payload: Record<string, unknown>) {
  const body = JSON.stringify({
    ...payload,
    path: window.location.pathname,
    timestamp: new Date().toISOString()
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/monitoring/error", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/monitoring/error", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-StyleMate-Client": "web"
    },
    body,
    keepalive: true
  });
}

export function ErrorMonitor() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      reportError({
        type: "window_error",
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack?.slice(0, 4000) : undefined
      });
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      reportError({
        type: "unhandled_rejection",
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
        stack: event.reason instanceof Error ? event.reason.stack?.slice(0, 4000) : undefined
      });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
