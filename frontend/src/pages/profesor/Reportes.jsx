import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export default function ProfesorReportes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Reportes del Aula {aulaId}</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm">
        Visualización y descarga de reportes semanales y mensuales.
        <div className="mt-3">
          <button className="h-9 px-4 rounded-md border" onClick={() => toast?.show('Reporte generado', 'success')}>Generar reporte</button>
        </div>
      </div>
    </div>
  )
}