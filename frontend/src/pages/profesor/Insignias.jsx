import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function ProfesorInsignias() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Validar Insignias (Aula {aulaId})</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm">
        Revisa solicitudes de insignias y confirma evidencia.
        <div className="mt-3">
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground" onClick={() => toast?.show('Acción de validación realizada', 'success')}>Validar ejemplo</button>
        </div>
      </div>
    </div>
  )
}