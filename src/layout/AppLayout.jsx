import { NavLink, Outlet, useLocation } from 'react-router-dom'
import NotificationsBell from '../components/NotificationsBell'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/categorias', label: 'Categorias' },
  { to: '/sucursales', label: 'Sucursales' },
  { to: '/owners', label: 'Owners/Admins' },
  { to: '/soporte/mensajes', label: 'Soporte mensajes' },
  { to: '/soporte/solicitudes', label: 'Soporte solicitudes' },
]

const routeTitles = {
  '/': 'Dashboard Global',
  '/categorias': 'Categorias de negocio',
  '/sucursales': 'Sucursales globales',
  '/owners': 'Owners y admins',
  '/soporte/mensajes': 'Soporte: mensajes',
  '/soporte/solicitudes': 'Soporte: solicitudes',
}

function AppLayout() {
  const location = useLocation()
  const { authUser, logout } = useAuth()
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  const s3Region = import.meta.env.VITE_AWS_S3_REGION || 'us-east-1'
  const routeKey = navItems.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )?.to

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1720px] flex-col px-3 md:flex-row md:px-5">
        <aside className="border-b border-slate-200 bg-white/80 p-5 backdrop-blur md:min-h-screen md:w-72 md:border-r md:border-b-0">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Citas App</p>
            <h1 className="text-2xl font-bold">Super Admin</h1>
          </div>

          <nav className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    'rounded-xl px-4 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-7">
          <div className="mx-auto w-full max-w-6xl">
            <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Modulo activo</p>
              <div className="mt-2 flex flex-col gap-3">
                <h2 className="text-2xl font-bold">{routeTitles[routeKey || '/']}</h2>

                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
                    API: <span className="font-semibold text-slate-800">{apiBaseUrl}</span> | S3 Region:{' '}
                    <span className="font-semibold text-slate-800">{s3Region}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <NotificationsBell />
                    <div className="rounded-lg bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                      Usuario: {authUser || 'N/A'}
                    </div>
                    <button
                      type="button"
                      onClick={logout}
                      className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                    >
                      Cerrar sesion
                    </button>
                  </div>
                </div>
              </div>
            </header>

            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AppLayout
