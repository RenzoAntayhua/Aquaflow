import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getPlantillasRetos, getRetosAula, listarPreguntas, registrarResultadoJuego, agregarPuntosUsuario, verificarRetoJugado } from '../../lib/api'

export default function EstudianteJuegos() {
  const { user } = useAuth()
  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  
  const [error, setError] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('')
  const [jugando, setJugando] = useState(false)
  const [preguntas, setPreguntas] = useState([])
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [resumen, setResumen] = useState(null)
  const [puntos, setPuntos] = useState(0)
  const [retoActual, setRetoActual] = useState(null)
  const [aciertos, setAciertos] = useState(0)
  const [jugadoMap, setJugadoMap] = useState({})

  useEffect(() => {
    getPlantillasRetos().then(setPlantillas).catch(e => setError(e.message))
    const aulaId = user?.aulaId || 1
    getRetosAula({ aulaId }).then(setRetos).catch(e => setError(e.message))
    
  }, [user])

  const categorias = useMemo(() => {
    const map = new Map()
    for (const p of plantillas) {
      const codigo = p.Codigo || p.codigo || 'generico'
      if (!map.has(codigo)) {
        map.set(codigo, { codigo, nombre: p.Nombre || p.nombre || codigo, descripcion: p.Descripcion || p.descripcion || '', dificultad: 'Medio' })
      }
    }
    return Array.from(map.values())
  }, [plantillas])

  const retosPorCategoria = useMemo(() => {
    const byId = new Map(plantillas.map(p => [p.Id || p.id, p]))
    return retos.filter(r => {
      const pl = byId.get(r.PlantillaId || r.plantillaId)
      const codigo = pl ? (pl.Codigo || pl.codigo) : null
      return codigo && codigo === categoriaSel
    })
  }, [retos, plantillas, categoriaSel])

  useEffect(() => {
    const usuarioId = user?.Id || user?.id || 0
    if (!usuarioId || retosPorCategoria.length === 0) return
    Promise.all(retosPorCategoria.map(r => verificarRetoJugado({ usuarioId, retoId: r.Id || r.id }).catch(() => ({ jugado: false })))).then(resps => {
      const map = {}
      for (let i = 0; i < retosPorCategoria.length; i++) {
        const r = retosPorCategoria[i]
        map[r.Id || r.id] = !!(resps[i]?.jugado)
      }
      setJugadoMap(map)
    }).catch(() => {})
  }, [retosPorCategoria, user])

  

  async function iniciarReto(r) {
    try {
      setRetoActual(r)
      const byId = new Map(plantillas.map(p => [p.Id || p.id, p]))
      const pl = byId.get(r.PlantillaId || r.plantillaId)
      const codigo = pl ? (pl.Codigo || pl.codigo || '') : ''
      const tipo = String(codigo).includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
      let req = 0
      try { const pars = JSON.parse(r.Parametros || r.parametros || '{}'); req = Number(pars.question_count || pars.cantidad || 0) } catch {}
      const lista = await listarPreguntas({ tipo, categoria: codigo })
      const arr = Array.isArray(lista) ? lista.slice() : []
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
      const take = req > 0 ? arr.slice(0, req) : arr
      setPreguntas(take)
      setIdx(0)
      setFeedback('')
      setResumen(null)
      setJugando(true)
      setPuntos(0)
      setAciertos(0)
    } catch (e) { setError(e.message) }
  }

  

  function opcionesDe(p) {
    const tipo = p.Tipo || p.tipo
    if (String(tipo).toLowerCase() === 'verdadero_falso') return ['verdadero','falso']
    const raw = p.Opciones || p.opciones || '[]'
    try { const arr = typeof raw === 'string' ? JSON.parse(raw) : raw; return Array.isArray(arr) ? arr : [] } catch { return [] }
  }

  async function responder(resp) {
    try {
      const p = preguntas[idx]
      const pid = p.Id || p.id
      const correcta = String(p.RespuestaCorrecta || p.respuestaCorrecta || '').trim().toLowerCase()
      const esCorrecta = String(resp).trim().toLowerCase() === correcta
      setFeedback(esCorrecta ? '¡Correcto! +10 monedas' : 'Incorrecto')
      if (esCorrecta) { setPuntos(prev => prev + 10); setAciertos(prev => prev + 1) }
      const next = idx + 1
      if (next < preguntas.length) {
        setTimeout(() => { setIdx(next); setFeedback('') }, 600)
      } else {
        const usuarioId = user?.Id || user?.id || 0
        const aulaId = user?.aulaId || 1
        const resumenFinal = { correctas: aciertos, total: preguntas.length }
        setResumen(resumenFinal)
        try {
          const juegoId = `reto:${retoActual?.Id || retoActual?.id || 'desconocido'}`
          await registrarResultadoJuego({ usuarioId, tipo: 'trivia', litrosAhorrados: 0, juegoId, aulaId })
          if (puntos > 0) await agregarPuntosUsuario({ usuarioId, valor: puntos, motivo: 'trivia_reto', aulaId })
          if (retoActual?.Id || retoActual?.id) localStorage.setItem(`reto_done_${retoActual.Id || retoActual.id}_${usuarioId}`, 'true')
        } catch (e) { /* silencioso: evitar romper fin de juego */ }
        setJugando(false)
      }
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-xl p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Desafíos Interactivos</h1>
            <p className="text-sm opacity-90">Selecciona una categoría y juega para ganar monedas y aprender.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="text-sm bg-white/10 px-3 py-1 rounded-md">Monedas: <span className="font-semibold">{puntos}</span></div>
          </div>
        </div>
      </div>
      {false && sesiones.length > 0 && !categoriaSel && null}
      {!categoriaSel && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categorias.map((c, i) => (
            <div key={c.codigo || i} className="bg-card rounded-xl border p-6 shadow flex flex-col hover:shadow-lg transition-transform hover:-translate-y-0.5">
              <div className="h-24 rounded-md mb-4 flex items-center justify-center" style={{ background: gradFor(c.codigo) }}>
                <span className="text-3xl">{emojiFor(c.codigo)}</span>
              </div>
              <div className="font-semibold text-title mb-1">{c.nombre}</div>
              <div className="text-sm text-slate-600 mb-3">{c.descripcion || 'Desafío interactivo'}</div>
              <span className="inline-block text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700 w-min mb-4">{c.dificultad}</span>
              <button className="mt-auto bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm" onClick={() => setCategoriaSel(c.codigo)}>Comenzar</button>
            </div>
          ))}
          {categorias.length === 0 && (
            <div className="text-sm text-slate-500">No hay categorías disponibles</div>
          )}
        </div>
      )}
      {categoriaSel && (
        <div className="grid gap-3">
          <div className="bg-card rounded-xl border p-6 shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Quiz: {categoriaSel}</div>
                <div className="text-sm text-slate-600">Pon a prueba tu conocimiento con preguntas interactivas.</div>
              </div>
              <button className="h-9 px-4 rounded-md border" onClick={() => { setCategoriaSel(''); setJugando(false); setResumen(null); }}>Volver</button>
            </div>
      {!jugando && !resumen && (
              <div className="mt-4 text-sm text-slate-600">Selecciona un reto activo para jugar.</div>
            )}
            {jugando && preguntas[idx] && (
              <div className="mt-4 space-y-3">
                <div className="h-2 bg-slate-200 rounded">
                  <div className="h-2 bg-primary rounded" style={{ width: `${Math.round(((idx+1)/preguntas.length)*100)}%` }} />
                </div>
                <div className="text-sm text-slate-600">Pregunta {idx+1} de {preguntas.length}</div>
                <div className="text-base font-medium">{preguntas[idx].Texto || preguntas[idx].texto}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {opcionesDe(preguntas[idx]).map((opt, j) => (
                    <button key={j} className="h-10 rounded-md border px-3 text-sm hover:bg-slate-50" onClick={() => responder(opt)}>{String(opt)}</button>
                  ))}
                </div>
                {feedback && <div className={`text-sm mt-2 ${feedback.startsWith('¡Correcto') ? 'text-green-700' : 'text-red-700'}`}>{feedback}</div>}
              </div>
            )}
            {!jugando && resumen && (
              <div className="mt-4 space-y-3">
                <div className="text-sm">Has finalizado el quiz</div>
                <div className="text-base">Correctas: {resumen.correctas} / {resumen.total}</div>
                <div className="text-sm">Monedas ganadas: {puntos}</div>
                <button className="h-9 px-4 rounded-md border" onClick={() => { setResumen(null); setCategoriaSel(''); }}>Explorar categorías</button>
              </div>
            )}
          </div>
          
          <div className="bg-card rounded-xl border p-6 shadow">
            <div className="text-sm text-slate-600 mb-2">Retos activos de esta categoría</div>
            <div className="grid gap-2">
              {retosPorCategoria.map((r, i) => (
                <div key={r.Id || r.id || i} className="rounded-md border px-3 py-2 text-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: gradFor(categoriaSel) }}>
                      <span className="text-lg">{emojiFor(categoriaSel)}</span>
                    </div>
                    <div>
                      <div className="font-medium">Plantilla #{r.PlantillaId || r.plantillaId}</div>
                      <div className="text-xs text-slate-600">{String(r.FechaInicio || r.fechaInicio).slice(0,10)} — {String(r.FechaFin || r.fechaFin).slice(0,10)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-md ${estadoColor(r)}`}>{estadoTexto(r)}</span>
                    {(r.Estado === 0 || r.estado === 0) && (jugadoMap[r.Id || r.id] ? (
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">Completado</span>
                    ) : (
                      <button className="h-8 px-3 rounded-md bg-primary text-primary-foreground" onClick={() => iniciarReto(r)}>Jugar</button>
                    ))}
                  </div>
                </div>
              ))}
              {retosPorCategoria.length === 0 && (
                <div className="rounded-md border px-3 py-2 text-sm text-slate-500">No hay retos activos en esta categoría</div>
              )}
            </div>
          </div>
        </div>
      )}
      {error && <div className="text-red-700 text-sm">{error}</div>}
    </div>
  )
}

function gradFor(code) {
  const key = String(code || '').toLowerCase()
  if (key.includes('fuga')) return 'linear-gradient(135deg,#00a8ff,#4da3ff)'
  if (key.includes('memoria') || key.includes('pareja')) return 'linear-gradient(135deg,#c471ed,#f64f59)'
  if (key.includes('riego') || key.includes('planta')) return 'linear-gradient(135deg,#00b09b,#96c93d)'
  return 'linear-gradient(135deg,#667eea,#764ba2)'
}

function emojiFor(code) {
  const key = String(code || '').toLowerCase()
  if (key.includes('trivia')) return '❓'
  if (key.includes('verdadero') || key.includes('falso')) return '✅'
  if (key.includes('memoria') || key.includes('pairs')) return '🧠'
  return '🎯'
}

function estadoTexto(r) {
  const e = r.Estado ?? r.estado
  if (e === 0) return 'Activo'
  if (e === 1) return 'Pausado'
  if (e === 2) return 'Completado'
  return 'Fallido'
}

function estadoColor(r) {
  const e = r.Estado ?? r.estado
  if (e === 0) return 'bg-green-100 text-green-700'
  if (e === 1) return 'bg-yellow-100 text-yellow-700'
  if (e === 2) return 'bg-blue-100 text-blue-700'
  return 'bg-red-100 text-red-700'
}