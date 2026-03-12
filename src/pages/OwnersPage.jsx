import { useCallback, useEffect, useMemo, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import {
  getOrganizationOwnerCandidates,
  getOrganizations,
  getOwners,
  reassignOrganizationOwner,
  updateOwner,
} from '../services/platformAdminApi'
import { showSuccessAlert } from '../utils/alerts'

function normalizeOwner(item) {
  return {
    id: item.id || item.owner_id || item.user_id || '',
    name: item.name || item.full_name || item.username || item.email || 'Sin nombre',
    email: item.email || item.username || '',
    active: item.active ?? item.is_active ?? true,
  }
}

function normalizeBranch(item) {
  return {
    id: item.id || item.organization_id || item.uuid || '',
    name: item.name || item.trade_name || item.display_name || 'Sin nombre',
    ownerId: item.owner_id || item.ownerId || item.owner?.id || '',
  }
}

function normalizeOwnerCandidate(item) {
  return {
    id: item.id || item.user_id || '',
    name: item.full_name || item.name || item.username || item.email || 'Sin nombre',
    email: item.email || '',
    role: item.role || 'staff',
    active: item.active ?? true,
    isCurrentOwner: item.is_current_owner ?? false,
  }
}

function OwnersPage() {
  const [owners, setOwners] = useState([])
  const [ownersPagination, setOwnersPagination] = useState({ limit: 20, offset: 0, total: 0 })
  const [branches, setBranches] = useState([])
  const [ownerCandidates, setOwnerCandidates] = useState([])
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reassignData, setReassignData] = useState({
    branchId: '',
    ownerId: '',
  })

  const branchCountByOwner = useMemo(() => {
    return branches.reduce((accumulator, branch) => {
      accumulator[branch.ownerId] = (accumulator[branch.ownerId] || 0) + 1
      return accumulator
    }, {})
  }, [branches])

  const loadOwners = useCallback(async (offset = 0) => {
    setLoading(true)
    setError('')
    try {
      const [ownersResult, organizationsResult] = await Promise.all([
        getOwners({ limit: ownersPagination.limit, offset }),
        getOrganizations({ limit: 200, offset: 0 }),
      ])
      const normalizedOwners = ownersResult.items.map(normalizeOwner)
      const normalizedBranches = organizationsResult.items.map(normalizeBranch)

      setOwners(normalizedOwners)
      setBranches(normalizedBranches)
      setOwnersPagination({
        limit: Number(ownersResult.pagination.limit ?? ownersPagination.limit),
        offset: Number(ownersResult.pagination.offset ?? offset),
        total: Number(ownersResult.pagination.total ?? normalizedOwners.length),
      })
      setReassignData((current) => {
        const branchExists = normalizedBranches.some((branch) => branch.id === current.branchId)
        return {
          branchId: branchExists ? current.branchId : normalizedBranches[0]?.id || '',
          ownerId: current.ownerId || '',
        }
      })
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [ownersPagination.limit])

  const loadOwnerCandidates = useCallback(async (branchId) => {
    if (!branchId) {
      setOwnerCandidates([])
      setReassignData((prev) => ({ ...prev, ownerId: '' }))
      return
    }

    setLoadingCandidates(true)
    setError('')
    try {
      const items = await getOrganizationOwnerCandidates(branchId)
      const normalizedCandidates = items.map(normalizeOwnerCandidate)
      setOwnerCandidates(normalizedCandidates)
      setReassignData((prev) => {
        const alreadySelected = normalizedCandidates.some((candidate) => candidate.id === prev.ownerId)
        return {
          ...prev,
          ownerId: alreadySelected ? prev.ownerId : normalizedCandidates[0]?.id || '',
        }
      })
    } catch (loadError) {
      setOwnerCandidates([])
      setReassignData((prev) => ({ ...prev, ownerId: '' }))
      setError(loadError.message)
    } finally {
      setLoadingCandidates(false)
    }
  }, [])

  useEffect(() => {
    loadOwners(0)
  }, [loadOwners])

  useEffect(() => {
    loadOwnerCandidates(reassignData.branchId)
  }, [reassignData.branchId, loadOwnerCandidates])

  const toggleOwner = async (ownerId, active) => {
    setError('')
    try {
      await updateOwner(ownerId, { active: !active })
      showSuccessAlert(active ? 'Owner desactivado' : 'Owner activado')
      await loadOwners(ownersPagination.offset)
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const reassignBranch = async (event) => {
    event.preventDefault()
    if (!reassignData.branchId || !reassignData.ownerId) {
      setError('Selecciona sucursal y un candidato owner valido.')
      return
    }
    setError('')
    try {
      await reassignOrganizationOwner(reassignData.branchId, reassignData.ownerId)
      showSuccessAlert('Sucursal reasignada correctamente')
      await loadOwners(ownersPagination.offset)
      await loadOwnerCandidates(reassignData.branchId)
    } catch (reassignError) {
      setError(reassignError.message)
    }
  }

  const previousPage = () => {
    const previousOffset = Math.max(0, ownersPagination.offset - ownersPagination.limit)
    loadOwners(previousOffset)
  }

  const nextPage = () => {
    const nextOffset = ownersPagination.offset + ownersPagination.limit
    if (nextOffset >= ownersPagination.total) {
      return
    }
    loadOwners(nextOffset)
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Owners y admins</h3>
        {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Owner</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Sucursales</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={4}>
                    Cargando owners...
                  </td>
                </tr>
              )}
              {!loading &&
                owners.map((owner) => (
                  <tr key={owner.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">{owner.name}</p>
                      <p className="text-xs text-slate-500">{owner.email || 'Sin email'}</p>
                    </td>
                    <td className="py-3">
                      <StatusBadge active={owner.active} />
                    </td>
                    <td className="py-3 font-semibold">{branchCountByOwner[owner.id] || 0}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleOwner(owner.id, owner.active)}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          {owner.active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
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
            disabled={ownersPagination.offset === 0}
            className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
          >
            Anterior
          </button>
          <p className="text-xs text-slate-500">
            {ownersPagination.total ? ownersPagination.offset + 1 : 0} -{' '}
            {Math.min(ownersPagination.offset + ownersPagination.limit, ownersPagination.total)} de{' '}
            {ownersPagination.total}
          </p>
          <button
            type="button"
            onClick={nextPage}
            disabled={ownersPagination.offset + ownersPagination.limit >= ownersPagination.total}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            Siguiente
          </button>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Reasignar sucursal</h3>
        <p className="mt-1 text-xs text-slate-500">
          Solo se permiten candidatos de esa sucursal (owner actual + staff verificado activo).
        </p>
        <form onSubmit={reassignBranch} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Sucursal</span>
            <select
              value={reassignData.branchId}
              onChange={(event) => setReassignData((prev) => ({ ...prev, branchId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Nuevo owner</span>
            <select
              value={reassignData.ownerId}
              onChange={(event) => setReassignData((prev) => ({ ...prev, ownerId: event.target.value }))}
              disabled={loadingCandidates || ownerCandidates.length === 0}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              {loadingCandidates && <option value="">Cargando candidatos...</option>}
              {!loadingCandidates && ownerCandidates.length === 0 && (
                <option value="">Sin candidatos disponibles</option>
              )}
              {!loadingCandidates &&
                ownerCandidates.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                    {owner.isCurrentOwner ? ' (owner actual)' : ''} - {owner.role}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={!reassignData.branchId || !reassignData.ownerId || loadingCandidates}
            className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Aplicar reasignacion
          </button>
        </form>
      </article>
    </section>
  )
}

export default OwnersPage
