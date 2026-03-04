import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getSupportTicket, getSupportTickets, updateSupportTicket } from '../services/platformAdminApi'
import { PLATFORM_SUPPORT_NOTIFICATIONS_ARRIVED_EVENT } from '../utils/appEvents'
import { showSuccessAlert } from '../utils/alerts'

const ticketStatusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_review', label: 'Sucursal registrada' },
  { value: 'resolved', label: 'Pago realizado' },
  { value: 'closed', label: 'Concluida' },
]

const ticketStatusLabels = {
  pending: 'Pendiente',
  in_review: 'Sucursal registrada',
  resolved: 'Pago realizado',
  closed: 'Concluida',
}

const ticketStatusClasses = {
  pending: 'bg-amber-100 text-amber-800 border border-amber-300',
  resolved: 'bg-sky-100 text-sky-800 border border-sky-300',
  in_review: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
  closed: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
}

const supportTabs = {
  mensajes: {
    apiType: 'message',
    title: 'Bandeja de mensajes',
    empty: 'No hay mensajes para mostrar.',
  },
  solicitudes: {
    apiType: 'branch_registration',
    title: 'Bandeja de solicitudes de sucursal',
    empty: 'No hay solicitudes para mostrar.',
  },
}

function toFriendlyError(error) {
  const message = error instanceof Error ? error.message : 'No se pudo completar la operacion.'
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'No se pudo conectar con backend. Verifica que API este arriba y CORS habilitado.'
  }
  return message
}

function normalizeTicket(item) {
  return {
    id: item.id || item.ticket_id || '',
    type: item.type || item.ticket_type || 'message',
    status: item.status || 'pending',
    message: item.message || item.description || '',
    contactPhone: item.contact_phone || item.phone || '',
    requesterQrCode: item.requester_qr_code || item.qr_code || '',
    senderUserId: item.sender_user_id || item.requester_user_id || item.user_id || '',
    senderUsername:
      item.sender_username || item.requester_username || item.user_username || item.username || item.user?.username || '',
    senderFullName:
      item.sender_full_name ||
      item.requester_full_name ||
      item.user_full_name ||
      item.full_name ||
      item.user?.full_name ||
      item.sender?.full_name ||
      '',
    adminNote: item.admin_note || '',
    createdAt: item.created_at || item.createdAt || '',
  }
}

function getStatusPillClass(status) {
  return ticketStatusClasses[status] || 'bg-slate-100 text-slate-700 border border-slate-300'
}

