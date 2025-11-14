import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, setToken, setUser } = useAuth()
  const navigate = useNavigate()
  // Aceptar rol como string o número para evitar errores al hacer toLowerCase
  const rawRol = user?.rol
  const rol = typeof rawRol === 'string'
    ? rawRol.toLowerCase()
    : typeof rawRol === 'number'
      ? ['estudiante','profesor','director','admin'][Number(rawRol)]
      : undefined
  const location = useLocation()
  if (rol !== 'admin') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }

  function handleLogout() {
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f3f6f8]">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b">
        <div className="mx-auto max-w-6xl px-3 h-12 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm">💧</div>
            <span className="font-semibold text-slate-800 text-sm">Aquaflow Admin</span>
          </div>
          <nav className="flex-1 flex items-center justify-center gap-6 text-xs text-slate-700">
            <Tab to="/admin" label="Inicio" />
            <Tab to="/admin/colegios" label="Colegios" />
            {/* El administrador no gestiona aulas */}
            <Tab to="/admin/usuarios" label="Usuarios" />
            <Tab to="/admin/reportes" label="Reportes" />
            <Tab to="/admin/config" label="Config" />
          </nav>
          <UserMenu onLogout={handleLogout} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}

function Tab({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative px-2 py-1 hover:text-blue-700 ${isActive ? 'text-blue-700' : ''}`
      }
    >
      {({ isActive }) => (
        <span className="flex items-center gap-1">
          {label}
          {isActive && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-blue-600 rounded-full" />}
        </span>
      )}
    </NavLink>
  )
}

function UserMenu({ onLogout }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ml-auto relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="h-7 px-3 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        ⚙️ Admin
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow text-sm">
          <button className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { setOpen(false); }}>
            Perfil (pronto)
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { setOpen(false); window.location.href = '/password-change' }}>
            Cambiar contraseña
          </button>
          <div className="border-t" />
          <button className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50" onClick={() => { setOpen(false); onLogout?.() }}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}