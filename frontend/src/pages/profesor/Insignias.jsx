import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProfesorInsignias() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Validar Insignias (Aula {aulaId})</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm">
        Revisa solicitudes de insignias y confirma evidencia (placeholder).
      </div>
    </div>
  )
}