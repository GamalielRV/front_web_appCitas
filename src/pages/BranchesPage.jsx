import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import {
  createOrganization,
  getBusinessTypes,
  getOrganizations,
  getOwners,
  previewOwnerByQr,
  reassignOrganizationOwner,
  updateSupportTicket,
  updateOrganization,
} from '../services/platformAdminApi'
import { showSuccessAlert } from '../utils/alerts'
import { decodeQrCodeFromImageFile } from '../utils/qrImageDecoder'

function normalizeCategory(item) {
  return {
    id: item.id || item.business_type_id || item.uuid || '',
    name: item.name || item.title || 'Sin nombre',
  }
}

function normalizeOwner(item) {
  return {
    id: item.id || item.owner_id || item.user_id || '',
    name: item.name || item.full_name || item.username || item.email || 'Sin nombre',
  }
}

function normalizeBranch(item) {
  return {
    id: item.id || item.organization_id || item.uuid || '',
    name: item.name || item.trade_name || item.display_name || 'Sin nombre',
    categoryId: item.business_type_id || item.businessTypeId || item.business_type?.id || '',
    ownerId: item.owner_id || item.ownerId || item.owner?.id || '',
    active: item.active ?? item.is_active ?? item.status === 'active',
    verified: item.verified ?? item.is_verified ?? false,
    createdAt: item.created_at || item.createdAt || '',
  }
}

function BranchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const createSectionRef = useRef(null)
  const lastAppliedSupportPrefillKeyRef = useRef('')
  const [branches, setBranches] = useState([])
  const [categories, setCategories] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [createError, setCreateError] = useState('')
  const [listError, setListError] = useState('')
  const [filters, setFilters] = useState({
    q: '',
    categoryId: 'all',
    active: 'all',
    ownerId: 'all',
  })
  const [pagination, setPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [createForm, setCreateForm] = useState({
    name: '',
    businessTypeId: '',
    ownerQrCode: '',
    address: '',
    latitude: '',
    longitude: '',
    dayStart: '',
    dayEnd: '',
    phone: '',
    email: '',
    active: true,
  })
  const [ownerPreview, setOwnerPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [scanningQrImage, setScanningQrImage] = useState(false)
  const [qrImageName, setQrImageName] = useState('')
  const [qrImagePreviewUrl, setQrImagePreviewUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const supportSource = searchParams.get('source') || ''
  const supportTicketId = searchParams.get('ticket') || ''
  const supportOwnerQr = searchParams.get('ownerQr') || ''
  const supportPhone = searchParams.get('phone') || ''
  const supportEmail = searchParams.get('email') || ''
  const supportPrefillKey = `${supportSource}|${supportTicketId}|${supportOwnerQr}|${supportPhone}|${supportEmail}`

  const filteredBranches = useMemo(
    () => branches,
    [branches],
  )

  const loadReferences = async () => {
    try {
      const [businessTypes, ownerResult] = await Promise.all([
        getBusinessTypes(),
        getOwners({ limit: 200, offset: 0 }),
      ])
      const normalizedCategories = businessTypes.map(normalizeCategory)
      setCategories(normalizedCategories)
      setOwners(ownerResult.items.map(normalizeOwner))
      setCreateForm((prev) => ({
        ...prev,
        businessTypeId: prev.businessTypeId || normalizedCategories[0]?.id || '',
      }))
    } catch (loadError) {
      setListError(loadError.message)
    }
  }

  const loadOrganizations = useCallback(async (customOffset = 0, customFilters = {}) => {
    setLoading(true)
    setListError('')
    try {
      const { items, pagination: apiPagination } = await getOrganizations({
        q: customFilters.q,
        business_type_id: customFilters.categoryId,
        active: customFilters.active,
        owner_id: customFilters.ownerId,
        limit: pagination.limit,
        offset: customOffset,
      })
      setBranches(items.map(normalizeBranch))
      setPagination((prev) => ({
        ...prev,
        offset: Number(apiPagination.offset ?? customOffset),
        total: Number(apiPagination.total ?? items.length),
      }))
    } catch (loadError) {
      setListError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  useEffect(() => {
    loadReferences()
  }, [])

  useEffect(() => {
    if (supportSource !== 'support') {
      return
    }
    if (!supportOwnerQr && !supportPhone && !supportEmail) {
      return
    }
    if (lastAppliedSupportPrefillKeyRef.current === supportPrefillKey) {
      return
    }

    lastAppliedSupportPrefillKeyRef.current = supportPrefillKey
      setCreateForm((prev) => ({
        ...prev,
        ownerQrCode: supportOwnerQr || prev.ownerQrCode,
        phone: supportPhone || prev.phone,
        email: supportEmail || prev.email,
      }))

    if (createSectionRef.current) {
      createSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (!supportOwnerQr) {
      return
    }

    const hydrateOwnerFromSupport = async () => {
      setPreviewLoading(true)
      setCreateError('')
      try {
        const preview = await previewOwnerByQr(supportOwnerQr)
        setOwnerPreview(preview)
        setCreateForm((prev) => ({
          ...prev,
          email: prev.email || preview.email || '',
          phone: prev.phone || preview.phone || '',
        }))
        showSuccessAlert('Solicitud cargada', `${preview.full_name} (${preview.username})`)
      } catch (previewError) {
        setOwnerPreview(null)
        const message = previewError?.message || 'No se pudo previsualizar owner.'
        if (message.toLowerCase().includes('owner admin no encontrado')) {
          setCreateError('No se pudo previsualizar el usuario por rol, pero puedes continuar y crear la sucursal.')
        } else {
          setCreateError(message)
        }
      } finally {
        setPreviewLoading(false)
      }
    }

    hydrateOwnerFromSupport()
  }, [supportSource, supportOwnerQr, supportPhone, supportEmail, supportPrefillKey])

  useEffect(
    () => () => {
      if (qrImagePreviewUrl) {
        URL.revokeObjectURL(qrImagePreviewUrl)
      }
    },
    [qrImagePreviewUrl],
  )

  useEffect(() => {
    loadOrganizations(0, {
      q: '',
      categoryId: filters.categoryId,
      active: filters.active,
      ownerId: filters.ownerId,
    })
  }, [filters.categoryId, filters.active, filters.ownerId, loadOrganizations])

  const runSearch = () => {
    loadOrganizations(0, filters)
  }

  const toggleStatus = async (id, active) => {
    setListError('')
    try {
      await updateOrganization(id, { active: !active })
      showSuccessAlert(active ? 'Sucursal desactivada' : 'Sucursal activada')
      await loadOrganizations(pagination.offset, filters)
    } catch (actionError) {
      setListError(actionError.message)
    }
  }

  const updateCategory = async (id, categoryId) => {
    setListError('')
    try {
      await updateOrganization(id, { business_type_id: categoryId })
      showSuccessAlert('Categoria de sucursal actualizada')
      await loadOrganizations(pagination.offset, filters)
    } catch (actionError) {
      setListError(actionError.message)
    }
  }

  const updateOwner = async (id, ownerId) => {
    setListError('')
    try {
      await reassignOrganizationOwner(id, ownerId)
      showSuccessAlert('Owner reasignado')
      await loadOrganizations(pagination.offset, filters)
    } catch (actionError) {
      setListError(actionError.message)
    }
  }

  const nextPage = () => {
    const nextOffset = pagination.offset + pagination.limit
    if (nextOffset >= pagination.total) {
      return
    }
    loadOrganizations(nextOffset, filters)
  }

  const previousPage = () => {
    const previousOffset = Math.max(0, pagination.offset - pagination.limit)
    loadOrganizations(previousOffset, filters)
  }

  const handlePreviewOwner = async () => {
    if (!createForm.ownerQrCode.trim()) {
      setCreateError('Debes ingresar un codigo QR para previsualizar owner.')
      return
    }
    setPreviewLoading(true)
    setCreateError('')
    try {
      const preview = await previewOwnerByQr(createForm.ownerQrCode.trim())
      setOwnerPreview(preview)
      setCreateForm((prev) => ({
        ...prev,
        email: prev.email || preview.email || '',
        phone: prev.phone || preview.phone || '',
      }))
      showSuccessAlert('Owner encontrado', `${preview.full_name} (${preview.username})`)
    } catch (previewError) {
      setOwnerPreview(null)
      setCreateError(previewError.message)
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleQrImageSelection = async (event) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) {
      return
    }

    if (qrImagePreviewUrl) {
      URL.revokeObjectURL(qrImagePreviewUrl)
    }
    const previewUrl = URL.createObjectURL(selectedFile)
    setQrImagePreviewUrl(previewUrl)
    setQrImageName(selectedFile.name)

    setScanningQrImage(true)
    setCreateError('')
    try {
      const qrCode = await decodeQrCodeFromImageFile(selectedFile)
      setCreateForm((prev) => ({ ...prev, ownerQrCode: qrCode }))
      const preview = await previewOwnerByQr(qrCode)
      setOwnerPreview(preview)
      setCreateForm((prev) => ({
        ...prev,
        email: prev.email || preview.email || '',
        phone: prev.phone || preview.phone || '',
      }))
      showSuccessAlert('QR leido correctamente', `${preview.full_name} (${preview.username})`)
    } catch (scanError) {
      setOwnerPreview(null)
      setCreateError(scanError.message)
    } finally {
      setScanningQrImage(false)
      event.target.value = ''
    }
  }

  const handleCreateBranch = async (event) => {
    event.preventDefault()
    if (!createForm.businessTypeId) {
      setCreateError('Selecciona una categoria para crear la sucursal.')
      return
    }
    if (!createForm.ownerQrCode.trim()) {
      setCreateError('Debes ingresar un QR de owner.')
      return
    }
    const manualAddress = createForm.address.trim()
    const hasLat = createForm.latitude !== ''
    const hasLng = createForm.longitude !== ''
    if (hasLat !== hasLng) {
      setCreateError('Debes ingresar latitude y longitude juntos.')
      return
    }

    let parsedLatitude = null
    let parsedLongitude = null
    if (hasLat && hasLng) {
      parsedLatitude = Number(createForm.latitude)
      parsedLongitude = Number(createForm.longitude)
      if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
        setCreateError('Latitude y longitude deben ser numeros validos.')
        return
      }
      if (parsedLatitude < -90 || parsedLatitude > 90 || parsedLongitude < -180 || parsedLongitude > 180) {
        setCreateError('Coordenadas fuera de rango. Latitude [-90,90], longitude [-180,180].')
        return
      }
    }

    const payload = {
      name: createForm.name.trim(),
      business_type_id: createForm.businessTypeId,
      owner_qr_code: createForm.ownerQrCode.trim(),
      active: createForm.active,
      ...(manualAddress ? { address: manualAddress } : {}),
      ...(parsedLatitude !== null && parsedLongitude !== null
        ? { latitude: parsedLatitude, longitude: parsedLongitude }
        : {}),
      ...(createForm.dayStart ? { day_start: createForm.dayStart } : {}),
      ...(createForm.dayEnd ? { day_end: createForm.dayEnd } : {}),
      ...(createForm.phone.trim() ? { phone: createForm.phone.trim() } : {}),
      ...(createForm.email.trim() ? { email: createForm.email.trim() } : {}),
    }

    setCreating(true)
    setCreateError('')
    try {
      await createOrganization(payload)
      let supportStatusError = ''
      if (supportSource === 'support' && supportTicketId) {
        try {
          await updateSupportTicket(supportTicketId, {
            status: 'in_review',
            admin_note: 'Sucursal registrada correctamente. Pendiente cierre manual como concluida.',
          })
        } catch (ticketStatusError) {
          supportStatusError = ticketStatusError.message || 'No se pudo marcar la solicitud como sucursal registrada.'
        }
      }
      showSuccessAlert('Sucursal creada')
      if (supportStatusError) {
        setCreateError(`Sucursal creada, pero no se actualizo estado del ticket: ${supportStatusError}`)
      }
      setCreateForm((prev) => ({
        ...prev,
        name: '',
        ownerQrCode: '',
        address: '',
        latitude: '',
        longitude: '',
        dayStart: '',
        dayEnd: '',
        phone: '',
        email: '',
        active: true,
      }))
      setOwnerPreview(null)
      if (qrImagePreviewUrl) {
        URL.revokeObjectURL(qrImagePreviewUrl)
      }
      setQrImagePreviewUrl('')
      setQrImageName('')
      if (supportSource === 'support') {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.delete('source')
        nextParams.delete('ticket')
        nextParams.delete('ownerQr')
        nextParams.delete('phone')
        nextParams.delete('email')
        setSearchParams(nextParams, { replace: true })
      }
      await loadOrganizations(0, filters)
    } catch (createError) {
      setCreateError(createError.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="space-y-5">
      <article ref={createSectionRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Crear sucursal (owner por QR)</h3>
        {supportSource === 'support' && (
          <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            Solicitud enlazada desde soporte {supportTicketId ? `(ticket ${supportTicketId})` : ''}. Datos del
            solicitante precargados.
          </div>
        )}
        <form onSubmit={handleCreateBranch} className="mt-3 grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Nombre *</span>
            <input
              required
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Categoria *</span>
            <select
              value={createForm.businessTypeId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, businessTypeId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">QR del owner *</span>
            <div className="flex gap-2">
              <input
                required
                value={createForm.ownerQrCode}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, ownerQrCode: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                type="button"
                onClick={handlePreviewOwner}
                disabled={previewLoading}
                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
              >
                {previewLoading ? '...' : 'Preview'}
              </button>
            </div>
            <span className="mt-2 block text-xs text-slate-500">O carga imagen del QR (.jpg/.jpeg/.png)</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleQrImageSelection}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
            {scanningQrImage && <p className="mt-1 text-xs text-slate-500">Escaneando QR desde imagen...</p>}
            {qrImageName && <p className="mt-1 text-xs text-slate-500">Archivo cargado: {qrImageName}</p>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Direccion</span>
            <input
              value={createForm.address}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, address: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Latitude</span>
            <input
              type="number"
              step="any"
              value={createForm.latitude}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, latitude: event.target.value }))}
              placeholder="9.9347"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Longitude</span>
            <input
              type="number"
              step="any"
              value={createForm.longitude}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, longitude: event.target.value }))}
              placeholder="-84.0875"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Inicio jornada</span>
            <input
              type="time"
              value={createForm.dayStart}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, dayStart: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Fin jornada</span>
            <input
              type="time"
              value={createForm.dayEnd}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, dayEnd: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Telefono</span>
            <input
              value={createForm.phone}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Email</span>
            <input
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={createForm.active}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Activa
          </label>
          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? 'Creando...' : 'Crear sucursal'}
            </button>
          </div>
        </form>
        {createError && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{createError}</p>}

        {ownerPreview && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            {ownerPreview.avatar_url_presigned && (
              <img
                src={ownerPreview.avatar_url_presigned}
                alt={ownerPreview.full_name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            {qrImagePreviewUrl && (
              <img
                src={qrImagePreviewUrl}
                alt="QR cargado"
                className="h-12 w-12 rounded-md border border-emerald-200 object-cover"
              />
            )}
            <p className="font-semibold">Owner detectado</p>
            <div>
              <p>
                {ownerPreview.full_name} ({ownerPreview.username})
              </p>
              <p className="text-xs">{ownerPreview.email}</p>
            </div>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Filtros</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Busqueda</span>
            <input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  runSearch()
                }
              }}
              placeholder="Nombre de sucursal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Categoria</span>
            <select
              value={filters.categoryId}
              onChange={(event) => setFilters((prev) => ({ ...prev, categoryId: event.target.value }))}
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
            <span className="mb-1 block text-slate-600">Estado</span>
            <select
              value={filters.active}
              onChange={(event) => setFilters((prev) => ({ ...prev, active: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Owner</span>
            <select
              value={filters.ownerId}
              onChange={(event) => setFilters((prev) => ({ ...prev, ownerId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="all">Todos</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={runSearch}
            className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600"
          >
            Buscar
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Listado de sucursales</h3>
        {listError && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{listError}</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Sucursal</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Verificada</th>
                <th className="pb-2">Categoria</th>
                <th className="pb-2">Owner</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={6}>
                    Cargando sucursales...
                  </td>
                </tr>
              )}
              {!loading &&
                filteredBranches.map((branch) => (
                  <tr key={branch.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">{branch.name}</p>
                      <p className="text-xs text-slate-500">Alta: {branch.createdAt || 'N/A'}</p>
                    </td>
                    <td className="py-3">
                      <StatusBadge active={branch.active} activeText="Activo" inactiveText="Inactivo" />
                    </td>
                    <td className="py-3">
                      <StatusBadge active={branch.verified} activeText="Verificada" inactiveText="Pendiente" />
                    </td>
                    <td className="py-3">
                      <select
                        value={branch.categoryId}
                        onChange={(event) => updateCategory(branch.id, event.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      >
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <select
                        value={branch.ownerId}
                        onChange={(event) => updateOwner(branch.id, event.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1"
                      >
                        {owners.map((owner) => (
                          <option key={owner.id} value={owner.id}>
                            {owner.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(branch.id, branch.active)}
                        className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        {branch.active ? 'Desactivar' : 'Activar'}
                      </button>
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

export default BranchesPage
