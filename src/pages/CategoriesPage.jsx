import { useEffect, useState } from 'react'
import StatusBadge from '../components/StatusBadge'
import { createBusinessType, deleteBusinessType, getBusinessTypes, updateBusinessType } from '../services/platformAdminApi'
import { showDangerConfirm, showSuccessAlert } from '../utils/alerts'

const emptyForm = {
  id: null,
  name: '',
  slug: '',
  description: '',
  active: true,
}

function normalizeCategory(item) {
  return {
    id: item.id || item.business_type_id || item.uuid || '',
    name: item.name || item.title || 'Sin nombre',
    slug: item.slug || '',
    description: item.description || '',
    active: item.active ?? item.is_active ?? true,
  }
}

function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const loadCategories = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getBusinessTypes()
      setCategories(response.map(normalizeCategory))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const normalizedSlug = (form.slug || form.name).toLowerCase().replaceAll(' ', '-')
    const payload = {
      name: form.name,
      slug: normalizedSlug,
      description: form.description || null,
      active: form.active,
    }

    setSaving(true)
    setError('')
    try {
      if (form.id) {
        await updateBusinessType(form.id, payload)
        showSuccessAlert('Categoria actualizada')
      } else {
        await createBusinessType(payload)
        showSuccessAlert('Categoria creada')
      }
      setForm(emptyForm)
      await loadCategories()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleCategory = async (id) => {
    const target = categories.find((item) => item.id === id)
    if (!target) {
      return
    }

    setError('')
    try {
      await updateBusinessType(id, { active: !target.active })
      showSuccessAlert(target.active ? 'Categoria desactivada' : 'Categoria activada')
      await loadCategories()
    } catch (toggleError) {
      setError(toggleError.message)
    }
  }

  const editCategory = (id) => {
    const category = categories.find((item) => item.id === id)
    if (category) {
      setForm(category)
    }
  }

  const handleDeleteCategory = async (id) => {
    const target = categories.find((item) => item.id === id)
    if (!target) {
      return
    }

    const confirmed = await showDangerConfirm({
      title: `Eliminar "${target.name}"`,
      text: 'Se desactivara la categoria y dejara de mostrarse en el panel.',
    })
    if (!confirmed) {
      return
    }

    setError('')
    try {
      const result = await deleteBusinessType(id)
      if (!result?.deleted) {
        throw new Error('El backend no confirmo eliminacion.')
      }
      showSuccessAlert('Categoria eliminada', 'Se elimino completamente desde backend.')
      if (form.id === id) {
        setForm(emptyForm)
      }
      await loadCategories()
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Listado de categorias</h3>
        {error && <p className="mt-3 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Nombre</th>
                <th className="pb-2">Slug</th>
                <th className="pb-2">Descripcion</th>
                <th className="pb-2">Estado</th>
                <th className="pb-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={5}>
                    Cargando categorias...
                  </td>
                </tr>
              )}
              {!loading &&
                categories.map((category) => (
                  <tr key={category.id} className="border-t border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">{category.name}</p>
                    </td>
                    <td className="py-3">{category.slug || 'N/A'}</td>
                    <td className="py-3">{category.description || 'Sin descripcion'}</td>
                    <td className="py-3">
                      <StatusBadge active={category.active} />
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editCategory(category.id)}
                          className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-300"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.id)}
                          className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                        >
                          {category.active ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category.id)}
                          className="rounded-lg bg-rose-700 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-600"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">{form.id ? 'Editar categoria' : 'Crear categoria'}</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Nombre</span>
            <input
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Slug</span>
            <input
              value={form.slug}
              onChange={(event) => updateField('slug', event.target.value)}
              placeholder="opcional, se autogenera"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Descripcion</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
            />
            Categoria activa
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {form.id ? 'Guardar cambios' : 'Crear categoria'}
            </button>
            <button
              type="button"
              onClick={() => setForm(emptyForm)}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Limpiar
            </button>
          </div>
        </form>
      </article>
    </section>
  )
}

export default CategoriesPage
