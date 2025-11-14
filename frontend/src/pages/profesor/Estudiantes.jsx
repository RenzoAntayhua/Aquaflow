import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getEstudiantesAula, eliminarEstudianteDeAula, getCodigoAula, getSolicitudesAula, aprobarSolicitud, rechazarSolicitud } from '../../lib/api'

export default function ProfesorEstudiantes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const [lista, setLista] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    getEstudiantesAula({ aulaId }).then(setLista).catch(e => setError(e.message))
    getCodigoAula({ aulaId }).then(r => setCodigo(r.code)).catch(() => {})
    getSolicitudesAula({ aulaId }).then(setSolicitudes).catch(() => {})
  }, [aulaId])

  async function quitar(id) {
    setLoading(true)
    setError('')
    try {
      await eliminarEstudianteDeAula({ aulaId: Number(aulaId), estudianteId: id })
      const l = await getEstudiantesAula({ aulaId })
      setLista(l)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Estudiantes del Aula {aulaId}</h1>
      <div className="rounded-xl border p-4 bg-blue-50 text-sm">
        Comparte este código para que los estudiantes soliciten unirse: <span className="font-semibold">{codigo || '—'}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow text-sm">
          <h2 className="text-lg font-semibold mb-3">Inscripción por solicitud</h2>
          <p className="text-slate-600">Los estudiantes usan el código del aula para enviar su solicitud. Tú solo apruebas o rechazas desde la sección de solicitudes.</p>
          {error && <div className="text-red-700 mt-3">{error}</div>}
        </div>
        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Listado de Estudiantes</h2>
          <div className="border rounded-md">
            <div className="grid grid-cols-3 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Nombre</div>
              <div>Email</div>
              <div>Acciones</div>
            </div>
            {lista.map((s, i) => (
              <div key={s.Id || s.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-3 items-center">
                  <div>{s.Nombre || s.nombre}</div>
                  <div>{s.Email || s.email}</div>
                  <div>
                    <button className="text-red-700" onClick={() => quitar(s.Id || s.id)}>Quitar</button>
                  </div>
                </div>
              </div>
            ))}
            {lista.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay estudiantes inscritos</div>
            )}
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl border p-6 shadow">
        <h2 className="text-lg font-semibold mb-3">Solicitudes pendientes</h2>
        <div className="border rounded-md">
          <div className="grid grid-cols-4 text-xs font-medium text-slate-500 px-3 py-2 border-b">
            <div>Nombre</div>
            <div>Email</div>
            <div>Fecha</div>
            <div>Acciones</div>
          </div>
          {solicitudes.map((s, i) => (
            <div key={s.Id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
              <div className="grid grid-cols-4 items-center">
                <div>{s.Nombre || s.nombre}</div>
                <div>{s.Email || s.email}</div>
                <div>{String(s.CreadoEn || s.creadoEn).slice(0,10)}</div>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={async () => { await aprobarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id }); const l = await getEstudiantesAula({ aulaId }); setLista(l); const ss = await getSolicitudesAula({ aulaId }); setSolicitudes(ss) }}>Aprobar</button>
                  <button className="text-red-700" onClick={async () => { await rechazarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id }); const ss = await getSolicitudesAula({ aulaId }); setSolicitudes(ss) }}>Rechazar</button>
                </div>
              </div>
            </div>
          ))}
          {solicitudes.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No hay solicitudes pendientes</div>
          )}
        </div>
      </div>
    </div>
  )
}