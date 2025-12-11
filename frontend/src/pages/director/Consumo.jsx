import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { getSensoresColegio, getConsumoColegio } from '../../lib/api'

export default function DirectorConsumo() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [consumo, setConsumo] = useState(null)
  const [sensores, setSensores] = useState([])
  const [timeRange, setTimeRange] = useState('-24h')
  const [error, setError] = useState('')

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    loadData()
  }, [colegioId, timeRange])

  async function loadData() {
    setLoading(true)
    try {
      const [consumoData, sensoresData] = await Promise.all([
        getConsumoColegio({ colegioId }).catch(() => null),
        getSensoresColegio({ colegioId }).catch(() => [])
      ])
      setConsumo(consumoData)
      setSensores(sensoresData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const formatLitros = (l) => {
    if (l >= 1000) return `${(l / 1000).toFixed(1)} m³`
    return `${l.toFixed(1)} L`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">Cargando datos de consumo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📊 Dashboard de Consumo</h1>
          <p className="text-slate-500 text-sm mt-1">Monitoreo de consumo de agua en tiempo real</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="h-10 px-4 rounded-lg border text-sm"
        >
          <option value="-1h">Última hora</option>
          <option value="-24h">Últimas 24 horas</option>
          <option value="-7d">Última semana</option>
          <option value="-30d">Último mes</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* KPIs Principales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl">
              💧
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {consumo ? formatLitros(consumo.litrosHoy) : '---'}
              </div>
              <div className="text-xs text-slate-400">Consumo Hoy</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center text-2xl">
              📅
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {consumo ? formatLitros(consumo.litrosSemana) : '---'}
              </div>
              <div className="text-xs text-slate-400">Esta Semana</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center text-2xl">
              📆
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {consumo ? formatLitros(consumo.litrosMes) : '---'}
              </div>
              <div className="text-xs text-slate-400">Este Mes</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl">
              🚿
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {consumo?.totalEventosHoy || 0}
              </div>
              <div className="text-xs text-slate-400">Usos Hoy</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">
              📡
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">
                {sensores.filter(s => s.online).length}/{sensores.length}
              </div>
              <div className="text-xs text-slate-400">Sensores Online</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Consumo por Espacio */}
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-slate-800">Consumo por Espacio</h2>
          </div>
          <div className="p-5">
            {consumo?.consumosPorEspacio?.length > 0 ? (
              <div className="space-y-4">
                {consumo.consumosPorEspacio.map((esp, i) => {
                  const maxLitros = Math.max(...consumo.consumosPorEspacio.map(e => e.litrosHoy))
                  const porcentaje = maxLitros > 0 ? (esp.litrosHoy / maxLitros) * 100 : 0
                  
                  return (
                    <div key={esp.espacioId || i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {esp.tipoEspacio === 'bano' && '🚻'} 
                          {esp.tipoEspacio === 'lavadero' && '🚿'} 
                          {esp.tipoEspacio === 'patio' && '🌳'} 
                          {esp.tipoEspacio === 'otro' && '📍'} 
                          {' '}{esp.nombreEspacio}
                        </span>
                        <span className="text-sm text-slate-500">
                          {formatLitros(esp.litrosHoy)} ({esp.porcentaje.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-2">📊</div>
                <p>No hay datos de consumo disponibles</p>
                <p className="text-sm mt-1">Asegúrate de tener sensores activos enviando datos</p>
              </div>
            )}
          </div>
        </div>

        {/* Estado de Sensores */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-slate-800">Estado de Sensores</h2>
          </div>
          <div className="divide-y max-h-[400px] overflow-y-auto">
            {sensores.length > 0 ? (
              sensores.map((sensor, i) => (
                <div key={sensor.id || i} className="p-4 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${sensor.online ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-800 truncate">{sensor.nombre}</div>
                    <div className="text-xs text-slate-400">{sensor.nombreEspacio}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      sensor.online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sensor.online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400">
                <div className="text-3xl mb-2">📡</div>
                <p className="text-sm">No hay sensores registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Últimos Eventos de Uso */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">📋 Últimos Eventos de Uso</h2>
            <p className="text-xs text-slate-400 mt-1">
              Cada registro = 1 vez que se usó el agua (desde que se abre hasta que se cierra el grifo)
            </p>
          </div>
          {consumo?.totalEventosHoy > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{consumo.totalEventosHoy}</div>
              <div className="text-xs text-slate-400">eventos hoy</div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-medium text-slate-600">Sensor</th>
                <th className="text-left p-4 font-medium text-slate-600">Espacio</th>
                <th className="text-right p-4 font-medium text-slate-600">Litros</th>
                <th className="text-right p-4 font-medium text-slate-600">Duración</th>
                <th className="text-right p-4 font-medium text-slate-600">Caudal Prom.</th>
                <th className="text-right p-4 font-medium text-slate-600">Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {consumo?.sensores?.flatMap(s => 
                (s.ultimosEventos || []).map((ev, i) => ({
                  ...ev, 
                  sensorNombre: s.sensorId || s.nombreDispositivo, 
                  espacioNombre: s.nombreEspacio
                }))
              ).slice(0, 20).map((evento, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="p-4 font-mono text-xs">{evento.sensorNombre || '-'}</td>
                  <td className="p-4">{evento.espacioNombre || '-'}</td>
                  <td className="p-4 text-right font-medium text-blue-600">
                    {evento.litrosConsumidos ? evento.litrosConsumidos.toFixed(2) : '0.00'} L
                  </td>
                  <td className="p-4 text-right">{evento.duracionSegundos || 0}s</td>
                  <td className="p-4 text-right text-slate-500">
                    {evento.caudalPromedio ? evento.caudalPromedio.toFixed(1) : '0.0'} L/min
                  </td>
                  <td className="p-4 text-right text-slate-400">
                    {evento.time ? new Date(evento.time).toLocaleTimeString('es-PE', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    }) : '-'}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">
                    <div className="text-4xl mb-2">🚿</div>
                    <p>No hay eventos registrados aún</p>
                    <p className="text-sm mt-1">Los eventos aparecerán cuando los sensores detecten uso de agua</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-medium text-blue-800">Sobre los datos de consumo</h3>
            <p className="text-sm text-blue-700 mt-1">
              Los datos se actualizan cada vez que un sensor detecta el cierre del grifo.
              Cada evento representa una sesión de uso de agua (desde que se abre hasta que se cierra).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


