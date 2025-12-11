import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
  try {
      const res = await login({ email, password })
      if (res?.token) localStorage.setItem('token', res.token)
      if (res?.usuario) localStorage.setItem('usuario', JSON.stringify(res.usuario))
      setToken(res.token)
      setUser(res.usuario)
      // Redirigir según rol (acepta string o número)
      if (res.usuario?.requiereCambioPassword) {
        navigate('/password-change')
        return
      }
      const rawRol = res.usuario?.rol
      const rol = typeof rawRol === 'string'
        ? rawRol.toLowerCase()
        : ['estudiante','profesor','director','admin'][Number(rawRol)] || String(rawRol).toLowerCase()
      if (rol === 'estudiante') navigate('/estudiante/inicio')
      else if (rol === 'profesor') navigate(`/profesor/aula/${res.usuario?.aulaId || 1}`)
      else if (rol === 'director') navigate(`/director/colegio/${res.usuario?.colegioId || 1}`)
      else navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-stretch">
      {/* Columna izquierda (solo en lg) con gradiente y elementos flotantes */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-secondary)] to-[var(--color-accent)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 text-9xl animate-float">🌊</div>
          <div className="absolute bottom-40 right-20 text-8xl animate-float" style={{ animationDelay: '1s' }}>💧</div>
          <div className="absolute top-1/2 left-1/3 text-7xl animate-float" style={{ animationDelay: '2s' }}>🐠</div>
          <div className="absolute bottom-20 left-40 text-6xl animate-float" style={{ animationDelay: '1.5s' }}>🌿</div>
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <h1 className="text-5xl font-bold mb-4 text-center">Bienvenido a AquaPlay</h1>
          <p className="text-xl text-center max-w-md opacity-90">Únete a la misión de conservar el recurso más valioso de nuestro planeta</p>
          <div className="mt-12 flex gap-8">
            <div className="text-center"><div className="text-4xl mb-2">💧</div><p className="text-sm opacity-80">Aprende</p></div>
            <div className="text-center"><div className="text-4xl mb-2">🎮</div><p className="text-sm opacity-80">Juega</p></div>
            <div className="text-center"><div className="text-4xl mb-2">🏆</div><p className="text-sm opacity-80">Gana</p></div>
          </div>
        </div>
      </div>

      {/* Columna derecha con tarjeta de login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-4">
        <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border w-full max-w-md p-8 shadow-lg">
          <div className="flex items-center justify-center mb-2 lg:hidden">
            <div className="h-12 w-12 text-primary">💧</div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-1 text-primary">Iniciar sesión</h2>
          <p className="text-center text-muted-foreground mb-4">Accede a tu panel y continúa tu aventura</p>
          {error && <p className="text-red-600 mb-2 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                     placeholder="tucorreo@colegio.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 pr-10 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-2 my-auto h-7 px-2 rounded-md text-xs bg-muted hover:bg-muted/80"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
                    className="bg-primary text-primary-foreground hover:opacity-90 h-10 rounded-md px-6 w-full mt-2">
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <div className="text-sm mt-2 flex justify-between">
            <a className="text-primary hover:underline" href="/registro">Crear cuenta</a>
            <a className="text-primary hover:underline" href="#" onClick={(e) => { e.preventDefault(); navigate('/password-reset'); }}>¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </div>
    </div>
  )
}