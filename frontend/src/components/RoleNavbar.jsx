import { useState } from 'react'
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RoleNavbar() {
  const { user, setToken, setUser } = useAuth()
  if (!user) return null
  const navigate = useNavigate()
  const location = useLocation()
  const { aulaId, colegioId } = useParams()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const rawRol = user?.rol
  const rol = typeof rawRol === 'string'
    ? rawRol.toLowerCase()
    : ['estudiante','profesor','director','admin'][Number(rawRol)] || String(rawRol).toLowerCase()

  const items = buildItemsForRole(rol, { aulaId, colegioId, user })

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b">
      <div className="px-4 h-12 w-full flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm">💧</div>
          <span className="font-semibold text-slate-800 text-sm">AquaPlay</span>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-6 text-xs text-slate-700">
          {items.map(it => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `relative px-2 py-1 hover:text-blue-700 ${isActive ? 'text-blue-700' : ''}`}>
              {({ isActive }) => (
                <span className="flex items-center gap-1">
                  {it.label}
                  {isActive && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-blue-600 rounded-full" />}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(o => !o)}
          className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Menu"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
        
        <div className="ml-auto relative">
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="h-7 px-3 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            👤 {user?.Nombre || user?.nombre || 'Usuario'}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white text-slate-800 border rounded shadow text-sm z-50">
              <button className="w-full text-left px-3 py-2 hover:bg-slate-50" onClick={() => { setMenuOpen(false); navigate('/password-change') }}>
                Cambiar contraseña
              </button>
              <div className="border-t" />
              <button className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-50" onClick={() => { setMenuOpen(false); setToken(null); setUser(null); navigate('/login') }}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white">
          <nav className="flex flex-col py-2">
            {items.map(it => (
              <NavLink
                key={it.to}
                to={it.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) => `px-4 py-2 text-sm ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                {it.label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}

function buildItemsForRole(rol, { aulaId, colegioId, user }) {
  const defAulaId = user?.aulaId || aulaId || 1
  const defColegioId = user?.colegioId || colegioId || 1
  switch (rol) {
    case 'estudiante':
      return [
        { label: '🏠 Inicio', to: '/estudiante/inicio' },
        { label: '🎮 Juegos', to: '/estudiante/juegos' },
        { label: '👤 Perfil', to: '/estudiante/perfil' },
        { label: '🏆 Ranking', to: '/estudiante/ranking' },
        // Recibos removido temporalmente - implementar con datos reales de consumo
      ]
    case 'profesor':
      return [
        { label: '📊 Dashboard', to: `/profesor/aula/${defAulaId}` },
        { label: '👥 Estudiantes', to: `/profesor/aula/${defAulaId}/estudiantes` },
        { label: '🎯 Retos', to: `/profesor/aula/${defAulaId}/retos` },
        { label: '📈 Reportes', to: `/profesor/aula/${defAulaId}/reportes` },
      ]
    case 'director':
      return [
        { label: '🏠 Inicio', to: `/director/colegio/${defColegioId}` },
        { label: '🏫 Aulas', to: `/director/colegio/${defColegioId}/estructura` },
        { label: '👥 Profesores', to: `/director/colegio/${defColegioId}/reglas` },
        { label: '📡 Sensores', to: `/director/colegio/${defColegioId}/sensores` },
        { label: '📊 Consumo', to: `/director/colegio/${defColegioId}/consumo` },
      ]
    case 'admin':
      return [
        { label: '🏠 Inicio', to: '/admin' },
        { label: '🏫 Colegios', to: '/admin/colegios' },
        { label: '👥 Usuarios', to: '/admin/usuarios' },
        { label: '📊 Reportes', to: '/admin/reportes' },
        { label: '📋 Auditoría', to: '/admin/auditoria' },
        { label: '⚙️ Config', to: '/admin/config' },
      ]
    default:
      return []
  }
}
