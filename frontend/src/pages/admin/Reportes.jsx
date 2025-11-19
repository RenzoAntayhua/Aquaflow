import { useEffect, useMemo, useState } from 'react'
import { adminAuditoria } from '../../lib/api'

export default function Reportes() {
  const [tipo, setTipo] = useState('')
  const [adminId, setAdminId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fTargetId, setFTargetId] = useState('')
  const [limit, setLimit] = useState(100)
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
      setItems(r.items ?? r)
      setTotal(r.total ?? (Array.isArray(r) ? r.length : 0))
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  function setPeriodo(days) {
    const now = new Date()
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    const toLocalInput = (d) => {
      const pad = (n) => String(n).padStart(2, '0')
      const yyyy = d.getFullYear()
      const mm = pad(d.getMonth() + 1)
      const dd = pad(d.getDate())
      const hh = pad(d.getHours())
      const mi = pad(d.getMinutes())
      return `${yyyy}-${mm}-${dd}T${hh}:${mi}`
    }
    setDesde(toLocalInput(start))
    setHasta(toLocalInput(now))
  }

  function exportCSV() {
    const cols = ['id','tipo','actorId','colegioId','aulaId','targetId','email','emailEnviado','ip','creadoEn']
    const header = cols.join(',')
    const lines = items.map(i => cols.map(c => {
      const v = i[c] ?? i[c.charAt(0).toUpperCase() + c.slice(1)]
      if (v == null) return ''
      const s = typeof v === 'string' ? v.replace(/"/g,'""') : String(v)
      return `"${s}"`
    }).join(','))
    const csv = [header, ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'auditoria_admin.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Reportes y Auditoría</h2>
      <div className="text-sm text-slate-600">Total: {total}</div>
      <div className="bg-white rounded-md border p-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <select className="h-9 px-3 rounded-md border text-sm" value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option value="">Tipo</option>
            <option value="admin_invitar_director">Invitar Director</option>
            <option value="admin_invitar_profesor">Invitar Profesor</option>
            <option value="admin_reset_password">Reset Password</option>
          </select>
          <input className="h-9 px-3 rounded-md border text-sm" placeholder="AdminId" value={adminId} onChange={e=>setAdminId(e.target.value)} />
          <input className="h-9 px-3 rounded-md border text-sm" placeholder="Email" value={fEmail} onChange={e=>setFEmail(e.target.value)} />
          <input className="h-9 px-3 rounded-md border text-sm" placeholder="TargetId" type="number" value={fTargetId} onChange={e=>setFTargetId(e.target.value)} />
          <input className="h-9 px-3 rounded-md border text-sm" type="datetime-local" value={desde} onChange={e=>setDesde(e.target.value)} />
          <input className="h-9 px-3 rounded-md border text-sm" type="datetime-local" value={hasta} onChange={e=>setHasta(e.target.value)} />
          <input className="h-9 px-3 rounded-md border text-sm" placeholder="Limit" type="number" min={1} max={500} value={limit} onChange={e=>setLimit(Number(e.target.value))} />
          <input className="h-9 px-3 rounded-md border text-sm" placeholder="Offset" type="number" min={0} value={offset} onChange={e=>setOffset(Number(e.target.value))} />
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex gap-2">
            <button className="h-7 px-3 rounded-md bg-slate-100 border text-xs" onClick={() => setPeriodo(0)}>Hoy</button>
            <button className="h-7 px-3 rounded-md bg-slate-100 border text-xs" onClick={() => setPeriodo(7)}>7 días</button>
            <button className="h-7 px-3 rounded-md bg-slate-100 border text-xs" onClick={() => setPeriodo(30)}>30 días</button>
          </div>
          <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" onClick={cargar} disabled={loading}>Buscar</button>
          <button className="h-9 px-4 rounded-md bg-slate-100 border text-sm" onClick={() => { setOffset(o => Math.max(0, o - limit)); cargar() }} disabled={offset===0}>Anterior</button>
          <button className="h-9 px-4 rounded-md bg-slate-100 border text-sm" onClick={() => { setOffset(o => o + limit); cargar() }} disabled={(offset+limit) >= total}>Siguiente</button>
          <button className="h-9 px-4 rounded-md bg-slate-100 border text-sm" onClick={exportCSV} disabled={items.length === 0}>Exportar CSV</button>
          {loading && <span className="text-sm text-slate-500">Cargando...</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
        <div className="overflow-x-auto rounded-md border bg-white mt-3">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Tipo</th>
                <th className="text-left px-3 py-2">Admin</th>
                <th className="text-left px-3 py-2">Colegio</th>
                <th className="text-left px-3 py-2">Aula</th>
                <th className="text-left px-3 py-2">Target</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Correo</th>
                <th className="text-left px-3 py-2">IP</th>
                <th className="text-left px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.Id || i.id} className="border-t">
                  <td className="px-3 py-2">{i.Id ?? i.id}</td>
                  <td className="px-3 py-2">{i.tipo}</td>
                  <td className="px-3 py-2">{i.actorId ?? i.ActorId}</td>
                  <td className="px-3 py-2">{i.ColegioId ?? i.colegioId ?? '—'}</td>
                  <td className="px-3 py-2">{i.AulaId ?? i.aulaId ?? '—'}</td>
                  <td className="px-3 py-2">{i.targetId ?? '—'}</td>
                  <td className="px-3 py-2">{i.email ?? '—'}</td>
                  <td className="px-3 py-2">{typeof i.emailEnviado === 'boolean' ? (i.emailEnviado ? 'enviado' : 'falló') : '—'}</td>
                  <td className="px-3 py-2">{i.ip ?? '—'}</td>
                  <td className="px-3 py-2">{(i.CreadoEn ?? i.creadoEn) ? new Date(i.CreadoEn ?? i.creadoEn).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={10}>Sin registros</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}