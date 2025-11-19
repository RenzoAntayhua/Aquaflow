import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getConsumoAgregado, getPerfilEstudiantesAula } from '../../lib/api'

export default function EstudianteInicio() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [perfil, setPerfil] = useState([])
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    const aulaId = user?.aulaId || user?.AulaId || 1
    getConsumoAgregado({ aulaId, periodo: 'semana' })
      .then(setStats)
      .catch(() => setError(''))
    getPerfilEstudiantesAula({ aulaId })
      .then(setPerfil)
      .catch(() => {})
  }, [user])

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">¡Hola, {user?.Nombre || user?.nombre || 'Estudiante'}! 👋</h1>
        <p className="text-slate-600">Bienvenido a tu centro de comando del agua</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="text-xl">🎮</span>
              <span className="font-semibold text-title">Desafíos Interactivos</span>
            </div>
            <span className="text-pink-600">🎯</span>
          </div>
          <p className="text-sm text-muted-foreground">Aprende jugando con nuestros juegos educativos</p>
          <div className="flex gap-2 text-2xl my-4">💧 🌿 🌸</div>
          <button className="mt-auto bg-primary text-primary-foreground hover:bg-primary-light h-11 rounded-md px-4 text-sm w-full" onClick={() => navigate('/estudiante/juegos')}>Jugar ahora</button>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="text-xl">👤</span>
              <span className="font-semibold text-title">Perfil de Héroe</span>
            </div>
            <span className="text-green-600">🌍</span>
          </div>
          <div className="text-sm grid gap-2">
            <div className="flex items-center justify-between">
              <span>Litros ahorrados</span>
              <span className="font-semibold">{stats ? Math.round(stats.totalLitros) + 'L' : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Nivel actual</span>
              <span className="font-semibold">Guardían del Agua (Placeholder)</span>
            </div>
          </div>
          <button className="mt-auto bg-primary-light text-primary-foreground h-11 rounded-md px-4 text-sm w-full" onClick={() => navigate('/estudiante/perfil')}>Ver perfil</button>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-xl">📈</span>
              <span className="font-semibold text-title">Datos de la región</span>
            </div>
            <span className="text-green-600">🌍</span>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="rounded-md bg-info-card px-3 py-2">Consumo promedio (Placeholder) <span className="font-semibold">180L por persona/día</span></div>
            <div className="rounded-md bg-info-card px-3 py-2">Precipitación anual (Placeholder) <span className="font-semibold">&lt; 50mm (muy árido)</span></div>
          </div>
          <div className="mt-auto" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="text-xl">🪼</span>
              <span className="font-semibold text-title">Conoce a Tito</span>
            </div>
            <span className="text-blue-700">🌎</span>
          </div>
          <div className="h-40 rounded-md bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center text-4xl">🐠</div>
          <p className="text-sm text-slate-600 mt-3">Protejo este arrecife gracias a tus decisiones inteligentes (Placeholder).</p>
          <p className="text-sm text-slate-600">Tienes <span className="font-semibold">18 💎</span> para decorar la pecera de Tito (Placeholder).</p>
          <button className="mt-auto bg-primary-light text-primary-foreground h-11 rounded-md px-4 text-sm w-full">Abrir tienda</button>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-xl">💡</span>
              <span className="font-semibold text-title">¿Sabías que…?</span>
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="rounded-md bg-info-card px-3 py-2">Escasez Hídrica (Placeholder): Tacna es una región con muy baja precipitación anual.</div>
            <div className="rounded-md bg-info-card px-3 py-2">Consumo Promedio (Placeholder): Aproximadamente 180 litros de agua por persona al día.</div>
            <div className="rounded-md bg-info-card px-3 py-2">Fuentes de Agua (Placeholder): El 70% proviene de fuentes subterráneas en riesgo.</div>
          </div>
          <div className="mt-auto" />
        </div>

        <div className="bg-card rounded-xl border p-6 shadow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-xl">📶</span>
              <span className="font-semibold text-title">Sensores en tiempo real</span>
            </div>
            <button className="text-slate-600 text-xs">↻</button>
          </div>
          <div className="rounded-md bg-info-card h-24 flex items-center justify-center text-slate-600 text-sm">Promedio registrado (Placeholder)</div>
          <div className="text-error text-sm mt-2">Failed to fetch (Placeholder)</div>
          <div className="mt-auto" />
        </div>
      </div>
    </div>
  )
}
      <div className="bg-card rounded-xl border p-6 shadow">
        <h2 className="text-lg font-semibold mb-3">Clasificación del Aula</h2>
        <div className="border rounded-md">
          {perfil.slice().sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0)).map((p, i) => (
            <div key={p.usuarioId || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
              <div className="grid grid-cols-4 items-center gap-2">
                <div className="col-span-2">{String(p.nombre || '')}</div>
                <div className="text-right">{p.monedasTotal || 0}</div>
                <div className="text-xs text-slate-600">{p.nivelActual || 'Explorador'}</div>
              </div>
              <div className="mt-1 h-2 bg-slate-200 rounded">
                <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, p.progresoMonedas || 0)}%` }} />
              </div>
            </div>
          ))}
          {perfil.length === 0 && (
            <div className="px-3 py-2 text-slate-500">Sin datos de clasificación</div>
          )}
        </div>
      </div>
