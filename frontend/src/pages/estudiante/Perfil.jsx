import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPerfilUsuario } from '../../lib/api'
import { useToast } from '../../context/ToastContext'

export default function EstudiantePerfil() {
  const { user } = useAuth()
  const toast = useToast()
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabActivo, setTabActivo] = useState('stats')
  
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const usuarioId = user?.Id || user?.id
        if (usuarioId) {
          const data = await getPerfilUsuario({ usuarioId })
          setPerfil(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const nombre = user?.Nombre || user?.nombre || 'Estudiante'
  const email = user?.Email || user?.email || '—'
  const monedas = perfil?.monedas || 0
  const nivel = perfil?.nivelActual || 'Explorador'
  const litrosAhorrados = perfil?.litrosAhorrados || 0
  const juegosCompletados = perfil?.juegosCompletados || 0
  const progresoNivel = perfil?.progresoMonedas || 0
  const siguienteUmbral = perfil?.siguienteUmbral || 200
  const insignias = perfil?.insignias || []

  // Decoraciones de la tienda de Tito
  const [decoraciones, setDecoraciones] = useState([
    { id: 1, nombre: 'Generador de burbujas', desc: 'Añade burbujas animadas', precio: 50, comprado: true },
    { id: 2, nombre: 'Algas danzantes', desc: 'Algas que dan color al fondo', precio: 30, comprado: true },
    { id: 3, nombre: 'Caracol brillante', desc: 'Un caracol amistoso', precio: 40, comprado: false },
    { id: 4, nombre: 'Coral luminoso', desc: 'Colores que iluminan', precio: 60, comprado: false },
    { id: 5, nombre: 'Estrella curiosa', desc: 'Una estrella de mar', precio: 45, comprado: false },
    { id: 6, nombre: 'Cofre del tesoro', desc: 'Un cofre misterioso', precio: 100, comprado: false }
  ])

  function comprarDecoracion(item) {
    if (monedas < item.precio) {
      toast?.show('No tienes suficientes monedas', 'error')
      return
    }
    // En una implementación real, esto llamaría al backend
    setDecoraciones(decs => 
      decs.map(d => d.id === item.id ? { ...d, comprado: true } : d)
    )
    toast?.show(`¡Has comprado ${item.nombre}!`, 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del perfil */}
      <div className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 rounded-2xl p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-5xl shadow-lg">
            🧑‍🚀
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{nombre}</h1>
            <p className="text-white/80 mb-3">{email}</p>
            
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="text-xl">🪙</span>
                <span className="font-bold">{monedas}</span>
              </div>
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                <span className="font-medium">{nivel}</span>
              </div>
              <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                <span className="text-xl">💧</span>
                <span className="font-bold">{Math.round(litrosAhorrados)}L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { id: 'stats', label: 'Estadísticas', icon: '📊' },
          { id: 'insignias', label: 'Insignias', icon: '🎖️' },
          { id: 'tito', label: 'Tito y Tienda', icon: '🐠' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActivo(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tabActivo === tab.id 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-title'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de tabs */}
      {tabActivo === 'stats' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Estadísticas de conservación */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">📊</span>
                Estadísticas de Conservación
              </h2>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-eco/10 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">💧</div>
                  <div className="text-3xl font-bold text-eco">{Math.round(litrosAhorrados)}L</div>
                  <div className="text-sm text-muted-foreground">Litros ahorrados</div>
                </div>
                <div className="bg-purple-100 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">🎮</div>
                  <div className="text-3xl font-bold text-purple-600">{juegosCompletados}</div>
                  <div className="text-sm text-muted-foreground">Juegos completados</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gold/10 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">🪙</div>
                  <div className="text-3xl font-bold text-amber-600">{monedas}</div>
                  <div className="text-sm text-muted-foreground">Monedas totales</div>
                </div>
                <div className="bg-primary/10 rounded-xl p-4 text-center">
                  <div className="text-4xl mb-2">🎖️</div>
                  <div className="text-3xl font-bold text-primary">{insignias.length}</div>
                  <div className="text-sm text-muted-foreground">Insignias</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progreso de nivel */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">📈</span>
                Progreso de Nivel
              </h2>
            </div>
            
            <div className="p-5">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary-light text-white shadow-lg mb-4">
                  <span className="text-4xl">
                    {nivel === 'Héroe del Agua' ? '🦸' :
                     nivel === 'Guardián del Agua' ? '🛡️' :
                     nivel === 'Aprendiz del Agua' ? '📚' : '🌱'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-title">{nivel}</h3>
                <p className="text-muted-foreground text-sm">Tu nivel actual</p>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium text-title">{progresoNivel}%</span>
                </div>
                <div className="h-4 bg-soft-divider rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                    style={{ width: `${progresoNivel}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{monedas} monedas</span>
                  <span>Siguiente: {siguienteUmbral}</span>
                </div>
              </div>
              
              <div className="bg-info-card rounded-xl p-4">
                <h4 className="font-medium text-title text-sm mb-3">Niveles del sistema</h4>
                <div className="space-y-2">
                  {[
                    { nombre: 'Explorador', min: 0, max: 199, icon: '🌱' },
                    { nombre: 'Aprendiz del Agua', min: 200, max: 499, icon: '📚' },
                    { nombre: 'Guardián del Agua', min: 500, max: 999, icon: '🛡️' },
                    { nombre: 'Héroe del Agua', min: 1000, max: null, icon: '🦸' }
                  ].map((n, i) => {
                    const alcanzado = monedas >= n.min
                    const actual = nivel === n.nombre
                    
                    return (
                      <div 
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          actual ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className="text-xl">{n.icon}</span>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${alcanzado ? 'text-title' : 'text-muted-foreground'}`}>
                            {n.nombre}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {n.max ? `${n.min} - ${n.max} monedas` : `${n.min}+ monedas`}
                          </div>
                        </div>
                        {alcanzado && <span className="text-eco">✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tabActivo === 'insignias' && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-bold text-title flex items-center gap-2">
              <span className="text-xl">🎖️</span>
              Colección de Insignias
            </h2>
          </div>
          
          <div className="p-5">
            {insignias.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insignias.map((ins, i) => (
                  <div 
                    key={i}
                    className="bg-gradient-to-br from-gold/20 to-amber-100 rounded-xl p-4 text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gold/30 flex items-center justify-center text-3xl shadow-lg">
                      🎖️
                    </div>
                    <h4 className="font-medium text-title text-sm">{ins.Nombre || ins.nombre}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {ins.Descripcion || ins.descripcion || 'Insignia desbloqueada'}
                    </p>
                    {ins.OtorgadaEn && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(ins.OtorgadaEn).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎖️</div>
                <h3 className="text-xl font-semibold text-title mb-2">¡Gana tu primera insignia!</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Completa retos y desafíos para desbloquear insignias especiales que mostrarán tu progreso como guardián del agua.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tabActivo === 'tito' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tito */}
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-b from-blue-100 via-cyan-100 to-teal-100 p-8 text-center relative overflow-hidden">
              {/* Burbujas animadas */}
              <div className="absolute inset-0">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-3 h-3 bg-white/50 rounded-full animate-float"
                    style={{
                      left: `${10 + i * 12}%`,
                      top: `${20 + (i % 3) * 20}%`,
                      animationDelay: `${i * 0.5}s`,
                      animationDuration: `${3 + i * 0.3}s`
                    }}
                  />
                ))}
              </div>
              
              {/* Tito */}
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-b from-blue-200 to-blue-400 flex items-center justify-center text-6xl shadow-xl animate-float">
                  🐠
                </div>
                <h3 className="text-xl font-bold text-title">Tito el Guardián</h3>
                <p className="text-sm text-muted-foreground">Tu compañero acuático</p>
              </div>
            </div>
            
            <div className="p-5">
              <div className="bg-soft-divider rounded-xl p-4 mb-4">
                <p className="text-sm text-title text-center italic">
                  "¡Cada gota que ahorras ayuda a mantener mi hogar limpio y brillante!"
                </p>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gold/10 rounded-xl">
                <span className="text-sm font-medium text-title">Tus monedas</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🪙</span>
                  <span className="text-xl font-bold text-amber-600">{monedas}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tienda de decoraciones */}
          <div className="lg:col-span-2 bg-card rounded-xl border shadow-sm overflow-hidden">
            <div className="p-5 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="font-bold text-title flex items-center gap-2">
                <span className="text-xl">🏪</span>
                Tienda de Tito
              </h2>
              <p className="text-sm text-muted-foreground">Decora el hogar de Tito con tus monedas</p>
            </div>
            
            <div className="p-5">
              <div className="grid md:grid-cols-2 gap-4">
                {decoraciones.map(item => (
                  <div 
                    key={item.id}
                    className={`rounded-xl border p-4 ${
                      item.comprado ? 'bg-eco/5 border-eco/30' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-title">{item.nombre}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-600">
                        <span>🪙</span>
                        <span className="font-bold">{item.precio}</span>
                      </div>
                    </div>
                    
                    {item.comprado ? (
                      <div className="flex items-center justify-center gap-2 h-10 rounded-lg bg-eco/10 text-eco text-sm font-medium">
                        <span>✓</span>
                        Equipado
                      </div>
                    ) : (
                      <button
                        onClick={() => comprarDecoracion(item)}
                        disabled={monedas < item.precio}
                        className={`w-full h-10 rounded-lg text-sm font-medium transition-colors ${
                          monedas >= item.precio
                            ? 'bg-primary text-white hover:bg-primary-light'
                            : 'bg-soft-divider text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        {monedas >= item.precio ? 'Comprar' : 'Sin monedas'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
