import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuthGuard } from '../lib/useAuthGuard'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const CHANNEL_LINK = process.env.NEXT_PUBLIC_CHANNEL_LINK || '#'
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || '#'

export default function Settings() {
  const user = useAuthGuard()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(localStorage.getItem('theme') === 'dark')
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!user) return null

  return (
    <Layout title="Settings">
      <div className="max-w-md mx-auto space-y-4">
        <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
          <h3 className="font-semibold mb-3">Account</h3>
          <p className="text-sm text-slate-400">Email</p>
          <p className="text-sm font-medium mb-1">{user.email}</p>
        </div>

        <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Appearance</h3>
            <p className="text-sm text-slate-400">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium"
          >
            {dark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 space-y-2">
          <h3 className="font-semibold mb-1">{BOT_NAME}</h3>
          <a href={CHANNEL_LINK} target="_blank" rel="noreferrer" className="block text-sm text-brand-600">
            📢 Official WhatsApp channel
          </a>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="block text-sm text-brand-600">
            💻 GitHub repository
          </a>
        </div>

        <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5">
          <h3 className="font-semibold mb-1">Group moderation settings</h3>
          <p className="text-sm text-slate-400">
            Anti-link, welcome/goodbye messages, warnings and other group controls are managed from
            WhatsApp itself using chat commands (e.g. <code>.antilink on</code>) inside each group,
            not from this dashboard.
          </p>
        </div>
      </div>
    </Layout>
  )
}
