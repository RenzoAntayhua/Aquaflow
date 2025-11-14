import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearEspacio, getEspacios } from '../../lib/api'

export default function DirectorSensores() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [espacios, setEspacios] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [etiqueta, setEtiqueta] = useState('')
  const [tipo, setTipo] = useState('bano')
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    getEspacios({ colegioId }).then(setEspacios).catch(e => setError(e.message))
  }, [colegioId])

  async function submit() {
    setLoading(true)
    setError('')
    try {
      // TipoEspacio es enum en backend, enviamos como string y lo mapea por número/valor
      const tipoEnum = { bano: 0, lavadero: 1, patio: 2, otro: 3 }[tipo]
      await crearEspacio({ colegioId: Number(colegioId), etiqueta, tipo: tipoEnum })
      setEtiqueta('')
      const lista = await getEspacios({ colegioId })
      setEspacios(lista)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Espacios</h1>
      <div className="grid md:grid-cols-2 gap-6 place-items-center">
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Alta de Espacio</h2>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit() }}>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="etiquetaEspacio">Etiqueta</label>
              <input id="etiquetaEspacio" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="Ej. Baños 2° piso" value={etiqueta} onChange={e => setEtiqueta(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="tipoEspacio">Tipo</label>
              <select id="tipoEspacio" className="h-10 w-full rounded-md border px-3 text-sm" value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="bano">Baño</option>
                <option value="lavadero">Lavadero</option>
                <option value="patio">Patio</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            {error && <div className="text-red-700 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm">{loading ? 'Creando…' : 'Crear'}</button>
          </form>
        </div>
        <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl">
          <h2 className="text-lg font-semibold mb-3">Listado de Espacios</h2>
          <div className="border rounded-md">
            <div className="grid grid-cols-3 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Etiqueta</div>
              <div>Tipo</div>
              <div>Acciones</div>
            </div>
            {espacios.map((e, i) => (
              <div key={e.Id || e.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-3 items-center">
                  <div>{e.Etiqueta || e.etiqueta}</div>
                  <div>{typeof e.Tipo === 'number' ? ['Baño','Lavadero','Patio','Otro'][e.Tipo] : (e.Tipo || e.tipo)}</div>
                  <div className="text-slate-500">Editar • Eliminar</div>
                </div>
              </div>
            ))}
            {espacios.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">No hay espacios registrados</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}