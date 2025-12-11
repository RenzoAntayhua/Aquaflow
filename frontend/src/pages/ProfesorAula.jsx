import { useEffect, useState } from 'react'
import { useParams, Navigate, useNavigate } from 'react-router-dom'
import { getConsumoAgregado, getPlantillasRetos, getRetosAula, getEstudiantesAula, getPerfilEstudiantesAula, getEventosAula } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function ProfesorAula() {
  const { aulaId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [consumo, setConsumo] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [retos, setRetos] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [eventos, setEventos] = useState([])

  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }

  useEffect(() => {
    async function load() {
      try {
        const [consumoData, plantillasData, retosData, estudiantesData, perfilesData, eventosData] = await Promise.all([
          getConsumoAgregado({ aulaId, periodo: 'semana' }).catch(() => null),
          getPlantillasRetos().catch(() => []),
          getRetosAula({ aulaId }).catch(() => []),
          getEstudiantesAula({ aulaId }).catch(() => []),
          getPerfilEstudiantesAula({ aulaId }).catch(() => []),
          getEventosAula({ aulaId, limit: 10 }).catch(() => [])
        ])
        
        setConsumo(consumoData)
        setPlantillas(plantillasData)
        setRetos(retosData)
        setEstudiantes(estudiantesData)
        setPerfiles(perfilesData)
        setEventos(Array.isArray(eventosData) ? eventosData : [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [aulaId])

  // Cálculos derivados
  const retosActivos = retos.filter(r => (r.Estado ?? r.estado) === 0)
  const retosCompletados = retos.filter(r => (r.Estado ?? r.estado) === 2)
  const triviasActivas = retosActivos.filter(r => {
    const p = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
    const codigo = p ? (p.Codigo || p.codigo || '') : ''
    return codigo.includes('trivia') || codigo.includes('verdadero_falso')
  })

  // Top estudiantes por monedas
  const topEstudiantes = [...perfiles]
    .sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
    .slice(0, 5)

  // Nivel promedio del aula
  const nivelPromedio = perfiles.length > 0
    ? perfiles.reduce((acc, p) => acc + (p.monedasTotal || 0), 0) / perfiles.length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del aula */}
      <div className="bg-gradient-to-r from-primary via-primary-light to-blue-400 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-bold">Aula {aulaId}</h1>
                <p className="text-white/80 text-sm">Panel del Profesor</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/profesor/aula/${aulaId}/estudiantes`)}
              className="h-10 px-4 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition-colors flex items-center gap-2"
            >
              👥 Estudiantes
            </button>
            <button
              onClick={() => navigate(`/profesor/aula/${aulaId}/retos`)}
              className="h-10 px-4 rounded-lg bg-white text-primary text-sm font-medium transition-colors flex items-center gap-2 hover:bg-white/90"
            >
              🎯 Gestionar Retos
            </button>
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <div className="text-3xl font-bold text-title">{estudiantes.length}</div>
              <div className="text-sm text-muted-foreground">Estudiantes</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-eco/20 flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <div className="text-3xl font-bold text-eco">{retosActivos.length}</div>
              <div className="text-sm text-muted-foreground">Retos activos</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600">{retosCompletados.length}</div>
              <div className="text-sm text-muted-foreground">Completados</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
              ❓
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{triviasActivas.length}</div>
              <div className="text-sm text-muted-foreground">Trivias activas</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Consumo de agua */}
        <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-info-card/50">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">💧</span>
              Consumo de Agua (Semanal)
            </h2>
          </div>
          
          {consumo ? (
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-soft-divider rounded-xl">
                  <div className="text-2xl font-bold text-primary">{Math.round(consumo.totalLitros)}L</div>
                  <div className="text-xs text-muted-foreground">Total consumido</div>
                </div>
                <div className="text-center p-4 bg-soft-divider rounded-xl">
                  <div className="text-2xl font-bold text-title">{consumo.lineaBase}L</div>
                  <div className="text-xs text-muted-foreground">Línea base</div>
                </div>
                <div className="text-center p-4 bg-eco/10 rounded-xl">
                  <div className={`text-2xl font-bold ${consumo.reduccionPct >= 0 ? 'text-eco' : 'text-coral'}`}>
                    {consumo.reduccionPct >= 0 ? '↓' : '↑'} {Math.abs(consumo.reduccionPct)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Variación</div>
                </div>
              </div>

              {/* Gráfico simple de barras */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground mb-3">Últimos 7 días</div>
                <div className="flex items-end justify-between gap-2 h-32">
                  {(consumo.serie || []).slice(-7).map((d, i) => {
                    const maxLitros = Math.max(...(consumo.serie || []).map(x => x.litros || 0), 1)
                    const height = ((d.litros || 0) / maxLitros) * 100
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full bg-primary/80 rounded-t-md hover:bg-primary transition-colors"
                          style={{ height: `${height}%`, minHeight: '4px' }}
                          title={`${d.litros}L`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {new Date(d.fecha).toLocaleDateString('es', { weekday: 'short' }).slice(0, 2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-muted-foreground">Sin datos de consumo disponibles</p>
            </div>
          )}
        </div>

        {/* Top estudiantes */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-gold/10">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">🏅</span>
              Top Estudiantes
            </h2>
          </div>
          
          <div className="divide-y">
            {topEstudiantes.length > 0 ? (
              topEstudiantes.map((est, i) => (
                <div key={est.usuarioId || i} className="p-4 flex items-center gap-3 hover:bg-soft-divider/50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-gold text-amber-900' :
                    i === 1 ? 'bg-gray-200 text-gray-700' :
                    i === 2 ? 'bg-amber-600/20 text-amber-700' :
                    'bg-soft-divider text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-title text-sm truncate">{est.nombre}</div>
                    <div className="text-xs text-muted-foreground">{est.nivelActual || 'Explorador'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">{est.monedasTotal || 0}</div>
                    <div className="text-xs text-muted-foreground">monedas</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-muted-foreground text-sm">Sin estudiantes aún</p>
              </div>
            )}
          </div>
          
          {perfiles.length > 5 && (
            <div className="p-3 border-t">
              <button
                onClick={() => navigate(`/profesor/aula/${aulaId}/estudiantes`)}
                className="w-full text-sm text-primary hover:underline"
              >
                Ver todos →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Retos activos */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">🎯</span>
              Retos Activos
            </h2>
            <button
              onClick={() => navigate(`/profesor/aula/${aulaId}/retos`)}
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </button>
          </div>
          
          <div className="divide-y">
            {retosActivos.length > 0 ? (
              retosActivos.slice(0, 4).map((r, i) => {
                const p = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
                const nombre = p?.Nombre || p?.nombre || `Reto #${r.Id || r.id}`
                const codigo = p?.Codigo || p?.codigo || ''
                let icon = '🎯'
                if (codigo.includes('trivia')) icon = '❓'
                if (codigo.includes('verdadero_falso')) icon = '✅'
                
                return (
                  <div key={r.Id || r.id} className="p-4 flex items-center gap-3 hover:bg-soft-divider/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-eco/20 flex items-center justify-center text-xl">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-title text-sm truncate">{nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {String(r.FechaInicio || r.fechaInicio).slice(5, 10)} → {String(r.FechaFin || r.fechaFin).slice(5, 10)}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-eco/20 text-green-700">
                      Activo
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">🎮</div>
                <p className="text-muted-foreground text-sm mb-4">No hay retos activos</p>
                <button
                  onClick={() => navigate(`/profesor/aula/${aulaId}/retos`)}
                  className="text-sm bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-light transition-colors"
                >
                  Crear reto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">📋</span>
              Actividad Reciente
            </h2>
          </div>
          
          <div className="divide-y max-h-[300px] overflow-y-auto">
            {eventos.length > 0 ? (
              eventos.map((ev, i) => {
                const tipo = ev.tipo || ev.Tipo || ''
                let icon = '📌'
                let label = tipo
                if (tipo.includes('reto_completado')) { icon = '🏆'; label = 'Reto completado' }
                if (tipo.includes('trivia_completada')) { icon = '✅'; label = 'Trivia completada' }
                if (tipo.includes('insignia')) { icon = '🎖️'; label = 'Insignia otorgada' }
                
                return (
                  <div key={ev.Id || ev.id || i} className="p-4 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-soft-divider flex items-center justify-center text-lg">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-title">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(ev.CreadoEn || ev.creadoEn).toLocaleDateString('es', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-muted-foreground text-sm">Sin actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nivel promedio del aula */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">📈 Progreso del Aula</h3>
            <p className="text-white/80 text-sm">
              Promedio de monedas por estudiante: <span className="font-bold">{Math.round(nivelPromedio)}</span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold">{perfiles.filter(p => (p.monedasTotal || 0) >= 200).length}</div>
              <div className="text-xs text-white/80">Aprendices+</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{perfiles.filter(p => (p.monedasTotal || 0) >= 500).length}</div>
              <div className="text-xs text-white/80">Guardianes+</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">{perfiles.filter(p => (p.monedasTotal || 0) >= 1000).length}</div>
              <div className="text-xs text-white/80">Héroes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
