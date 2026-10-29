export default function StatCard({ label, value, icon, tint = 'brand' }) {
  const tintClasses = {
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    pink: 'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  }[tint]

  return (
    <div className="rounded-xl2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-3 ${tintClasses}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
