import Link from 'next/link'
import {
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
  Database,
  MonitorSmartphone,
  ShieldCheck,
  Volume2,
  WalletCards,
} from 'lucide-react'
import { pilotScenarioSummaries } from '@/lib/digital-receptionist/pilot-scenarios'

const links = [
  {
    href: '/kiosk',
    title: 'Visitor kiosk',
    description: 'Multilingual visitor assistant with quick questions, typed input, voice, and action cards.',
    icon: MonitorSmartphone,
  },
  {
    href: '/admin',
    title: 'Admin dashboard',
    description: 'Scenario setup, approved answers, review queue, devices, analytics, and import/export.',
    icon: ShieldCheck,
  },
]

const capabilities = [
  {
    title: 'SQLite backend',
    description: 'Pilot data, events, unknown questions, kiosk devices, audit logs, and admin settings persist locally.',
    icon: Database,
  },
  {
    title: 'Reusable answers',
    description: 'Known questions are served from the approved library; new questions enter the review queue.',
    icon: ClipboardCheck,
  },
  {
    title: 'Local voice path',
    description: 'Cached WAV audio can be generated locally with browser TTS as the fallback.',
    icon: Volume2,
  },
  {
    title: 'Budget-first avatar',
    description: 'The current kiosk uses the Lite First 2D avatar path for fast, low-cost demonstrations.',
    icon: WalletCards,
  },
]

const walkthrough = [
  'Apply a pilot scenario in the admin setup tab.',
  'Open the kiosk and ask a known question in Arabic, French, or English.',
  'Ask a new question and watch it enter the admin review queue.',
  'Approve the question once, then ask it again as a reusable answer.',
]

export default function DigitalReceptionistDemoPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] p-6 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-700">
                Digital Employee Platform
              </p>
              <h1 className="mt-2 text-4xl font-semibold text-slate-950">
                Algerian reception pilot builder
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Build and test kiosk pilots for public offices, branch networks, and commercial reception
                desks using reusable answers, a low-cost avatar path, and an admin review loop.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
              <BarChart3 className="size-4" />
              Scenario-ready prototype
            </span>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {links.map((item) => {
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
                href={item.href}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="flex size-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                    <Icon className="size-6" />
                  </span>
                  <ArrowUpRight className="size-5 text-slate-400 transition group-hover:text-cyan-700" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-2 text-base leading-relaxed text-slate-600">{item.description}</p>
              </Link>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          {capabilities.map((item) => {
            const Icon = item.icon

            return (
              <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </article>
            )
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Demo scenarios
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">Customer-ready pilot templates</h2>
              </div>
              <Link
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan-700 px-4 text-sm font-semibold text-white hover:bg-cyan-800"
                href="/admin"
              >
                Open setup
                <ArrowUpRight className="size-4" />
              </Link>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {pilotScenarioSummaries.map((scenario) => (
                <article key={scenario.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                    {scenario.customerType}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-slate-950">{scenario.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{scenario.description}</p>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-700">
                    {scenario.valueProposition}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Pilot walkthrough
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">What to test next</h2>
            <ol className="mt-5 space-y-3">
              {walkthrough.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-semibold text-cyan-800">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </div>
    </main>
  )
}
