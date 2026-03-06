import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_PRIVACY_CONTENT, DEFAULT_PRIVACY_TITLE } from '../data/legalDefaults'
import { getPublicPrivacy } from '../services/legalContentApi'

function PrivacyPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [privacy, setPrivacy] = useState({
    title: DEFAULT_PRIVACY_TITLE,
    content: DEFAULT_PRIVACY_CONTENT,
    version: '1.0.0',
    effectiveAt: '',
  })

  useEffect(() => {
    let mounted = true
    const loadPrivacy = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await getPublicPrivacy()
        if (!mounted) {
          return
        }
        setPrivacy((prev) => ({
          ...prev,
          ...response,
          title: response.title || prev.title,
          content: response.content || prev.content,
        }))
      } catch {
        if (mounted) {
          setError('No se pudo cargar politica desde API. Mostrando borrador local.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPrivacy()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Citas App</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{privacy.title}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Version: {privacy.version || 'N/A'} | Vigencia:{' '}
                {privacy.effectiveAt ? new Date(privacy.effectiveAt).toLocaleDateString('es-CR') : 'N/A'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/terminos-y-condiciones"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Ver terminos
              </Link>
              <Link
                to="/login"
                className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600"
              >
                Ir a login
              </Link>
            </div>
          </div>
        </header>

        {error && <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">{error}</p>}

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Cargando politica...</p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-800">{privacy.content}</pre>
          )}
        </article>
      </div>
    </main>
  )
}

export default PrivacyPage

