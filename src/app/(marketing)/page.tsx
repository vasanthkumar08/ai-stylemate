import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CloudSun,
  Layers3,
  Lock,
  MessageSquareQuote,
  Play,
  Shirt,
  Sparkles,
  Star,
  WandSparkles,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "StyleMate AI | AI Wardrobe Styling SaaS",
  description:
    "StyleMate AI turns your wardrobe into personalized outfit recommendations for weather, travel, occasions, seasons, and style preferences.",
  openGraph: {
    title: "StyleMate AI",
    description: "AI wardrobe intelligence for outfits that fit the real day ahead.",
    url: "/",
    siteName: "StyleMate AI",
    type: "website"
  }
};

const features = [
  {
    icon: Shirt,
    title: "AI Outfit Generator",
    description:
      "Generate polished looks from your own clothes with occasion, weather, and style context."
  },
  {
    icon: CloudSun,
    title: "Smart Wardrobe Scan",
    description:
      "Upload or capture clothing photos and let AI detect category, color, fabric, and styling signals."
  },
  {
    icon: Lock,
    title: "Style Recommendations",
    description:
      "Get explainable recommendations with premium AI tips and practical outfit pairings."
  },
  {
    icon: Zap,
    title: "Fast styling workflows",
    description:
      "Go from upload to recommendation history, saved outfits, and repeatable favorites in seconds."
  }
];

const steps = [
  "Upload wardrobe photos and quick details.",
  "Set your style, sizing, occasions, and climate preferences.",
  "Ask for a look and let StyleMate compose the outfit.",
  "Save, rate, reuse, and refine what works."
];

const testimonials = [
  {
    quote:
      "StyleMate made our wardrobe app feel less like storage and more like a personal stylist users actually trust.",
    name: "Maya Chen",
    role: "Founder, CapsuleLab"
  },
  {
    quote:
      "The product thinking is obvious. Recommendations respect the closet, the weather, and the person's taste.",
    name: "Jordan Ellis",
    role: "Head of Product, ModeOS"
  },
  {
    quote:
      "We tested it with frequent travelers and saw outfit planning time drop almost immediately.",
    name: "Priya Raman",
    role: "Growth Lead, Awayday"
  }
];

const pricing = [
  {
    name: "Starter",
    price: "$12",
    description: "For solo users building a smarter closet.",
    features: ["100 wardrobe items", "25 AI looks monthly", "Saved outfits", "Weather context"]
  },
  {
    name: "Pro",
    price: "$29",
    description: "For power users and creators.",
    features: ["Unlimited wardrobe", "250 AI looks monthly", "Travel packing", "Priority generation"],
    highlighted: true
  },
  {
    name: "Studio",
    price: "$79",
    description: "For stylists and boutique teams.",
    features: ["Client closets", "Team workflows", "Shared moodboards", "Advanced analytics"]
  }
];

const faqs = [
  {
    question: "Can StyleMate work with my existing Supabase app?",
    answer:
      "Yes. The architecture is modular: auth, wardrobe data, recommendations, usage limits, and subscriptions are cleanly separated."
  },
  {
    question: "Does it support Google auth and password recovery?",
    answer:
      "Yes. The app includes signup, login, logout, Google auth, forgot password, reset password, middleware protection, and session persistence."
  },
  {
    question: "How does the AI wardrobe demo work?",
    answer:
      "The demo models the core workflow: upload items, extract attributes, combine context, and return a complete outfit recommendation."
  },
  {
    question: "Is this ready to scale?",
    answer:
      "The schema and app patterns are designed around user-scoped queries, indexed tables, RLS, soft deletes, and service-managed quota controls."
  }
];

