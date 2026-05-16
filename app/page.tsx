import Link from 'next/link'
import { ArrowUpRight, MonitorSmartphone, ShieldCheck, WalletCards } from 'lucide-react'

const links = [
  {
    href: '/kiosk',
    title: 'Visitor kiosk',
    description: 'Full-screen multilingual assistant with quick questions and typed input.',
    icon: MonitorSmartphone,
  },
  {
    href: '/admin',
    title: 'Admin dashboard',
    description: 'Approved answers, unknown question review, metrics, and budget policy.',
    icon: ShieldCheck,
  },
]

export default function DigitalReceptionistDemoPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb] p-6 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col justify-center gap-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-cyan-700">
            Lite First Prototype
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-950">Digital Receptionist Demo</h1>
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

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <WalletCards className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Local demo mode</h2>
              <p className="text-sm text-slate-600">
                No LLM, TTS, avatar provider, database, or billing calls are used in this prototype.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
