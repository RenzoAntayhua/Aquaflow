import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPerfilEstudiantesAula } from '../../lib/api'

export default function EstudianteRanking() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [ranking, setRanking] = useState([])
  
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const aulaId = user?.aulaId || user?.AulaId || 1
        const data = await getPerfilEstudiantesAula({ aulaId })
        setRanking(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const sortedRanking = [...ranking].sort((a, b) => (b.monedasTotal || 0) - (a.monedasTotal || 0))
  const miPosicion = sortedRanking.findIndex(p => p.usuarioId === (user?.Id || user?.id)) + 1
  const miPerfil = sortedRanking.find(p => p.usuarioId === (user?.Id || user?.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando ranking...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 md:p-8 text-white shadow-lg">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Ranking del Aula</h1>
          <p className="text-white/80">Compite con tus compañeros y sube de posición</p>
          
          {miPosicion > 0 && (
            <div className="mt-6 inline-flex items-center gap-4 bg-white/20 backdrop-blur px-6 py-3 rounded-xl">
              <span className="text-white/80">Tu posición:</span>
              <span className="text-3xl font-bold">#{miPosicion}</span>
              <span className="text-white/80">de {sortedRanking.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Podio top 3 */}
      {sortedRanking.length >= 3 && (
        <div className="flex justify-center items-end gap-4 py-6">
          {/* 2do lugar */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-gray-200 flex items-center justify-center text-3xl shadow-lg">
              🥈
            </div>
            <div className="bg-card rounded-xl border p-3 shadow-sm min-w-[120px]">
              <div className="font-bold text-title text-sm truncate">{sortedRanking[1]?.nombre || 'Estudiante'}</div>
              <div className="text-lg font-bold text-gray-500">{sortedRanking[1]?.monedasTotal || 0}</div>
              <div className="text-xs text-muted-foreground">monedas</div>
            </div>
          </div>

          {/* 1er lugar */}
          <div className="text-center -mt-8">
            <div className="w-24 h-24 mx-auto mb-2 rounded-full bg-gold flex items-center justify-center text-4xl shadow-xl animate-float">
              🥇
            </div>
            <div className="bg-gradient-to-b from-gold/20 to-amber-50 rounded-xl border-2 border-gold/30 p-4 shadow-lg min-w-[140px]">
              <div className="font-bold text-title truncate">{sortedRanking[0]?.nombre || 'Estudiante'}</div>
              <div className="text-2xl font-bold text-amber-600">{sortedRanking[0]?.monedasTotal || 0}</div>
              <div className="text-xs text-muted-foreground">monedas</div>
              <div className="mt-2 px-2 py-1 bg-gold/20 rounded-full text-xs font-medium text-amber-700">
                {sortedRanking[0]?.nivelActual || 'Explorador'}
              </div>
            </div>
          </div>

          {/* 3er lugar */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-amber-600/20 flex items-center justify-center text-3xl shadow-lg">
              🥉
            </div>
            <div className="bg-card rounded-xl border p-3 shadow-sm min-w-[120px]">
              <div className="font-bold text-title text-sm truncate">{sortedRanking[2]?.nombre || 'Estudiante'}</div>
              <div className="text-lg font-bold text-amber-700">{sortedRanking[2]?.monedasTotal || 0}</div>
              <div className="text-xs text-muted-foreground">monedas</div>
            </div>
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-soft-divider">
          <h2 className="font-bold text-title">Clasificación completa</h2>
        </div>
        
        <div className="divide-y">
          {sortedRanking.map((est, i) => {
            const esYo = est.usuarioId === (user?.Id || user?.id)
            const pos = i + 1
            
            return (
              <div 
                key={est.usuarioId || i}
                className={`p-4 flex items-center gap-4 ${esYo ? 'bg-primary/5' : 'hover:bg-soft-divider/50'} transition-colors`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  pos === 1 ? 'bg-gold text-amber-900' :
                  pos === 2 ? 'bg-gray-200 text-gray-700' :
                  pos === 3 ? 'bg-amber-600/20 text-amber-700' :
                  'bg-soft-divider text-muted-foreground'
                }`}>
                  {pos <= 3 ? ['🥇', '🥈', '🥉'][pos - 1] : pos}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`font-medium truncate ${esYo ? 'text-primary' : 'text-title'}`}>
                    {esYo ? `⭐ ${est.nombre || 'Tú'}` : (est.nombre || 'Estudiante')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {est.nivelActual || 'Explorador'}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-primary">{est.monedasTotal || 0}</div>
                    <div className="text-xs text-muted-foreground">monedas</div>
                  </div>
                  
                  <div className="w-24 hidden md:block">
                    <div className="h-2 bg-soft-divider rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          pos === 1 ? 'bg-gold' :
                          pos === 2 ? 'bg-gray-400' :
                          pos === 3 ? 'bg-amber-600' :
                          'bg-primary'
                        }`}
                        style={{ 
                          width: `${sortedRanking[0]?.monedasTotal > 0 
                            ? ((est.monedasTotal || 0) / sortedRanking[0].monedasTotal) * 100 
                            : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          
          {sortedRanking.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="font-semibold text-title mb-2">Sin datos de ranking</h3>
              <p className="text-muted-foreground text-sm">
                El ranking se actualizará cuando haya más actividad en el aula
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mi progreso */}
      {miPerfil && (
        <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 text-white shadow-lg">
          <h3 className="font-bold text-lg mb-4">Tu progreso</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{miPerfil.monedasTotal || 0}</div>
              <div className="text-xs text-white/80">Monedas</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{Math.round(miPerfil.litrosAhorradosTotal || 0)}L</div>
              <div className="text-xs text-white/80">Ahorrados</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{miPerfil.juegosCompletados || 0}</div>
              <div className="text-xs text-white/80">Juegos</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
