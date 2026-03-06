import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function LoginPage() {
  const { isAuthenticated, sessionReady, login, allowedUsername } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = location.state?.from || '/'

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm font-semibold text-slate-600">
        Validando sesion...
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login({ username: allowedUsername, password })
      navigate(redirectTo, { replace: true })
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <img src="/LogoCitapp.png" alt="Logo Citas App" className="h-14 w-auto rounded-lg object-contain" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Citas App</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Login Super Admin</h1>
        <p className="mt-2 text-sm text-slate-600">
          Acceso restringido. Solo el usuario <span className="font-semibold">{allowedUsername}</span>.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Consulta los{' '}
          <Link to="/terminos-y-condiciones" className="font-semibold text-teal-700 hover:text-teal-600">
            terminos y condiciones
          </Link>{' '}
          y la{' '}
          <Link to="/politica-de-privacidad" className="font-semibold text-teal-700 hover:text-teal-600">
            politica de privacidad
          </Link>{' '}
          sin iniciar sesion.
        </p>

        {error && <p className="mt-4 rounded-lg bg-rose-100 px-3 py-2 text-sm text-rose-800">{error}</p>}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Usuario</span>
            <input
              value={allowedUsername}
              readOnly
              autoComplete="username"
              className="w-full cursor-not-allowed rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700"
            />
            <span className="mt-1 block text-xs text-slate-500">Usuario fijo por seguridad.</span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default LoginPage
