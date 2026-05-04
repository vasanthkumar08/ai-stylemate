import { Shield } from "lucide-react";

export default function AdminLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#060b16] px-6 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <Shield className="mx-auto size-8 animate-pulse text-blue-300" aria-hidden="true" />
        <p className="mt-4 text-sm text-slate-300">Verifying admin console...</p>
      </div>
    </main>
  );
}
