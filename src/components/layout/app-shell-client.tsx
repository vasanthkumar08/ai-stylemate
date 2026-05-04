"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, Bot, LayoutDashboard, Menu, ScanLine, Shirt, Sparkles, UserCircle, X } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { cn } from "@/lib/utils";
import type { AppRole } from "@/roles/types";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Wardrobe", href: "/dashboard/wardrobe", icon: Shirt },
  { label: "AI Scan", href: "/dashboard/scan", icon: ScanLine },
  { label: "Outfits", href: "/outfits", icon: Sparkles },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Admin", href: "/admin", icon: BarChart3, adminOnly: true }
] as const;

const bottomNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Outfits", href: "/outfits", icon: Sparkles },
  { label: "Scan", href: "/scan", icon: ScanLine },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Admin", href: "/admin", icon: BarChart3, adminOnly: true }
] as const;

export function AppShellClient({ children, csrfToken, role }: { children: ReactNode; csrfToken: string; role: AppRole }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => !("adminOnly" in item) || role === "admin");
  const visibleBottomNavItems = bottomNavItems.filter((item) => !("adminOnly" in item) || role === "admin");

  return (
    <div className="min-h-screen bg-[#eaedfe] text-[var(--foreground)]">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(168,163,227,0.5),transparent_30rem),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.76),transparent_24rem),linear-gradient(180deg,#ffffff,#eaedfe_48%,#eef1ff)]" />

      <aside
        className={cn(
          "fixed inset-y-4 left-4 z-40 hidden rounded-2xl p-3 text-[var(--foreground)] shadow-2xl transition-all lg:block",
          collapsed ? "w-[88px]" : "w-[252px]",
          "glass-panel"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between gap-2 px-2 py-2">
            <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
                <Shirt className="size-4" aria-hidden="true" />
              </span>
              {!collapsed ? <span className="truncate">StyleMate AI</span> : null}
            </Link>
            <button
              className="grid size-9 place-items-center rounded-xl text-[#64748b] hover:bg-[#eaedfe] hover:text-[#363b6c]"
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="mt-6 grid gap-2">
            {visibleNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  className={cn(
                    "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[#64748b] transition hover:bg-[#eaedfe] hover:text-[#363b6c]",
                    active && "text-white shadow-[0_0_34px_rgba(54,59,108,0.22)]"
                  )}
                  href={item.href as Route}
                  title={item.label}
                >
                  {active ? (
                    <motion.span
                      layoutId="active-sidebar-route"
                      className="absolute inset-0 rounded-xl bg-[#363b6c]"
                      transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    />
                  ) : null}
                  <Icon className="relative z-10 size-4 shrink-0" aria-hidden="true" />
                  {!collapsed ? <span className="relative z-10 truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#a8a3e3]/20 text-[#363b6c]">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">Smart Wardrobe AI</p>
                  <p className="truncate text-xs text-[#64748b]">Ready to style</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-[#c6c9e7]/70 bg-white/78 text-[var(--foreground)] backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-[#363b6c] text-white">
              <Shirt className="size-4" aria-hidden="true" />
            </span>
            StyleMate AI
          </Link>
          <button
            className="grid size-10 place-items-center rounded-xl border border-[#c6c9e7]/70 bg-white/70"
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Open navigation"
          >
            {mobileOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
        {mobileOpen ? (
          <nav className="grid gap-2 border-t border-[#c6c9e7]/70 bg-white/95 p-4">
            {visibleNavItems.map((item) => (
              <Link key={item.label} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[#64748b] hover:bg-[#eaedfe] hover:text-[#363b6c]" href={item.href as Route}>
                <item.icon className="size-4 text-[var(--accent)]" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </header>

      <main className={cn("min-h-screen px-5 pb-24 pt-6 transition-all md:px-8 lg:pb-10 lg:pt-8", collapsed ? "lg:pl-[128px]" : "lg:pl-[292px]")}>
        <div className="mx-auto w-full max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34, ease: "easeOut" }}>
            <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
              <div>
                <p className="text-sm font-medium text-[var(--accent)]">StyleMate workspace</p>
                <p className="text-xs text-[var(--muted)]">Premium AI styling operations</p>
              </div>
              <div className="flex items-center gap-2">
                <Button className="gradient-button text-white" size="sm">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Generate look
                </Button>
                <LogoutButton csrfToken={csrfToken} />
              </div>
            </div>
            {children}
          </motion.div>
        </div>
      </main>

      <nav
        className={cn(
          "fixed inset-x-3 bottom-3 z-40 grid gap-1 rounded-2xl border border-white/70 bg-white/84 p-1.5 shadow-2xl shadow-[#363b6c]/15 backdrop-blur-xl lg:hidden",
          role === "admin" ? "grid-cols-5" : "grid-cols-4"
        )}
      >
        {visibleBottomNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              className="relative grid min-h-12 place-items-center rounded-xl px-1 text-[10px] font-semibold text-[#64748b]"
              href={item.href as Route}
            >
              {active ? (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-[#363b6c] shadow-lg shadow-[#363b6c]/25"
                  layoutId="active-bottom-route"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              ) : null}
              <item.icon className={cn("relative z-10 size-4", active && "text-white")} aria-hidden="true" />
              <span className={cn("relative z-10 mt-0.5 truncate", active && "text-white")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
