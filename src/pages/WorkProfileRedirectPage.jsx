import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const APP_STORE_URL = 'https://apps.apple.com/cr/app/citaapp/id6769994001'
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=dev.openbyte.appcitas'

function WorkProfileRedirectPage() {
  const [searchParams] = useSearchParams()
  const [showFallback, setShowFallback] = useState(false)
  const organizationId = searchParams.get('org') || ''
  const staffUserId = searchParams.get('staff') || ''
  const hasRequiredParams = Boolean(organizationId && staffUserId)

  const deepLink = useMemo(() => {
    const params = new URLSearchParams()
    if (organizationId) {
      params.set('org', organizationId)
    }
    if (staffUserId) {
      params.set('staff', staffUserId)
    }
    return `prototypecitas://perfil-trabajo?${params.toString()}`
  }, [organizationId, staffUserId])

  useEffect(() => {
    if (!hasRequiredParams) {
      return undefined
    }

    window.location.href = deepLink
    const timer = window.setTimeout(() => {
      setShowFallback(true)
    }, 1800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [deepLink, hasRequiredParams])

  const retryOpenApp = () => {
    window.location.href = deepLink
    setShowFallback(true)
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center">
        <article className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <img src="/LogoCitapp.png" alt="CitApp" className="mx-auto mb-4 h-14 w-auto rounded-lg object-contain" />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">CitApp</p>
          <h1 className="mt-2 text-2xl font-bold">Perfil de trabajo</h1>
          <p className="mt-3 text-sm text-slate-600">
            Abre este perfil en CitApp o descarga la app para continuar.
          </p>

          {!hasRequiredParams ? (
            <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">
              El enlace no tiene los datos necesarios para abrir el perfil.
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Intentando abrir la app...
            </p>
          )}

          {(showFallback || !hasRequiredParams) && (
            <div className="mt-5 space-y-3">
              {hasRequiredParams && (
                <button
                  type="button"
                  onClick={retryOpenApp}
                  className="w-full rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
                >
                  Abrir en CitApp
                </button>
              )}
              <a
                href={APP_STORE_URL}
                className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Descargar en App Store
              </a>
              <a
                href={GOOGLE_PLAY_URL}
                className="block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Descargar en Google Play
              </a>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default WorkProfileRedirectPage
