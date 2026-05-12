"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function SubscribeForm() {
  const [email,  setEmail]  = useState("");
  const [name,   setName]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg,    setMsg]    = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res  = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || undefined })
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setMsg(data.message ?? "Subscribed!");
        setEmail("");
        setName("");
      } else {
        setStatus("error");
        setMsg(data.error ?? "Could not subscribe.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Icon name="check_circle" className="text-emerald-600 text-[20px]" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-emerald-900">You&apos;re subscribed!</p>
          <p className="text-xs text-emerald-700">{msg}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setStatus("idle"); }}
          placeholder="your@email.com"
          required
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>
      <button
        type="submit"
        disabled={status === "loading" || !email}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-400 disabled:opacity-50 active:scale-95"
      >
        {status === "loading" ? "Subscribing..." : "Subscribe to Status Updates"}
      </button>
      {status === "error" && (
        <p className="text-xs font-medium text-red-400">{msg}</p>
      )}
      <p className="text-[11px] text-slate-500 text-center">You&apos;ll receive email updates when service status changes.</p>
    </form>
  );
}
