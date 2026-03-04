import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/platformAdminApi'
import { PLATFORM_SUPPORT_NOTIFICATIONS_ARRIVED_EVENT } from '../utils/appEvents'

function toFriendlyError(error) {
  const message = error instanceof Error ? error.message : 'No se pudo cargar notificaciones.'
  if (message.toLowerCase().includes('failed to fetch')) {
    return 'No se pudo conectar con backend para cargar notificaciones.'
  }
  return message
}

function normalizeNotification(item) {
  return {
    id: item.id || '',
    type: item.type || '',
    title: item.title || 'Notificacion',
    message: item.message || '',
    status: item.status || 'unread',
    scope: item.scope || 'work',
    sentAt: item.sent_at || '',
    data: item.data && typeof item.data === 'object' ? item.data : {},
  }
}

function isSupportLikeNotification(notification) {
  if (notification.data.support_ticket_id || notification.data.ticket_id) {
    return true
  }
  const haystack = `${notification.type} ${notification.title} ${notification.message}`.toLowerCase()
  return (
    haystack.includes('support') ||
    haystack.includes('soporte') ||
    haystack.includes('ticket') ||
    haystack.includes('branch_registration') ||
    haystack.includes('message')
  )
}

function getSupportTarget(notification) {
  const ticketId = notification.data.support_ticket_id || notification.data.ticket_id || ''
  const source = `${notification.type} ${notification.title} ${notification.data.support_type || ''}`.toLowerCase()
  const isBranchRequest =
    source.includes('branch') ||
    source.includes('registration') ||
    source.includes('sucursal') ||
    Boolean(notification.data.contact_phone)
  const basePath = isBranchRequest ? '/soporte/solicitudes' : '/soporte/mensajes'
  return ticketId ? `${basePath}?ticket=${encodeURIComponent(ticketId)}` : basePath
}

function formatSentAt(value) {
  if (!value) {
    return 'Sin fecha'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha'
  }
  return date.toLocaleString('es-CR')
}

function NotificationsBell() {
  const navigate = useNavigate()
  const dropdownRef = useRef(null)
  const hasBootstrappedNotificationsRef = useRef(false)
  const seenNotificationIdsRef = useRef(new Set())
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMarkAll, setLoadingMarkAll] = useState(false)
  const [error, setError] = useState('')

  const unreadCount = notifications.filter((notification) => notification.status === 'unread').length

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const list = await getNotifications({ scope: 'work', status: 'unread' })
      const normalized = list
        .map(normalizeNotification)
        .filter((notification) => notification.scope === 'work')
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())

      const newSupportNotifications = normalized.filter(
        (notification) =>
          !seenNotificationIdsRef.current.has(notification.id) && isSupportLikeNotification(notification),
      )

      if (hasBootstrappedNotificationsRef.current && newSupportNotifications.length > 0) {
        window.dispatchEvent(
          new CustomEvent(PLATFORM_SUPPORT_NOTIFICATIONS_ARRIVED_EVENT, {
            detail: {
              count: newSupportNotifications.length,
              notifications: newSupportNotifications,
            },
          }),
        )
      }

      seenNotificationIdsRef.current = new Set(normalized.map((notification) => notification.id))
      hasBootstrappedNotificationsRef.current = true
      setNotifications(normalized)
      setError('')
    } catch (loadError) {
      setError(toFriendlyError(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = window.setInterval(loadNotifications, 30000)
    return () => {
      window.clearInterval(interval)
    }
  }, [loadNotifications])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target)) {
        return
      }
      setOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [])

  useEffect(() => {
    const markAsReadOnOpen = async () => {
      if (!open || unreadCount === 0 || loadingMarkAll) {
        return
      }
      setLoadingMarkAll(true)
      try {
        await markAllNotificationsRead('work')
        setNotifications((prev) => prev.map((item) => ({ ...item, status: 'read' })))
      } catch {
        // If this fails, keep current state and allow manual retries.
      } finally {
        setLoadingMarkAll(false)
      }
    }

    markAsReadOnOpen()
  }, [open, unreadCount, loadingMarkAll])

  const previewItems = useMemo(() => notifications.slice(0, 8), [notifications])

  const openTargetFromNotification = async (notification) => {
    try {
      await markNotificationRead(notification.id)
    } catch {
      // Ignore mark-as-read failure and still navigate.
    }

    if (isSupportLikeNotification(notification)) {
      navigate(getSupportTarget(notification))
    } else {
      navigate('/')
    }

    setOpen(false)
    loadNotifications()
  }

  const handleMarkAllRead = async () => {
    setLoadingMarkAll(true)
    try {
      await markAllNotificationsRead('work')
      await loadNotifications()
    } finally {
      setLoadingMarkAll(false)
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:bg-slate-50"
        aria-label="Notificaciones"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M10 17a2 2 0 1 0 4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-96 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notificaciones</p>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={loadingMarkAll || unreadCount === 0}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              {loadingMarkAll ? 'Marcando...' : 'Marcar todo leido'}
            </button>
          </div>

          {loading && <p className="py-4 text-sm text-slate-500">Cargando...</p>}
          {!loading && error && <p className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">{error}</p>}
          {!loading && !error && previewItems.length === 0 && (
            <p className="py-4 text-sm text-slate-500">No hay notificaciones pendientes.</p>
          )}

          {!loading && !error && previewItems.length > 0 && (
            <ul className="max-h-80 space-y-2 overflow-auto pr-1">
              {previewItems.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openTargetFromNotification(notification)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{notification.type}</p>
                    <p className="text-sm font-semibold text-slate-800">{notification.title}</p>
                    {notification.message && <p className="text-xs text-slate-600">{notification.message}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">{formatSentAt(notification.sentAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
