const FALLBACK_APP_URL = "http://localhost:3000";

function isPlaceholderUrl(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    normalized === "" ||
    normalized.startsWith("your_") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace_me") ||
    normalized.includes("your-project") ||
    normalized.includes("your-vercel-domain")
  );
}

export function getAppUrl(value = process.env.NEXT_PUBLIC_APP_URL) {
  if (!value || isPlaceholderUrl(value)) {
    if (value) {
      console.warn("[stylemate-env-url]", {
        key: "NEXT_PUBLIC_APP_URL",
        message: "Ignoring placeholder app URL and using fallback."
      });
    }

    return FALLBACK_APP_URL;
  }

  try {
    return new URL(value).origin;
  } catch {
    console.warn("[stylemate-env-url]", {
      key: "NEXT_PUBLIC_APP_URL",
      message: "Invalid app URL. Using fallback."
    });

    return FALLBACK_APP_URL;
  }
}

