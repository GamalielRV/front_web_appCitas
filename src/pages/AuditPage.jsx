import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAuditEvents } from '../services/platformAdminApi'

function normalizeEvent(item) {
  return {
    id: item.id || item.event_id || crypto.randomUUID(),
    sentAt: item.sent_at || item.created_at || item.at || '',
    actor: item.actor || item.actor_email || 'Sistema',
    eventType: item.event_type || item.action || 'unknown',
    title: item.title || '',
    message: item.message || item.details || '',
    organization: item.organization || item.target || '',
  }
}

function AuditPage() {
  const [events, setEvents] = useState([])
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [query, setQuery] = useState('')
  const [eventType, setEventType] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const eventTypes = useMemo(() => [...new Set(events.map((event) => event.eventType))], [events])

  const loadEvents = useCallback(async (offset = 0) => {
    setLoading(true)
    setError('')
    try {
      const { items, pagination: apiPagination } = await getAuditEvents({
        limit: pagination.limit,
        offset,
      })
      const normalizedItems = items.map(normalizeEvent)
      setEvents(normalizedItems)
      setPagination({
        limit: Number(apiPagination.limit ?? pagination.limit),
        offset: Number(apiPagination.offset ?? offset),
        total: Number(apiPagination.total ?? normalizedItems.length),
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    loadEvents(0)
  }, [loadEvents])

  const filteredEvents = useMemo(
    () => {
      return events.filter((event) => {
        const byType = eventType === 'all' || event.eventType === eventType
        const searchTarget = `${event.actor} ${event.organization} ${event.title} ${event.message}`.toLowerCase()
        const byQuery = !query || searchTarget.includes(query.toLowerCase())
        return byType && byQuery
      })
    },
    [eventType, events, query],
  )

  const previousPage = () => {
    const previousOffset = Math.max(0, pagination.offset - pagination.limit)
    loadEvents(previousOffset)
  }

  const nextPage = () => {
    const nextOffset = pagination.offset + pagination.limit
    if (nextOffset >= pagination.total) {
      return
    }
    loadEvents(nextOffset)
  }

  return (
    <section className="space-y-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Filtros de auditoria</h3>
        {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Tipo de evento</span>
            <select
              value={eventType}
              onChange={(event) => setEventType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todas</option>
              {eventTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Buscar por actor/objetivo</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ej. superadmin"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Historial de acciones criticas</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Fecha</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Accion</th>
                <th className="pb-2">Objetivo</th>
                <th className="pb-2">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={5}>
                    Cargando eventos...
                  </td>
                </tr>
              )}
              {!loading &&
                filteredEvents.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="py-3">
                      {event.sentAt ? new Date(event.sentAt).toLocaleString('es-MX') : 'Sin fecha'}
                    </td>
                    <td className="py-3">{event.actor}</td>
                    <td className="py-3 font-mono text-xs">{event.eventType}</td>
                    <td className="py-3">{event.organization || '-'}</td>
                    <td className="py-3">
                      <p className="font-medium">{event.title || 'Evento'}</p>
                      <p className="text-xs text-slate-500">{event.message || '-'}</p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={previousPage}
            disabled={pagination.offset === 0}
            className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            Anterior
          </button>
          <p className="text-xs text-slate-500">
            {pagination.total ? pagination.offset + 1 : 0} -{' '}
            {Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <button
            type="button"
            onClick={nextPage}
            disabled={pagination.offset + pagination.limit >= pagination.total}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Siguiente
          </button>
        </div>
      </article>
    </section>
  )
}

export default AuditPage
