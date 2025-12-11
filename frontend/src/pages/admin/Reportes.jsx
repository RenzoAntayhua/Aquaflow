import { useEffect, useMemo, useState } from 'react'
import { adminAuditoria, getAdminStats } from '../../lib/api'

export default function Reportes() {
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  
  // Audit filters
  const [tipo, setTipo] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [limit, setLimit] = useState(100)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
    cargarAuditoria()
  }, [])

  async function cargarAuditoria() {
    setLoading(true)
    setError('')
    try {
      const params = {
        tipo: tipo || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        limit,
        offset: 0
      }
      const r = await adminAuditoria(params)
      setItems(r.items ?? r)
      setTotal(r.total ?? (Array.isArray(r) ? r.length : 0))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  function setPeriodo(days) {
    const now = new Date()
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    setDesde(start.toISOString().slice(0, 10))
    setHasta(now.toISOString().slice(0, 10))
  }

  function exportCSV() {
    const cols = ['id', 'tipo', 'actorId', 'colegioId', 'aulaId', 'targetId', 'email', 'emailEnviado', 'ip', 'creadoEn']
    const header = cols.join(',')
    const lines = items.map(i => cols.map(c => {
      const v = i[c] ?? i[c.charAt(0).toUpperCase() + c.slice(1)]
      if (v == null) return ''
      const s = typeof v === 'string' ? v.replace(/"/g, '""') : String(v)
      return `"${s}"`
    }).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auditoria_admin_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group events by type for chart
  const eventsByType = useMemo(() => {
    const counts = {}
    items.forEach(item => {
      const t = item.tipo || 'otros'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts).map(([tipo, count]) => ({ tipo, count }))
  }, [items])

  const tipoLabels = {
    admin_invitar_director: { label: 'Invitar Director', color: 'bg-amber-500' },
    admin_invitar_profesor: { label: 'Invitar Profesor', color: 'bg-violet-500' },
    admin_reset_password: { label: 'Reset Password', color: 'bg-rose-500' },
    admin_alerta_email: { label: 'Alerta Email', color: 'bg-blue-500' },
  }

  const maxCount = Math.max(...eventsByType.map(e => e.count), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
          <p className="text-slate-500 text-sm mt-1">Análisis y exportación de datos del sistema</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={items.length === 0}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          <span>📥</span> Exportar CSV
        </button>
      </div>

      {/* Summary Cards */}
      {!loadingStats && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon="🏫"
            label="Colegios"
            value={stats.colegios}
            change="+2 este mes"
            color="blue"
          />
          <SummaryCard
            icon="👥"
            label="Usuarios"
            value={stats.usuarios}
            change={`${stats.estudiantes} estudiantes`}
            color="emerald"
          />
          <SummaryCard
            icon="📚"
            label="Aulas"
            value={stats.aulas}
            change={`${stats.profesores} profesores`}
            color="violet"
          />
          <SummaryCard
            icon="🎯"
            label="Retos"
            value={stats.plantillasRetos}
            change={`${stats.preguntas} preguntas`}
            color="amber"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <span>📊</span> Filtrar Auditoría
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
            <select 
              className="h-10 w-full px-3 rounded-lg border text-sm"
              value={tipo} 
              onChange={e => setTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="admin_invitar_director">Invitar Director</option>
              <option value="admin_invitar_profesor">Invitar Profesor</option>
              <option value="admin_reset_password">Reset Password</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm" 
              type="date" 
              value={desde} 
              onChange={e => setDesde(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm" 
              type="date" 
              value={hasta} 
              onChange={e => setHasta(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Límite</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm" 
              type="number" 
              min={1} 
              max={500} 
              value={limit} 
              onChange={e => setLimit(Number(e.target.value))} 
            />
          </div>
          <div className="flex items-end">
            <button 
              className="h-10 w-full rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={cargarAuditoria} 
              disabled={loading}
            >
              {loading ? '...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Periodos rápidos:</span>
          <button 
            className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
            onClick={() => setPeriodo(0)}
          >
            Hoy
          </button>
          <button 
            className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
            onClick={() => setPeriodo(7)}
          >
            7 días
          </button>
          <button 
            className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
            onClick={() => setPeriodo(30)}
          >
            30 días
          </button>
          <button 
            className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
            onClick={() => setPeriodo(90)}
          >
            90 días
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Events by Type */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Eventos por Tipo</h3>
          <div className="space-y-3">
            {eventsByType.length > 0 ? eventsByType.map(({ tipo, count }) => {
              const info = tipoLabels[tipo] || { label: tipo, color: 'bg-slate-500' }
              const width = (count / maxCount) * 100
              return (
                <div key={tipo}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-600">{info.label}</span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${info.color} rounded-full transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-8 text-slate-400">
                <div className="text-3xl mb-2">📊</div>
                Sin datos para mostrar
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-semibold text-slate-700 mb-4">Resumen de Período</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{total}</div>
              <div className="text-sm text-blue-600/80">Total eventos</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-emerald-600">{eventsByType.length}</div>
              <div className="text-sm text-emerald-600/80">Tipos únicos</div>
            </div>
            <div className="bg-violet-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-violet-600">
                {eventsByType.find(e => e.tipo === 'admin_invitar_profesor')?.count || 0}
              </div>
              <div className="text-sm text-violet-600/80">Profesores invitados</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-amber-600">
                {eventsByType.find(e => e.tipo === 'admin_invitar_director')?.count || 0}
              </div>
              <div className="text-sm text-amber-600/80">Directores invitados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">Detalle de Eventos ({items.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.slice(0, 50).map(i => (
                <tr key={i.Id || i.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-500">#{i.Id ?? i.id}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tipoLabels[i.tipo]?.color?.replace('bg-', 'bg-').replace('-500', '-100') || 'bg-slate-100'
                    } ${
                      tipoLabels[i.tipo]?.color?.replace('bg-', 'text-').replace('-500', '-700') || 'text-slate-700'
                    }`}>
                      {tipoLabels[i.tipo]?.label || i.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">#{i.actorId ?? i.ActorId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">#{i.targetId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{i.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {(i.CreadoEn ?? i.creadoEn) ? new Date(i.CreadoEn ?? i.creadoEn).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-400" colSpan={6}>
                    <div className="text-4xl mb-2">📋</div>
                    Sin registros para el período seleccionado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {items.length > 50 && (
          <div className="px-4 py-3 border-t bg-slate-50 text-sm text-slate-500 text-center">
            Mostrando 50 de {items.length} registros. Exporta CSV para ver todos.
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, change, color }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    violet: 'from-violet-500 to-violet-600',
    amber: 'from-amber-500 to-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center text-xl shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t text-xs text-slate-500">{change}</div>
    </div>
  )
}
