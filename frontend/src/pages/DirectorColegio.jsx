import KPI from '../components/KPI'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useEffect, useMemo, useState } from 'react'
import { getAulas, getProfesores, getEspacios, getColegios, directorAuditoria } from '../lib/api'

export default function DirectorColegio() {
  const { user } = useAuth()
  const { colegioId } = useParams()
  if (user?.requiereCambioPassword) {
    return <Navigate to="/password-change" replace />
  }
  const location = useLocation()
  const path = location.pathname || ''
  const tab = useMemo(() => {
    if (/\/estructura$/.test(path)) return 'estructura'
    if (/\/reglas$/.test(path)) return 'reglas'
    if (/\/sensores$/.test(path)) return 'sensores'
    if (/\/auditoria$/.test(path)) return 'auditoria'
    return 'dashboard'
  }, [path])
  const [countAulas, setCountAulas] = useState(0)
  const [countProfesores, setCountProfesores] = useState(0)
  const [countEspacios, setCountEspacios] = useState(0)
  const [colegio, setColegio] = useState(null)
  const [audItems, setAudItems] = useState([])
  const [errorAud, setErrorAud] = useState('')
  const [loadingAud, setLoadingAud] = useState(false)
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [desdeFiltro, setDesdeFiltro] = useState('')
  const [hastaFiltro, setHastaFiltro] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [pageIndex, setPageIndex] = useState(0)
  const [totalAud, setTotalAud] = useState(0)

  useEffect(() => {
    const cid = Number(colegioId || user?.colegioId || 0)
    if (!cid) return
    getAulas({ colegioId: cid }).then(list => setCountAulas(list.length)).catch(() => {})
    getProfesores({ colegioId: cid }).then(list => setCountProfesores(list.length)).catch(() => {})
    getEspacios({ colegioId: cid }).then(list => setCountEspacios(list.length)).catch(() => {})
    getColegios().then(all => {
      const col = all.find(c => c.id === cid)
      setColegio(col || null)
    }).catch(() => {})
  }, [user, colegioId])

  useEffect(() => {
    if (tab !== 'auditoria') return
    setErrorAud('')
    setLoadingAud(true)
    directorAuditoria({ limit: pageSize, offset: pageIndex * pageSize }).then(r => {
      const items = Array.isArray(r.items) ? r.items : (Array.isArray(r) ? r : [])
      setAudItems(items)
      setTotalAud(typeof r.total === 'number' ? r.total : items.length)
    }).catch(e => setErrorAud(e.message)).finally(() => setLoadingAud(false))
  }, [tab, pageSize, pageIndex])

  async function aplicarFiltrosAud() {
    setErrorAud('')
    setLoadingAud(true)
    try {
      const r = await directorAuditoria({ tipo: tipoFiltro || undefined, desde: desdeFiltro || undefined, hasta: hastaFiltro || undefined, limit: pageSize, offset: pageIndex * pageSize })
      const items = Array.isArray(r.items) ? r.items : (Array.isArray(r) ? r : [])
      setAudItems(items)
      setTotalAud(typeof r.total === 'number' ? r.total : items.length)
    } catch (e) {
      setErrorAud(e.message)
    } finally {
      setLoadingAud(false)
    }
  }

  function presetAudDias(dias) {
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setDate(hoy.getDate() - dias);
    setDesdeFiltro(desde.toISOString().slice(0,10))
    setHastaFiltro(hoy.toISOString().slice(0,10))
    setPageIndex(0)
    aplicarFiltrosAud()
  }
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Panel del Director</h1>
      {tab === 'dashboard' && (
        <div className="grid gap-6">
          <div className="bg-card rounded-xl border p-6 shadow">
            <h2 className="text-lg font-semibold mb-2">Colegio</h2>
            <div className="text-sm text-slate-700">
              <div><span className="text-slate-500">Nombre:</span> {colegio ? colegio.nombre : '—'}</div>
              <div><span className="text-slate-500">Ciudad:</span> {colegio ? (colegio.ciudad || '—') : '—'}</div>
              <div><span className="text-slate-500">Nivel:</span> {(() => {
                const raw = colegio ? colegio.nivel : null
                if (raw === null || raw === undefined) return '—'
                const v = String(raw).toLowerCase()
                if (v === 'primaria_secundaria' || v === 'primaria-secundaria' || v === '2') return 'Primaria-Secundaria'
                if (v === 'primaria' || v === '0') return 'Primaria'
                if (v === 'secundaria' || v === '1') return 'Secundaria'
                return String(raw)
              })()}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Aulas" value={countAulas} />
            <KPI title="Profesores" value={countProfesores} />
            <KPI title="Espacios" value={countEspacios} />
          </div>
        </div>
      )}
      {tab === 'estructura' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPI title="Aulas" value={countAulas} />
          <KPI title="Profesores" value={countProfesores} />
          <KPI title="Espacios" value={countEspacios} />
        </div>
      )}
      {tab === 'reglas' && (
        <div className="rounded-md bg-white p-4 shadow text-sm text-slate-600">
          Reglas escolares de gamificación (placeholder)
        </div>
      )}
      {tab === 'sensores' && (
        <div className="rounded-md bg-white p-4 shadow text-sm text-slate-600">
          Vinculación de sensores a espacios (placeholder)
        </div>
      )}
      {tab === 'auditoria' && (
        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Auditoría de acciones</h2>
          {errorAud && <div className="text-red-700 text-sm mb-2">{errorAud}</div>}
          <div className="mb-3 grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600" htmlFor="tipoAud">Tipo</label>
              <select id="tipoAud" className="h-9 w-full rounded-md border px-2" value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}>
                <option value="">(todos)</option>
                <option value="director_crear_aula">Crear aula</option>
                <option value="director_actualizar_aula">Actualizar aula</option>
                <option value="director_eliminar_aula">Eliminar aula</option>
                <option value="director_crear_profesor">Crear profesor</option>
                <option value="director_actualizar_profesor">Actualizar profesor</option>
                <option value="director_eliminar_profesor">Eliminar profesor</option>
                <option value="director_crear_espacio">Crear espacio</option>
                <option value="director_actualizar_espacio">Actualizar espacio</option>
                <option value="director_eliminar_espacio">Eliminar espacio</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600" htmlFor="desdeAud">Desde</label>
              <input id="desdeAud" type="date" className="h-9 w-full rounded-md border px-2" value={desdeFiltro} onChange={e=>setDesdeFiltro(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-600" htmlFor="hastaAud">Hasta</label>
              <input id="hastaAud" type="date" className="h-9 w-full rounded-md border px-2" value={hastaFiltro} onChange={e=>setHastaFiltro(e.target.value)} />
            </div>
            <div className="flex items-end">
              <button className="h-9 px-3 rounded-md bg-primary text-primary-foreground" onClick={aplicarFiltrosAud} disabled={loadingAud}>{loadingAud ? 'Cargando…' : 'Aplicar'}</button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <div className="flex gap-2">
              <button className="h-8 px-3 rounded-md border" onClick={()=>presetAudDias(7)} disabled={loadingAud}>Últimos 7 días</button>
              <button className="h-8 px-3 rounded-md border" onClick={()=>presetAudDias(30)} disabled={loadingAud}>Últimos 30 días</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Tamaño de página</span>
              <select className="h-8 rounded-md border px-2" value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPageIndex(0); }}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="border rounded-md">
            <div className="grid grid-cols-5 text-xs font-medium text-slate-500 px-3 py-2 border-b">
              <div>Tipo</div>
              <div>Target</div>
              <div>Detalle</div>
              <div>IP</div>
              <div>Fecha</div>
            </div>
            {audItems.map((it, i) => (
              <div key={it.id || i} className={`px-3 py-2 text-sm ${i>0 ? 'border-t' : ''}`}>
                <div className="grid grid-cols-5 items-center">
                  <div>{it.tipo || '—'}</div>
                  <div>{it.targetId ?? '—'}</div>
                  <div>{it.email || it.etiqueta || '—'}</div>
                  <div>{it.ip || '—'}</div>
                  <div>{new Date(it.creadoEn || Date.now()).toLocaleString()}</div>
                </div>
              </div>
            ))}
            {audItems.length === 0 && (
              <div className="px-3 py-2 text-sm text-slate-500">Sin eventos recientes.</div>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <div className="text-slate-600">Total: {totalAud}</div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 rounded-md border" onClick={()=>setPageIndex(i=>Math.max(0, i-1))} disabled={loadingAud || pageIndex===0}>Anterior</button>
              <span>Página {pageIndex+1} de {Math.max(1, Math.ceil(totalAud / pageSize))}</span>
              <button className="h-8 px-3 rounded-md border" onClick={()=>setPageIndex(i=> (i+1) < Math.ceil(totalAud / pageSize) ? i+1 : i)} disabled={loadingAud || (pageIndex+1)>=Math.ceil(totalAud/pageSize)}>Siguiente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}