function SupportPage() {
  const navigate = useNavigate()
  const { tab = 'mensajes' } = useParams()
  const activeTab = tab === 'solicitudes' ? 'solicitudes' : 'mensajes'
  const fixedType = supportTabs[activeTab].apiType
  const [searchParams, setSearchParams] = useSearchParams()
  const ticketFromQuery = searchParams.get('ticket') || ''

  const [tickets, setTickets] = useState([])
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [filters, setFilters] = useState({ status: 'all' })
  const [selectedTicketId, setSelectedTicketId] = useState(ticketFromQuery)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [expandedTicketId, setExpandedTicketId] = useState('')
  const [isDetailMessageOpen, setIsDetailMessageOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [updateForm, setUpdateForm] = useState({ status: 'pending', adminNote: '' })
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  const [acceptingTicketId, setAcceptingTicketId] = useState('')
  const [statusUpdatingTicketId, setStatusUpdatingTicketId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (ticketFromQuery) {
      setSelectedTicketId(ticketFromQuery)
    }
  }, [ticketFromQuery])

  useEffect(() => {
    setIsEditing(false)
    setIsDetailMessageOpen(false)
  }, [selectedTicketId])

  const selectedTicketPreview = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId],
  )

  const loadTickets = useCallback(
    async (customOffset = 0) => {
      setLoadingList(true)
      setError('')
      try {
        const { items, pagination: apiPagination } = await getSupportTickets({
          type: fixedType,
          status: filters.status,
          limit: pagination.limit,
          offset: customOffset,
        })
        const normalized = items.map(normalizeTicket)
        setTickets(normalized)
        setPagination((prev) => ({
          ...prev,
          offset: Number(apiPagination.offset ?? customOffset),
          total: Number(apiPagination.total ?? normalized.length),
        }))
        setSelectedTicketId((currentId) => {
          if (currentId && !normalized.some((ticket) => ticket.id === currentId)) {
            return ''
          }
          return currentId
        })
      } catch (loadError) {
        setError(toFriendlyError(loadError))
      } finally {
        setLoadingList(false)
      }
    },
    [filters.status, fixedType, pagination.limit],
  )

  const loadTicketDetail = useCallback(async () => {
    if (activeTab === 'solicitudes') {
      setSelectedTicket(null)
      return
    }
    if (!selectedTicketId) {
      setSelectedTicket(null)
      return
    }
    setLoadingDetail(true)
    setError('')
    try {
      const detail = normalizeTicket(await getSupportTicket(selectedTicketId))
      setSelectedTicket(detail)
      setUpdateForm({
        status: detail.status || 'pending',
        adminNote: detail.adminNote || '',
      })
    } catch (detailError) {
      setError(toFriendlyError(detailError))
      setSelectedTicket(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [activeTab, selectedTicketId])

  useEffect(() => {
    loadTickets(0)
  }, [loadTickets])

  useEffect(() => {
    loadTicketDetail()
  }, [loadTicketDetail])

  useEffect(() => {
    const handleSupportNotification = () => {
      loadTickets(0)
      if (activeTab === 'mensajes' && selectedTicketId) {
        loadTicketDetail()
      }
    }

    window.addEventListener(PLATFORM_SUPPORT_NOTIFICATIONS_ARRIVED_EVENT, handleSupportNotification)
    return () => {
      window.removeEventListener(PLATFORM_SUPPORT_NOTIFICATIONS_ARRIVED_EVENT, handleSupportNotification)
    }
  }, [activeTab, loadTicketDetail, loadTickets, selectedTicketId])

  const applyFilters = () => {
    loadTickets(0)
  }

  const nextPage = () => {
    const nextOffset = pagination.offset + pagination.limit
    if (nextOffset >= pagination.total) {
      return
    }
    loadTickets(nextOffset)
  }

  const previousPage = () => {
    const previousOffset = Math.max(0, pagination.offset - pagination.limit)
    loadTickets(previousOffset)
  }

  const selectTicket = (ticketId) => {
    if (ticketId === selectedTicketId && searchParams.get('ticket') === ticketId) {
      return
    }
    setSelectedTicketId(ticketId)
    if (searchParams.get('ticket') !== ticketId) {
      const nextParams = new URLSearchParams(searchParams)
      if (ticketId) {
        nextParams.set('ticket', ticketId)
      } else {
        nextParams.delete('ticket')
      }
      setSearchParams(nextParams, { replace: true })
    }
  }

  const toggleMessagePreview = (ticketId) => {
    setExpandedTicketId((current) => (current === ticketId ? '' : ticketId))
  }

  const submitUpdate = async (event) => {
    event.preventDefault()
    if (!selectedTicketId) {
      return
    }
    setSaving(true)
    setError('')
    try {
      await updateSupportTicket(selectedTicketId, {
        status: updateForm.status,
        admin_note: updateForm.adminNote || null,
      })
      showSuccessAlert('Ticket actualizado')
      setIsEditing(false)
      await loadTicketDetail()
      await loadTickets(pagination.offset)
    } catch (updateError) {
      setError(toFriendlyError(updateError))
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setUpdateForm({
      status: selectedTicket?.status || selectedTicketPreview?.status || 'pending',
      adminNote: selectedTicket?.adminNote || '',
    })
  }

  const handleAcceptBranchRequest = async (ticket) => {
    if (ticket.status === 'closed') {
      setError('La solicitud ya esta concluida y no permite mas acciones.')
      return
    }
    if (ticket.status === 'pending') {
      setError('Primero debes marcar el estado como Pago realizado.')
      return
    }
    if (ticket.status === 'in_review') {
      setError('Esta solicitud ya tiene sucursal registrada. Si todo esta listo, marca Concluida.')
      return
    }
    let requesterQrCode = ticket.requesterQrCode
    let contactPhone = ticket.contactPhone
    if (!requesterQrCode) {
      try {
        const detail = normalizeTicket(await getSupportTicket(ticket.id))
        requesterQrCode = detail.requesterQrCode
        contactPhone = detail.contactPhone || contactPhone
      } catch (detailError) {
        setError(toFriendlyError(detailError))
        return
      }
    }
    if (!requesterQrCode) {
      setError('La solicitud no tiene requester_qr_code para identificar al owner.')
      return
    }
    setAcceptingTicketId(ticket.id)
    setError('')
    const params = new URLSearchParams({
      source: 'support',
      ticket: ticket.id,
      ownerQr: requesterQrCode,
    })
    if (contactPhone) {
      params.set('phone', contactPhone)
    }
    navigate(`/sucursales?${params.toString()}`)
  }

  const updateRequestStatus = async (ticket, status, adminNote) => {
    setStatusUpdatingTicketId(ticket.id)
    setError('')
    try {
      await updateSupportTicket(ticket.id, {
        status,
        admin_note: adminNote || null,
      })
      setTickets((prev) => prev.map((item) => (item.id === ticket.id ? { ...item, status } : item)))
      showSuccessAlert(`Estado actualizado: ${ticketStatusLabels[status] || status}`)
    } catch (statusError) {
      setError(toFriendlyError(statusError))
    } finally {
      setStatusUpdatingTicketId('')
    }
  }

  return (
    <section className="space-y-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Filtros de tickets</h3>
        <p className="mt-1 text-sm text-slate-600">
          Vista activa: <span className="font-semibold">{supportTabs[activeTab].title}</span>
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Estado</span>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {ticketStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={applyFilters}
              className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      </article>

      {error && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}

      {activeTab === 'solicitudes' ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Bandeja de solicitudes</h3>
          <p className="mt-1 text-sm text-slate-600">
            Al aceptar, te lleva a crear sucursal con datos precargados del solicitante.
          </p>

          <div className="mt-4 space-y-3">
            {loadingList && <p className="py-4 text-sm text-slate-500">Cargando solicitudes...</p>}
            {!loadingList && tickets.length === 0 && (
              <p className="py-4 text-sm text-slate-500">{supportTabs[activeTab].empty}</p>
            )}
            {!loadingList &&
              tickets.map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('es-CR') : 'Sin fecha'}
                  </p>
                  <div className="mt-1 grid gap-1 text-sm md:grid-cols-3">
                    <p>
                      <span className="font-semibold">Tipo:</span> {ticket.type}
                    </p>
                    <p>
                      <span className="font-semibold">Remitente:</span>{' '}
                      {ticket.senderFullName || ticket.senderUsername || 'N/A'}
                    </p>
                    <p>
                      <span className="font-semibold">Telefono:</span> {ticket.contactPhone || 'N/A'}
                    </p>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold">Estado:</span>{' '}
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusPillClass(ticket.status)}`}>
                      {ticketStatusLabels[ticket.status] || ticket.status}
                    </span>
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptBranchRequest(ticket)}
                      disabled={
                        acceptingTicketId === ticket.id ||
                        statusUpdatingTicketId === ticket.id ||
                        ticket.status !== 'resolved'
                      }
                      className={[
                        'rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50',
                        ticket.status === 'in_review' ? 'bg-indigo-700' : 'bg-teal-700',
                      ].join(' ')}
                    >
                      {acceptingTicketId === ticket.id ? 'Procesando...' : 'Registrar sucursal'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRequestStatus(ticket, 'resolved', 'Pago registrado para solicitud de sucursal.')
                      }
                      disabled={
                        statusUpdatingTicketId === ticket.id ||
                        ticket.status !== 'pending'
                      }
                      className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Pago realizado
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRequestStatus(ticket, 'closed', 'Proceso de solicitud de sucursal concluido.')
                      }
                      disabled={statusUpdatingTicketId === ticket.id || ticket.status !== 'in_review'}
                      className={[
                        'rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50',
                        ticket.status === 'in_review' ? 'bg-emerald-700' : 'bg-slate-800',
                      ].join(' ')}
                    >
                      Concluida
                    </button>
                  </div>
                </div>
              ))}
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
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">{supportTabs[activeTab].title}</h3>

            <div className="mt-4 space-y-3">
              {loadingList && <p className="py-4 text-sm text-slate-500">Cargando tickets...</p>}

              {!loadingList && tickets.length === 0 && (
                <p className="py-4 text-sm text-slate-500">{supportTabs[activeTab].empty}</p>
              )}

              {!loadingList &&
                tickets.map((ticket) => {
                  const isSelected = selectedTicketId === ticket.id
                  const isExpanded = expandedTicketId === ticket.id
                  return (
                    <div
                      key={ticket.id}
                      className={[
                        'rounded-xl border p-3 transition',
                        isSelected ? 'border-teal-400 bg-teal-50/60' : 'border-slate-200 bg-white',
                      ].join(' ')}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => selectTicket(ticket.id)}
                          className="flex-1 text-left"
                        >
                          <p className="text-xs text-slate-500">
                            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('es-CR') : 'Sin fecha'}
                          </p>
                          <div className="mt-1 grid gap-1 text-sm md:grid-cols-3">
                            <p>
                              <span className="font-semibold">Tipo:</span> {ticket.type}
                            </p>
                            <p>
                              <span className="font-semibold">Remitente:</span>{' '}
                              {ticket.senderFullName || ticket.senderUsername || 'N/A'}
                            </p>
                            <p>
                              <span className="font-semibold">Telefono:</span> {ticket.contactPhone || 'N/A'}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMessagePreview(ticket.id)}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          title="Mostrar/Ocultar mensaje"
                        >
                          {isExpanded ? 'Ocultar' : 'Ver'}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                          {ticket.message || 'Sin mensaje'}
                        </div>
                      )}
                    </div>
                  )
                })}
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

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-lg font-semibold">Detalle y gestion</h3>
            {!selectedTicketId && (
              <p className="mt-3 text-sm text-slate-500">
                Selecciona un ticket para ver detalle. Por defecto se mantiene cerrado.
              </p>
            )}
            {loadingDetail && <p className="mt-3 text-sm text-slate-500">Cargando detalle...</p>}

            {selectedTicketId && !loadingDetail && (
              <div className="mt-3 space-y-4 text-sm">
                <div className="rounded-lg bg-slate-100 p-3">
                  <p>
                    <span className="font-semibold">Tipo:</span> {selectedTicket?.type || selectedTicketPreview?.type}
                  </p>
                  <p>
                    <span className="font-semibold">Remitente:</span>{' '}
                    {selectedTicket?.senderFullName || selectedTicket?.senderUsername || 'N/A'}
                  </p>
                  <p>
                    <span className="font-semibold">Telefono:</span> {selectedTicket?.contactPhone || 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <button
                    type="button"
                    onClick={() => setIsDetailMessageOpen((open) => !open)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {isDetailMessageOpen ? 'Ocultar mensaje' : 'Ver mensaje'}
                  </button>
                  {isDetailMessageOpen && (
                    <p className="mt-3 whitespace-pre-wrap text-slate-700">{selectedTicket?.message || 'Sin mensaje'}</p>
                  )}
                </div>

                <form onSubmit={submitUpdate} className="space-y-3 rounded-lg border border-slate-200 p-3">
                  <fieldset disabled={!isEditing || saving} className="space-y-3 disabled:opacity-70">
                    <label className="block">
                      <span className="mb-1 block text-slate-600">Estado</span>
                      <select
                        value={updateForm.status}
                        onChange={(event) => setUpdateForm((prev) => ({ ...prev, status: event.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {ticketStatusOptions
                          .filter((option) => option.value !== 'all')
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-slate-600">Nota de admin</span>
                      <textarea
                        value={updateForm.adminNote}
                        onChange={(event) => setUpdateForm((prev) => ({ ...prev, adminNote: event.target.value }))}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </label>
                  </fieldset>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Actualizar
                    </button>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  )
}

export default SupportPage

