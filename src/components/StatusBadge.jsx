function StatusBadge({ active, activeText = 'Activo', inactiveText = 'Inactivo' }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
        active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700',
      ].join(' ')}
    >
      {active ? activeText : inactiveText}
    </span>
  )
}

export default StatusBadge
