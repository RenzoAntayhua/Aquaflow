import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMisRetos, listarPreguntas, registrarResultadoJuego, agregarPuntosUsuario, verificarRetoJugado } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

export default function EstudianteJuegos() {
  const { user } = useAuth()
  const toast = useToast()
  
  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [categoriaSel, setCategoriaSel] = useState(null)
  const [retoActual, setRetoActual] = useState(null)
  const [jugando, setJugando] = useState(false)
  const [preguntas, setPreguntas] = useState([])
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [resumen, setResumen] = useState(null)
  const [puntos, setPuntos] = useState(0)
  const [aciertos, setAciertos] = useState(0)
  const [jugadoMap, setJugadoMap] = useState({})
  const [tiempoRestante, setTiempoRestante] = useState(null)

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const data = await getMisRetos()
        setPlantillas(data.plantillas || [])
        setRetos(data.retos || [])
        
        // Verificar cuáles ya jugó
        const usuarioId = user?.Id || user?.id || 0
        if (usuarioId && data.retos?.length > 0) {
          const checks = await Promise.all(
            data.retos.map(r => 
              verificarRetoJugado({ usuarioId, retoId: r.Id || r.id }).catch(() => ({ jugado: false }))
            )
          )
          const map = {}
          data.retos.forEach((r, i) => {
            map[r.Id || r.id] = checks[i]?.jugado || false
          })
          setJugadoMap(map)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Agrupar retos por categoría/plantilla
  const categorias = useMemo(() => {
    const map = new Map()
    
    for (const p of plantillas) {
      const codigo = p.Codigo || p.codigo || 'general'
      const nombre = p.Nombre || p.nombre || codigo
      
      // Contar retos activos de esta plantilla
      const retosDeCategoria = retos.filter(r => {
        const plantillaId = r.PlantillaId || r.plantillaId
        return plantillaId === (p.Id || p.id)
      })
      
      if (!map.has(codigo)) {
        map.set(codigo, {
          codigo,
          nombre,
          descripcion: p.Descripcion || p.descripcion || '',
          plantillaId: p.Id || p.id,
          retosActivos: retosDeCategoria.length,
          retos: retosDeCategoria
        })
      } else {
        const existing = map.get(codigo)
        existing.retosActivos += retosDeCategoria.length
        existing.retos = [...existing.retos, ...retosDeCategoria]
      }
    }
    
    return Array.from(map.values()).filter(c => c.retosActivos > 0)
  }, [plantillas, retos])

  function getPlantillaInfo(retoId) {
    const reto = retos.find(r => (r.Id || r.id) === retoId)
    if (!reto) return null
    const plantilla = plantillas.find(p => (p.Id || p.id) === (reto.PlantillaId || reto.plantillaId))
    return plantilla
  }

  async function iniciarReto(reto) {
    try {
      setRetoActual(reto)
      
      const plantilla = plantillas.find(p => (p.Id || p.id) === (reto.PlantillaId || reto.plantillaId))
      const codigo = plantilla?.Codigo || plantilla?.codigo || ''
      const tipo = codigo.includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
      
      let cantidad = 5
      try {
        const params = JSON.parse(reto.Parametros || reto.parametros || '{}')
        cantidad = Number(params.question_count || params.cantidad || 5)
      } catch {}

      const lista = await listarPreguntas({ tipo, categoria: codigo })
      const arr = Array.isArray(lista) ? lista.slice() : []
      
      // Mezclar preguntas
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      
      const take = arr.slice(0, cantidad)
      
      if (take.length === 0) {
        toast?.show('Este reto no tiene preguntas configuradas aún', 'error')
        return
      }
      
      setPreguntas(take)
      setIdx(0)
      setFeedback('')
      setResumen(null)
      setJugando(true)
      setPuntos(0)
      setAciertos(0)
      setTiempoRestante(30) // 30 segundos por pregunta
      
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  // Timer
  useEffect(() => {
    if (!jugando || tiempoRestante === null) return
    
    if (tiempoRestante <= 0) {
      // Tiempo agotado, avanzar
      handleRespuesta(null)
      return
    }
    
    const timer = setTimeout(() => {
      setTiempoRestante(t => t - 1)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [jugando, tiempoRestante])

  function getOpciones(pregunta) {
    const tipo = pregunta.Tipo || pregunta.tipo
    if (String(tipo).toLowerCase() === 'verdadero_falso') {
      return ['Verdadero', 'Falso']
    }
    const raw = pregunta.Opciones || pregunta.opciones || '[]'
    try {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
      return Array.isArray(arr) ? arr : []
    } catch {
      return []
    }
  }

  async function handleRespuesta(resp) {
    const pregunta = preguntas[idx]
    const correcta = String(pregunta.RespuestaCorrecta || pregunta.respuestaCorrecta || '').trim().toLowerCase()
    const esCorrecta = resp && String(resp).trim().toLowerCase() === correcta
    
    if (esCorrecta) {
      setFeedback('correct')
      setPuntos(p => p + 10)
      setAciertos(a => a + 1)
    } else {
      setFeedback('incorrect')
    }
    
    // Esperar y avanzar
    setTimeout(async () => {
      const next = idx + 1
      
      if (next < preguntas.length) {
        setIdx(next)
        setFeedback('')
        setTiempoRestante(30)
      } else {
        // Fin del juego
        setJugando(false)
        setResumen({
          correctas: esCorrecta ? aciertos + 1 : aciertos,
          total: preguntas.length,
          puntos: esCorrecta ? puntos + 10 : puntos
        })
        
        // Registrar resultado
        try {
          const usuarioId = user?.Id || user?.id || 0
          const aulaId = user?.aulaId || 1
          const juegoId = `reto:${retoActual?.Id || retoActual?.id}`
          
          await registrarResultadoJuego({ usuarioId, tipo: 'trivia', litrosAhorrados: 0, juegoId, aulaId })
          
          const puntosFinales = esCorrecta ? puntos + 10 : puntos
          if (puntosFinales > 0) {
            await agregarPuntosUsuario({ usuarioId, valor: puntosFinales, motivo: 'trivia_reto', aulaId })
          }
          
          setJugadoMap(m => ({ ...m, [retoActual?.Id || retoActual?.id]: true }))
        } catch {}
      }
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando desafíos...</p>
        </div>
      </div>
    )
  }

  // Vista de juego activo
  if (jugando && preguntas[idx]) {
    const pregunta = preguntas[idx]
    const opciones = getOpciones(pregunta)
    const progreso = ((idx + 1) / preguntas.length) * 100
    
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header del juego */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎮</span>
              <div>
                <h2 className="font-bold">Pregunta {idx + 1} de {preguntas.length}</h2>
                <p className="text-white/80 text-sm">{categoriaSel?.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                <span className="text-2xl font-bold">{puntos}</span>
                <span className="text-sm ml-1">pts</span>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                tiempoRestante <= 10 ? 'bg-red-500 animate-pulse' : 'bg-white/20'
              }`}>
                {tiempoRestante}
              </div>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Pregunta */}
        <div className="bg-card rounded-2xl border shadow-lg overflow-hidden">
          <div className="p-8">
            <h3 className="text-xl font-semibold text-title mb-8 text-center">
              {pregunta.Texto || pregunta.texto}
            </h3>
            
            {/* Opciones */}
            <div className="grid gap-3">
              {opciones.map((opt, i) => {
                const letra = String.fromCharCode(65 + i)
                let btnClass = 'border-2 border-input hover:border-primary hover:bg-primary/5'
                
                if (feedback) {
                  const correcta = String(pregunta.RespuestaCorrecta || pregunta.respuestaCorrecta || '').trim().toLowerCase()
                  const esEsta = String(opt).trim().toLowerCase() === correcta
                  
                  if (esEsta) {
                    btnClass = 'border-2 border-eco bg-eco/10'
                  } else if (feedback === 'incorrect') {
                    btnClass = 'border-2 border-input opacity-50'
                  }
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => !feedback && handleRespuesta(opt)}
                    disabled={!!feedback}
                    className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 ${btnClass}`}
                  >
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      feedback ? 'bg-soft-divider' : 'bg-primary/10 text-primary'
                    }`}>
                      {letra}
                    </span>
                    <span className="text-title font-medium">{opt}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Feedback */}
          {feedback && (
            <div className={`p-4 text-center font-semibold ${
              feedback === 'correct' 
                ? 'bg-eco/20 text-green-700' 
                : 'bg-coral/20 text-red-700'
            }`}>
              {feedback === 'correct' ? '🎉 ¡Correcto! +10 puntos' : '❌ Incorrecto'}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista de resumen
  if (resumen) {
    const porcentaje = Math.round((resumen.correctas / resumen.total) * 100)
    let mensaje = ''
    let emoji = ''
    
    if (porcentaje >= 80) { mensaje = '¡Excelente trabajo!'; emoji = '🏆' }
    else if (porcentaje >= 60) { mensaje = '¡Muy bien!'; emoji = '🌟' }
    else if (porcentaje >= 40) { mensaje = '¡Sigue practicando!'; emoji = '💪' }
    else { mensaje = '¡No te rindas!'; emoji = '📚' }
    
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-card rounded-2xl border shadow-lg overflow-hidden text-center">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="text-6xl mb-4">{emoji}</div>
            <h2 className="text-2xl font-bold mb-2">{mensaje}</h2>
            <p className="text-white/80">Has completado el desafío</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-soft-divider rounded-xl p-4">
                <div className="text-3xl font-bold text-eco">{resumen.correctas}</div>
                <div className="text-sm text-muted-foreground">Correctas</div>
              </div>
              <div className="bg-soft-divider rounded-xl p-4">
                <div className="text-3xl font-bold text-title">{resumen.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="bg-gold/20 rounded-xl p-4">
                <div className="text-3xl font-bold text-amber-600">+{resumen.puntos}</div>
                <div className="text-sm text-muted-foreground">Puntos</div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2">Tu puntuación</div>
              <div className="h-4 bg-soft-divider rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${
                    porcentaje >= 80 ? 'bg-eco' :
                    porcentaje >= 60 ? 'bg-primary' :
                    porcentaje >= 40 ? 'bg-amber-500' :
                    'bg-coral'
                  }`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <div className="text-2xl font-bold text-title mt-2">{porcentaje}%</div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => { setResumen(null); setCategoriaSel(null); setRetoActual(null) }}
                className="flex-1 h-12 rounded-xl border font-medium hover:bg-soft-divider transition-colors"
              >
                Ver más desafíos
              </button>
              {categoriaSel && categoriaSel.retos.some(r => !jugadoMap[r.Id || r.id] && (r.Estado ?? r.estado) === 0) && (
                <button
                  onClick={() => {
                    const siguiente = categoriaSel.retos.find(r => !jugadoMap[r.Id || r.id] && (r.Estado ?? r.estado) === 0)
                    if (siguiente) iniciarReto(siguiente)
                  }}
                  className="flex-1 h-12 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors"
                >
                  Siguiente reto
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista de categoría seleccionada
  if (categoriaSel) {
    const retosDisponibles = categoriaSel.retos.filter(r => (r.Estado ?? r.estado) === 0)
    const retosJugados = retosDisponibles.filter(r => jugadoMap[r.Id || r.id])
    const retosPendientes = retosDisponibles.filter(r => !jugadoMap[r.Id || r.id])
    
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => setCategoriaSel(null)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a categorías
          </button>
          
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-4xl">
                {getEmoji(categoriaSel.codigo)}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{categoriaSel.nombre}</h1>
                <p className="text-white/80">{categoriaSel.descripcion || 'Pon a prueba tus conocimientos'}</p>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                <span className="font-bold">{retosDisponibles.length}</span>
                <span className="text-sm ml-1">retos</span>
              </div>
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                <span className="font-bold">{retosJugados.length}</span>
                <span className="text-sm ml-1">completados</span>
              </div>
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                <span className="font-bold">{retosPendientes.length}</span>
                <span className="text-sm ml-1">pendientes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de retos */}
        <div className="grid gap-4">
          {retosPendientes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-title mb-3 flex items-center gap-2">
                <span>🎯</span> Retos Disponibles
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {retosPendientes.map(reto => {
                  const plantilla = plantillas.find(p => (p.Id || p.id) === (reto.PlantillaId || reto.plantillaId))
                  let cantidad = 5
                  try {
                    const params = JSON.parse(reto.Parametros || reto.parametros || '{}')
                    cantidad = Number(params.question_count || params.cantidad || 5)
                  } catch {}
                  
                  return (
                    <div key={reto.Id || reto.id} className="bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: getGradient(categoriaSel.codigo) }}>
                              {getEmoji(categoriaSel.codigo)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-title">{plantilla?.Nombre || plantilla?.nombre || 'Reto'}</h3>
                              <p className="text-xs text-muted-foreground">{cantidad} preguntas</p>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs bg-eco/20 text-green-700">
                            Disponible
                          </span>
                        </div>
                        
                        <div className="text-sm text-muted-foreground mb-4">
                          Válido hasta: {new Date(reto.FechaFin || reto.fechaFin).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </div>
                        
                        <button
                          onClick={() => iniciarReto(reto)}
                          className="w-full h-11 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
                        >
                          <span>🎮</span>
                          Jugar ahora
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {retosJugados.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-title mb-3 flex items-center gap-2">
                <span>✅</span> Completados
              </h2>
              <div className="bg-card rounded-xl border shadow-sm divide-y">
                {retosJugados.map(reto => {
                  const plantilla = plantillas.find(p => (p.Id || p.id) === (reto.PlantillaId || reto.plantillaId))
                  
                  return (
                    <div key={reto.Id || reto.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-eco/20 flex items-center justify-center text-xl">
                          ✅
                        </div>
                        <div>
                          <h3 className="font-medium text-title">{plantilla?.Nombre || plantilla?.nombre || 'Reto'}</h3>
                          <p className="text-xs text-muted-foreground">Completado</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-soft-divider text-muted-foreground">
                        Ya jugado
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {retosDisponibles.length === 0 && (
            <div className="bg-card rounded-xl border shadow-sm p-12 text-center">
              <div className="text-5xl mb-4">🎮</div>
              <h3 className="text-lg font-semibold text-title mb-2">No hay retos disponibles</h3>
              <p className="text-muted-foreground">Tu profesor aún no ha activado retos de esta categoría</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista principal - Categorías
  return (
    <div className="space-y-6">
      {/* Header principal */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">🎮</span>
              Desafíos Interactivos
            </h1>
            <p className="text-white/80 mt-2">
              Aprende sobre el cuidado del agua mientras ganas puntos y medallas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur px-5 py-3 rounded-xl text-center">
              <div className="text-2xl font-bold">{retos.length}</div>
              <div className="text-xs text-white/80">Retos activos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Categorías */}
      {categorias.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-title mb-4">Elige una categoría</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorias.map((cat, i) => {
              const jugados = cat.retos.filter(r => jugadoMap[r.Id || r.id]).length
              const pendientes = cat.retos.filter(r => !jugadoMap[r.Id || r.id] && (r.Estado ?? r.estado) === 0).length
              
              return (
                <div 
                  key={cat.codigo || i}
                  className="bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
                  onClick={() => setCategoriaSel(cat)}
                >
                  <div 
                    className="h-32 flex items-center justify-center text-5xl"
                    style={{ background: getGradient(cat.codigo) }}
                  >
                    {getEmoji(cat.codigo)}
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-title text-lg mb-1">{cat.nombre}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {cat.descripcion || 'Desafía tus conocimientos'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {pendientes > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-eco/20 text-green-700">
                            {pendientes} nuevos
                          </span>
                        )}
                        {jugados > 0 && (
                          <span className="px-2 py-1 rounded-full text-xs bg-soft-divider text-muted-foreground">
                            {jugados} jugados
                          </span>
                        )}
                      </div>
                      <span className="text-primary font-medium text-sm">Jugar →</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-sm p-12 text-center">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold text-title mb-2">¡Pronto habrá desafíos!</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Tu profesor está preparando retos interactivos para ti. Mientras tanto, explora otras secciones de la aplicación.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-coral/10 text-red-700 p-4 rounded-xl text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

function getGradient(code) {
  const key = String(code || '').toLowerCase()
  if (key.includes('trivia')) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  if (key.includes('verdadero') || key.includes('falso')) return 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
  if (key.includes('memoria') || key.includes('pairs')) return 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)'
  if (key.includes('fuga')) return 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)'
  if (key.includes('agua') || key.includes('water')) return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}

function getEmoji(code) {
  const key = String(code || '').toLowerCase()
  if (key.includes('trivia')) return '❓'
  if (key.includes('verdadero') || key.includes('falso')) return '✅'
  if (key.includes('memoria') || key.includes('pairs')) return '🧠'
  if (key.includes('fuga')) return '🚿'
  if (key.includes('agua') || key.includes('water')) return '💧'
  return '🎯'
}
