import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearProfesor, getProfesores, actualizarProfesor, eliminarProfesor } from '../../lib/api'

export default function DirectorReglas() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [profesores, setProfesores] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [q, setQ] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editEmail, setEditEmail] = useState('')
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    getProfesores({ colegioId }).then(setProfesores).catch(e => setError(e.message))
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
      await crearProfesor({ colegioId: Number(colegioId), nombre, email })
      setNombre('')
      setEmail('')
      const lista = await getProfesores({ colegioId })
      setProfesores(lista)
      setMsg('Profesor creado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(p) {
    setEditId(p.id)
    setEditNombre(p.nombre || '')
    setEditEmail(p.email || '')
  }

  async function saveEdit() {
    if (!editId) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await actualizarProfesor({ id: editId, nombre: editNombre, email: editEmail })
      setEditId(null)
      const lista = await getProfesores({ colegioId })
      setProfesores(lista)
      setMsg('Profesor actualizado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function cancelEdit() {
    setEditId(null)
    setEditNombre('')
    setEditEmail('')
  }

  async function deleteProfesor(id) {
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await eliminarProfesor({ id })
      const lista = await getProfesores({ colegioId })
      setProfesores(lista)
      setMsg('Profesor eliminado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Profesores</h1>
      <div className="grid md:grid-cols-2 gap-6 place-items-center">
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Alta de Profesor</h2>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="nombreProfesor">Nombre</label>
              <input id="nombreProfesor" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="Nombre y Apellido" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="emailProfesor">Email</label>
              <input id="emailProfesor" type="email" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="correo@colegio.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <div className="text-red-700 text-sm">{error}</div>}
            {msg && <div className="text-green-700 text-sm">{msg}</div>}
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm">{loading ? 'Creando…' : 'Crear'}</button>
          </form>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Listado de Profesores</h2>
          <div className="mb-2">
            <input className="h-9 w-full rounded-md border px-3 text-sm" placeholder="Buscar por nombre o email" value={q} onChange={e=>setQ(e.target.value)} />
          </div>
          <div className="border rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(q ? profesores.filter(p => (p.nombre||'').toLowerCase().includes(q.toLowerCase()) || (p.email||'').toLowerCase().includes(q.toLowerCase())) : profesores).map((p, i) => (
                    <tr key={p.id || i} className={`${i>0 ? 'border-t' : ''} hover:bg-slate-50`}>
                      <td className="px-3 py-2">
                        {editId === p.id ? (
                          <input className="h-8 rounded-md border px-2 text-sm w-full" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                        ) : (
                          p.nombre
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === p.id ? (
                          <input className="h-8 rounded-md border px-2 text-sm w-full" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                        ) : (
                          p.email
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editId === p.id ? (
                          <div className="flex gap-2">
                            <button className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs" onClick={saveEdit} disabled={loading}>Guardar</button>
                            <button className="h-8 px-3 rounded-md border text-xs" onClick={cancelEdit} disabled={loading}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button className="text-blue-600" onClick={() => startEdit(p)}>Editar</button>
                            <button className="text-red-700" onClick={() => { if (window.confirm('¿Eliminar profesor?')) deleteProfesor(p.id) }}>Eliminar</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(q ? profesores.filter(p => (p.nombre||'').toLowerCase().includes(q.toLowerCase()) || (p.email||'').toLowerCase().includes(q.toLowerCase())) : profesores).length === 0 && (
                    <tr>
                      <td className="px-3 py-3 text-slate-500 text-center" colSpan={3}>No hay profesores registrados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}