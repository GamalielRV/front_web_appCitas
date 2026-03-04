function StatCard({ label, value, tone = 'default' }) {
  const toneStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
  }

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${toneStyles[tone] || toneStyles.default}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  )
}

export default StatCard
