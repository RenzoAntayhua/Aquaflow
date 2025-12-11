import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { registrar, getCiudades, getColegios } from '../lib/api'

export default function Register() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol] = useState('estudiante')
  const [ciudad, setCiudad] = useState('')
  const [colegioId, setColegioId] = useState('')
  const [buscarColegio, setBuscarColegio] = useState('')
  const [ciudades, setCiudades] = useState([])
  const [colegios, setColegios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOk('')
    try {
      if (!ciudad) throw new Error('Selecciona tu ciudad')
      if (!colegioId) throw new Error('Selecciona tu colegio')
      await registrar({ nombre, email, password, rol, colegioId: Number(colegioId) })
      setOk('Cuenta creada. Ahora puedes iniciar sesión.')
      setTimeout(() => navigate('/login'), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [ciuds, cols] = await Promise.all([getCiudades().catch(() => []), getColegios().catch(() => [])])
        if (!alive) return
        setCiudades(ciuds)
        setColegios(cols)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('No se pudieron cargar ciudades/colegios', e)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const colegiosFiltrados = useMemo(() => {
    if (!ciudad) return []
    const porCiudad = colegios.filter(c => (c.Ciudad || c.ciudad || '').toLowerCase() === ciudad.toLowerCase())
    if (!buscarColegio) return porCiudad
    const q = buscarColegio.toLowerCase()
    return porCiudad.filter(c => (c.Nombre || c.nombre || '').toLowerCase().includes(q))
  }, [ciudad, colegios, buscarColegio])

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
          <h1 className="text-5xl font-bold mb-4 text-center">Únete a AquaPlay</h1>
          <p className="text-xl text-center max-w-md opacity-90">Comienza tu aventura como Héroe del Agua</p>
          <div className="mt-12 flex gap-8">
            <div className="text-center"><div className="text-4xl mb-2">💧</div><p className="text-sm opacity-80">Aprende</p></div>
            <div className="text-center"><div className="text-4xl mb-2">🎮</div><p className="text-sm opacity-80">Juega</p></div>
            <div className="text-center"><div className="text-4xl mb-2">🏆</div><p className="text-sm opacity-80">Gana</p></div>
          </div>
        </div>
      </div>

      {/* Columna derecha con tarjeta de registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background p-4">
        <div className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border w-full max-w-md p-8 shadow-lg">
          <div className="flex items-center justify-center mb-2 lg:hidden">
            <div className="h-12 w-12 text-primary">💧</div>
          </div>
          <h2 className="text-3xl font-bold text-center mb-1 text-primary">Registro</h2>
          <p className="text-center text-muted-foreground mb-4">Comienza tu aventura como Héroe del Agua</p>
          {error && <p className="text-red-600 mb-2 text-center">{error}</p>}
          {ok && <p className="text-green-600 mb-2 text-center">{ok}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="nombre">Nombre</label>
              <input id="nombre" type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                     placeholder="Tu nombre" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                     placeholder="tucorreo@colegio.com" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                     className="h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                     placeholder="••••••••" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ciudad">Ciudad</label>
              <select id="ciudad" value={ciudad} onChange={e => { setCiudad(e.target.value); setColegioId('') }}
                      className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" required>
                <option value="">Selecciona una ciudad</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="colegio">Colegio</label>
              {ciudad && (
                <input
                  type="text"
                  value={buscarColegio}
                  onChange={e => { setBuscarColegio(e.target.value); setColegioId('') }}
                  placeholder="Buscar colegio por nombre"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-blue-400"
                />
              )}
              <select id="colegio" value={colegioId} onChange={e => setColegioId(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm" required disabled={!ciudad}>
                <option value="">{ciudad ? 'Selecciona tu colegio' : 'Primero elige una ciudad'}</option>
                {colegiosFiltrados.map((col) => (
                  <option key={col.Id || col.id} value={col.Id || col.id}>{col.Nombre || col.nombre}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading}
                    className="bg-primary text-primary-foreground hover:opacity-90 h-10 rounded-md px-6 w-full mt-2">
              {loading ? 'Creando…' : 'Registrarse'}
            </button>
          </form>
          <div className="text-sm mt-2 text-center">
            <a className="text-primary hover:underline" href="/login">Ya tengo cuenta</a>
          </div>
        </div>
      </div>
    </div>
  )
}