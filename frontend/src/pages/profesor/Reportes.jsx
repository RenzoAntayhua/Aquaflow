import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getConsumoAgregado, getRetosAula, getPerfilEstudiantesAula, getPlantillasRetos } from '../../lib/api'

export default function ProfesorReportes() {
  const { aulaId } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  
  const [loading, setLoading] = useState(true)
  const [consumo, setConsumo] = useState(null)
  const [retos, setRetos] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [periodo, setPeriodo] = useState('semana')

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    async function load() {
      try {
        const [consumoData, retosData, perfilesData, plantillasData] = await Promise.all([
          getConsumoAgregado({ aulaId, periodo }).catch(() => null),
          getRetosAula({ aulaId }).catch(() => []),
          getPerfilEstudiantesAula({ aulaId }).catch(() => []),
          getPlantillasRetos().catch(() => [])
        ])
        
        setConsumo(consumoData)
        setRetos(retosData)
        setPerfiles(perfilesData)
        setPlantillas(plantillasData)
      } catch (e) {
        toast?.show(e.message, 'error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [aulaId, periodo])

  // Estadísticas calculadas
  const totalMonedas = perfiles.reduce((acc, p) => acc + (p.monedasTotal || 0), 0)
  const promedioMonedas = perfiles.length > 0 ? Math.round(totalMonedas / perfiles.length) : 0
  const totalLitrosAhorrados = perfiles.reduce((acc, p) => acc + (p.litrosAhorradosTotal || 0), 0)
  const retosCompletados = retos.filter(r => (r.Estado ?? r.estado) === 2).length
  const retosActivos = retos.filter(r => (r.Estado ?? r.estado) === 0).length

  // Distribución por nivel
  const distribucionNiveles = {
    'Héroe del Agua': perfiles.filter(p => (p.monedasTotal || 0) >= 1000).length,
    'Guardián del Agua': perfiles.filter(p => (p.monedasTotal || 0) >= 500 && (p.monedasTotal || 0) < 1000).length,
    'Aprendiz del Agua': perfiles.filter(p => (p.monedasTotal || 0) >= 200 && (p.monedasTotal || 0) < 500).length,
    'Explorador': perfiles.filter(p => (p.monedasTotal || 0) < 200).length
  }

  function exportarReporte() {
    const data = {
      aula: aulaId,
      fecha: new Date().toISOString(),
      periodo,
      estudiantes: perfiles.length,
      totalMonedas,
      promedioMonedas,
      totalLitrosAhorrados: Math.round(totalLitrosAhorrados),
      retosActivos,
      retosCompletados,
      distribucionNiveles,
      consumo
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-aula-${aulaId}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast?.show('Reporte exportado', 'success')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generando reporte...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-title flex items-center gap-3">
            <span className="text-3xl">📈</span>
            Reportes del Aula
          </h1>
          <p className="text-muted-foreground mt-1">
            Estadísticas y métricas de rendimiento del aula {aulaId}
          </p>
        </div>
        
        <div className="flex gap-3">
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="h-10 px-4 rounded-lg border border-input text-sm"
          >
            <option value="dia">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
          </select>
          <button
            onClick={exportarReporte}
            className="h-10 px-4 rounded-lg bg-primary text-white font-medium hover:bg-primary-light transition-colors flex items-center gap-2"
          >
            📥 Exportar
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <div className="text-3xl font-bold text-title">{perfiles.length}</div>
              <div className="text-sm text-muted-foreground">Estudiantes</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center text-2xl">
              🪙
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600">{totalMonedas}</div>
              <div className="text-sm text-muted-foreground">Monedas totales</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-eco/20 flex items-center justify-center text-2xl">
              💧
            </div>
            <div>
              <div className="text-3xl font-bold text-eco">{Math.round(totalLitrosAhorrados)}L</div>
              <div className="text-sm text-muted-foreground">Litros ahorrados</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
              🏆
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{retosCompletados}</div>
              <div className="text-sm text-muted-foreground">Retos completados</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Consumo de agua */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">💧</span>
              Consumo de Agua
            </h2>
          </div>
          
          {consumo ? (
            <div className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-soft-divider rounded-xl">
                  <div className="text-2xl font-bold text-primary">{Math.round(consumo.totalLitros)}L</div>
                  <div className="text-xs text-muted-foreground">Consumido</div>
                </div>
                <div className="text-center p-4 bg-soft-divider rounded-xl">
                  <div className="text-2xl font-bold text-title">{consumo.lineaBase}L</div>
                  <div className="text-xs text-muted-foreground">Línea base</div>
                </div>
                <div className={`text-center p-4 rounded-xl ${consumo.reduccionPct >= 0 ? 'bg-eco/10' : 'bg-coral/10'}`}>
                  <div className={`text-2xl font-bold ${consumo.reduccionPct >= 0 ? 'text-eco' : 'text-coral'}`}>
                    {consumo.reduccionPct >= 0 ? '↓' : '↑'} {Math.abs(consumo.reduccionPct)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Variación</div>
                </div>
              </div>

              {/* Gráfico de barras */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Tendencia semanal</div>
                <div className="flex items-end justify-between gap-2 h-32">
                  {(consumo.serie || []).slice(-7).map((d, i) => {
                    const maxLitros = Math.max(...(consumo.serie || []).map(x => x.litros || 0), 1)
                    const height = ((d.litros || 0) / maxLitros) * 100
                    const isToday = i === (consumo.serie || []).slice(-7).length - 1
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs text-muted-foreground">{d.litros}L</div>
                        <div 
                          className={`w-full rounded-t-md transition-colors ${isToday ? 'bg-primary' : 'bg-primary/60'}`}
                          style={{ height: `${height}%`, minHeight: '4px' }}
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

        {/* Distribución por niveles */}
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-title flex items-center gap-2">
              <span className="text-xl">🎖️</span>
              Distribución por Nivel
            </h2>
          </div>
          
          <div className="p-5 space-y-4">
            {[
              { nivel: 'Héroe del Agua', color: 'bg-purple-500', min: 1000 },
              { nivel: 'Guardián del Agua', color: 'bg-eco', min: 500 },
              { nivel: 'Aprendiz del Agua', color: 'bg-primary', min: 200 },
              { nivel: 'Explorador', color: 'bg-gray-400', min: 0 }
            ].map(({ nivel, color, min }) => {
              const count = distribucionNiveles[nivel]
              const pct = perfiles.length > 0 ? (count / perfiles.length) * 100 : 0
              
              return (
                <div key={nivel}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{nivel}</span>
                    <span className="text-sm text-muted-foreground">{count} ({Math.round(pct)}%)</span>
                  </div>
                  <div className="h-3 bg-soft-divider rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}

            <div className="pt-4 border-t mt-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Promedio de monedas</span>
                <span className="font-bold text-primary">{promedioMonedas} 🪙</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de retos */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-semibold text-title flex items-center gap-2">
            <span className="text-xl">🎯</span>
            Resumen de Retos
          </h2>
        </div>
        
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-soft-divider rounded-xl">
              <div className="text-2xl font-bold text-title">{retos.length}</div>
              <div className="text-xs text-muted-foreground">Total creados</div>
            </div>
            <div className="text-center p-4 bg-eco/10 rounded-xl">
              <div className="text-2xl font-bold text-eco">{retosActivos}</div>
              <div className="text-xs text-muted-foreground">Activos</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{retosCompletados}</div>
              <div className="text-xs text-muted-foreground">Completados</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-xl">
              <div className="text-2xl font-bold text-amber-600">{retos.filter(r => (r.Estado ?? r.estado) === 1).length}</div>
              <div className="text-xs text-muted-foreground">Pausados</div>
            </div>
          </div>

          {/* Lista de retos recientes */}
          {retos.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-soft-divider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Reto</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Período</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {retos.slice(0, 5).map((r, i) => {
                    const p = plantillas.find(x => String(x.Id || x.id) === String(r.PlantillaId || r.plantillaId))
                    const nombre = p?.Nombre || p?.nombre || `Reto #${r.Id || r.id}`
                    const estado = r.Estado ?? r.estado
                    
                    return (
                      <tr key={r.Id || r.id} className="hover:bg-soft-divider/50">
                        <td className="px-4 py-3 font-medium">{nombre}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {String(r.FechaInicio || r.fechaInicio).slice(0, 10)} — {String(r.FechaFin || r.fechaFin).slice(0, 10)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            estado === 0 ? 'bg-eco/20 text-green-700' :
                            estado === 2 ? 'bg-blue-100 text-blue-700' :
                            estado === 1 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {estado === 0 ? 'Activo' : estado === 2 ? 'Completado' : estado === 1 ? 'Pausado' : 'Fallido'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span>💡</span>
          Insights del Aula
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/10 rounded-lg p-4">
            <div className="font-medium mb-1">Participación</div>
            <p className="text-white/80">
              {perfiles.length > 0 
                ? `${Math.round((perfiles.filter(p => (p.juegosCompletados || 0) > 0).length / perfiles.length) * 100)}% de estudiantes han completado al menos un juego`
                : 'Sin datos de participación aún'
              }
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="font-medium mb-1">Tendencia</div>
            <p className="text-white/80">
              {consumo && consumo.reduccionPct >= 0 
                ? `¡Excelente! El aula ha reducido su consumo un ${consumo.reduccionPct}%`
                : 'Sigue motivando a tus estudiantes para mejorar el consumo'
              }
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <div className="font-medium mb-1">Siguiente meta</div>
            <p className="text-white/80">
              {distribucionNiveles['Explorador'] > 0 
                ? `${distribucionNiveles['Explorador']} estudiantes cerca de subir a Aprendiz`
                : '¡Todos los estudiantes han progresado del nivel inicial!'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
