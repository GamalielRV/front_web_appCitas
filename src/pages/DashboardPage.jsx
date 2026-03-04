import { useCallback, useEffect, useMemo, useState } from 'react'
import StatCard from '../components/StatCard'
import { getAppointmentsReport, getBusinessTypes, getDashboard, getOrganizations } from '../services/platformAdminApi'

function normalizeMetricData(data = {}) {
  const appointmentStatus = data.appointments_by_status || data.appointments_status || data.citas_por_estado || {}
  return {
    organizations: data.organizations_total ?? data.total_organizations ?? data.organizations ?? 0,
    owners: data.owners_total ?? data.owners_active ?? data.total_owners ?? data.owners ?? 0,
    staff: data.staff_active ?? data.staff_total ?? data.total_staff ?? data.staff ?? 0,
    customers: data.customers_active ?? data.customers_total ?? data.total_customers ?? data.customers ?? 0,
    booked:
      data.appointments_scheduled ??
      appointmentStatus.booked ??
      appointmentStatus.reserved ??
      appointmentStatus.reservada ??
      0,
    completed:
      data.appointments_completed ??
      appointmentStatus.completed ??
      appointmentStatus.completada ??
      0,
    canceled:
      data.appointments_cancelled ??
      appointmentStatus.canceled ??
      appointmentStatus.cancelada ??
      0,
    noShow:
      data.appointments_no_show ??
      appointmentStatus.no_show ??
      appointmentStatus.noshow ??
      appointmentStatus.noShow ??
      0,
  }
}

function normalizeReportRow(item) {
  return {
    id: item.id || item.appointment_id || item.cita_id || crypto.randomUUID(),
    appointment: item.appointment || item.cita || item.code || item.id || 'N/A',
    customer: item.customer || item.cliente || item.customer_name || 'N/A',
    professional: item.professional || item.profesional || item.staff_name || 'N/A',
    organization: item.organization || item.sucursal || item.organization_name || 'N/A',
    category: item.business_type || item.categoria || item.business_type_name || 'N/A',
    price: item.price ?? item.precio ?? 0,
    duration: item.duration ?? item.duracion ?? 0,
    startAt: item.start_at || item.fecha_inicio || item.start || '',
    endAt: item.end_at || item.fecha_fin || item.end || '',
  }
}

function normalizeCategory(item) {
  return {
    id: item.id || item.business_type_id || item.uuid || '',
    name: item.name || item.title || 'Sin nombre',
  }
}

function normalizeBranch(item) {
  return {
    id: item.id || item.organization_id || item.uuid || '',
    name: item.name || item.trade_name || item.display_name || 'Sin nombre',
  }
}

const defaultFilters = {
  fromDate: '',
  toDate: '',
  businessTypeId: 'all',
  organizationId: 'all',
}

function DashboardPage() {
  const [dashboard, setDashboard] = useState(normalizeMetricData())
  const [reportRows, setReportRows] = useState([])
  const [categories, setCategories] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(defaultFilters)

  const reportPreview = useMemo(() => reportRows.slice(0, 8), [reportRows])

  const queryFromFilters = useCallback((customFilters) => ({
    date_from: customFilters.fromDate,
    date_to: customFilters.toDate,
    business_type_id: customFilters.businessTypeId,
    organization_id: customFilters.organizationId,
  }), [])

  const loadReferences = useCallback(async () => {
    try {
      const [businessTypes, organizationResult] = await Promise.all([
        getBusinessTypes(),
        getOrganizations({ limit: 200, offset: 0 }),
      ])
      setCategories(businessTypes.map(normalizeCategory))
      setBranches(organizationResult.items.map(normalizeBranch))
    } catch (loadError) {
      setError(loadError.message)
    }
  }, [])

  const loadMetrics = useCallback(async (customFilters) => {
    setLoading(true)
    setError('')
    try {
      const [dashboardResult, appointmentsResult] = await Promise.all([
        getDashboard(queryFromFilters(customFilters)),
        getAppointmentsReport(queryFromFilters(customFilters)),
      ])
      setDashboard(normalizeMetricData(dashboardResult))
      setReportRows(appointmentsResult.map(normalizeReportRow))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [queryFromFilters])

  useEffect(() => {
    loadReferences()
    loadMetrics(defaultFilters)
  }, [loadMetrics, loadReferences])

  const applyFilters = () => {
    loadMetrics(filters)
  }

  const handleExportCsv = () => {
    const rows = [
      ['appointment', 'customer', 'professional', 'organization', 'category', 'price', 'duration', 'start_at', 'end_at'],
      ...reportRows.map((row) => [
        row.appointment,
        row.customer,
        row.professional,
        row.organization,
        row.category,
        row.price,
        row.duration,
        row.startAt,
        row.endAt,
      ]),
    ]
    const csv = rows.map((row) => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'reporte-citas.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Filtros de dashboard</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Desde</span>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Hasta</span>
            <input
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Categoria</span>
            <select
              value={filters.businessTypeId}
              onChange={(event) => setFilters((prev) => ({ ...prev, businessTypeId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Sucursal</span>
            <select
              value={filters.organizationId}
              onChange={(event) => setFilters((prev) => ({ ...prev, organizationId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todas</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizaciones" value={dashboard.organizations} />
        <StatCard label="Owners" value={dashboard.owners} />
        <StatCard label="Staff" value={dashboard.staff} />
        <StatCard label="Customers" value={dashboard.customers} />
        <StatCard label="Reservas" value={dashboard.booked} />
        <StatCard label="Completadas" value={dashboard.completed} tone="success" />
        <StatCard label="Canceladas" value={dashboard.canceled} tone="warning" />
        <StatCard label="No Show" value={dashboard.noShow} tone="danger" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Resumen de estado</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>Citas con estado reservado: {dashboard.booked}</p>
            <p>Citas completadas: {dashboard.completed}</p>
            <p>Citas canceladas: {dashboard.canceled}</p>
            <p>Citas no-show: {dashboard.noShow}</p>
            <p className="pt-2 text-xs text-slate-500">
              Datos consultados en tiempo real desde <code>/api/v1/platform/dashboard</code>.
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Reporte de citas (preview)</h3>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!reportRows.length}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Exportar CSV
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2">Cita</th>
                  <th className="pb-2">Cliente</th>
                  <th className="pb-2">Sucursal</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="py-4 text-slate-500" colSpan={3}>
                      Cargando reporte...
                    </td>
                  </tr>
                )}
                {!loading &&
                  reportPreview.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-3">{row.appointment}</td>
                      <td className="py-3">{row.customer}</td>
                      <td className="py-3 font-semibold">{row.organization}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  )
}

export default DashboardPage
