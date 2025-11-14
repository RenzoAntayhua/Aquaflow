import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequireRole({ role, children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }

  const rawRol = user?.rol
  const rol = typeof rawRol === 'string'
    ? rawRol.toLowerCase()
    : ['estudiante','profesor','director','admin'][Number(rawRol)] || String(rawRol).toLowerCase()

  if (rol !== role) {
    const aulaId = user?.aulaId || 1
    const colegioId = user?.colegioId || 1
    const landing = rol === 'estudiante'
      ? '/estudiante/retos'
      : rol === 'profesor'
        ? `/profesor/aula/${aulaId}`
        : rol === 'director'
          ? `/director/colegio/${colegioId}/estructura`
          : '/admin'
    return <Navigate to={landing} replace />
  }

  return children
}