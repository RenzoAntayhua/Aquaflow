import { useEffect, useState } from 'react'
import { useParams, Navigate, useLocation } from 'react-router-dom'
import KPI from '../components/KPI'
import { getConsumoAgregado, getPlantillasRetos, crearRetoAula, getRetosAula, crearPregunta, listarPreguntas, getEstudiantesAula } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function ProfesorAula() {
  const { aulaId } = useParams()
  const [consumo, setConsumo] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  const [estudiantesCount, setEstudiantesCount] = useState(0)
  
  const [pSel, setPSel] = useState('')
  const [inicio, setInicio] = useState('')
  const [fin, setFin] = useState('')
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const tab = params.get('tab') || 'aula'

  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState('trivia')
  const [opciones, setOpciones] = useState('')
  const [correcta, setCorrecta] = useState('')
  const [categoria, setCategoria] = useState('')
  const [dificultad, setDificultad] = useState('facil')
  const [preguntas, setPreguntas] = useState([])
  const [bancoId, setBancoId] = useState('')
  const toast = useToast()

  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }

  useEffect(() => {
    getConsumoAgregado({ aulaId, periodo: 'semana' }).then(setConsumo).catch(setError)
    getPlantillasRetos().then(setPlantillas).catch(setError)
    getRetosAula({ aulaId }).then(setRetos).catch(() => {})
    getEstudiantesAula({ aulaId }).then(l => setEstudiantesCount(Array.isArray(l) ? l.length : 0)).catch(() => {})
    
  }, [aulaId])

  useEffect(() => {
    if (tab === 'trivia') {
      listarPreguntas({ tipo, categoria, dificultad, activa: true }).then(setPreguntas).catch(() => {})
    }
  }, [tab])

  async function crearReto() {
    try {
      if (!pSel || !inicio || !fin) throw new Error('Completa plantilla y fechas')
      await crearRetoAula({ aulaId, plantillaId: Number(pSel), fechaInicio: inicio, fechaFin: fin })
      setPSel('')
      setInicio('')
      setFin('')
      const lista = await getRetosAula({ aulaId })
      setRetos(lista)
      toast?.show('Reto creado', 'success')
    } catch (e) {
      setError(e.message)
      toast?.show(e.message, 'error')
    }
  }

  async function guardarPregunta() {
    try {
      const creadorId = user?.Id || user?.id
      const colegioId = user?.ColegioId || user?.colegioId || null
      const opts = tipo === 'trivia' ? opciones.split(';').map(s => s.trim()).filter(Boolean) : []
      if (!texto || !tipo || !correcta) throw new Error('Completa texto, tipo y respuesta')
      await crearPregunta({ texto, tipo, opciones: opts, respuestaCorrecta: correcta, categoria, dificultad, creadorId, colegioId })
      setTexto('')
      setOpciones('')
      setCorrecta('')
      listarPreguntas({ tipo, categoria, dificultad, activa: true }).then(setPreguntas).catch(() => {})
      toast?.show('Pregunta guardada', 'success')
    } catch (e) {
      setError(e.message)
      toast?.show(e.message, 'error')
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Panel del Profesor (Aula {aulaId})</h1>
      {error && <div className="text-red-600">{String(error)}</div>}
      {tab === 'aula' && consumo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 place-items-center">
          <div className="w-full max-w-sm"><KPI title="Litros (semana)" value={Math.round(consumo.totalLitros)} /></div>
          <div className="w-full max-w-sm"><KPI title="Línea base" value={consumo.lineaBase} /></div>
          <div className="w-full max-w-sm"><KPI title="Reducción" value={`${consumo.reduccionPct}%`} /></div>
        </div>
      )}
      {tab === 'aula' && (() => {
        const activos = retos.filter(r => (r.Estado === 0 || r.estado === 0))
        const triviasActivas = activos.filter(r => {
          const p = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
          const codigo = p ? (p.Codigo || p.codigo || '') : ''
          return String(codigo).includes('trivia') || String(codigo).includes('verdadero_falso')
        }).length
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 place-items-center">
            <div className="w-full max-w-sm"><KPI title="Estudiantes" value={estudiantesCount} /></div>
            <div className="w-full max-w-sm"><KPI title="Retos activos" value={activos.length} /></div>
            <div className="w-full max-w-sm"><KPI title="Retos completados" value={retos.filter(r => (r.Estado === 2 || r.estado === 2)).length} /></div>
            <div className="w-full max-w-sm"><KPI title="Trivias activas" value={triviasActivas} /></div>
          </div>
        )
      })()}
      {tab === 'retos' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border p-6 shadow">
            <div className="text-sm text-slate-600 mb-3">Crear reto desde plantilla</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Plantilla</label>
                <select className="h-10 w-full rounded-md border px-3 text-sm" value={pSel} onChange={e => setPSel(e.target.value)}>
                  <option value="">Selecciona</option>
                  {plantillas.map(p => (
                    <option key={p.Id || p.id} value={p.Id || p.id}>{p.Nombre || p.nombre}</option>
                  ))}
                </select>
              </div>
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
              <button className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm" onClick={crearReto}>Crear</button>
              {error && <div className="text-red-700 text-sm">{error}</div>}
            </div>
          </div>
          <div className="bg-card rounded-xl border p-6 shadow">
            <div className="text-sm text-slate-600 mb-3">Retos del aula</div>
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
                    <div>{r.Estado === 0 ? 'Activo' : r.Estado === 1 ? 'Finalizado' : 'Pendiente'}</div>
                  </div>
                </div>
              ))}
              {retos.length === 0 && (
                <div className="px-3 py-2 text-sm text-slate-500">No hay retos creados</div>
              )}
            </div>
          </div>
        </div>
      )}
      {tab === 'trivia' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border p-6 shadow">
            <div className="text-sm text-slate-600 mb-3">Crear pregunta</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm">Texto</label>
                <input className="h-10 w-full rounded-md border px-3 text-sm" value={texto} onChange={e => setTexto(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Tipo</label>
                  <select className="h-10 w-full rounded-md border px-3 text-sm" value={tipo} onChange={e => setTipo(e.target.value)}>
                    <option value="trivia">Trivia</option>
                    <option value="verdadero_falso">Verdadero/Falso</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Dificultad</label>
                  <select className="h-10 w-full rounded-md border px-3 text-sm" value={dificultad} onChange={e => setDificultad(e.target.value)}>
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
              {tipo === 'trivia' && (
                <div>
                  <label className="text-sm">Opciones (; separadas)</label>
                  <input className="h-10 w-full rounded-md border px-3 text-sm" value={opciones} onChange={e => setOpciones(e.target.value)} />
                </div>
              )}
              <div>
                <label className="text-sm">Respuesta correcta</label>
                <input className="h-10 w-full rounded-md border px-3 text-sm" value={correcta} onChange={e => setCorrecta(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm">Categoría</label>
                  <input className="h-10 w-full rounded-md border px-3 text-sm" value={categoria} onChange={e => setCategoria(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm">Banco (opcional)</label>
                  <input className="h-10 w-full rounded-md border px-3 text-sm" value={bancoId} onChange={e => setBancoId(e.target.value)} />
                </div>
              </div>
              <button className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm" onClick={guardarPregunta}>Guardar pregunta</button>
            </div>
            <div className="mt-6">
              <div className="text-sm text-slate-600 mb-2">Preguntas</div>
              <div className="border rounded-md">
                {preguntas.map((p, i) => (
                  <div key={p.Id || p.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>{p.Texto || p.texto}</div>
                ))}
                {preguntas.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">Sin preguntas</div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      )}
      {tab === 'insignias' && (
        <div className="bg-card rounded-xl border p-6 shadow">
          <div className="text-sm text-slate-600">Validación de insignias (placeholder)</div>
          <p className="text-sm">Revisa solicitudes de insignias y confirma evidencia.</p>
        </div>
      )}
      {tab === 'reportes' && (
        <div className="bg-card rounded-xl border p-6 shadow">
          <div className="text-sm text-slate-600">Reportes del aula (placeholder)</div>
          <p className="text-sm">Descarga y visualiza reportes semanales y mensuales.</p>
        </div>
      )}
    </div>
  )
}