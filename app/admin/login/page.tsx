'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { LockKeyhole, MonitorUp } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    setLoading(false)

    if (!response.ok) {
      setError('Invalid admin password')
      return
    }

    window.location.href = '/admin'
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-4 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
            <LockKeyhole className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
              Admin access
            </p>
            <h1 className="text-2xl font-semibold text-slate-950">Digital Receptionist</h1>
          </div>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Password</span>
            <input
              className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}

          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-4 text-base font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={loading}
            type="submit"
          >
            <LockKeyhole className="size-4" />
            {loading ? 'Checking...' : 'Log in'}
          </button>
        </form>

        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-cyan-800"
          href="/kiosk"
        >
          <MonitorUp className="size-4" />
          Open kiosk
        </Link>
      </section>
    </main>
  )
}
