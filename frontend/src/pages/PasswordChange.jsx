import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cambiarPassword } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function PasswordChange() {
  const { token, user, setUser } = useAuth()
  const navigate = useNavigate()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setOk('')
    if (!actual || !nueva || !confirmar) { setError('Completa todos los campos'); return }
    if (nueva.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres'); return }
    if (nueva !== confirmar) { setError('La confirmación no coincide'); return }
    setLoading(true)
    try {
      await cambiarPassword({ actual, nueva }, token)
      setOk('Contraseña actualizada')
      // Marcar que ya no requiere cambio
      if (user) setUser({ ...user, requiereCambioPassword: false, Estado: 'activo' })
      // Redirigir según rol
      const rawRol = user?.rol
      const rol = typeof rawRol === 'string'
        ? rawRol.toLowerCase()
        : ['estudiante','profesor','director','admin'][Number(rawRol)] || String(rawRol).toLowerCase()
      if (rol === 'estudiante') navigate('/estudiante')
      else if (rol === 'profesor') navigate('/profesor/aula/1')
      else if (rol === 'director') navigate('/director/colegio/1')
      else navigate('/admin')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-xl border w-full max-w-md p-6 shadow">
        <h2 className="text-xl font-semibold text-primary text-center">Cambiar contraseña</h2>
        <p className="text-sm text-muted-foreground text-center">Por seguridad, actualiza tu contraseña antes de continuar.</p>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        {ok && <div className="text-green-600 text-sm text-center">{ok}</div>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm" htmlFor="actual">Contraseña actual</label>
            <input id="actual" type="password" className="h-10 w-full rounded-md border px-3 text-sm" value={actual} onChange={e=>setActual(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="nueva">Nueva contraseña</label>
            <input id="nueva" type="password" className="h-10 w-full rounded-md border px-3 text-sm" value={nueva} onChange={e=>setNueva(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="confirmar">Confirmar nueva contraseña</label>
            <input id="confirmar" type="password" className="h-10 w-full rounded-md border px-3 text-sm" value={confirmar} onChange={e=>setConfirmar(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="bg-primary text-primary-foreground h-10 rounded-md px-4 w-full">
            {loading ? 'Guardando…' : 'Actualizar'}
          </button>
        </form>
      </div>
    </div>
  )
}