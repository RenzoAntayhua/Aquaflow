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
          <span className="font-semibold text-slate-800 text-sm">Aquaflow</span>
        </div>
        <nav className="flex-1 flex items-center justify-center gap-6 text-xs text-slate-700">
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
            <div className="absolute right-0 mt-2 w-44 bg-white text-slate-800 border rounded shadow text-sm">
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
    </header>
  )
}

function buildItemsForRole(rol, { aulaId, colegioId, user }) {
  const defAulaId = user?.aulaId || aulaId || 1
  const defColegioId = user?.colegioId || colegioId || 1
  switch (rol) {
    case 'estudiante':
      return [
        { label: 'Inicio', to: '/estudiante/inicio' },
        { label: 'Juegos', to: '/estudiante/juegos' },
        { label: 'Perfil', to: '/estudiante/perfil' },
        { label: 'Ranking', to: '/estudiante/ranking' },
        { label: 'Recibos', to: '/estudiante/recibos' },
      ]
    case 'profesor':
      return [
        { label: `Aula${defAulaId ? ` ${defAulaId}` : ''}`, to: `/profesor/aula/${defAulaId}` },
        { label: 'Estudiantes', to: `/profesor/aula/${defAulaId}/estudiantes` },
        { label: 'Retos (plantillas)', to: `/profesor/aula/${defAulaId}/retos` },
        { label: 'Validar insignias', to: `/profesor/aula/${defAulaId}/insignias` },
        { label: 'Reportes', to: `/profesor/aula/${defAulaId}/reportes` },
      ]
    case 'director':
      return [
        { label: 'Aulas', to: `/director/colegio/${defColegioId}/estructura` },
        { label: 'Profesores', to: `/director/colegio/${defColegioId}/reglas` },
        { label: 'Espacios', to: `/director/colegio/${defColegioId}/sensores` },
      ]
    case 'admin':
      return [
        { label: 'Inicio', to: '/admin' },
        { label: 'Colegios + Directores', to: '/admin/colegios' },
        { label: 'Plantillas globales', to: '/admin/plantillas' },
        { label: 'Sensores y espacios', to: '/admin/sensores' },
        { label: 'Catálogo y políticas', to: '/admin/catalogo' },
      ]
    default:
      return []
  }
}