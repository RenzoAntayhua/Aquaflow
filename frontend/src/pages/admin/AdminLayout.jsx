import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { user, setToken, setUser } = useAuth()
  const navigate = useNavigate()
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

  const navItems = [
    { to: '/admin', label: 'Inicio', icon: '🏠', exact: true },
    { to: '/admin/colegios', label: 'Colegios', icon: '🏫' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: '👥' },
    { to: '/admin/reportes', label: 'Reportes', icon: '📊' },
    { to: '/admin/auditoria', label: 'Auditoría', icon: '📋' },
    { to: '/admin/config', label: 'Config', icon: '⚙️' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
                💧
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-[8px] text-white">✓</span>
              </div>
            </div>
            <div>
              <span className="font-bold text-slate-800 text-lg">AquaFlow</span>
              <div className="text-[10px] text-slate-400 font-medium -mt-1">ADMINISTRADOR</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 bg-slate-100/80 rounded-xl p-1">
              {navItems.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </nav>

          {/* User Menu */}
          <UserMenu user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 mt-8">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between text-xs text-slate-400">
          <span>© 2025 AquaFlow - Sistema de Gestión del Agua</span>
          <span>v1.0.0</span>
        </div>
      </footer>
    </div>
  )
}

function NavItem({ to, label, icon, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          {user?.nombre?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-slate-700">{user?.nombre || 'Admin'}</div>
          <div className="text-xs text-slate-400">{user?.email || ''}</div>
        </div>
        <svg className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-4 py-3 border-b">
              <div className="font-medium text-slate-800">{user?.nombre}</div>
              <div className="text-xs text-slate-400">{user?.email}</div>
            </div>
            
            <div className="py-1">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => { setOpen(false); }}
              >
                <span>👤</span> Mi perfil
              </button>
              <button 
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                onClick={() => { setOpen(false); window.location.href = '/password-change' }}
              >
                <span>🔑</span> Cambiar contraseña
              </button>
            </div>
            
            <div className="border-t pt-1">
              <button 
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                onClick={() => { setOpen(false); onLogout?.() }}
              >
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
