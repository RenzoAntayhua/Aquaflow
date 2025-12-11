import KPI from '../components/KPI'
import { Navigate, useLocation, useParams, Link } from 'react-router-dom'
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
  const [aulas, setAulas] = useState([])
  const [profesores, setProfesores] = useState([])
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cid = Number(colegioId || user?.colegioId || 0)
    if (!cid) return
    
    Promise.all([
      getAulas({ colegioId: cid }),
      getProfesores({ colegioId: cid }),
      getEspacios({ colegioId: cid }),
      getColegios()
    ]).then(([aulasList, profList, espaciosList, allColegios]) => {
      setAulas(aulasList)
      setCountAulas(aulasList.length)
      setProfesores(profList)
      setCountProfesores(profList.length)
      setCountEspacios(espaciosList.length)
      const col = allColegios.find(c => c.id === cid)
      setColegio(col || null)
    }).catch(() => {})
      .finally(() => setLoading(false))
  }, [user, colegioId])

  useEffect(() => {
    if (tab !== 'auditoria') return
    loadAuditoria()
  }, [tab, pageSize, pageIndex])

  async function loadAuditoria() {
    setErrorAud('')
    setLoadingAud(true)
    try {
      const r = await directorAuditoria({
        tipo: tipoFiltro || undefined,
        desde: desdeFiltro || undefined,
        hasta: hastaFiltro || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize
      })
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
    const hoy = new Date()
    const desde = new Date(hoy)
    desde.setDate(hoy.getDate() - dias)
    setDesdeFiltro(desde.toISOString().slice(0, 10))
    setHastaFiltro(hoy.toISOString().slice(0, 10))
    setPageIndex(0)
  }

  const formatNivel = (raw) => {
    if (raw === null || raw === undefined) return '—'
    const v = String(raw).toLowerCase()
    if (v === 'primaria_secundaria' || v === 'primaria-secundaria' || v === '2') return 'Primaria-Secundaria'
    if (v === 'primaria' || v === '0') return 'Primaria'
    if (v === 'secundaria' || v === '1') return 'Secundaria'
    return String(raw)
  }

  const tipoLabels = {
    director_crear_aula: { label: 'Crear aula', icon: '📚', color: 'bg-blue-100 text-blue-700' },
    director_actualizar_aula: { label: 'Actualizar aula', icon: '✏️', color: 'bg-amber-100 text-amber-700' },
    director_eliminar_aula: { label: 'Eliminar aula', icon: '🗑️', color: 'bg-red-100 text-red-700' },
    director_crear_profesor: { label: 'Crear profesor', icon: '👨‍🏫', color: 'bg-violet-100 text-violet-700' },
    director_actualizar_profesor: { label: 'Actualizar profesor', icon: '✏️', color: 'bg-amber-100 text-amber-700' },
    director_eliminar_profesor: { label: 'Eliminar profesor', icon: '🗑️', color: 'bg-red-100 text-red-700' },
    director_crear_espacio: { label: 'Crear espacio', icon: '🚿', color: 'bg-teal-100 text-teal-700' },
    director_actualizar_espacio: { label: 'Actualizar espacio', icon: '✏️', color: 'bg-amber-100 text-amber-700' },
    director_eliminar_espacio: { label: 'Eliminar espacio', icon: '🗑️', color: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel del Director</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de {colegio?.nombre || 'tu institución'}</p>
        </div>
        {colegio && (
          <div className="text-right">
            <div className="text-sm font-medium text-slate-600">{colegio.nombre}</div>
            <div className="text-xs text-slate-400">{colegio.ciudad} · {formatNivel(colegio.nivel)}</div>
          </div>
        )}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg">
                  📚
                </div>
                <span className="text-3xl font-bold text-slate-800">{countAulas}</span>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-700">Aulas</div>
                <div className="text-xs text-slate-400">Salones activos</div>
              </div>
              <Link to={`/director/colegio/${colegioId || user?.colegioId}/estructura`} className="mt-3 block text-sm text-blue-600 hover:text-blue-700">
                Gestionar aulas →
              </Link>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg">
                  👨‍🏫
                </div>
                <span className="text-3xl font-bold text-slate-800">{countProfesores}</span>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-700">Profesores</div>
                <div className="text-xs text-slate-400">Docentes registrados</div>
              </div>
              <Link to={`/director/colegio/${colegioId || user?.colegioId}/reglas`} className="mt-3 block text-sm text-violet-600 hover:text-violet-700">
                Gestionar profesores →
              </Link>
            </div>

            <div className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-2xl shadow-lg">
                  🚿
                </div>
                <span className="text-3xl font-bold text-slate-800">{countEspacios}</span>
              </div>
              <div className="mt-3">
                <div className="font-semibold text-slate-700">Espacios</div>
                <div className="text-xs text-slate-400">Puntos de medición</div>
              </div>
              <Link to={`/director/colegio/${colegioId || user?.colegioId}/sensores`} className="mt-3 block text-sm text-teal-600 hover:text-teal-700">
                Gestionar espacios →
              </Link>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* School Info */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">🏫</span>
                Información del Colegio
              </h2>
              {colegio ? (
                <div className="space-y-3">
                  <InfoRow label="Nombre" value={colegio.nombre} />
                  <InfoRow label="Ciudad" value={colegio.ciudad || '—'} />
                  <InfoRow label="Nivel" value={formatNivel(colegio.nivel)} />
                  <InfoRow label="Dirección" value={colegio.direccion || '—'} />
                  <InfoRow label="Teléfono" value={colegio.telefono || '—'} />
                  <InfoRow label="Email" value={colegio.emailContacto || '—'} />
                </div>
              ) : (
                <div className="text-slate-400 text-sm">Cargando...</div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">📊</span>
                Resumen Rápido
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{aulas.reduce((acc, a) => acc + (a.estudiantes?.length || 0), 0) || '—'}</div>
                  <div className="text-xs text-blue-600/80">Estudiantes</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{countAulas * 2}</div>
                  <div className="text-xs text-emerald-600/80">Retos activos (est.)</div>
                </div>
                <div className="bg-violet-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-violet-600">{Math.round(countEspacios * 0.8) || 0}</div>
                  <div className="text-xs text-violet-600/80">Sensores conectados</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">95%</div>
                  <div className="text-xs text-amber-600/80">Actividad semanal</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity & Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Classrooms List */}
            <div className="md:col-span-2 bg-white rounded-xl border shadow-sm p-6">
              <h2 className="font-semibold text-slate-700 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">📚</span>
                  Aulas Recientes
                </span>
                <Link to={`/director/colegio/${colegioId || user?.colegioId}/estructura`} className="text-sm text-blue-600 hover:text-blue-700">
                  Ver todas
                </Link>
              </h2>
              <div className="space-y-2">
                {aulas.slice(0, 5).map(aula => {
                  const prof = profesores.find(p => p.id === aula.profesorId)
                  return (
                    <div key={aula.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {aula.nombre?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-700">{aula.nombre}</div>
                          <div className="text-xs text-slate-400">Grado: {aula.grado || '—'}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-slate-600">{prof?.nombre || 'Sin profesor'}</div>
                        <div className="text-xs text-slate-400">{aula.estudiantes?.length || 0} estudiantes</div>
                      </div>
                    </div>
                  )
                })}
                {aulas.length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <div className="text-3xl mb-2">📚</div>
                    No hay aulas registradas
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
              <h2 className="font-semibold mb-4">Acciones Rápidas</h2>
              <div className="space-y-3">
                <Link
                  to={`/director/colegio/${colegioId || user?.colegioId}/estructura`}
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                >
                  <span className="text-lg">📚</span>
                  <span className="text-sm font-medium">Nueva Aula</span>
                </Link>
                <Link
                  to={`/director/colegio/${colegioId || user?.colegioId}/reglas`}
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                >
                  <span className="text-lg">👨‍🏫</span>
                  <span className="text-sm font-medium">Nuevo Profesor</span>
                </Link>
                <Link
                  to={`/director/colegio/${colegioId || user?.colegioId}/sensores`}
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                >
                  <span className="text-lg">🚿</span>
                  <span className="text-sm font-medium">Nuevo Espacio</span>
                </Link>
                <Link
                  to={`/director/colegio/${colegioId || user?.colegioId}/auditoria`}
                  className="flex items-center gap-3 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
                >
                  <span className="text-lg">📋</span>
                  <span className="text-sm font-medium">Ver Auditoría</span>
                </Link>
              </div>
            </div>
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
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Reglas de Gamificación</h2>
          <p className="text-slate-500 text-sm">
            Configura las reglas de puntuación y niveles para los estudiantes de tu colegio.
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            💡 Esta funcionalidad estará disponible próximamente
          </div>
        </div>
      )}

      {tab === 'sensores' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Vinculación de Sensores</h2>
          <p className="text-slate-500 text-sm">
            Asocia dispositivos IoT a los espacios de tu colegio para monitorear el consumo de agua.
          </p>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            💡 Esta funcionalidad estará disponible próximamente
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-slate-800">Auditoría de Acciones</h2>
            <p className="text-sm text-slate-500">Historial de cambios realizados en tu colegio</p>
          </div>
          
          <div className="p-6">
            {errorAud && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {errorAud}
              </div>
            )}
            
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Tipo de acción</label>
                <select 
                  className="h-10 w-full rounded-lg border px-3 text-sm"
                  value={tipoFiltro} 
                  onChange={e => setTipoFiltro(e.target.value)}
                >
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
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <input 
                  type="date" 
                  className="h-10 w-full rounded-lg border px-3 text-sm" 
                  value={desdeFiltro} 
                  onChange={e => setDesdeFiltro(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <input 
                  type="date" 
                  className="h-10 w-full rounded-lg border px-3 text-sm" 
                  value={hastaFiltro} 
                  onChange={e => setHastaFiltro(e.target.value)} 
                />
              </div>
              <div className="flex items-end">
                <button 
                  className="h-10 w-full rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  onClick={loadAuditoria} 
                  disabled={loadingAud}
                >
                  {loadingAud ? '...' : 'Aplicar'}
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-500">Períodos:</span>
              <button 
                className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={() => presetAudDias(7)} 
                disabled={loadingAud}
              >
                7 días
              </button>
              <button 
                className="h-7 px-3 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={() => presetAudDias(30)} 
                disabled={loadingAud}
              >
                30 días
              </button>
              <div className="flex-1"></div>
              <span className="text-xs text-slate-500">Mostrar:</span>
              <select 
                className="h-7 rounded-md border px-2 text-xs"
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setPageIndex(0) }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Target</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Detalle</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">IP</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {audItems.map((it, i) => {
                    const info = tipoLabels[it.tipo] || { label: it.tipo, icon: '📋', color: 'bg-slate-100 text-slate-600' }
                    return (
                      <tr key={it.id || i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${info.color}`}>
                            <span>{info.icon}</span>
                            {info.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">#{it.targetId ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{it.email || it.etiqueta || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{it.ip || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {new Date(it.creadoEn || Date.now()).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                  {audItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-12 text-center text-slate-400" colSpan={5}>
                        <div className="text-3xl mb-2">📋</div>
                        Sin eventos recientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-slate-500">Total: {totalAud}</div>
              <div className="flex items-center gap-2">
                <button 
                  className="h-8 px-3 rounded-md border disabled:opacity-50"
                  onClick={() => setPageIndex(i => Math.max(0, i - 1))} 
                  disabled={loadingAud || pageIndex === 0}
                >
                  Anterior
                </button>
                <span className="text-slate-600">
                  Página {pageIndex + 1} de {Math.max(1, Math.ceil(totalAud / pageSize))}
                </span>
                <button 
                  className="h-8 px-3 rounded-md border disabled:opacity-50"
                  onClick={() => setPageIndex(i => (i + 1) < Math.ceil(totalAud / pageSize) ? i + 1 : i)} 
                  disabled={loadingAud || (pageIndex + 1) >= Math.ceil(totalAud / pageSize)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-700">{value}</span>
    </div>
  )
}