const wardrobeImages = [
  {
    src: "https://res.cloudinary.com/demo/image/upload/c_fill,w_420,h_520,q_auto,f_auto/sample.jpg",
    alt: "Wardrobe item preview"
  },
  {
    src: "https://res.cloudinary.com/demo/image/upload/e_grayscale,c_fill,w_420,h_520,q_auto,f_auto/sample.jpg",
    alt: "Monochrome wardrobe item preview"
  },
  {
    src: "https://res.cloudinary.com/demo/image/upload/e_blue:40,c_fill,w_420,h_520,q_auto,f_auto/sample.jpg",
    alt: "Blue-toned wardrobe item preview"
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-[#c6c9e7]/70 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
              <Shirt className="size-4" aria-hidden="true" />
            </span>
            StyleMate AI
          </Link>
          <div className="hidden items-center gap-7 text-sm font-medium text-[#64748b] md:flex">
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <Button asChild size="sm">
            <Link href={{ pathname: "/signup" }}>
              Start free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>

      <section className="hero-gradient relative border-b border-white/70">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div className="animate-reveal-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-sm font-medium text-[var(--accent)]">
              <Sparkles className="size-4" aria-hidden="true" />
              Premium AI styling for modern wardrobes
            </p>
            <h1 className="mt-6 max-w-4xl text-5xl font-bold leading-tight tracking-tight text-balance sm:text-6xl lg:text-7xl">
              AI Fashion Assistant for Your Wardrobe
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              StyleMate AI turns closet uploads into complete outfit recommendations shaped by
              weather, travel, occasions, seasons, and personal taste.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={{ pathname: "/signup" }}>
                  Start Free
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#demo">
                  Watch demo
                  <Play className="size-4" aria-hidden="true" />
                </a>
              </Button>
            </div>
            <div className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-[var(--border)] pt-6">
              {["10k+ looks generated", "99.9% auth uptime", "RLS secured"].map((item) => (
                <p key={item} className="text-sm font-medium text-[var(--muted)]">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="relative min-h-[560px]">
            <div className="absolute inset-x-0 top-3 mx-auto h-[520px] max-w-[520px] rounded-[2rem] bg-blue-50" />
            <div className="animate-float-panel relative mx-auto max-w-[560px] rounded-2xl border border-white/70 bg-white/78 p-4 shadow-2xl shadow-[#363b6c]/15 backdrop-blur-xl">
              <div className="grid grid-cols-3 gap-3">
                {wardrobeImages.map((image) => (
                  <div key={image.alt} className="overflow-hidden rounded-xl border border-[#c6c9e7]/70 bg-white/70">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={420}
                      height={520}
                      className="aspect-[4/5] h-full w-full object-cover"
                      priority
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-cyan-200">Recommended look</p>
                    <h2 className="mt-1 text-xl font-semibold">Polished city travel</h2>
                  </div>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm font-medium text-emerald-200">
                    94% match
                  </span>
                </div>
                <div className="relative mt-4 overflow-hidden rounded-xl bg-white/[0.06] p-4">
                  <div className="animate-scan-line absolute inset-y-0 left-0 w-1/2 bg-blue-100/70" />
                  <div className="relative grid gap-3">
                    {["Layer for wind", "Neutral palette", "Walkable accessories"].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm font-medium">
                        <Check className="size-4 text-blue-600" aria-hidden="true" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-5 left-0 hidden rounded-2xl border border-white/70 bg-white/80 p-4 shadow-xl shadow-[#363b6c]/15 backdrop-blur-xl sm:block">
              <p className="text-xs font-medium text-[var(--muted)]">Weather signal</p>
              <p className="mt-1 text-lg font-semibold">18°C, light wind</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#c6c9e7]/70 bg-white/50 px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[var(--accent)]">Product demo</p>
            <h2 className="mt-3 text-4xl font-semibold text-balance sm:text-5xl">
              See StyleMate AI in Action
            </h2>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
              A calm preview of the wardrobe-to-outfit flow: scan, understand, and style with premium AI guidance.
            </p>
          </div>
          <div className="premium-card mx-auto mt-10 max-w-5xl overflow-hidden rounded-2xl p-3">
            <video
              className="aspect-video w-full rounded-xl object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80"
            >
              <source
                src="https://videos.pexels.com/video-files/853919/853919-hd_1920_1080_25fps.mp4"
                type="video/mp4"
              />
            </video>
          </div>
        </div>
      </section>

      <section id="features" className="border-b border-[var(--border)] bg-[var(--background)] px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[var(--accent)]">Features</p>
            <h2 className="mt-3 text-4xl font-semibold text-balance sm:text-5xl">
              Everything an AI stylist assistant needs.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="premium-card rounded-2xl p-6 transition duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[var(--shadow-glow)]"
              >
                <feature.icon className="size-5 text-[var(--accent)]" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#c6c9e7]/70 bg-white/50 px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">How it works</p>
            <h2 className="mt-3 text-4xl font-semibold text-balance sm:text-5xl">
              From closet chaos to confident choices.
            </h2>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#363b6c] text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="self-center text-base font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-b border-[#c6c9e7]/70 bg-[#363b6c] px-5 py-20 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-300">AI wardrobe demo</p>
              <h2 className="mt-3 text-4xl font-semibold text-balance sm:text-5xl">
                A styling engine your users can feel.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-blue-100/80">
                The demo pairs real wardrobe inputs with user intent, weather context, and style
                preferences to produce explainable outfit recommendations.
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur">
              <div className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white">
                  <p className="text-sm font-semibold text-cyan-200">Input</p>
                  <div className="mt-4 grid gap-3">
                    {["Dinner in Chicago", "Cold wind", "Minimal style", "Black + blue palette"].map(
                      (item) => (
                        <div key={item} className="flex items-center gap-2 text-sm">
                          <Layers3 className="size-4 text-blue-600" aria-hidden="true" />
                          {item}
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/30 to-indigo-600/25 p-4 shadow-[0_0_36px_rgba(59,130,246,0.16)]">
                  <p className="text-sm font-semibold text-blue-100">Output</p>
                  <h3 className="mt-3 text-2xl font-semibold">Wool coat, oxford, dark denim, leather shoes.</h3>
                  <div className="mt-5 grid gap-2">
                    {["Warm enough for wind", "Elevated but not formal", "Uses owned items only"].map((item) => (
                      <p key={item} className="flex items-center gap-2 text-sm text-blue-50">
                        <WandSparkles className="size-4" aria-hidden="true" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#c6c9e7]/70 bg-white/50 px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">Testimonials</p>
              <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Loved by product teams.</h2>
            </div>
            <div className="flex gap-1 text-blue-600">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-5 fill-current" aria-hidden="true" />
              ))}
            </div>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <article key={testimonial.name} className="premium-card rounded-2xl p-6">
                <MessageSquareQuote className="size-5 text-[var(--accent)]" aria-hidden="true" />
                <p className="mt-5 text-base leading-7">{testimonial.quote}</p>
                <p className="mt-6 font-semibold">{testimonial.name}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{testimonial.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-[var(--border)] bg-[var(--background)] px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-[var(--accent)]">Pricing</p>
            <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Start focused. Scale elegantly.</h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricing.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-6 shadow-sm backdrop-blur-xl ${
                  plan.highlighted
                    ? "border-[#363b6c] bg-[#363b6c] text-white shadow-2xl shadow-[#363b6c]/20"
                    : "border-[#c6c9e7]/70 bg-white/70"
                }`}
              >
                <p className={plan.highlighted ? "text-blue-200" : "text-[var(--accent)]"}>{plan.name}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold">{plan.price}</span>
                  <span className={plan.highlighted ? "pb-2 text-blue-100" : "pb-2 text-[var(--muted)]"}>
                    /mo
                  </span>
                </div>
                <p className={plan.highlighted ? "mt-4 text-blue-100" : "mt-4 text-[var(--muted)]"}>
                  {plan.description}
                </p>
                <div className="mt-6 grid gap-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-blue-500" aria-hidden="true" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button asChild className="mt-7 w-full" variant={plan.highlighted ? "secondary" : "primary"}>
                  <Link href={{ pathname: "/signup" }}>Choose {plan.name}</Link>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="border-b border-[#c6c9e7]/70 bg-white/50 px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">FAQ</p>
            <h2 className="mt-3 text-4xl font-semibold sm:text-5xl">Questions, answered.</h2>
          </div>
          <div className="grid gap-3">
            {faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {faq.question}
                  <ChevronRight className="size-4 transition group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#363b6c] px-5 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-[#363b6c]">
              <Shirt className="size-4" aria-hidden="true" />
            </span>
            StyleMate AI
          </Link>
          <div className="flex flex-wrap gap-5 text-sm text-blue-100">
            <a href="#features">Features</a>
            <a href="#demo">Demo</a>
            <a href="#pricing">Pricing</a>
            <Link href={{ pathname: "/login" }}>Login</Link>
          </div>
          <p className="text-sm text-blue-100">
            <CalendarDays className="mr-2 inline size-4" aria-hidden="true" />
            Built for the next generation of wardrobe apps.
          </p>
        </div>
      </footer>
    </main>
  );
}
