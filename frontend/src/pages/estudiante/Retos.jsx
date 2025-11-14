import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getRetosAula } from '../../lib/api'

export default function EstudianteRetos() {
  const { user } = useAuth()
  const [retos, setRetos] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    const aulaId = user?.aulaId || 1
    getRetosAula({ aulaId }).then(setRetos).catch(e => setError(e.message))
  }, [user])
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Retos</h1>
      <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl mx-auto">
        {error && <div className="text-red-700 text-sm">{error}</div>}
        <div className="border rounded-md">
          <div className="grid grid-cols-4 text-xs font-medium text-slate-500 px-3 py-2 border-b">
            <div>Plantilla</div>
            <div>Inicio</div>
            <div>Fin</div>
            <div>Estado</div>
          </div>
          {retos.map((r, i) => (
            <div key={r.Id || r.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
              <div className="grid grid-cols-4 items-center">
                <div>{r.PlantillaId || r.plantillaId}</div>
                <div>{String(r.FechaInicio || r.fechaInicio).slice(0,10)}</div>
                <div>{String(r.FechaFin || r.fechaFin).slice(0,10)}</div>
                <div>{(r.Estado === 0 || r.estado === 0) ? 'Activo' : (r.Estado === 1 || r.estado === 1) ? 'Pausado' : (r.Estado === 2 || r.estado === 2) ? 'Completado' : 'Fallido'}</div>
              </div>
            </div>
          ))}
          {retos.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No hay retos disponibles</div>
          )}
        </div>
      </div>
    </div>
  )
}