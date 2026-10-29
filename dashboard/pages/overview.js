import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { useAuthGuard } from '../lib/useAuthGuard'
import { api } from '../lib/api'

export default function Overview() {
  const user = useAuthGuard()
  const [sessions, setSessions] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    api
      .listSessions()
      .then((d) => setSessions(d.sessions))
      .catch((e) => setError(e.message))
  }, [user])

  if (!user) return null

  const total = sessions?.length || 0
  const online = sessions?.filter((s) => s.status === 'online').length || 0
  const pairing = sessions?.filter((s) => s.status === 'pairing').length || 0
  const offline = total - online - pairing

  return (
    <Layout title="Overview">
      {/* Hero */}
      <div className="rounded-xl2 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 text-white p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-brand-100 text-sm mb-1">Multi-Session Dashboard</p>
          <h2 className="text-xl font-semibold">Connect a WhatsApp number</h2>
          <p className="text-brand-100 text-sm mt-1">Pair a new session and get a pairing code.</p>
        </div>
        <Link
          href="/pair"
          className="bg-white text-brand-700 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-brand-50 transition"
        >
          ➜ Start Pairing
        </Link>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Sessions" value={total} icon="📱" tint="brand" />
        <StatCard label="Online" value={online} icon="🟢" tint="blue" />
        <StatCard label="Offline" value={offline} icon="⚪" tint="purple" />
        <StatCard label="Pairing" value={pairing} icon="🔗" tint="pink" />
      </div>

      {/* Sessions list */}
      <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Your Sessions</h3>
          <Link href="/pair" className="text-sm text-brand-600 font-medium">
            + New session
          </Link>
        </div>

        {sessions === null && <p className="text-sm text-slate-400">Loading…</p>}
        {sessions?.length === 0 && (
          <p className="text-sm text-slate-400">No sessions yet — pair your first WhatsApp number.</p>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions?.map((s) => (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="flex items-center justify-between py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 -mx-2 rounded-lg transition"
            >
              <div>
                <p className="font-medium text-sm">{s.label || s.phone_number}</p>
                <p className="text-xs text-slate-400">{s.phone_number || 'Pairing…'}</p>
              </div>
              <StatusBadge status={s.status} />
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
