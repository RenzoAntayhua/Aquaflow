import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function EstudianteRecibos() {
  const { user } = useAuth()
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Recibos</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm w-full max-w-xl mx-auto">
        Próximamente
      </div>
    </div>
  )
}