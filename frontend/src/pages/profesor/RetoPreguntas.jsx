import { useEffect, useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { getPlantillasRetos, getRetosAula, crearPregunta, listarPreguntas, actualizarEstadoReto } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useConfirm } from '../../context/ConfirmContext'

export default function RetoPreguntas() {
  const { aulaId, retoId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const { confirm } = useConfirm() || {}

  const [reto, setReto] = useState(null)
  const [plantilla, setPlantilla] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Formulario de pregunta
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState(['', '', '', ''])
  const [correctaIdx, setCorrectaIdx] = useState(0)
  const [dificultad, setDificultad] = useState('facil')

  // Derivados
  const tipoReto = plantilla ? (plantilla.Codigo || plantilla.codigo || '') : ''
  const esVerdaderoFalso = tipoReto.includes('verdadero_falso')
  const tipoPregunta = esVerdaderoFalso ? 'verdadero_falso' : 'trivia'

  // Requerimientos
  let preguntasRequeridas = 0
  try {
    const params = JSON.parse(reto?.Parametros || reto?.parametros || '{}')
    preguntasRequeridas = Number(params.question_count || params.cantidad || 5)
  } catch {}

  const progreso = preguntas.length
  const listo = progreso >= preguntasRequeridas && preguntasRequeridas > 0

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const [plantillas, retos] = await Promise.all([
          getPlantillasRetos(),
          getRetosAula({ aulaId })
        ])
        const r = retos.find(x => String(x.Id || x.id) === String(retoId))
        if (!r) throw new Error('Reto no encontrado')
        setReto(r)

        const pl = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
        setPlantilla(pl || null)

        if (pl) {
          const codigo = pl.Codigo || pl.codigo || ''
          const tipo = codigo.includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
          const lista = await listarPreguntas({ tipo, categoria: codigo })
          setPreguntas(Array.isArray(lista) ? lista : [])
        }
      } catch (e) {
        toast?.show(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [aulaId, retoId])

  async function guardarPregunta() {
    if (!texto.trim()) {
      toast?.show('Ingresa el texto de la pregunta', 'error')
      return
    }

    setSaving(true)
    try {
      const creadorId = user?.Id || user?.id
      const colegioId = user?.ColegioId || user?.colegioId || null
      const categoria = tipoReto

      let opts = []
      let correcta = ''

      if (esVerdaderoFalso) {
        opts = ['Verdadero', 'Falso']
        correcta = correctaIdx === 0 ? 'Verdadero' : 'Falso'
      } else {
        opts = opciones.filter(o => o.trim())
        if (opts.length < 2) {
          toast?.show('Agrega al menos 2 opciones', 'error')
          setSaving(false)
          return
        }
        correcta = opciones[correctaIdx] || opts[0]
      }

      await crearPregunta({
        texto,
        tipo: tipoPregunta,
        opciones: opts,
        respuestaCorrecta: correcta,
        categoria,
        dificultad,
        creadorId,
        colegioId
      })

      // Limpiar formulario
      setTexto('')
      setOpciones(['', '', '', ''])
      setCorrectaIdx(0)

      // Recargar preguntas
      const lista = await listarPreguntas({ tipo: tipoPregunta, categoria })
      setPreguntas(Array.isArray(lista) ? lista : [])

      toast?.show('Pregunta agregada', 'success')
    } catch (e) {
      toast?.show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function activarReto() {
    const ok = confirm 
      ? await confirm('¿Activar este reto? Los estudiantes podrán jugarlo.')
      : window.confirm('¿Activar este reto?')
    if (!ok) return

    try {
      await actualizarEstadoReto({ retoId, estado: 'activo' })
      toast?.show('Reto activado correctamente', 'success')
      navigate(`/profesor/aula/${aulaId}/retos`)
    } catch (e) {
      toast?.show(e.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reto...</p>
        </div>
      </div>
    )
  }

  if (!reto || !plantilla) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-title mb-2">Reto no encontrado</h2>
        <p className="text-muted-foreground mb-6">No pudimos encontrar el reto solicitado.</p>
        <button 
          onClick={() => navigate(`/profesor/aula/${aulaId}/retos`)}
          className="bg-primary text-primary-foreground h-10 px-6 rounded-lg"
        >
          Volver a Retos
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/profesor/aula/${aulaId}/retos`)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a Retos
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title flex items-center gap-3">
              <span className="text-3xl">{esVerdaderoFalso ? '✅' : '❓'}</span>
              {plantilla.Nombre || plantilla.nombre}
            </h1>
            <p className="text-muted-foreground mt-1">
              {plantilla.Descripcion || plantilla.descripcion || 'Configura las preguntas para este reto'}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              listo ? 'bg-eco/20 text-green-700' : 'bg-gold/20 text-amber-700'
            }`}>
              {listo ? '✓ Listo para activar' : `${progreso}/${preguntasRequeridas} preguntas`}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="bg-card rounded-xl border p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-title">Progreso de configuración</span>
          <span className="text-sm text-muted-foreground">{Math.min(100, Math.round((progreso / preguntasRequeridas) * 100))}%</span>
        </div>
        <div className="h-3 bg-soft-divider rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${listo ? 'bg-eco' : 'bg-primary'}`}
            style={{ width: `${Math.min(100, (progreso / preguntasRequeridas) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Inicio: {String(reto.FechaInicio || reto.fechaInicio).slice(0, 10)}</span>
          <span>Fin: {String(reto.FechaFin || reto.fechaFin).slice(0, 10)}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Formulario de pregunta */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary-light p-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-xl">➕</span>
                Nueva Pregunta
              </h2>
            </div>
            
            <div className="p-6 space-y-5">
              {/* Texto de la pregunta */}
              <div>
                <label className="block text-sm font-medium text-title mb-2">
                  Pregunta
                </label>
                <textarea
                  className="w-full h-24 rounded-lg border border-input px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder={esVerdaderoFalso 
                    ? "Ej: El agua cubre el 71% de la superficie terrestre" 
                    : "Ej: ¿Cuántos litros de agua se desperdician con una fuga pequeña por día?"
                  }
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                />
              </div>

              {/* Opciones */}
              {esVerdaderoFalso ? (
                <div>
                  <label className="block text-sm font-medium text-title mb-3">
                    Respuesta correcta
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Verdadero', 'Falso'].map((opt, i) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCorrectaIdx(i)}
                        className={`p-4 rounded-lg border-2 text-sm font-medium transition-all ${
                          correctaIdx === i 
                            ? 'border-eco bg-eco/10 text-green-700' 
                            : 'border-input hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            correctaIdx === i ? 'border-eco bg-eco' : 'border-gray-300'
                          }`}>
                            {correctaIdx === i && <span className="text-white text-xs">✓</span>}
                          </div>
                          {opt === 'Verdadero' ? '✓ Verdadero' : '✗ Falso'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-title mb-3">
                    Opciones de respuesta
                    <span className="text-muted-foreground font-normal ml-2">(marca la correcta)</span>
                  </label>
                  <div className="space-y-3">
                    {opciones.map((opt, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCorrectaIdx(i)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            correctaIdx === i 
                              ? 'border-eco bg-eco text-white' 
                              : 'border-gray-300 hover:border-primary'
                          }`}
                        >
                          {correctaIdx === i ? '✓' : String.fromCharCode(65 + i)}
                        </button>
                        <input
                          type="text"
                          className={`flex-1 h-11 rounded-lg border px-4 text-sm transition-all ${
                            correctaIdx === i 
                              ? 'border-eco bg-eco/5 focus:ring-eco/20' 
                              : 'border-input focus:ring-primary/20'
                          } focus:ring-2`}
                          placeholder={`Opción ${String.fromCharCode(65 + i)}`}
                          value={opt}
                          onChange={e => {
                            const newOpts = [...opciones]
                            newOpts[i] = e.target.value
                            setOpciones(newOpts)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dificultad */}
              <div>
                <label className="block text-sm font-medium text-title mb-2">
                  Dificultad
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'facil', label: 'Fácil', color: 'bg-green-100 text-green-700 border-green-200' },
                    { value: 'media', label: 'Media', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                    { value: 'dificil', label: 'Difícil', color: 'bg-red-100 text-red-700 border-red-200' }
                  ].map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDificultad(d.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        dificultad === d.value ? d.color : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botón guardar */}
              <button
                onClick={guardarPregunta}
                disabled={saving || !texto.trim()}
                className="w-full h-12 bg-primary hover:bg-primary-light text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    Agregar Pregunta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Lista de preguntas */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-info-card p-4 border-b">
              <h2 className="font-semibold text-title flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span>📝</span>
                  Preguntas ({preguntas.length})
                </span>
                {listo && (
                  <span className="text-eco text-sm">✓ Completo</span>
                )}
              </h2>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {preguntas.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-muted-foreground text-sm">
                    Aún no hay preguntas.<br/>
                    ¡Agrega la primera!
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {preguntas.map((p, i) => (
                    <div key={p.Id || p.id || i} className="p-4 hover:bg-soft-divider/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-title line-clamp-2">
                            {p.Texto || p.texto}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              (p.Dificultad || p.dificultad) === 'facil' ? 'bg-green-100 text-green-700' :
                              (p.Dificultad || p.dificultad) === 'media' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {(p.Dificultad || p.dificultad || 'facil').charAt(0).toUpperCase() + (p.Dificultad || p.dificultad || 'facil').slice(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ✓ {p.RespuestaCorrecta || p.respuestaCorrecta}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Acción de activar */}
            {listo && (
              <div className="p-4 bg-eco/10 border-t">
                <button
                  onClick={activarReto}
                  className="w-full h-11 bg-eco hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  Activar Reto
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

