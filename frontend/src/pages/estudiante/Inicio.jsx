import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPerfilUsuario, getPerfilEstudiantesAula, getMisRetos } from '../../lib/api'

export default function EstudianteInicio() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState(null)
  const [ranking, setRanking] = useState([])
  const [retosActivos, setRetosActivos] = useState(0)
  
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const usuarioId = user?.Id || user?.id
        const aulaId = user?.aulaId || user?.AulaId || 1
        
        const [perfilData, rankingData, retosData] = await Promise.all([
          usuarioId ? getPerfilUsuario({ usuarioId }).catch(() => null) : null,
          getPerfilEstudiantesAula({ aulaId }).catch(() => []),
          getMisRetos().catch(() => ({ retos: [] }))
        ])
        
        setPerfil(perfilData)
        setRanking(rankingData || [])
        setRetosActivos(retosData?.retos?.length || 0)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  // Calcular posición en ranking
  const miPosicion = ranking.length > 0
    ? ranking.sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
        .findIndex(p => p.usuarioId === (user?.Id || user?.id)) + 1
    : 0

  const topRanking = ranking
    .slice()
    .sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
    .slice(0, 5)

  // Datos del usuario
  const nombre = user?.Nombre || user?.nombre || 'Estudiante'
  const monedas = perfil?.monedas || 0
  const nivel = perfil?.nivelActual || 'Explorador'
  const litrosAhorrados = perfil?.litrosAhorrados || 0
  const juegosCompletados = perfil?.juegosCompletados || 0
  const progresoNivel = perfil?.progresoMonedas || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                ¡Hola, {nombre}! 👋
              </h1>
              <p className="text-white/80">
                Bienvenido a tu centro de comando del agua
              </p>
              
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="text-2xl font-bold">{monedas}</span>
                  <span className="text-sm ml-1">🪙</span>
                </div>
                <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                  <span className="font-medium">{nivel}</span>
                </div>
                {miPosicion > 0 && (
                  <div className="bg-gold/30 backdrop-blur px-4 py-2 rounded-lg">
                    <span className="font-bold">#{miPosicion}</span>
                    <span className="text-sm ml-1">en el aula</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/estudiante/juegos')}
                className="h-12 px-6 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors flex items-center gap-2"
              >
                <span className="text-xl">🎮</span>
                Jugar ahora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl">
              🪙
            </div>
            <div>
              <div className="text-2xl font-bold text-title">{monedas}</div>
              <div className="text-sm text-muted-foreground">Monedas</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-eco/20 flex items-center justify-center text-2xl">
              💧
            </div>
            <div>
              <div className="text-2xl font-bold text-eco">{Math.round(litrosAhorrados)}L</div>
              <div className="text-sm text-muted-foreground">Ahorrados</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
              🎮
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{juegosCompletados}</div>
              <div className="text-sm text-muted-foreground">Juegos</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">{retosActivos}</div>
              <div className="text-sm text-muted-foreground">Retos activos</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Desafíos interactivos */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <span className="text-3xl">🎮</span>
                  <div>
                    <h2 className="font-bold text-lg">Desafíos Interactivos</h2>
                    <p className="text-white/80 text-sm">Aprende jugando y gana monedas</p>
                  </div>
                </div>
                {retosActivos > 0 && (
                  <div className="bg-white/20 px-3 py-1 rounded-full text-white text-sm">
                    {retosActivos} disponibles
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5">
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {[
                  { icon: '❓', title: 'Trivias', desc: 'Responde preguntas' },
                  { icon: '✅', title: 'V o F', desc: 'Verdadero o falso' },
                  { icon: '🧠', title: 'Memoria', desc: 'Encuentra parejas' }
                ].map((tipo, i) => (
                  <div key={i} className="bg-soft-divider rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">{tipo.icon}</div>
                    <div className="font-medium text-title text-sm">{tipo.title}</div>
                    <div className="text-xs text-muted-foreground">{tipo.desc}</div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => navigate('/estudiante/juegos')}
                className="w-full h-12 rounded-xl bg-primary text-white font-medium hover:bg-primary-light transition-colors flex items-center justify-center gap-2"
              >
                <span>🎮</span>
                Ver todos los desafíos
              </button>
            </div>
          </div>

          {/* Tu progreso */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">📈</span>
                Tu Progreso
              </h2>
            </div>
            
            <div className="p-5">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-title">{nivel}</span>
                  <span className="text-sm text-muted-foreground">{progresoNivel}%</span>
                </div>
                <div className="h-4 bg-soft-divider rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                    style={{ width: `${progresoNivel}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Nivel actual</span>
                  <span>Siguiente: {perfil?.siguienteUmbral || 200} monedas</span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { nivel: 'Explorador', min: 0, icon: '🌱' },
                  { nivel: 'Aprendiz', min: 200, icon: '📚' },
                  { nivel: 'Guardián', min: 500, icon: '🛡️' },
                  { nivel: 'Héroe', min: 1000, icon: '🦸' }
                ].map((n, i) => {
                  const alcanzado = monedas >= n.min
                  return (
                    <div 
                      key={i}
                      className={`text-center p-3 rounded-xl ${
                        alcanzado ? 'bg-eco/10' : 'bg-soft-divider'
                      }`}
                    >
                      <div className="text-2xl mb-1">{n.icon}</div>
                      <div className={`text-xs font-medium ${alcanzado ? 'text-eco' : 'text-muted-foreground'}`}>
                        {n.nivel}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sabías que... */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">💡</span>
                ¿Sabías que...?
              </h2>
            </div>
            
            <div className="p-5 space-y-3">
              {[
                { emoji: '🚿', text: 'Una ducha de 5 minutos puede consumir hasta 100 litros de agua' },
                { emoji: '🚰', text: 'Un grifo que gotea desperdicia más de 11,000 litros al año' },
                { emoji: '🌍', text: 'Solo el 2.5% del agua del planeta es agua dulce' },
                { emoji: '💧', text: 'Cerrar el grifo al lavarte los dientes ahorra 12 litros por minuto' }
              ].map((dato, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-info-card rounded-xl">
                  <span className="text-2xl">{dato.emoji}</span>
                  <p className="text-sm text-title">{dato.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar derecho */}
        <div className="space-y-6">
          {/* Mascota Tito */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-blue-100 to-cyan-100 p-6 text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-b from-blue-200 to-blue-300 flex items-center justify-center text-5xl shadow-lg animate-float">
                🐠
              </div>
              <h3 className="font-bold text-title">Tito el Guardián</h3>
              <p className="text-sm text-muted-foreground">Tu compañero acuático</p>
            </div>
            
            <div className="p-4">
              <div className="bg-soft-divider rounded-xl p-3 text-center mb-3">
                <p className="text-sm text-title italic">
                  "¡Sigue ahorrando agua para mantener mi arrecife limpio!"
                </p>
              </div>
              
              <button
                onClick={() => navigate('/estudiante/perfil')}
                className="w-full h-10 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors text-sm"
              >
                Ver tienda de Tito
              </button>
            </div>
          </div>

          {/* Ranking del aula */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gold/10">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">🏆</span>
                Ranking del Aula
              </h2>
            </div>
            
            <div className="divide-y">
              {topRanking.length > 0 ? (
                topRanking.map((est, i) => {
                  const esYo = est.usuarioId === (user?.Id || user?.id)
                  
                  return (
                    <div 
                      key={est.usuarioId || i} 
                      className={`p-3 flex items-center gap-3 ${esYo ? 'bg-primary/5' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        i === 0 ? 'bg-gold text-amber-900' :
                        i === 1 ? 'bg-gray-200 text-gray-700' :
                        i === 2 ? 'bg-amber-600/20 text-amber-700' :
                        'bg-soft-divider text-muted-foreground'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm truncate ${esYo ? 'text-primary' : 'text-title'}`}>
                          {esYo ? '⭐ Tú' : (est.nombre || 'Estudiante')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {est.nivelActual || 'Explorador'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary text-sm">{est.monedasTotal || 0}</div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Sin datos de ranking
                </div>
              )}
            </div>
            
            {ranking.length > 5 && (
              <div className="p-3 border-t">
                <button
                  onClick={() => navigate('/estudiante/ranking')}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Ver ranking completo →
                </button>
              </div>
            )}
          </div>

          {/* Insignias */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">🎖️</span>
                Mis Insignias
              </h2>
            </div>
            
            <div className="p-4">
              {perfil?.insignias?.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {perfil.insignias.slice(0, 8).map((ins, i) => (
                    <div 
                      key={i}
                      className="aspect-square rounded-xl bg-gold/10 flex items-center justify-center text-2xl"
                      title={ins.Nombre || ins.nombre}
                    >
                      🎖️
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎖️</div>
                  <p className="text-sm text-muted-foreground">
                    Completa retos para ganar insignias
                  </p>
                </div>
              )}
              
              <button
                onClick={() => navigate('/estudiante/perfil')}
                className="w-full h-10 rounded-lg border font-medium hover:bg-soft-divider transition-colors text-sm mt-3"
              >
                Ver todas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
