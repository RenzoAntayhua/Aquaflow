import { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { getPlantillasRetos, crearRetoAula, getRetosAula, actualizarEstadoReto, listarPreguntas } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function ProfesorRetos() {
  const { aulaId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm() || {}

  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [creando, setCreando] = useState(false)
  
  // Modal de creación
  const [showModal, setShowModal] = useState(false)
  const [pSel, setPSel] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [param, setParam] = useState({})

  // Estado de preguntas por reto
  const [preguntasCount, setPreguntasCount] = useState({})

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const [pl, rt] = await Promise.all([
          getPlantillasRetos(),
          getRetosAula({ aulaId })
        ])
        setPlantillas(pl)
        setRetos(rt)

        // Cargar conteo de preguntas para cada reto
        const counts = {}
        for (const r of rt) {
          const p = pl.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
          if (p) {
            const codigo = p.Codigo || p.codigo || ''
            if (codigo.includes('trivia') || codigo.includes('verdadero_falso')) {
              const tipo = codigo.includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
              try {
                const preguntas = await listarPreguntas({ tipo, categoria: codigo })
                counts[r.Id || r.id] = Array.isArray(preguntas) ? preguntas.length : 0
              } catch {
                counts[r.Id || r.id] = 0
              }
            }
          }
        }
        setPreguntasCount(counts)
      } catch (e) {
        toast?.show(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [aulaId])

  function getPlantillaInfo(r) {
    const p = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
    return {
      nombre: p?.Nombre || p?.nombre || `Plantilla #${r.PlantillaId || r.plantillaId}`,
      codigo: p?.Codigo || p?.codigo || '',
      descripcion: p?.Descripcion || p?.descripcion || ''
    }
  }

  function getEstado(r) {
    const e = r.Estado ?? r.estado
    if (e === 0) return { label: 'Activo', color: 'bg-eco/20 text-green-700', icon: '🟢' }
    if (e === 1) return { label: 'Pausado', color: 'bg-amber-100 text-amber-700', icon: '🟡' }
    if (e === 2) return { label: 'Completado', color: 'bg-blue-100 text-blue-700', icon: '🔵' }
    return { label: 'Fallido', color: 'bg-red-100 text-red-700', icon: '🔴' }
  }

  function esTrivia(r) {
    const info = getPlantillaInfo(r)
    return info.codigo.includes('trivia') || info.codigo.includes('verdadero_falso')
  }

  function getPreguntasRequeridas(r) {
    try {
      const params = JSON.parse(r.Parametros || r.parametros || '{}')
      return Number(params.question_count || params.cantidad || 5)
    } catch {
      return 5
    }
  }

  async function crearNuevoReto() {
    if (!pSel || !inicio || !fin) {
      toast?.show('Completa todos los campos', 'error')
      return
    }

    setCreando(true)
    try {
      const result = await crearRetoAula({ 
        aulaId, 
        plantillaId: Number(pSel), 
        fechaInicio: inicio, 
        fechaFin: fin,
        parametros: param
      })
      
      const nuevoRetoId = result?.Id || result?.id
      const lista = await getRetosAula({ aulaId })
      setRetos(lista)
      
      setShowModal(false)
      setPSel('')
      setInicio('')
      setFin('')
      setParam({})
      
      toast?.show('Reto creado correctamente', 'success')

      // Redirigir a la página de preguntas si es trivia
      const p = plantillas.find(x => String(x.Id || x.id) === String(pSel))
      const codigo = p?.Codigo || p?.codigo || ''
      if (codigo.includes('trivia') || codigo.includes('verdadero_falso')) {
        navigate(`/profesor/aula/${aulaId}/retos/${nuevoRetoId}/preguntas`)
      }
    } catch (e) {
      toast?.show(e.message, 'error')
    } finally {
      setCreando(false)
    }
  }

  async function cambiarEstado(r, nuevoEstado) {
    const accion = nuevoEstado === 'activo' ? 'activar' : nuevoEstado === 'pausado' ? 'pausar' : 'completar'
    const ok = confirm 
      ? await confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este reto?`)
      : window.confirm(`¿${accion.charAt(0).toUpperCase() + accion.slice(1)} este reto?`)
    
    if (!ok) return

    try {
      await actualizarEstadoReto({ retoId: r.Id || r.id, estado: nuevoEstado })
      const lista = await getRetosAula({ aulaId })
      setRetos(lista)
      toast?.show(`Reto ${nuevoEstado}`, 'success')
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  // Separar retos activos y otros
  const retosActivos = retos.filter(r => (r.Estado ?? r.estado) === 0)
  const retosOtros = retos.filter(r => (r.Estado ?? r.estado) !== 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando retos...</p>
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
            <span className="text-3xl">🎯</span>
            Gestión de Retos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crea y administra los retos del aula {aulaId}
          </p>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-light text-white h-11 px-6 rounded-lg font-medium transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <span className="text-lg">➕</span>
          Nuevo Reto
        </button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-3xl font-bold text-primary">{retos.length}</div>
          <div className="text-sm text-muted-foreground">Total de retos</div>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-3xl font-bold text-eco">{retosActivos.length}</div>
          <div className="text-sm text-muted-foreground">Retos activos</div>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{retos.filter(r => (r.Estado ?? r.estado) === 2).length}</div>
          <div className="text-sm text-muted-foreground">Completados</div>
        </div>
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <div className="text-3xl font-bold text-amber-600">{retos.filter(r => (r.Estado ?? r.estado) === 1).length}</div>
          <div className="text-sm text-muted-foreground">Pausados</div>
        </div>
      </div>

      {/* Retos activos */}
      {retosActivos.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-title mb-4 flex items-center gap-2">
            <span>🟢</span> Retos Activos
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retosActivos.map(r => {
              const info = getPlantillaInfo(r)
              const estado = getEstado(r)
              const esT = esTrivia(r)
              const requeridas = getPreguntasRequeridas(r)
              const actual = preguntasCount[r.Id || r.id] || 0
              
              return (
                <div key={r.Id || r.id} className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gradient-to-r from-eco/20 to-green-50 p-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-title">{info.nombre}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{info.descripcion}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${estado.color}`}>
                        {estado.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Período</span>
                      <span className="font-medium">
                        {String(r.FechaInicio || r.fechaInicio).slice(5, 10)} → {String(r.FechaFin || r.fechaFin).slice(5, 10)}
                      </span>
                    </div>
                    
                    {esT && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Preguntas</span>
                          <span className={`font-medium ${actual >= requeridas ? 'text-eco' : 'text-amber-600'}`}>
                            {actual}/{requeridas}
                          </span>
                        </div>
                        <div className="h-2 bg-soft-divider rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${actual >= requeridas ? 'bg-eco' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, (actual / requeridas) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {esT && (
                        <button
                          onClick={() => navigate(`/profesor/aula/${aulaId}/retos/${r.Id || r.id}/preguntas`)}
                          className="flex-1 h-9 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                        >
                          ✏️ Preguntas
                        </button>
                      )}
                      <button
                        onClick={() => cambiarEstado(r, 'pausado')}
                        className="h-9 px-3 rounded-lg border text-amber-600 border-amber-200 text-sm hover:bg-amber-50 transition-colors"
                      >
                        ⏸️
                      </button>
                      <button
                        onClick={() => cambiarEstado(r, 'completado')}
                        className="h-9 px-3 rounded-lg border text-blue-600 border-blue-200 text-sm hover:bg-blue-50 transition-colors"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Otros retos */}
      {retosOtros.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-title mb-4 flex items-center gap-2">
            <span>📋</span> Historial de Retos
          </h2>
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-soft-divider">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Reto</th>
                  <th className="px-4 py-3 font-medium">Período</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {retosOtros.map(r => {
                  const info = getPlantillaInfo(r)
                  const estado = getEstado(r)
                  const esT = esTrivia(r)
                  
                  return (
                    <tr key={r.Id || r.id} className="hover:bg-soft-divider/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-title text-sm">{info.nombre}</div>
                        <div className="text-xs text-muted-foreground">{info.codigo}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {String(r.FechaInicio || r.fechaInicio).slice(0, 10)} — {String(r.FechaFin || r.fechaFin).slice(0, 10)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${estado.color}`}>
                          {estado.icon} {estado.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(r.Estado ?? r.estado) === 1 && (
                            <button
                              onClick={() => cambiarEstado(r, 'activo')}
                              className="text-xs text-eco hover:underline"
                            >
                              Reactivar
                            </button>
                          )}
                          {esT && (
                            <button
                              onClick={() => navigate(`/profesor/aula/${aulaId}/retos/${r.Id || r.id}/preguntas`)}
                              className="text-xs text-primary hover:underline"
                            >
                              Ver preguntas
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estado vacío */}
      {retos.length === 0 && (
        <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold text-title mb-2">¡Crea tu primer reto!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Los retos motivan a tus estudiantes a aprender sobre el cuidado del agua mientras ganan puntos y medallas.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-light text-white h-11 px-6 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <span>➕</span>
            Crear Reto
          </button>
        </div>
      )}

      {/* Modal de creación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-primary to-primary-light p-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                Nuevo Reto
              </h2>
              <p className="text-white/80 text-sm mt-1">Selecciona una plantilla y configura las fechas</p>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Selector de plantilla */}
              <div>
                <label className="block text-sm font-medium text-title mb-2">
                  Tipo de reto
                </label>
                <div className="grid gap-2">
                  {plantillas.filter(p => p.Activa !== false && p.activa !== false).map(p => {
                    const codigo = p.Codigo || p.codigo || ''
                    const isSelected = String(pSel) === String(p.Id || p.id)
                    let icon = '🎯'
                    if (codigo.includes('trivia')) icon = '❓'
                    if (codigo.includes('verdadero_falso')) icon = '✅'
                    if (codigo.includes('memoria')) icon = '🧠'
                    
                    return (
                      <button
                        key={p.Id || p.id}
                        type="button"
                        onClick={() => {
                          setPSel(String(p.Id || p.id))
                          try {
                            setParam(JSON.parse(p.ParametrosDefault || p.parametrosDefault || '{}'))
                          } catch {
                            setParam({})
                          }
                        }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          isSelected 
                            ? 'border-primary bg-primary/5' 
                            : 'border-input hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div>
                            <div className="font-medium text-title">{p.Nombre || p.nombre}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {p.Descripcion || p.descripcion || codigo}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="ml-auto w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                              ✓
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Parámetros configurables */}
              {pSel && Object.keys(param).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-title mb-2">
                    Configuración
                  </label>
                  <div className="grid gap-3">
                    {Object.entries(param).map(([k, v]) => {
                      const p = plantillas.find(x => String(x.Id || x.id) === String(pSel))
                      let rango = {}
                      try { rango = JSON.parse(p?.ParametrosRango || p?.parametrosRango || '{}') } catch {}
                      const label = {
                        question_count: 'Cantidad de preguntas',
                        time_per_question: 'Segundos por pregunta',
                        reduccion_porcentual: 'Meta de reducción (%)'
                      }[k] || k.replace(/_/g, ' ')
                      
                      return (
                        <div key={k} className="flex items-center gap-3">
                          <label className="text-sm text-muted-foreground flex-1">{label}</label>
                          <input
                            type="number"
                            className="w-24 h-10 rounded-lg border border-input px-3 text-center"
                            value={v}
                            min={rango[k]?.min ?? 1}
                            max={rango[k]?.max ?? 100}
                            onChange={e => setParam({ ...param, [k]: Number(e.target.value) })}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-title mb-2">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    className="w-full h-11 rounded-lg border border-input px-3"
                    value={inicio}
                    onChange={e => setInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-title mb-2">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    className="w-full h-11 rounded-lg border border-input px-3"
                    value={fin}
                    onChange={e => setFin(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => {
                  setShowModal(false)
                  setPSel('')
                  setInicio('')
                  setFin('')
                  setParam({})
                }}
                className="flex-1 h-11 rounded-lg border text-muted-foreground font-medium hover:bg-soft-divider transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={crearNuevoReto}
                disabled={creando || !pSel || !inicio || !fin}
                className="flex-1 h-11 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando...
                  </>
                ) : (
                  'Crear y Configurar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
