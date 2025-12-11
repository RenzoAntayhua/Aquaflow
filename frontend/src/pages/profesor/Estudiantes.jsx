import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getEstudiantesAula, eliminarEstudianteDeAula, getCodigoAula, getSolicitudesAula, aprobarSolicitud, rechazarSolicitud, getPerfilEstudiantesAula } from '../../lib/api'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ProfesorEstudiantes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm() || {}
  
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [solicitudes, setSolicitudes] = useState([])
  const [perfil, setPerfil] = useState([])
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('lista')

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const [estudiantesData, codigoData, solicitudesData, perfilData] = await Promise.all([
          getEstudiantesAula({ aulaId }).catch(() => []),
          getCodigoAula({ aulaId }).catch(() => ({ code: '' })),
          getSolicitudesAula({ aulaId }).catch(() => []),
          getPerfilEstudiantesAula({ aulaId }).catch(() => [])
        ])
        
        setLista(estudiantesData)
        setCodigo(codigoData.code || '')
        setSolicitudes(solicitudesData)
        setPerfil(perfilData)
      } catch (e) {
        toast?.show(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [aulaId])

  async function quitar(id, nombre) {
    const okConf = confirm 
      ? await confirm(`¿Quitar a ${nombre} del aula?`) 
      : window.confirm(`¿Quitar a ${nombre} del aula?`)
    if (!okConf) return
    
    try {
      await eliminarEstudianteDeAula({ aulaId: Number(aulaId), estudianteId: id })
      const l = await getEstudiantesAula({ aulaId })
      setLista(l)
      const p = await getPerfilEstudiantesAula({ aulaId })
      setPerfil(p)
      toast?.show('Estudiante removido', 'success')
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  async function aprobar(s) {
    const okConf = confirm 
      ? await confirm(`¿Aprobar a ${s.Nombre || s.nombre}?`) 
      : window.confirm(`¿Aprobar a ${s.Nombre || s.nombre}?`)
    if (!okConf) return
    
    try {
      await aprobarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id })
      const [l, ss] = await Promise.all([
        getEstudiantesAula({ aulaId }),
        getSolicitudesAula({ aulaId })
      ])
      setLista(l)
      setSolicitudes(ss)
      toast?.show('Solicitud aprobada', 'success')
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  async function rechazar(s) {
    const okConf = confirm 
      ? await confirm(`¿Rechazar a ${s.Nombre || s.nombre}?`) 
      : window.confirm(`¿Rechazar a ${s.Nombre || s.nombre}?`)
    if (!okConf) return
    
    try {
      await rechazarSolicitud({ aulaId: Number(aulaId), usuarioId: s.Id || s.id })
      const ss = await getSolicitudesAula({ aulaId })
      setSolicitudes(ss)
      toast?.show('Solicitud rechazada', 'success')
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  const filtrados = useMemo(() => {
    const base = lista.map(s => {
      const agg = perfil.find(p => String(p.usuarioId) === String(s.Id || s.id))
      return { ...s, agg }
    })
    const ql = q.trim().toLowerCase()
    return ql 
      ? base.filter(x => 
          String(x.Nombre || x.nombre).toLowerCase().includes(ql) || 
          String(x.Email || x.email).toLowerCase().includes(ql)
        ) 
      : base
  }, [lista, perfil, q])

  const leaderboard = useMemo(() => {
    return [...perfil].sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
  }, [perfil])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando estudiantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-title flex items-center gap-3">
            <span className="text-3xl">👥</span>
            Gestión de Estudiantes
          </h1>
          <p className="text-muted-foreground mt-1">
            Aula {aulaId} · {lista.length} estudiantes inscritos
          </p>
        </div>
      </div>

      {/* Código de acceso */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-5 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-semibold mb-1">🔑 Código de Acceso al Aula</h3>
            <p className="text-white/80 text-sm">Comparte este código para que los estudiantes soliciten unirse</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur px-6 py-3 rounded-lg">
              <span className="text-2xl font-mono font-bold tracking-widest">{codigo || '—'}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(codigo)
                toast?.show('Código copiado', 'success')
              }}
              className="h-12 px-4 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'lista', label: 'Estudiantes', icon: '👥', count: lista.length },
          { id: 'solicitudes', label: 'Solicitudes', icon: '📥', count: solicitudes.length },
          { id: 'ranking', label: 'Ranking', icon: '🏆', count: null }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-title'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                tab === t.id ? 'bg-primary/10' : 'bg-soft-divider'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista de estudiantes */}
      {tab === 'lista' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <input
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input text-sm"
                placeholder="Buscar por nombre o email..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            </div>
          </div>
          
          <div className="divide-y">
            {filtrados.length > 0 ? (
              filtrados.map((s, i) => (
                <div key={s.Id || s.id || i} className="p-4 hover:bg-soft-divider/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                      i < 3 && leaderboard[i]?.usuarioId === (s.Id || s.id)
                        ? 'bg-gold text-amber-900'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {(s.Nombre || s.nombre || 'E').charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-title">{s.Nombre || s.nombre}</div>
                      <div className="text-sm text-muted-foreground truncate">{s.Email || s.email}</div>
                    </div>

                    {s.agg && (
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-primary">{s.agg.monedasTotal || 0}</div>
                          <div className="text-xs text-muted-foreground">Monedas</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-eco">{Math.round(s.agg.litrosAhorradosTotal || 0)}L</div>
                          <div className="text-xs text-muted-foreground">Ahorrados</div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-soft-divider text-xs">
                          {s.agg.nivelActual || 'Explorador'}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => quitar(s.Id || s.id, s.Nombre || s.nombre)}
                      className="h-9 px-3 rounded-lg text-coral border border-coral/30 hover:bg-coral/10 text-sm transition-colors"
                    >
                      Remover
                    </button>
                  </div>

                  {s.agg && (
                    <div className="mt-3 md:hidden grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-soft-divider rounded-lg p-2 text-center">
                        <div className="font-bold">{s.agg.monedasTotal || 0}</div>
                        <div className="text-muted-foreground">Monedas</div>
                      </div>
                      <div className="bg-soft-divider rounded-lg p-2 text-center">
                        <div className="font-bold">{Math.round(s.agg.litrosAhorradosTotal || 0)}L</div>
                        <div className="text-muted-foreground">Ahorrados</div>
                      </div>
                      <div className="bg-soft-divider rounded-lg p-2 text-center">
                        <div className="font-bold">{s.agg.nivelActual || 'Explorador'}</div>
                        <div className="text-muted-foreground">Nivel</div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">👥</div>
                <h3 className="font-semibold text-title mb-2">
                  {q ? 'Sin resultados' : 'Sin estudiantes'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {q 
                    ? 'No se encontraron estudiantes con ese criterio' 
                    : 'Comparte el código del aula para que se unan'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Solicitudes pendientes */}
      {tab === 'solicitudes' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-amber-50">
            <p className="text-sm text-amber-800">
              📋 Los estudiantes envían solicitudes usando el código del aula. Aprueba o rechaza cada una.
            </p>
          </div>
          
          <div className="divide-y">
            {solicitudes.length > 0 ? (
              solicitudes.map((s, i) => (
                <div key={s.Id || i} className="p-4 flex items-center gap-4 hover:bg-soft-divider/50">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                    📥
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-title">{s.Nombre || s.nombre}</div>
                    <div className="text-sm text-muted-foreground">{s.Email || s.email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Solicitado: {new Date(s.CreadoEn || s.creadoEn).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => aprobar(s)}
                      className="h-10 px-4 rounded-lg bg-eco text-white hover:bg-green-600 text-sm font-medium transition-colors"
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => rechazar(s)}
                      className="h-10 px-4 rounded-lg border border-coral text-coral hover:bg-coral/10 text-sm font-medium transition-colors"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="font-semibold text-title mb-2">Sin solicitudes pendientes</h3>
                <p className="text-muted-foreground text-sm">
                  Las nuevas solicitudes aparecerán aquí
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranking */}
      {tab === 'ranking' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gold/10">
            <p className="text-sm text-amber-800">
              🏆 Clasificación de estudiantes por monedas acumuladas
            </p>
          </div>
          
          <div className="divide-y">
            {leaderboard.length > 0 ? (
              leaderboard.map((p, i) => {
                const estudiante = lista.find(s => (s.Id || s.id) === p.usuarioId)
                const nombre = p.nombre || estudiante?.Nombre || estudiante?.nombre || 'Estudiante'
                
                return (
                  <div key={p.usuarioId || i} className="p-4 flex items-center gap-4 hover:bg-soft-divider/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      i === 0 ? 'bg-gold text-amber-900' :
                      i === 1 ? 'bg-gray-200 text-gray-700' :
                      i === 2 ? 'bg-amber-600/20 text-amber-700' :
                      'bg-soft-divider text-muted-foreground'
                    }`}>
                      {i + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-title">{nombre}</div>
                      <div className="text-xs text-muted-foreground">{p.nivelActual || 'Explorador'}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="h-2 bg-soft-divider rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, p.progresoMonedas || 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right min-w-[60px]">
                        <div className="font-bold text-primary">{p.monedasTotal || 0}</div>
                        <div className="text-xs text-muted-foreground">monedas</div>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">🏅</div>
                <h3 className="font-semibold text-title mb-2">Sin datos de ranking</h3>
                <p className="text-muted-foreground text-sm">
                  El ranking se actualiza cuando los estudiantes completan actividades
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
