import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { solicitarIngresoAula } from '../../lib/api'

export default function EstudianteUnirme() {
  const { user } = useAuth()
  const [codigo, setCodigo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  async function enviar() {
    setLoading(true)
    setError('')
    setMensaje('')
    try {
      await solicitarIngresoAula({ codigo, usuarioId: user?.Id || user?.id })
      setMensaje('Solicitud enviada. Espera la aprobación del profesor.')
      setCodigo('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Unirme a un Aula</h1>
      <div className="bg-card rounded-xl border p-6 shadow w-full max-w-xl mx-auto">
        <form className="space-y-3" onSubmit={e => { e.preventDefault(); enviar() }}>
          <div>
            <label className="text-sm" htmlFor="codigo">Código de Aula</label>
            <input id="codigo" className="h-10 w-full rounded-md border px-3 text-sm" placeholder="AF-<colegioId>-<aulaId>" value={codigo} onChange={e => setCodigo(e.target.value)} />
          </div>
          {mensaje && <div className="text-green-700 text-sm">{mensaje}</div>}
          {error && <div className="text-red-700 text-sm">{error}</div>}
          <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 text-sm">{loading ? 'Enviando…' : 'Enviar solicitud'}</button>
        </form>
      </div>
    </div>
  )
}