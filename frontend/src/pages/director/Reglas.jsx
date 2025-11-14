import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearProfesor, getProfesores } from '../../lib/api'

export default function DirectorReglas() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [profesores, setProfesores] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    getProfesores({ colegioId }).then(setProfesores).catch(e => setError(e.message))
  }, [colegioId])

  async function submit() {
    setLoading(true)
    setError('')
    try {
      await crearProfesor({ colegioId: Number(colegioId), nombre, email })
      setNombre('')
      setEmail('')
      const lista = await getProfesores({ colegioId })
      setProfesores(lista)
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
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm">{loading ? 'Creando…' : 'Crear'}</button>
          </form>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Listado de Profesores</h2>
          <div className="border rounded-md">
            <div className="grid grid-cols-3 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Nombre</div>
              <div>Email</div>
              <div>Acciones</div>
            </div>
            {profesores.map((p, i) => (
              <div key={p.Id || p.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-3 items-center">
                  <div>{p.Nombre || p.nombre}</div>
                  <div>{p.Email || p.email}</div>
                  <div className="text-slate-500">Editar • Eliminar</div>
                </div>
              </div>
            ))}
            {profesores.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay profesores registrados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}