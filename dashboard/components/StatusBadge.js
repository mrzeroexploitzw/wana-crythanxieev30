const STYLES = {
  online: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
  offline: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  pairing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
}

const DOT = {
  online: 'bg-brand-500',
  offline: 'bg-slate-400',
  pairing: 'bg-pink-500',
}

export default function StatusBadge({ status }) {
  const key = STYLES[status] ? status : 'offline'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STYLES[key]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT[key]}`} />
      {key.charAt(0).toUpperCase() + key.slice(1)}
    </span>
  )
}
