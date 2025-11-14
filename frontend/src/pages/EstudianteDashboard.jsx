import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import KPI from '../components/KPI'
import { getConsumoAgregado } from '../lib/api'

export default function EstudianteDashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const tab = params.get('tab') || 'retos'

  useEffect(() => {
    getConsumoAgregado({ aulaId: 1, periodo: 'semana' })
      .then(setData)
      .catch(setError)
  }, [])

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Panel del Estudiante (Aula)</h1>
      {error && <div className="text-red-600">{String(error)}</div>}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI title="Litros (semana)" value={Math.round(data.totalLitros)} />
          <KPI title="Línea base" value={data.lineaBase} />
          <KPI title="Reducción" value={`${data.reduccionPct}%`} />
        </div>
      )}
      {!data && !error && (
        <div className="text-slate-500">Cargando datos...</div>
      )}
      {tab === 'retos' && (
        <div className="rounded-md bg-white p-4 shadow">
          <div className="text-sm text-slate-600">Retos activos (placeholder)</div>
          <ul className="list-disc ml-6 text-sm">
            <li>Reto: Ahorro de agua en lavamanos</li>
            <li>Reto: Tiempo de ducha eficiente</li>
          </ul>
        </div>
      )}
      {tab === 'progreso' && (
        <div className="rounded-md bg-white p-4 shadow">
          <div className="text-sm text-slate-600">Tu progreso (placeholder)</div>
          <p className="text-sm">Subiste 3 niveles esta semana. ¡Sigue así!</p>
        </div>
      )}
      {tab === 'insignias' && (
        <div className="rounded-md bg-white p-4 shadow">
          <div className="text-sm text-slate-600">Insignias del Aula (placeholder)</div>
          <ul className="list-disc ml-6 text-sm">
            <li>Semana Verde</li>
            <li>Aula Eficiente</li>
          </ul>
        </div>
      )}
      {tab === 'ranking' && (
        <div className="rounded-md bg-white p-4 shadow">
          <div className="text-sm text-slate-600">Ranking (placeholder)</div>
          <p className="text-sm">Tu aula está en el puesto #4 de la ciudad.</p>
        </div>
      )}
      {tab === 'trivias' && (
        <div className="rounded-md bg-white p-4 shadow">
          <div className="text-sm text-slate-600">Trivias (placeholder)</div>
          <p className="text-sm">Participa en la trivia del agua del mes.</p>
        </div>
      )}
    </div>
  )
}