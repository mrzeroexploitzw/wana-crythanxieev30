import { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { useAuthGuard } from '../../lib/useAuthGuard'
import { api } from '../../lib/api'

const REGIONS = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'africa', label: 'Africa' },
  { value: 'europe', label: 'Europe' },
  { value: 'us', label: 'United States' },
  { value: 'asia', label: 'Asia' },
]

export default function Pair() {
  const user = useAuthGuard()
  const router = useRouter()
  const [number, setNumber] = useState('')
  const [region, setRegion] = useState('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // Accept international E.164 format from any country, with or without
    // spaces, brackets, or hyphens. The country calling code must be included.
    const fullNumber = number.replace(/[^\d]/g, '')
    if (!/^\d{8,15}$/.test(fullNumber) || fullNumber.startsWith('0')) {
      setError('Enter the full international WhatsApp number, including country code (for example +263 771 234 567).')
      return
    }

    setLoading(true)
    try {
      const { sessionId } = await api.createSession(fullNumber, region)
      router.push(`/pair/${sessionId}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="Pair a number">
      <div className="max-w-md mx-auto rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6">
        <h2 className="font-semibold mb-1">Generate Pairing Code</h2>
        <p className="text-sm text-slate-400 mb-5">Enter the full international WhatsApp number to generate a pairing code.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">International WhatsApp number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="+263 771 234 567"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-400 mt-1">
              Include the country calling code. Numbers from any country are supported in international format.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Server region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Preference is saved with your session; region-specific routing is applied once proxy
              support is enabled.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-2.5 text-sm font-medium transition disabled:opacity-60"
          >
            {loading ? 'Generating…' : '📲 Generate Code'}
          </button>
        </form>
      </div>
    </Layout>
  )
}
