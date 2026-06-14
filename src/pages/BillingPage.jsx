import { useCallback, useEffect, useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import {
  getBillingInvoice,
  getBillingInvoices,
  getBillingOrganizations,
  reviewBillingPayment,
  updateBillingOrganizationSettings,
} from '../services/platformAdminApi'
import { showDangerConfirm, showSuccessAlert } from '../utils/alerts'

const billingStatusLabels = {
  free: 'Gratis',
  suspended: 'Suspendida',
  overdue: 'En mora',
  pending: 'Pendiente',
  current: 'Al dia',
}

const invoiceStatusLabels = {
  generated: 'Generada',
  notified: 'Notificada',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
}

function money(value, currency = 'CRC') {
  const amount = Number(value || 0)
  return `${currency} ${amount.toFixed(2)}`
}

function normalizeBillingOrganization(item) {
  return {
    organizationId: item.organization_id || item.id || '',
    organizationName: item.organization_name || item.name || 'Sin nombre',
    businessTypeName: item.business_type_name || 'Sin categoria',
    ownerName: item.owner_name || 'Sin owner',
    organizationActive: Boolean(item.organization_active),
    billingIsFree: Boolean(item.billing_is_free),
    billingFreeUntil: item.billing_free_until || '',
    billableStaffCount: Number(item.billable_staff_count || 0),
    currentBillingStatus: item.current_billing_status || 'pending',
    latestInvoiceId: item.latest_invoice_id || '',
    latestInvoiceStatus: item.latest_invoice_status || '',
    latestInvoiceDueDate: item.latest_invoice_due_date || '',
    latestInvoiceTotalAmount: item.latest_invoice_total_amount ?? 0,
    overdueInvoicesCount: Number(item.overdue_invoices_count || 0),
  }
}

function normalizeInvoice(item) {
  return {
    id: item.id || '',
    organizationId: item.organization_id || '',
    organizationName: item.organization_name || 'Sin sucursal',
    periodYear: item.period_year || '',
    periodMonth: item.period_month || '',
    issueDate: item.issue_date || '',
    dueDate: item.due_date || '',
    status: item.status || 'generated',
    currency: item.currency || 'CRC',
    branchBaseAmount: item.branch_base_amount ?? 0,
    staffCount: Number(item.staff_count || 0),
    staffUnitAmount: item.staff_unit_amount ?? 0,
    staffTotalAmount: item.staff_total_amount ?? 0,
    totalAmount: item.total_amount ?? 0,
    isFreeInvoice: Boolean(item.is_free_invoice),
    items: Array.isArray(item.items) ? item.items : [],
    payments: Array.isArray(item.payments) ? item.payments : [],
  }
}

function BillingPage() {
  const [organizations, setOrganizations] = useState([])
  const [organizationPagination, setOrganizationPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [organizationFilters, setOrganizationFilters] = useState({
    billingStatus: 'all',
    organizationActive: 'all',
  })
  const [invoices, setInvoices] = useState([])
  const [invoicePagination, setInvoicePagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [invoiceFilters, setInvoiceFilters] = useState({
    status: 'all',
    organizationId: '',
  })
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loadingOrganizations, setLoadingOrganizations] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [savingOrgId, setSavingOrgId] = useState('')
  const [reviewingPaymentId, setReviewingPaymentId] = useState('')
  const [error, setError] = useState('')

  const organizationById = useMemo(
    () => organizations.reduce((acc, item) => ({ ...acc, [item.organizationId]: item.organizationName }), {}),
    [organizations],
  )

  const loadOrganizations = useCallback(
    async (customOffset = 0) => {
      setLoadingOrganizations(true)
      setError('')
      try {
        const { items, pagination } = await getBillingOrganizations({
          billing_status: organizationFilters.billingStatus,
          organization_active: organizationFilters.organizationActive,
          limit: organizationPagination.limit,
          offset: customOffset,
        })
        const normalized = items.map(normalizeBillingOrganization)
        setOrganizations(normalized)
        setOrganizationPagination((prev) => ({
          ...prev,
          offset: Number(pagination.offset ?? customOffset),
          total: Number(pagination.total ?? normalized.length),
        }))
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoadingOrganizations(false)
      }
    },
    [organizationFilters.billingStatus, organizationFilters.organizationActive, organizationPagination.limit],
  )

  const loadInvoices = useCallback(
    async (customOffset = 0) => {
      setLoadingInvoices(true)
      setError('')
      try {
        const { items, pagination } = await getBillingInvoices({
          status: invoiceFilters.status,
          organization_id: invoiceFilters.organizationId,
          limit: invoicePagination.limit,
          offset: customOffset,
        })
        const normalized = items.map(normalizeInvoice)
        setInvoices(normalized)
        setInvoicePagination((prev) => ({
          ...prev,
          offset: Number(pagination.offset ?? customOffset),
          total: Number(pagination.total ?? normalized.length),
        }))
      } catch (loadError) {
        setError(loadError.message)
      } finally {
        setLoadingInvoices(false)
      }
    },
    [invoiceFilters.organizationId, invoiceFilters.status, invoicePagination.limit],
  )

  useEffect(() => {
    loadOrganizations(0)
  }, [loadOrganizations])

  useEffect(() => {
    loadInvoices(0)
  }, [loadInvoices])

  const openInvoice = async (invoiceId) => {
    if (!invoiceId) {
      return
    }
    setLoadingDetail(true)
    setError('')
    try {
      setSelectedInvoice(normalizeInvoice(await getBillingInvoice(invoiceId)))
    } catch (detailError) {
      setError(detailError.message)
      setSelectedInvoice(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const updateFreeMode = async (organization, nextIsFree) => {
    const confirmed = await showDangerConfirm({
      title: nextIsFree ? 'Activar modo gratis' : 'Desactivar modo gratis',
      text: `Se actualizara la configuracion de cobro de ${organization.organizationName}.`,
      confirmButtonText: 'Confirmar',
    })
    if (!confirmed) {
      return
    }

    setSavingOrgId(organization.organizationId)
    setError('')
    try {
      await updateBillingOrganizationSettings(organization.organizationId, {
        billing_is_free: nextIsFree,
        billing_free_until: nextIsFree ? organization.billingFreeUntil || null : null,
      })
      showSuccessAlert(nextIsFree ? 'Modo gratis activado' : 'Modo gratis desactivado')
      await loadOrganizations(organizationPagination.offset)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingOrgId('')
    }
  }

  const updateFreeUntil = async (organization, freeUntil) => {
    setSavingOrgId(organization.organizationId)
    setError('')
    try {
      await updateBillingOrganizationSettings(organization.organizationId, {
        billing_is_free: organization.billingIsFree,
        billing_free_until: freeUntil || null,
      })
      showSuccessAlert('Fecha de modo gratis actualizada')
      await loadOrganizations(organizationPagination.offset)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setSavingOrgId('')
    }
  }

  const reviewPayment = async (payment, approve) => {
    const confirmed = await showDangerConfirm({
      title: approve ? 'Aprobar pago' : 'Rechazar pago',
      text: approve ? 'La factura quedara marcada segun la validacion del backend.' : 'El pago reportado sera rechazado.',
      confirmButtonText: approve ? 'Aprobar' : 'Rechazar',
    })
    if (!confirmed) {
      return
    }

    setReviewingPaymentId(payment.id)
    setError('')
    try {
      await reviewBillingPayment(payment.id, {
        approve,
        review_note: approve ? 'Pago validado desde platform admin.' : 'Pago rechazado desde platform admin.',
      })
      showSuccessAlert(approve ? 'Pago aprobado' : 'Pago rechazado')
      await openInvoice(payment.invoice_id || selectedInvoice?.id)
      await loadInvoices(invoicePagination.offset)
      await loadOrganizations(organizationPagination.offset)
    } catch (reviewError) {
      setError(reviewError.message)
    } finally {
      setReviewingPaymentId('')
    }
  }

  return (
    <section className="space-y-5">
      {error && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Sucursales y estado de cobro</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Estado cobro</span>
            <select
              value={organizationFilters.billingStatus}
              onChange={(event) => setOrganizationFilters((prev) => ({ ...prev, billingStatus: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="current">Al dia</option>
              <option value="pending">Pendiente</option>
              <option value="overdue">En mora</option>
              <option value="suspended">Suspendida</option>
              <option value="free">Gratis</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sucursal activa</span>
            <select
              value={organizationFilters.organizationActive}
              onChange={(event) =>
                setOrganizationFilters((prev) => ({ ...prev, organizationActive: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => loadOrganizations(0)}
              className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Aplicar filtros
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Sucursal</th>
                <th className="pb-2">Cobro</th>
                <th className="pb-2">Staff</th>
                <th className="pb-2">Ultima factura</th>
                <th className="pb-2">Modo gratis</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrganizations && (
                <tr>
                  <td colSpan={5} className="py-4 text-slate-500">Cargando cobros...</td>
                </tr>
              )}
              {!loadingOrganizations &&
                organizations.map((organization) => (
                  <tr key={organization.organizationId} className="border-t border-slate-100 align-top">
                    <td className="py-3">
                      <p className="font-medium">{organization.organizationName}</p>
                      <p className="text-xs text-slate-500">{organization.businessTypeName}</p>
                      <p className="text-xs text-slate-500">Owner: {organization.ownerName}</p>
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        active={organization.currentBillingStatus !== 'overdue' && organization.currentBillingStatus !== 'suspended'}
                        activeText={billingStatusLabels[organization.currentBillingStatus] || organization.currentBillingStatus}
                        inactiveText={billingStatusLabels[organization.currentBillingStatus] || organization.currentBillingStatus}
                      />
                      {organization.overdueInvoicesCount > 0 && (
                        <p className="mt-1 text-xs text-rose-700">Vencidas: {organization.overdueInvoicesCount}</p>
                      )}
                    </td>
                    <td className="py-3">{organization.billableStaffCount}</td>
                    <td className="py-3">
                      {organization.latestInvoiceId ? (
                        <button
                          type="button"
                          onClick={() => openInvoice(organization.latestInvoiceId)}
                          className="text-left text-teal-700 underline"
                        >
                          <span className="block">
                            {invoiceStatusLabels[organization.latestInvoiceStatus] || organization.latestInvoiceStatus}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {money(organization.latestInvoiceTotalAmount)} | vence {organization.latestInvoiceDueDate || 'N/A'}
                          </span>
                        </button>
                      ) : (
                        'Sin factura'
                      )}
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={organization.billingIsFree}
                            disabled={savingOrgId === organization.organizationId}
                            onChange={(event) => updateFreeMode(organization, event.target.checked)}
                          />
                          Gratis
                        </label>
                        <input
                          type="date"
                          defaultValue={organization.billingFreeUntil || ''}
                          disabled={!organization.billingIsFree || savingOrgId === organization.organizationId}
                          onBlur={(event) => {
                            if (event.target.value !== (organization.billingFreeUntil || '')) {
                              updateFreeUntil(organization, event.target.value)
                            }
                          }}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Facturas</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Estado</span>
              <select
                value={invoiceFilters.status}
                onChange={(event) => setInvoiceFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="all">Todas</option>
                <option value="generated">Generada</option>
                <option value="notified">Notificada</option>
                <option value="paid">Pagada</option>
                <option value="overdue">Vencida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Sucursal</span>
              <select
                value={invoiceFilters.organizationId}
                onChange={(event) => setInvoiceFilters((prev) => ({ ...prev, organizationId: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Todas</option>
                {organizations.map((organization) => (
                  <option key={organization.organizationId} value={organization.organizationId}>
                    {organization.organizationName}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => loadInvoices(0)}
                className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600"
              >
                Aplicar filtros
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {loadingInvoices && <p className="py-4 text-sm text-slate-500">Cargando facturas...</p>}
            {!loadingInvoices &&
              invoices.map((invoice) => (
                <button
                  type="button"
                  key={invoice.id}
                  onClick={() => openInvoice(invoice.id)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{invoice.organizationName || organizationById[invoice.organizationId]}</p>
                      <p className="text-xs text-slate-500">
                        Periodo {invoice.periodMonth}/{invoice.periodYear} | vence {invoice.dueDate || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{money(invoice.totalAmount, invoice.currency)}</p>
                      <p className="text-xs text-slate-500">{invoiceStatusLabels[invoice.status] || invoice.status}</p>
                    </div>
                  </div>
                </button>
              ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold">Detalle de factura</h3>
          {loadingDetail && <p className="mt-3 text-sm text-slate-500">Cargando detalle...</p>}
          {!loadingDetail && !selectedInvoice && (
            <p className="mt-3 text-sm text-slate-500">Selecciona una factura para ver pagos e items.</p>
          )}
          {!loadingDetail && selectedInvoice && (
            <div className="mt-3 space-y-4 text-sm">
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="font-semibold">{selectedInvoice.organizationName}</p>
                <p>Estado: {invoiceStatusLabels[selectedInvoice.status] || selectedInvoice.status}</p>
                <p>Total: {money(selectedInvoice.totalAmount, selectedInvoice.currency)}</p>
                <p>Staff cobrable: {selectedInvoice.staffCount}</p>
                {selectedInvoice.isFreeInvoice && <p className="text-teal-700">Factura en modo gratis</p>}
              </div>

              <div>
                <p className="font-semibold">Items</p>
                <div className="mt-2 space-y-2">
                  {selectedInvoice.items.length === 0 && <p className="text-slate-500">Sin items.</p>}
                  {selectedInvoice.items.map((item, index) => (
                    <div key={`${item.id || index}`} className="rounded-lg border border-slate-200 p-2">
                      <p>{item.description || item.name || `Item ${index + 1}`}</p>
                      <p className="text-xs text-slate-500">{money(item.amount ?? item.total_amount, selectedInvoice.currency)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold">Pagos reportados</p>
                <div className="mt-2 space-y-2">
                  {selectedInvoice.payments.length === 0 && <p className="text-slate-500">Sin pagos reportados.</p>}
                  {selectedInvoice.payments.map((payment) => (
                    <div key={payment.id} className="rounded-lg border border-slate-200 p-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{money(payment.amount, selectedInvoice.currency)}</p>
                          <p className="text-xs text-slate-500">SINPE: {payment.sinpe_reference || 'N/A'}</p>
                          <p className="text-xs text-slate-500">Estado: {payment.status || 'reported'}</p>
                          {payment.notes && <p className="mt-1 text-xs text-slate-600">{payment.notes}</p>}
                        </div>
                        {payment.status === 'reported' && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => reviewPayment(payment, true)}
                              disabled={reviewingPaymentId === payment.id}
                              className="rounded-lg bg-emerald-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              onClick={() => reviewPayment(payment, false)}
                              disabled={reviewingPaymentId === payment.id}
                              className="rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

export default BillingPage
