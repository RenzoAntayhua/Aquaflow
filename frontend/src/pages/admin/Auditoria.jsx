import { useEffect, useMemo, useState } from 'react'
import { adminAuditoria } from '../../lib/api'

export default function Auditoria() {
  const [tipo, setTipo] = useState('')
  const [adminId, setAdminId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fTargetId, setFTargetId] = useState('')
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filtros = useMemo(() => ({
    tipo: tipo || undefined,
    adminId: adminId ? Number(adminId) : undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
    email: fEmail || undefined,
    targetId: fTargetId ? Number(fTargetId) : undefined,
    limit,
    offset
  }), [tipo, adminId, desde, hasta, fEmail, fTargetId, limit, offset])

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      const r = await adminAuditoria(filtros)
      const arr = Array.isArray(r.items) ? r.items : (Array.isArray(r) ? r : [])
      setItems(arr)
      setTotal(typeof r.total === 'number' ? r.total : arr.length)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  function presetDias(dias) {
    const hoy = new Date()
    const d = new Date(hoy)
    d.setDate(hoy.getDate() - dias)
    setDesde(d.toISOString().slice(0, 10))
    setHasta(hoy.toISOString().slice(0, 10))
    setOffset(0)
  }

  const tipoLabels = {
    admin_invitar_director: { label: 'Invitar Director', color: 'bg-amber-100 text-amber-700', icon: '👔' },
    admin_invitar_profesor: { label: 'Invitar Profesor', color: 'bg-violet-100 text-violet-700', icon: '👨‍🏫' },
    admin_reset_password: { label: 'Reset Password', color: 'bg-rose-100 text-rose-700', icon: '🔑' },
    admin_alerta_email: { label: 'Alerta Email', color: 'bg-blue-100 text-blue-700', icon: '📧' },
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const currentPage = Math.floor(offset / limit) + 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoría del Sistema</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de todas las acciones administrativas</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">{total}</div>
          <div className="text-xs text-slate-400">eventos registrados</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🔍</span>
          <h2 className="font-semibold text-slate-700">Filtros de búsqueda</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo de acción</label>
            <select 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
              value={tipo} 
              onChange={e => setTipo(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="admin_invitar_director">Invitar director</option>
              <option value="admin_invitar_profesor">Invitar profesor</option>
              <option value="admin_reset_password">Reset password</option>
              <option value="admin_alerta_email">Alerta email</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Admin ID</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
              placeholder="ID"
              type="number" 
              value={adminId} 
              onChange={e => setAdminId(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Email</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
              placeholder="usuario@..."
              value={fEmail} 
              onChange={e => setFEmail(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Target ID</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
              type="number"
              placeholder="ID"
              value={fTargetId} 
              onChange={e => setFTargetId(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
              type="date" 
              value={desde} 
              onChange={e => setDesde(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input 
              className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
              type="date" 
              value={hasta} 
              onChange={e => setHasta(e.target.value)} 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button 
              className="h-8 px-3 rounded-md text-sm hover:bg-white transition-colors"
              onClick={() => presetDias(7)}
            >
              7 días
            </button>
            <button 
              className="h-8 px-3 rounded-md text-sm hover:bg-white transition-colors"
              onClick={() => presetDias(30)}
            >
              30 días
            </button>
            <button 
              className="h-8 px-3 rounded-md text-sm hover:bg-white transition-colors"
              onClick={() => presetDias(90)}
            >
              90 días
            </button>
          </div>
          
          <button 
            className="h-10 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
            onClick={cargar} 
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Aplicar Filtros'}
          </button>

          <button 
            className="h-10 px-4 rounded-lg border text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={() => {
              setTipo(''); setAdminId(''); setDesde(''); setHasta('')
              setFEmail(''); setFTargetId(''); setOffset(0)
            }}
          >
            Limpiar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Admin</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Target</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Colegio</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, i) => {
                const tipoInfo = tipoLabels[it.tipo] || { label: it.tipo, color: 'bg-slate-100 text-slate-600', icon: '📋' }
                return (
                  <tr key={it.id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tipoInfo.color}`}>
                        <span>{tipoInfo.icon}</span>
                        {tipoInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">#{it.usuarioId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">#{it.targetId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{it.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{it.colegioId ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(it.creadoEn || Date.now()).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
              {items.length === 0 && !loading && (
                <tr>
                  <td className="px-4 py-12 text-center text-slate-400" colSpan={6}>
                    <div className="text-4xl mb-2">📋</div>
                    No se encontraron eventos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Mostrar</span>
            <select
              className="h-8 px-2 rounded border text-sm"
              value={limit}
              onChange={e => { setLimit(Number(e.target.value)); setOffset(0) }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-slate-500">por página</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded border bg-white flex items-center justify-center disabled:opacity-50"
              onClick={() => setOffset(0)}
              disabled={loading || offset === 0}
            >
              ««
            </button>
            <button
              className="h-8 px-3 rounded border bg-white text-sm disabled:opacity-50"
              onClick={() => setOffset(o => Math.max(0, o - limit))}
              disabled={loading || offset === 0}
            >
              Anterior
            </button>
            <span className="px-3 text-sm text-slate-600">
              Página {currentPage} de {totalPages}
            </span>
            <button
              className="h-8 px-3 rounded border bg-white text-sm disabled:opacity-50"
              onClick={() => setOffset(o => o + limit)}
              disabled={loading || offset + limit >= total}
            >
              Siguiente
            </button>
            <button
              className="h-8 w-8 rounded border bg-white flex items-center justify-center disabled:opacity-50"
              onClick={() => setOffset((totalPages - 1) * limit)}
              disabled={loading || offset + limit >= total}
            >
              »»
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
