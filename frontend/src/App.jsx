import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import EstudianteDashboard from './pages/EstudianteDashboard'
import EstudianteRetos from './pages/estudiante/Retos'
import EstudianteJuegos from './pages/estudiante/Juegos'
import EstudianteProgreso from './pages/estudiante/Progreso'
import EstudianteInsignias from './pages/estudiante/Insignias'
import EstudianteRanking from './pages/estudiante/Ranking'
import EstudianteTrivias from './pages/estudiante/Trivias'
import EstudianteUnirme from './pages/estudiante/Unirme'
import EstudianteInicio from './pages/estudiante/Inicio'
import EstudiantePerfil from './pages/estudiante/Perfil'
import EstudianteRecibos from './pages/estudiante/Recibos'
import ProfesorAula from './pages/ProfesorAula'
import ProfesorRetos from './pages/profesor/Retos'
import ProfesorInsignias from './pages/profesor/Insignias'
import ProfesorReportes from './pages/profesor/Reportes'
import ProfesorEstudiantes from './pages/profesor/Estudiantes'
import DirectorColegio from './pages/DirectorColegio'
import DirectorEstructura from './pages/director/Estructura'
import DirectorReglas from './pages/director/Reglas'
import DirectorSensores from './pages/director/Sensores'
import RequireRole from './components/RequireRole'
import AdminLayout from './pages/admin/AdminLayout'
import Home from './pages/admin/Home'
import Colegios from './pages/admin/Colegios'
import Usuarios from './pages/admin/Usuarios'
import Reportes from './pages/admin/Reportes'
import Config from './pages/admin/Config'
import Login from './pages/Login'
import Register from './pages/Register'
import PasswordChange from './pages/PasswordChange'
import RoleNavbar from './components/RoleNavbar'

export default function App() {
  const { user, setToken, setUser } = useAuth()
  const logged = !!user
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')
  const isRolePage =
    location.pathname.startsWith('/estudiante') ||
    location.pathname.startsWith('/profesor') ||
    location.pathname.startsWith('/director')

  const isFullWidthPage = ['/', '/login', '/registro', '/password-change'].includes(location.pathname)

  const showGenericHeader = !isFullWidthPage && !isAdmin && !isRolePage

  const containerClass = isAdmin
    ? 'w-full min-h-screen'
    : isRolePage
      ? ''
      : isFullWidthPage
        ? 'w-full'
        : 'max-w-6xl mx-auto p-4'

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {isRolePage && <RoleNavbar />}
      {showGenericHeader && (
        <header className="bg-blue-600 text-white">
          <div className="max-w-6xl mx-auto px-4 py-3 flex gap-4">
            <span className="font-semibold">AquaFlow</span>
            <nav className="flex gap-3 text-sm">
              {logged && (
                <>
                  <NavLink to="/estudiante" className={({ isActive }) => isActive ? 'underline' : ''}>Estudiante</NavLink>
                  <NavLink to={`/profesor/aula/${user?.aulaId || 1}`} className={({ isActive }) => isActive ? 'underline' : ''}>Profesor</NavLink>
                  <NavLink to={`/director/colegio/${user?.colegioId || 1}/estructura`} className={({ isActive }) => isActive ? 'underline' : ''}>Director</NavLink>
                  <NavLink to="/admin" className={({ isActive }) => isActive ? 'underline' : ''}>Admin</NavLink>
                </>
              )}
              <span className="ml-auto" />
              {logged ? (
                <div className="relative">
                  <button
                    type="button"
                    className="bg-blue-700 px-3 py-1 rounded"
                    onClick={() => setMenuOpen(o => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    👤 {user?.Nombre || user?.nombre || 'Usuario'}
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white text-slate-800 border rounded shadow text-sm">
                      <button className="w-full text-left px-3 py-2 hover:bg-slate-100" onClick={() => { setMenuOpen(false); navigate('/password-change') }}>
                        Cambiar contraseña
                      </button>
                      <div className="border-t" />
                      <button className="w-full text-left px-3 py-2 text-red-700 hover:bg-red-100" onClick={() => { setMenuOpen(false); setToken(null); setUser(null); navigate('/login') }}>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <NavLink to="/login" className={({ isActive }) => isActive ? 'underline' : ''}>Login</NavLink>
                  <NavLink to="/registro" className={({ isActive }) => isActive ? 'underline' : ''}>Registro</NavLink>
                </>
              )}
            </nav>
          </div>
        </header>
      )}
      <main className={containerClass}>
        <div className={isRolePage ? 'max-w-6xl mx-auto p-6' : ''}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/estudiante" element={<RequireRole role="estudiante"><EstudianteInicio /></RequireRole>} />
            <Route path="/estudiante/inicio" element={<RequireRole role="estudiante"><EstudianteInicio /></RequireRole>} />
            <Route path="/estudiante/juegos" element={<RequireRole role="estudiante"><EstudianteJuegos /></RequireRole>} />
            <Route path="/estudiante/perfil" element={<RequireRole role="estudiante"><EstudiantePerfil /></RequireRole>} />
            <Route path="/estudiante/ranking" element={<RequireRole role="estudiante"><EstudianteRanking /></RequireRole>} />
            <Route path="/estudiante/recibos" element={<RequireRole role="estudiante"><EstudianteRecibos /></RequireRole>} />
            <Route path="/profesor/aula/:aulaId" element={<RequireRole role="profesor"><ProfesorAula /></RequireRole>} />
            <Route path="/profesor/aula/:aulaId/estudiantes" element={<RequireRole role="profesor"><ProfesorEstudiantes /></RequireRole>} />
            <Route path="/profesor/aula/:aulaId/retos" element={<RequireRole role="profesor"><ProfesorRetos /></RequireRole>} />
            <Route path="/profesor/aula/:aulaId/insignias" element={<RequireRole role="profesor"><ProfesorInsignias /></RequireRole>} />
            <Route path="/profesor/aula/:aulaId/reportes" element={<RequireRole role="profesor"><ProfesorReportes /></RequireRole>} />
            <Route path="/director/colegio/:colegioId" element={<RequireRole role="director"><DirectorEstructura /></RequireRole>} />
            <Route path="/director/colegio/:colegioId/estructura" element={<RequireRole role="director"><DirectorEstructura /></RequireRole>} />
            <Route path="/director/colegio/:colegioId/reglas" element={<RequireRole role="director"><DirectorReglas /></RequireRole>} />
            <Route path="/director/colegio/:colegioId/sensores" element={<RequireRole role="director"><DirectorSensores /></RequireRole>} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Home />} />
              <Route path="colegios" element={<Colegios />} />
              { /* El administrador no crea aulas */ }
              <Route path="usuarios" element={<Usuarios />} />
              <Route path="reportes" element={<Reportes />} />
              <Route path="config" element={<Config />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/password-change" element={<PasswordChange />} />
            <Route path="/registro" element={<Register />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}