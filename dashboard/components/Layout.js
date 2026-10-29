import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getUser, logout } from '../lib/api'

const BOT_NAME = process.env.NEXT_PUBLIC_BOT_NAME || 'WANNA-CRY THANXIEE'
const CHANNEL_LINK = process.env.NEXT_PUBLIC_CHANNEL_LINK || '#'
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || '#'
const AD_SLOT_HTML = process.env.NEXT_PUBLIC_AD_SLOT_HTML || ''

const NAV = [
  { href: '/overview', label: 'Overview', icon: '📊' },
  { href: '/pair', label: 'Pair a number', icon: '🔗' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout({ children, title }) {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setUser(getUser())
    const saved = localStorage.getItem('theme')
    const isDark = saved === 'dark'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  function handleLogout() {
    logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-gradient-to-b from-brand-900 to-brand-700 text-white p-6">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
            {BOT_NAME.charAt(0)}
          </div>
          <span className="font-semibold tracking-wide">{BOT_NAME}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const active = router.pathname === item.href || router.pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  active ? 'bg-white/15' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto space-y-3 text-xs text-white/70">
          <a href={CHANNEL_LINK} target="_blank" rel="noreferrer" className="block hover:text-white">
            📢 Official channel
          </a>
          <a href={GITHUB_REPO} target="_blank" rel="noreferrer" className="block hover:text-white">
            💻 GitHub repo
          </a>
          <button onClick={handleLogout} className="block hover:text-white">
            ↩ Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div>
            <h1 className="text-lg font-semibold">{title || 'Dashboard'}</h1>
            {user && <p className="text-xs text-slate-500 dark:text-slate-400">Welcome back, {user.email}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm"
              title="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>
            <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-semibold">
              {user?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>

        {AD_SLOT_HTML && (
          <div
            className="m-6 mt-0 rounded-xl2 border border-dashed border-slate-300 dark:border-slate-700 p-3 text-center text-xs text-slate-400"
            dangerouslySetInnerHTML={{ __html: AD_SLOT_HTML }}
          />
        )}
      </div>
    </div>
  )
}
