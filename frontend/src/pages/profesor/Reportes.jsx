import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProfesorReportes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Reportes del Aula {aulaId}</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm">
        Visualización y descarga de reportes semanales y mensuales (placeholder).
      </div>
    </div>
  )
}