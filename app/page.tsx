import Link from "next/link";
import { Icon } from "@/components/Icon";

const proofPoints = [
  "Turn 4me/Xurrent and Datadog signals into operator-approved stakeholder updates.",
  "Keep business, executive, and technical audiences aligned with role-based routing.",
  "Publish status page changes and preserve a full audit trail from one control plane."
];

const idealFor = [
  "IT operations teams running major incident processes",
  "Companies using 4me/Xurrent, Datadog, or both",
  "Organizations that need faster stakeholder communication during outages"
];

const packageCards = [
  {
    name: "Starter",
    fit: "Single team or internal IT service desk",
    price: "Fast pilot",
    bullets: [
      "Internal command center",
      "Public status page",
      "Manual incident declaration",
      "Email templates and routing"
    ]
  },
  {
    name: "Professional",
    fit: "Mature IT ops teams with active incident workflows",
    price: "Best fit",
    bullets: [
      "4me/Xurrent webhook intake",
      "Datadog alert ingestion",
      "Approval-first communication pack",
      "Audit trail and operator controls"
    ]
  },
  {
    name: "Enterprise",
    fit: "Regulated or multi-team organizations",
    price: "Roadmap-ready",
    bullets: [
      "SSO and stronger identity controls",
      "Branding and deployment controls",
      "Advanced governance and reporting",
      "Operational rollout support"
    ]
  }
];

const workflow = [
  {
    step: "01",
    title: "Detect",
    text: "StatusHub receives a major incident or monitor alert from your operational stack."
  },
  {
    step: "02",
    title: "Approve",
    text: "Operators review the intake, select the affected service, and approve the communication pack."
  },
  {
    step: "03",
    title: "Communicate",
    text: "Stakeholder updates, service status, and follow-up actions stay synchronized from one timeline."
  }
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_56%,#e2e8f0_56%,#f8fafc_100%)]" />

      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <header className="mb-16 flex flex-col gap-6 rounded-[28px] border border-white/10 bg-white/5 px-6 py-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-900/30">
              <Icon name="wifi_tethering" className="text-[24px] text-white" />
            </span>
            <div>
              <p className="font-headline text-2xl font-extrabold">StatusHub</p>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">Incident Communication Control Plane</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/status-page/public" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10">
              <Icon name="open_in_new" className="text-[18px]" />
              View live status page
            </Link>
            <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-900/25 transition hover:-translate-y-0.5 hover:bg-emerald-400">
              <Icon name="login" className="text-[18px]" />
              Open operator console
            </Link>
          </div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-200">
              Built for major incident communication
            </div>
            <h1 className="max-w-4xl font-headline text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
              Do not just update status during an incident. Orchestrate communication.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
              StatusHub turns 4me/Xurrent and Datadog signals into operator-approved stakeholder communication, live status page updates, and an auditable incident timeline.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["MTTC", "Faster first communication"],
                ["Audit", "Every update is traceable"],
                ["Control", "One operating console"]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">{label}</p>
                  <p className="mt-2 text-lg font-extrabold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100">
                <Icon name="analytics" className="text-[18px]" />
                Explore command center
              </Link>
              <Link href="/status-page/public" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-transparent px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/5">
                <Icon name="monitor_heart" className="text-[18px]" />
                See public experience
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/35 backdrop-blur">
            <div className="rounded-[24px] border border-white/10 bg-slate-950 p-5">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-300">Why teams buy</p>
                  <p className="mt-1 text-lg font-extrabold text-white">Silence is the real outage multiplier</p>
                </div>
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">Critical flow</span>
              </div>
              <div className="mt-4 space-y-3">
                {proofPoints.map((point) => (
                  <div key={point} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                      <Icon name="check_circle" className="text-[18px]" />
                    </span>
                    <p className="text-sm leading-6 text-slate-200">{point}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200">Ideal first customer</p>
                <ul className="mt-3 space-y-2 text-sm text-cyan-50">
                  {idealFor.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Icon name="arrow_forward" className="mt-0.5 shrink-0 text-[16px]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-slate-50 px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-cyan-700">Operational workflow</p>
            <h2 className="mt-3 font-headline text-3xl font-extrabold sm:text-4xl">
              Detection, approval, communication and status stay in one flow.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              The product is strongest when it sits between your incident source systems and the people who need clear updates. That is the wedge.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">{item.step}</p>
                <h3 className="mt-3 text-2xl font-extrabold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-slate-100 px-4 py-20 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">Commercial packaging</p>
              <h2 className="mt-3 font-headline text-3xl font-extrabold sm:text-4xl">Package the same core product for three sales motions.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600">
              The goal is not custom projects. The goal is a repeatable core with configuration, governance and deployment options layered on top.
            </p>
          </div>

          <div className="mt-10 grid gap-5 xl:grid-cols-3">
            {packageCards.map((card) => (
              <div key={card.name} className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500">{card.name}</p>
                    <h3 className="mt-2 text-2xl font-extrabold text-slate-950">{card.price}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{card.fit}</p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">Tier</span>
                </div>
                <div className="mt-6 space-y-3">
                  {card.bullets.map((bullet) => (
                    <div key={bullet} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                      <Icon name="verified" className="mt-0.5 shrink-0 text-[18px] text-emerald-600" />
                      <p className="text-sm text-slate-700">{bullet}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
