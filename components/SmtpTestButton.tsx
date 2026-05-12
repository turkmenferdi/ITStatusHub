"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

export function SmtpTestButton() {
  const [to, setTo]         = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg]       = useState("");

  async function handleTest() {
    if (!to) return;
    setStatus("loading");
    try {
      const res  = await fetch("/api/settings/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to })
      });
      const data = await res.json();
      if (data.ok) { setStatus("ok");    setMsg(data.message); }
      else          { setStatus("error"); setMsg(data.error);   }
    } catch {
      setStatus("error");
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={to}
          onChange={e => { setTo(e.target.value); setStatus("idle"); }}
          placeholder="your@email.com"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
        />
        <button
          onClick={handleTest}
          disabled={status === "loading" || !to}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 active:scale-95"
        >
          {status === "loading"
            ? <><Icon name="pending" className="text-[16px]" />Sending...</>
            : <><Icon name="send" className="text-[16px]" />Send Test</>}
        </button>
      </div>

      {status === "ok" && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <Icon name="check_circle" className="mt-0.5 shrink-0 text-[16px] text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">
          <Icon name="error" className="mt-0.5 shrink-0 text-[16px] text-red-600" />
          <span>{msg}</span>
        </div>
      )}
    </div>
  );
}
