import KPI from '../components/KPI'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import { getAulas, getProfesores, getEspacios } from '../lib/api'

export default function DirectorColegio() {
  const { user } = useAuth()
  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const tab = params.get('tab') || 'estructura'
  const [countAulas, setCountAulas] = useState(0)
  const [countProfesores, setCountProfesores] = useState(0)
  const [countEspacios, setCountEspacios] = useState(0)

  useEffect(() => {
    const colegioId = user?.colegioId || user?.ColegioId || null
    if (!colegioId) return
    getAulas({ colegioId }).then(list => setCountAulas(list.length)).catch(() => {})
    getProfesores({ colegioId }).then(list => setCountProfesores(list.length)).catch(() => {})
    getEspacios({ colegioId }).then(list => setCountEspacios(list.length)).catch(() => {})
  }, [user])
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Panel del Director</h1>
      {tab === 'estructura' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI title="Aulas" value={countAulas} />
          <KPI title="Profesores" value={countProfesores} />
          <KPI title="Espacios" value={countEspacios} />
        </div>
      )}
      {tab === 'reglas' && (
        <div className="rounded-md bg-white p-4 shadow text-sm text-slate-600">
          Reglas escolares de gamificación (placeholder)
        </div>
      )}
      {tab === 'sensores' && (
        <div className="rounded-md bg-white p-4 shadow text-sm text-slate-600">
          Vinculación de sensores a espacios (placeholder)
        </div>
      )}
    </div>
  )
}