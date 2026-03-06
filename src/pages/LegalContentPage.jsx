import { useEffect, useState } from 'react'
import { DEFAULT_TERMS_CONTENT, DEFAULT_TERMS_TITLE } from '../data/legalDefaults'
import { getPlatformTerms, updatePlatformTerms } from '../services/legalContentApi'
import { showSuccessAlert } from '../utils/alerts'

function LegalContentPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: DEFAULT_TERMS_TITLE,
    version: '1.0.0',
    effectiveAt: '',
    content: DEFAULT_TERMS_CONTENT,
    published: true,
  })

  useEffect(() => {
    let mounted = true
    const loadContent = async () => {
      setLoading(true)
      setError('')
      try {
        const legal = await getPlatformTerms()
        if (!mounted) {
          return
        }
        setForm((prev) => ({
          ...prev,
          ...legal,
          title: legal.title || prev.title,
          content: legal.content || prev.content,
          version: legal.version || prev.version,
          effectiveAt: legal.effectiveAt ? legal.effectiveAt.slice(0, 10) : prev.effectiveAt,
        }))
      } catch {
        if (mounted) {
          setError('No se pudo cargar contenido legal desde API. Edita borrador y configura endpoint de backend.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadContent()
    return () => {
      mounted = false
    }
  }, [])

  const onSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updatePlatformTerms({
        title: form.title.trim(),
        version: form.version.trim(),
        effective_at: form.effectiveAt || null,
        content: form.content,
        published: form.published,
      })
      showSuccessAlert('Terminos actualizados')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar contenido legal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-5">
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold">Contenido legal</h3>
        <p className="mt-1 text-sm text-slate-600">
          Este contenido se usa para terminos y condiciones publicos en web y app movil.
        </p>
      </article>

      {error && <p className="rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}

      {loading ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Cargando contenido legal...</p>
        </article>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
          <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-slate-600">Titulo</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Version</span>
                <input
                  required
                  value={form.version}
                  onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-slate-600">Vigente desde</span>
                <input
                  type="date"
                  value={form.effectiveAt}
                  onChange={(event) => setForm((prev) => ({ ...prev, effectiveAt: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
                />
                Publicado
              </label>
            </div>

            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-slate-600">Contenido</span>
              <textarea
                rows={20}
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>

            <div className="mt-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-base font-semibold">Vista previa</h4>
            <p className="mt-1 text-xs text-slate-500">
              Version: {form.version || 'N/A'} | Vigente:{' '}
              {form.effectiveAt ? new Date(form.effectiveAt).toLocaleDateString('es-CR') : 'N/A'}
            </p>
            <h5 className="mt-3 text-sm font-semibold text-slate-800">{form.title || DEFAULT_TERMS_TITLE}</h5>
            <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-700">
              {form.content || DEFAULT_TERMS_CONTENT}
            </pre>
          </article>
        </div>
      )}
    </section>
  )
}

export default LegalContentPage

