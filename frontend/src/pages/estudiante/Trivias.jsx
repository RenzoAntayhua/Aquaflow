import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getSesionesTriviaAula, getPreguntasSesion, enviarRespuestaSesion, finalizarSesion } from '../../lib/api'

export default function EstudianteTrivias() {
  const { user } = useAuth()
  const [sesiones, setSesiones] = useState([])
  const [error, setError] = useState('')
  const [jugando, setJugando] = useState(false)
  const [sesionId, setSesionId] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [idx, setIdx] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [resumen, setResumen] = useState(null)
  const usuarioId = user?.Id || user?.id || 0
  useEffect(() => {
    const aulaId = user?.aulaId || 1
    getSesionesTriviaAula({ aulaId }).then(setSesiones).catch(e => setError(e.message))
  }, [user])

  async function iniciar(s) {
    try {
      const sid = s.Id || s.id
      const qs = await getPreguntasSesion({ sesionId: sid })
      setSesionId(sid)
      setPreguntas(qs)
      setIdx(0)
      setFeedback('')
      setResumen(null)
      setJugando(true)
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
      const r = await enviarRespuestaSesion({ sesionId, usuarioId, preguntaId: pid, respuesta: String(resp) })
      setFeedback(r.correcta ? '¡Correcto! +10 monedas' : 'Incorrecto')
      const next = idx + 1
      if (next < preguntas.length) {
        setTimeout(() => { setIdx(next); setFeedback('') }, 600)
      } else {
        const fin = await finalizarSesion({ sesionId, usuarioId })
        setResumen(fin)
        setJugando(false)
        const aulaId = user?.aulaId || 1
        getSesionesTriviaAula({ aulaId }).then(setSesiones).catch(() => {})
      }
    } catch (e) { setError(e.message) }
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Trivias</h1>
      <div className="bg-card rounded-xl border p-6 shadow text-sm w-full max-w-2xl mx-auto">
        {error && <div className="text-red-700 text-sm mb-2">{error}</div>}
        {!jugando && !resumen && (
          <div className="border rounded-md">
            <div className="grid grid-cols-4 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>ID</div>
              <div>Preguntas</div>
              <div>Creada</div>
              <div>Acción</div>
            </div>
            {sesiones.map((s, i) => (
              <div key={s.Id || s.id || i} className={`px-3 py-2 ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-4 items-center">
                  <div>#{s.Id || s.id}</div>
                  <div>{s.cantidad}</div>
                  <div>{String(s.CreadoEn || s.creadoEn).slice(0,10)}</div>
                  <div><button className="h-8 px-3 rounded-md bg-primary text-primary-foreground" onClick={() => iniciar(s)}>Participar</button></div>
                </div>
              </div>
            ))}
            {sesiones.length === 0 && (
              <div className="px-3 py-2 text-slate-500">No hay trivias activas</div>
            )}
          </div>
        )}
        {jugando && preguntas[idx] && (
          <div className="space-y-3">
            <div className="text-sm text-slate-600">Pregunta {idx+1} de {preguntas.length}</div>
            <div className="text-base font-medium">{preguntas[idx].Texto || preguntas[idx].texto}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
              {opcionesDe(preguntas[idx]).map((opt, j) => (
                <button key={j} className="h-10 rounded-md border px-3 text-sm hover:bg-slate-50" onClick={() => responder(opt)}>{String(opt)}</button>
              ))}
            </div>
            {feedback && <div className="text-sm mt-2">{feedback}</div>}
          </div>
        )}
        {!jugando && resumen && (
          <div className="space-y-3">
            <div className="text-sm">Has finalizado la trivia</div>
            <div className="text-base">Correctas: {resumen.correctas} / {resumen.total}</div>
            <div>
              <button className="h-9 px-4 rounded-md border" onClick={() => { setResumen(null); setSesionId(null); setPreguntas([]); setIdx(0); }}>Volver</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}