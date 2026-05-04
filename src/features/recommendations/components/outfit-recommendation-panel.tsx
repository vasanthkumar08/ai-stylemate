"use client";

import { useState } from "react";
import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageFade } from "@/components/ui/motion-primitives";
import type { AiRecommendationResult } from "@/features/recommendations/ai/types";

const occasions = ["office", "wedding", "vacation", "beach", "party", "interview", "date"] as const;
const seasons = ["spring", "summer", "fall", "winter", "all-season"] as const;
const weatherOptions = ["hot", "warm", "mild", "cool", "cold", "rain", "wind"] as const;

type RecommendationResponse = {
  recommendationId: string | null;
  result: AiRecommendationResult;
  usage: {
    used: number;
    limit: number;
  };
  error?: string;
};

export function OutfitRecommendationPanel() {
  const [occasion, setOccasion] = useState<(typeof occasions)[number]>("office");
  const [season, setSeason] = useState<(typeof seasons)[number]>("all-season");
  const [weather, setWeather] = useState<string[]>(["mild"]);
  const [weatherSummary, setWeatherSummary] = useState("");
  const [stylePreference, setStylePreference] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);

  function toggleWeather(value: string) {
    setWeather((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function generateRecommendation() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommendations/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StyleMate-Client": "web"
        },
        body: JSON.stringify({
          occasion,
          season,
          weather: weather.length ? weather : ["mild"],
          weatherSummary: weatherSummary || undefined,
          stylePreferences: stylePreference
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        })
      });
      const data = (await response.json()) as RecommendationResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not generate outfit.");
      }

      setRecommendation(data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not generate outfit.");
    } finally {
      setIsLoading(false);
    }
  }

  const topOutfit = recommendation?.result.outfits[0];

  return (
    <PageFade className="ai-card rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#a8a3e3]/20 text-[#363b6c] shadow-[0_0_24px_rgba(168,163,227,0.28)]">
          <WandSparkles className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="ai-active-badge inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">AI ACTIVE</p>
          <h2 className="mt-1 text-lg font-semibold">Generate outfit</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Uses image understanding when configured, with rule-based fallback.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="occasion">
            Occasion
          </label>
          <select
            id="occasion"
            className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
            value={occasion}
            onChange={(event) => setOccasion(event.target.value as typeof occasion)}
          >
            {occasions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="season">
            Season
          </label>
          <select
            id="season"
            className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
            value={season}
            onChange={(event) => setSeason(event.target.value as typeof season)}
          >
            {seasons.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium">Weather</span>
          <div className="flex flex-wrap gap-2">
            {weatherOptions.map((item) => (
              <button
                key={item}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition hover:-translate-y-0.5 ${
                  weather.includes(item)
                    ? "badge-glow border-[var(--accent)] bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                    : "border-[#c6c9e7]/80 bg-white/70 text-[#64748b] hover:bg-white"
                }`}
                type="button"
                onClick={() => toggleWeather(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Weather notes</span>
          <input
            className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
            placeholder="Light wind, rooftop dinner..."
            value={weatherSummary}
            onChange={(event) => setWeatherSummary(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium">Style preferences</span>
          <input
            className="h-11 rounded-xl border border-[#c6c9e7]/80 bg-white/80 px-3 text-sm text-[#111827] outline-none placeholder:text-slate-400 focus:border-[#363b6c] focus:shadow-[0_0_0_4px_rgba(54,59,108,0.12)]"
            placeholder="minimal, polished, relaxed"
            value={stylePreference}
            onChange={(event) => setStylePreference(event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <Button className={isLoading ? "gradient-button mt-5 w-full animate-pulse text-white" : "gradient-button mt-5 w-full text-white"} disabled={isLoading} type="button" onClick={generateRecommendation}>
        {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        {isLoading ? "Generating..." : "Generate AI outfit"}
      </Button>

      {topOutfit ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {recommendation.result.usedFallback ? "Fallback recommendation" : "AI recommendation"}
              </p>
              <h3 className="mt-1 text-base font-semibold">
                {Math.round(topOutfit.score * 100)}% match for {topOutfit.occasion}
              </h3>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
              {recommendation.usage.used}/{recommendation.usage.limit}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {topOutfit.items.map((item) => (
              <p key={item.id} className="text-sm">
                {item.name}
              </p>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{topOutfit.stylingExplanation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {topOutfit.suggestedAccessories.map((item) => (
              <span key={item} className="rounded-full bg-white px-2 py-1 text-xs text-[#64748b]">
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </PageFade>
  );
}
