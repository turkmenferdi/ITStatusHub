import { loginAction } from "@/app/actions";
import { Icon } from "@/components/Icon";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-xl shadow-emerald-900/40">
            <Icon name="wifi_tethering" className="text-[28px] text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-headline text-2xl font-extrabold text-white">StatusHub</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">Incident Communication Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <p className="mb-2 text-sm font-bold text-white">Operator sign-in</p>
          <p className="mb-5 text-sm leading-6 text-slate-400">
            Access the incident communication control plane to approve updates, manage routing, and keep the status page aligned.
          </p>

          {params.error ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-400">
              <Icon name="error" className="shrink-0 text-[16px]" />
              {params.error === "rate-limit"
                ? "Too many sign-in attempts. Wait a few minutes and try again."
                : "Invalid username or password. Please try again."}
            </div>
          ) : null}

          <form action={loginAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-slate-400">Username</label>
              <input
                id="username"
                name="username"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 outline-none transition"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-slate-400">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/15 outline-none transition"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-xl active:translate-y-0"
            >
              <Icon name="login" className="text-[18px]" />
              Sign in
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">Restricted workspace for incident managers, operators, and administrators.</p>
      </div>
    </main>
  );
}
