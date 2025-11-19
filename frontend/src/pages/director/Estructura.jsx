import { Navigate, useParams } from 'react-router-dom'

import KPI from '../../components/KPI'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearAula, getAulas, getProfesores, getEspacios, actualizarAula, eliminarAula } from '../../lib/api'

export default function DirectorEstructura() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [aulas, setAulas] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [countAulas, setCountAulas] = useState(0)
  const [countProfesores, setCountProfesores] = useState(0)
  const [countEspacios, setCountEspacios] = useState(0)
  const [profesores, setProfesores] = useState([])
  const [profesorId, setProfesorId] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editGrado, setEditGrado] = useState('')
  const [editProfesorId, setEditProfesorId] = useState('')
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    getAulas({ colegioId }).then(list => { setAulas(list); setCountAulas(list.length) }).catch(e => setError(e.message))
    getProfesores({ colegioId }).then(list => { setProfesores(list); setCountProfesores(list.length) }).catch(() => {})
    getEspacios({ colegioId }).then(list => setCountEspacios(list.length)).catch(() => {})
  }, [colegioId])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  async function submit() {
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await crearAula({ colegioId: Number(colegioId), nombre, grado, profesorId: profesorId ? Number(profesorId) : null })
      setProfesorId('')
      setNombre('')
      setGrado('')
      const lista = await getAulas({ colegioId })
      setAulas(lista)
      setCountAulas(lista.length)
      setMsg('Aula creada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(a) {
    setEditId(a.id)
    setEditNombre(a.nombre || '')
    setEditGrado(a.grado || '')
    setEditProfesorId(a.profesorId || '')
  }

  async function saveEdit() {
    if (!editId) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await actualizarAula({ id: editId, nombre: editNombre, grado: editGrado, profesorId: editProfesorId ? Number(editProfesorId) : null })
      setEditId(null)
      const lista = await getAulas({ colegioId })
      setAulas(lista)
      setCountAulas(lista.length)
      setMsg('Aula actualizada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function cancelEdit() {
    setEditId(null)
    setEditNombre('')
    setEditGrado('')
    setEditProfesorId('')
  }

  async function deleteAula(id) {
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await eliminarAula({ id })
      const lista = await getAulas({ colegioId })
      setAulas(lista)
      setCountAulas(lista.length)
      setMsg('Aula eliminada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Aulas</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 place-items-center">
        <div className="w-full max-w-sm"><KPI title="Aulas" value={countAulas} /></div>
        <div className="w-full max-w-sm"><KPI title="Profesores" value={countProfesores} /></div>
        <div className="w-full max-w-sm"><KPI title="Espacios" value={countEspacios} /></div>
      </div>
      <div className="grid md:grid-cols-2 gap-6 place-items-center">
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Alta de Aula</h2>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="nombreAula">Nombre</label>
              <input id="nombreAula" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="Ej. 2°A" value={nombre} onChange={e=>setNombre(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="grado">Grado</label>
              <input id="grado" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="Ej. 2°" value={grado} onChange={e=>setGrado(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="profesor">Profesor</label>
              <select id="profesor" className="h-10 w-full rounded-md border px-3 text-sm" value={profesorId} onChange={e=>setProfesorId(e.target.value)}>
                <option value="">--</option>
                {profesores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            {error && <div className="text-red-700 text-sm">{error}</div>}
            {msg && <div className="text-green-700 text-sm">{msg}</div>}
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm">{loading ? 'Creando…' : 'Crear'}</button>
          </form>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Listado de Aulas</h2>
          <div className="border rounded-md">
            <div className="grid grid-cols-4 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Nombre</div>
              <div>Grado</div>
              <div>Profesor</div>
              <div>Acciones</div>
            </div>
            {aulas.map((a, i) => (
              <div key={a.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                {editId === a.id ? (
                  <div className="grid grid-cols-4 items-center gap-2">
                    <input className="h-8 rounded-md border px-2 text-sm" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                    <input className="h-8 rounded-md border px-2 text-sm" value={editGrado} onChange={e => setEditGrado(e.target.value)} />
                    <select className="h-8 rounded-md border px-2 text-sm" value={editProfesorId} onChange={e => setEditProfesorId(e.target.value)}>
                      <option value="">--</option>
                      {profesores.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button className="px-3 h-8 rounded-md bg-primary text-primary-foreground" onClick={saveEdit} disabled={loading}>Guardar</button>
                      <button className="px-3 h-8 rounded-md border" onClick={cancelEdit} disabled={loading}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 items-center">
                    <div>{a.nombre}</div>
                    <div>{a.grado}</div>
                    <div>{(() => { const pr = profesores.find(p => p.id === a.profesorId); return pr ? pr.nombre : '--' })()}</div>
                    <div className="flex gap-3">
                      <button className="text-blue-600" onClick={() => startEdit(a)}>Editar</button>
                      <button className="text-red-700" onClick={() => { if (window.confirm('¿Eliminar aula?')) deleteAula(a.id) }}>Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {aulas.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay aulas registradas</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}