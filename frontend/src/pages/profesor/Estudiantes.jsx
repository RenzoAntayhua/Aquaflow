import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getEstudiantesAula, eliminarEstudianteDeAula, getCodigoAula, getSolicitudesAula, aprobarSolicitud, rechazarSolicitud, getPerfilEstudiantesAula, getEventosAula } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ProfesorEstudiantes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm() || {}
  const [lista, setLista] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  const [loadingSolic, setLoadingSolic] = useState(false)
  const [perfil, setPerfil] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [notif, setNotif] = useState([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    setLoading(true)
    setLoadingSolic(true)
    getEstudiantesAula({ aulaId }).then(setLista).catch(e => setError(e.message)).finally(() => setLoading(false))
    getCodigoAula({ aulaId }).then(r => setCodigo(r.code)).catch(() => {})
    getSolicitudesAula({ aulaId }).then(setSolicitudes).catch(() => {}).finally(() => setLoadingSolic(false))
    getPerfilEstudiantesAula({ aulaId }).then(setPerfil).catch(() => {})
    setLoadingNotif(true)
    getEventosAula({ aulaId, limit: 10 }).then(setNotif).catch(() => {}).finally(() => setLoadingNotif(false))
  }, [aulaId])

  async function quitar(id) {
    const okConf = confirm ? await confirm('¿Quitar estudiante del aula?') : window.confirm('¿Quitar estudiante del aula?')
    if (!okConf) return
    setLoading(true)
    setError('')
    try {
      await eliminarEstudianteDeAula({ aulaId: Number(aulaId), estudianteId: id })
      const l = await getEstudiantesAula({ aulaId })
      setLista(l)
      const p = await getPerfilEstudiantesAula({ aulaId }); setPerfil(p)
      toast?.show('Estudiante eliminado', 'success')
    } catch (e) {
      setError(e.message)
      toast?.show(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const filtrados = useMemo(() => {
    const base = lista.map(s => {
      const agg = perfil.find(p => String(p.usuarioId) === String(s.Id || s.id))
      return { ...s, agg }
    })
    const ql = q.trim().toLowerCase()
    return ql ? base.filter(x => String(x.Nombre || x.nombre).toLowerCase().includes(ql) || String(x.Email || x.email).toLowerCase().includes(ql)) : base
  }, [lista, perfil, q])

  const total = filtrados.length
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const pageItems = filtrados.slice(start, end)

  const leaderboard = useMemo(() => {
    const arr = perfil.slice().sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
    return arr
  }, [perfil])

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
          <div className="flex items-center gap-3 mb-3">
            <input className="h-9 w-full md:w-64 rounded-md border px-3 text-sm" placeholder="Buscar por nombre o email" value={q} onChange={e => { setQ(e.target.value); setPage(1) }} />
            <select className="h-9 rounded-md border px-2 text-sm" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
          <div className="border rounded-md">
            <div className="grid grid-cols-[2fr,2fr,1fr] gap-2 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Nombre</div>
              <div>Email</div>
              <div className="text-right">Acciones</div>
            </div>
            {loading ? (
              <div className="px-3 py-2 text-sm text-slate-500">Cargando...</div>
            ) : pageItems.map((s, i) => (
              <div key={s.Id || s.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-[2fr,2fr,1fr] items-center gap-2">
                  <div className="min-w-0">{s.Nombre || s.nombre}</div>
                  <div className="min-w-0 break-all">{s.Email || s.email}</div>
                  <div className="justify-self-end">
                    <button className="text-red-700" onClick={() => quitar(s.Id || s.id)}>Quitar</button>
                  </div>
                </div>
                {s.agg && (
                  <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-slate-600">
                    <div>Monedas: <span className="font-medium">{s.agg.monedasTotal}</span></div>
                    <div>Nivel: <span className="font-medium">{s.agg.nivelActual}</span></div>
                    <div>Litros ahorrados: <span className="font-medium">{Math.round(s.agg.litrosAhorradosTotal || 0)}</span></div>
                  </div>
                )}
              </div>
            ))}
            {lista.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay estudiantes inscritos</div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 text-xs">
            <div>Total: {total}</div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 border rounded-md" disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))}>Anterior</button>
              <span>Página {page}</span>
              <button className="px-2 py-1 border rounded-md" disabled={end>=total} onClick={() => setPage(p => (end<total ? p+1 : p))}>Siguiente</button>
            </div>
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
          {loadingSolic ? (
            <div className="px-3 py-2 text-sm text-slate-500">Cargando...</div>
          ) : solicitudes.map((s, i) => (
            <div key={s.Id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
              <div className="grid grid-cols-4 items-center">
                <div>{s.Nombre || s.nombre}</div>
                <div>{s.Email || s.email}</div>
                <div>{String(s.CreadoEn || s.creadoEn).slice(0,10)}</div>
                <div className="flex gap-2">
                  <button className="text-blue-600" onClick={async () => { const okConf = confirm ? await confirm('¿Aprobar solicitud?') : window.confirm('¿Aprobar solicitud?'); if (!okConf) return; await aprobarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id }); const l = await getEstudiantesAula({ aulaId }); setLista(l); const ss = await getSolicitudesAula({ aulaId }); setSolicitudes(ss); toast?.show('Solicitud aprobada', 'success') }}>Aprobar</button>
                  <button className="text-red-700" onClick={async () => { const okConf = confirm ? await confirm('¿Rechazar solicitud?') : window.confirm('¿Rechazar solicitud?'); if (!okConf) return; await rechazarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id }); const ss = await getSolicitudesAula({ aulaId }); setSolicitudes(ss); toast?.show('Solicitud rechazada', 'success') }}>Rechazar</button>
                </div>
              </div>
            </div>
          ))}
          {solicitudes.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No hay solicitudes pendientes</div>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Clasificación del Aula</h2>
          <div className="border rounded-md">
            {leaderboard.map((p, i) => (
              <div key={p.usuarioId || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-4 items-center gap-2">
                  <div className="col-span-2">{String(perfil.find(x => x.usuarioId === p.usuarioId)?.nombre || lista.find(s => (s.Id||s.id)===p.usuarioId)?.Nombre || '')}</div>
                  <div className="text-right">{p.monedasTotal}</div>
                  <div className="text-xs text-slate-600">{p.nivelActual}</div>
                </div>
                <div className="mt-1 h-2 bg-slate-200 rounded">
                  <div className="h-2 bg-green-500 rounded" style={{ width: `${Math.min(100, p.progresoMonedas || 0)}%` }} />
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">Sin datos de clasificación</div>
            )}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Notificaciones del Aula</h2>
          <div className="border rounded-md">
            {loadingNotif ? (
              <div className="px-3 py-2 text-sm text-slate-500">Cargando...</div>
            ) : notif.map((n, i) => (
              <div key={n.Id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-4 gap-2 items-center">
                  <div className="text-xs font-medium">{String(n.tipo).replace(/_/g,' ')}</div>
                  <div className="col-span-2 truncate">{n.Payload || n.payload}</div>
                  <div className="text-right text-xs">{String(n.CreadoEn || n.creadoEn).slice(0,10)}</div>
                </div>
              </div>
            ))}
            {notif.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">Sin notificaciones</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}