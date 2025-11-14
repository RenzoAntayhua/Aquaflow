import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { getPlantillasRetos, crearRetoAula, getRetosAula, actualizarEstadoReto, crearPregunta, listarPreguntas, crearSesionTrivia } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function ProfesorRetos() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  const [error, setError] = useState(null)
  const [pSel, setPSel] = useState('')
  const [param, setParam] = useState({})
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState('')
  const [correcta, setCorrecta] = useState('')
  const [dificultad, setDificultad] = useState('facil')
  const [preguntas, setPreguntas] = useState([])
  const [retoSel, setRetoSel] = useState(null)
  const [preguntasSel, setPreguntasSel] = useState([])
  const [requeridasSel, setRequeridasSel] = useState(0)
  const [readySel, setReadySel] = useState(false)
  useEffect(() => {
    getPlantillasRetos().then(setPlantillas).catch(setError)
    getRetosAula({ aulaId }).then(setRetos).catch(() => {})
  }, [aulaId])

  useEffect(() => {
    if (!retoSel) { setPreguntasSel([]); return }
    const pl = plantillas.find(p => String(p.Id || p.id) === String(retoSel.PlantillaId || retoSel.plantillaId))
    const codigo = pl ? (pl.Codigo || pl.codigo || '') : ''
    const esTrivia = String(codigo).includes('trivia') || String(codigo).includes('verdadero_falso')
    if (!esTrivia) { setPreguntasSel([]); return }
    const tipoC = String(codigo).includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
    listarPreguntas({ tipo: tipoC, categoria: codigo }).then(setPreguntasSel).catch(() => setPreguntasSel([]))
  }, [retoSel, plantillas])

  function labelParametro(k) {
    const map = {
      question_count: 'Cantidad de preguntas',
      time_per_question: 'Tiempo por pregunta (segundos)',
      pairs_count: 'Cantidad de parejas',
      reduccion_porcentual: 'Reducción porcentual'
    }
    return map[k] || k.replace(/_/g, ' ')
  }
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Retos desde plantillas (Aula {aulaId})</h1>
      {error && <div className="text-red-600">{String(error)}</div>}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-card rounded-xl border p-8 shadow">
          <div className="text-sm text-slate-600 mb-3">Crear reto derivado de plantilla</div>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Plantilla</label>
              <select className="h-10 w-full rounded-md border px-3 text-sm" value={pSel} onChange={e => {
                const v = e.target.value; setPSel(v); const p = plantillas.find(x => String(x.Id || x.id) === v); try { setParam(p ? JSON.parse(p.ParametrosDefault || p.parametrosDefault || '{}') : {}) } catch { setParam({}) }
              }}>
                <option value="">Selecciona</option>
                {plantillas.map(p => (
                  <option key={p.Id || p.id} value={p.Id || p.id}>{p.Nombre || p.nombre}</option>
                ))}
              </select>
            </div>
            {(() => {
              const p = plantillas.find(x => String(x.Id || x.id) === String(pSel))
              if (!p) return null
              let rango = {}
              try { rango = JSON.parse(p.ParametrosRango || p.parametrosRango || '{}') } catch {}
              const entries = Object.entries(param)
              return (
                <div className="space-y-3">
                  {entries.map(([k, v]) => (
                    <div key={k}>
                      <label className="text-sm">{labelParametro(k)}</label>
                      <input type="number" className="h-10 w-full rounded-md border px-3 text-sm" value={v} onChange={e => setParam({ ...param, [k]: Number(e.target.value) })} min={rango[k]?.min ?? 0} max={rango[k]?.max ?? 999} />
                    </div>
                  ))}
                </div>
              )
            })()}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Inicio</label>
                <input type="date" className="h-10 w-full rounded-md border px-3 text-sm" value={inicio} onChange={e => setInicio(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Fin</label>
                <input type="date" className="h-10 w-full rounded-md border px-3 text-sm" value={fin} onChange={e => setFin(e.target.value)} />
              </div>
            </div>
            <button className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm" onClick={async () => {
              try {
                if (!pSel || !inicio || !fin) throw new Error('Completa plantilla y fechas')
                await crearRetoAula({ aulaId, plantillaId: Number(pSel), fechaInicio: inicio, fechaFin: fin, parametros: param })
                setPSel(''); setInicio(''); setFin(''); setParam({})
                const lista = await getRetosAula({ aulaId }); setRetos(lista)
              } catch (e) { setError(e.message) }
            }}>Crear</button>
            {error && <div className="text-red-700 text-sm">{error}</div>}
          </div>
        </div>
        <div className="bg-card rounded-xl border p-8 shadow">
          <div className="text-sm text-slate-600 mb-3">Retos del aula</div>
          <div className="border rounded-md">
            <div className="grid grid-cols-5 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Plantilla</div>
              <div>Inicio</div>
              <div>Fin</div>
              <div>Estado</div>
              <div>Acciones</div>
            </div>
            {retos.map((r, i) => (
              <div key={r.Id || r.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-5 items-center">
                  <div>{r.PlantillaId || r.plantillaId}</div>
                  <div>{String(r.FechaInicio || r.fechaInicio).slice(0,10)}</div>
                  <div>{String(r.FechaFin || r.fechaFin).slice(0,10)}</div>
                  <div>{(r.Estado === 0 || r.estado === 0) ? 'Activo' : (r.Estado === 1 || r.estado === 1) ? 'Pausado' : (r.Estado === 2 || r.estado === 2) ? 'Completado' : 'Fallido'}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button className="text-blue-600" onClick={async () => {
                      try {
                        const pl = plantillas.find(p => String(p.Id || p.id) === String(r.PlantillaId || r.plantillaId))
                        const codigo = pl ? (pl.Codigo || pl.codigo || '') : ''
                        const esTrivia = String(codigo).includes('trivia') || String(codigo).includes('verdadero_falso')
                        let ok = true
                        if (esTrivia) {
                          let req = 0
                          try { const pars = JSON.parse(r.Parametros || r.parametros || '{}'); req = Number(pars.question_count || pars.cantidad || 0) } catch {}
                          const tipoC = String(codigo).includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
                          const listaPreg = await listarPreguntas({ tipo: tipoC, categoria: codigo })
                          const cnt = Array.isArray(listaPreg) ? listaPreg.length : 0
                          ok = cnt >= req && req > 0
                          if (!ok) throw new Error(`Faltan ${Math.max(0, req - cnt)} preguntas`)
                        }
                        await actualizarEstadoReto({ retoId: r.Id || r.id, estado: 'activo' })
                        const lista = await getRetosAula({ aulaId }); setRetos(lista)
                      } catch (e) { setError(e.message) }
                    }}>Activar</button>
                    <button className="text-yellow-700" onClick={async () => { await actualizarEstadoReto({ retoId: r.Id || r.id, estado: 'pausado' }); const lista = await getRetosAula({ aulaId }); setRetos(lista) }}>Pausar</button>
                    <button className="text-green-700" onClick={() => setRetoSel(r)}>
                      Gestionar
                    </button>
                    {null}
                  </div>
                </div>
              </div>
            ))}
            {retos.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay retos creados</div>
            )}
          </div>
        </div>
      </div>
      {retoSel && (() => {
        const r = retoSel
        const pl = plantillas.find(p => String(p.Id || p.id) === String(r.PlantillaId || r.plantillaId))
        const codigo = pl ? (pl.Codigo || pl.codigo || '') : ''
        const esTrivia = String(codigo).includes('trivia') || String(codigo).includes('verdadero_falso')
        if (!esTrivia) return null
        const tipoC = String(codigo).includes('verdadero_falso') ? 'verdadero_falso' : 'trivia'
        return (
          <div className="bg-card rounded-xl border p-8 shadow mt-6">
            <div className="text-sm text-slate-600 mb-3">Preguntas del reto seleccionado</div>
            <div className="text-xs text-slate-600 mb-3">Tipo: <span className="font-medium">{tipoC === 'trivia' ? 'Trivia' : 'Verdadero/Falso'}</span> • Categoría: <span className="font-medium">{codigo}</span></div>
            {(() => {
              let req = 0
              try { const pars = JSON.parse(r.Parametros || r.parametros || '{}'); req = Number(pars.question_count || pars.cantidad || 0) } catch {}
              const required = req
              const existentes = preguntasSel.length
              const ok = existentes >= required && required > 0
              if (requeridasSel !== required) setRequeridasSel(required)
              if (readySel !== ok) setReadySel(ok)
              return (
                <div className="rounded-md border px-3 py-2 text-sm mb-4">Progreso: {existentes} / {required}</div>
              )
            })()}
            <div className="space-y-3">
              <div>
                <label className="text-sm">Texto</label>
                <input className="h-10 w-full rounded-md border px-3 text-sm" value={texto} onChange={e => setTexto(e.target.value)} />
              </div>
              {tipoC === 'trivia' && (
                <div>
                  <label className="text-sm">Opciones (; separadas)</label>
                  <input className="h-10 w-full rounded-md border px-3 text-sm" value={opciones} onChange={e => setOpciones(e.target.value)} />
                </div>
              )}
              <div>
                <label className="text-sm">Respuesta correcta</label>
                <input className="h-10 w-full rounded-md border px-3 text-sm" value={correcta} onChange={e => setCorrecta(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Dificultad</label>
                <select className="h-10 w-full rounded-md border px-3 text-sm" value={dificultad} onChange={e => setDificultad(e.target.value)}>
                  <option value="facil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              <button className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm" onClick={async () => {
                try {
                  const creadorId = user?.Id || user?.id
                  const colegioId = user?.ColegioId || user?.colegioId || null
                  const opts = tipoC === 'trivia' ? opciones.split(';').map(s => s.trim()).filter(Boolean) : []
                  if (!texto || !correcta) throw new Error('Completa texto y respuesta')
                  await crearPregunta({ texto, tipo: tipoC, opciones: opts, respuestaCorrecta: correcta, categoria: codigo, dificultad, creadorId, colegioId })
                  setTexto(''); setOpciones(''); setCorrecta('')
                  const lista = await listarPreguntas({ tipo: tipoC, categoria: codigo }); setPreguntasSel(lista); setPreguntas(lista)
                } catch (e) { setError(e.message) }
              }}>Guardar pregunta</button>
            </div>
            <div className="mt-6">
              <div className="text-sm text-slate-600 mb-2">Preguntas agregadas</div>
              <div className="border rounded-md">
                {preguntasSel.map((pp, i) => (
                  <div key={pp.Id || pp.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>{pp.Texto || pp.texto}</div>
                ))}
                {preguntasSel.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">Sin preguntas</div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}