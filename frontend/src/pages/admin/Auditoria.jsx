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

  const filtros = useMemo(() => ({ tipo: tipo || undefined, adminId: adminId ? Number(adminId) : undefined, desde: desde || undefined, hasta: hasta || undefined, email: fEmail || undefined, targetId: fTargetId ? Number(fTargetId) : undefined, limit, offset }), [tipo, adminId, desde, hasta, fEmail, fTargetId, limit, offset])

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
    const hoy = new Date();
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - dias);
    setDesde(d.toISOString().slice(0,10))
    setHasta(hoy.toISOString().slice(0,10))
    setOffset(0)
    cargar()
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Auditoría</h2>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
        <select className="h-9 px-3 rounded-md border" value={tipo} onChange={e=>setTipo(e.target.value)}>
          <option value="">Tipo</option>
          <option value="admin_invitar_director">Invitar director</option>
          <option value="admin_invitar_profesor">Invitar profesor</option>
          <option value="admin_reset_password">Reset password</option>
          <option value="admin_alerta_email">Alerta email</option>
        </select>
        <input className="h-9 px-3 rounded-md border" placeholder="AdminId" type="number" value={adminId} onChange={e=>setAdminId(e.target.value)} />
        <input className="h-9 px-3 rounded-md border" placeholder="Email" value={fEmail} onChange={e=>setFEmail(e.target.value)} />
        <input className="h-9 px-3 rounded-md border" placeholder="TargetId" type="number" value={fTargetId} onChange={e=>setFTargetId(e.target.value)} />
        <input className="h-9 px-3 rounded-md border" type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
        <input className="h-9 px-3 rounded-md border" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
      </div>
      <div className="flex items-center gap-2">
        <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" onClick={cargar} disabled={loading}>{loading?'Cargando…':'Aplicar'}</button>
        <button className="h-9 px-3 rounded-md border text-sm" onClick={()=>presetDias(7)} disabled={loading}>Últimos 7 días</button>
        <button className="h-9 px-3 rounded-md border text-sm" onClick={()=>presetDias(30)} disabled={loading}>Últimos 30 días</button>
        <span className="text-slate-600 text-sm">Total: {total}</span>
        <span className="flex-1"></span>
        <label className="text-slate-600 text-sm">Tamaño</label>
        <select className="h-9 rounded-md border px-2 text-sm" value={limit} onChange={e=>{ setLimit(Number(e.target.value)); setOffset(0); }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <button className="h-9 px-3 rounded-md border text-sm" onClick={()=>setOffset(o=>Math.max(0, o-limit))} disabled={loading || offset===0}>Anterior</button>
        <button className="h-9 px-3 rounded-md border text-sm" onClick={()=>setOffset(o=> o+limit < total ? o+limit : o)} disabled={loading || offset+limit>=total}>Siguiente</button>
      </div>
      {error && <div className="text-sm text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-md border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Admin</th>
              <th className="text-left px-3 py-2">Target</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">Colegio</th>
              <th className="text-left px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id || i} className="border-t">
                <td className="px-3 py-2">{it.tipo}</td>
                <td className="px-3 py-2">{it.usuarioId ?? '—'}</td>
                <td className="px-3 py-2">{it.targetId ?? '—'}</td>
                <td className="px-3 py-2">{it.email ?? '—'}</td>
                <td className="px-3 py-2">{it.colegioId ?? '—'}</td>
                <td className="px-3 py-2">{new Date(it.creadoEn || Date.now()).toLocaleString()}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}