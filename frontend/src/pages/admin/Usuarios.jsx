import { useEffect, useMemo, useState } from 'react'
import { adminBuscarUsuarios, adminInvitarDirector, adminInvitarProfesor, adminResetPassword } from '../../lib/api'

export default function Usuarios() {
  const [tab, setTab] = useState('buscar')

  // Search state
  const [q, setQ] = useState('')
  const [rol, setRol] = useState('')
  const [colegioId, setColegioId] = useState('')
  const [estado, setEstado] = useState('')
  const [limit, setLimit] = useState(25)
  const [offset, setOffset] = useState(0)
  const [lista, setLista] = useState([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')

  // Invite Director
  const [invNombreD, setInvNombreD] = useState('')
  const [invEmailD, setInvEmailD] = useState('')
  const [invColegioD, setInvColegioD] = useState('')
  const [invResD, setInvResD] = useState(null)
  const [invErrorD, setInvErrorD] = useState('')
  const [invLoadingD, setInvLoadingD] = useState(false)

  // Invite Profesor
  const [invNombreP, setInvNombreP] = useState('')
  const [invEmailP, setInvEmailP] = useState('')
  const [invColegioP, setInvColegioP] = useState('')
  const [invResP, setInvResP] = useState(null)
  const [invErrorP, setInvErrorP] = useState('')
  const [invLoadingP, setInvLoadingP] = useState(false)

  // Reset Password
  const [resetUsuarioId, setResetUsuarioId] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetRes, setResetRes] = useState(null)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const filtros = useMemo(() => ({
    q: q || undefined,
    rol: rol || undefined,
    colegioId: colegioId ? Number(colegioId) : undefined,
    estado: estado || undefined,
    limit,
    offset
  }), [q, rol, colegioId, estado, limit, offset])

  async function buscarUsuarios() {
    setCargandoLista(true)
    setErrorLista('')
    try {
      const r = await adminBuscarUsuarios(filtros)
      setLista(r)
    } catch (e) {
      setErrorLista(String(e.message || e))
    } finally {
      setCargandoLista(false)
    }
  }

  useEffect(() => {
    if (tab !== 'buscar') return
    buscarUsuarios()
  }, [tab])

  async function submitInvitarDirector(e) {
    e.preventDefault()
    if (!window.confirm(`¿Confirmas invitar al Director "${invNombreD}" (${invEmailD})?`)) return
    setInvLoadingD(true)
    setInvErrorD('')
    setInvResD(null)
    try {
      const r = await adminInvitarDirector({ nombre: invNombreD, email: invEmailD, colegioId: Number(invColegioD) })
      setInvResD(r)
      setInvNombreD('')
      setInvEmailD('')
      setInvColegioD('')
    } catch (e) {
      setInvErrorD(String(e.message || e))
    } finally {
      setInvLoadingD(false)
    }
  }

  async function submitInvitarProfesor(e) {
    e.preventDefault()
    if (!window.confirm(`¿Confirmas invitar al Profesor "${invNombreP}" (${invEmailP})?`)) return
    setInvLoadingP(true)
    setInvErrorP('')
    setInvResP(null)
    try {
      const r = await adminInvitarProfesor({ nombre: invNombreP, email: invEmailP, colegioId: Number(invColegioP) })
      setInvResP(r)
      setInvNombreP('')
      setInvEmailP('')
      setInvColegioP('')
    } catch (e) {
      setInvErrorP(String(e.message || e))
    } finally {
      setInvLoadingP(false)
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault()
    const label = resetUsuarioId ? `ID ${resetUsuarioId}` : resetEmail
    if (!label) return
    if (!window.confirm(`¿Confirmas resetear la contraseña del usuario ${label}?`)) return
    setResetLoading(true)
    setResetError('')
    setResetRes(null)
    try {
      const r = await adminResetPassword({ usuarioId: resetUsuarioId ? Number(resetUsuarioId) : undefined, email: resetEmail || undefined })
      setResetRes(r)
      setResetUsuarioId('')
      setResetEmail('')
    } catch (e) {
      setResetError(String(e.message || e))
    } finally {
      setResetLoading(false)
    }
  }

  const tabs = [
    { id: 'buscar', label: 'Búsqueda', icon: '🔍' },
    { id: 'invitar', label: 'Invitar', icon: '✉️' },
    { id: 'reset', label: 'Reset Password', icon: '🔑' },
  ]

  const rolColors = {
    estudiante: 'bg-sky-100 text-sky-700',
    profesor: 'bg-violet-100 text-violet-700',
    director: 'bg-amber-100 text-amber-700',
    admin: 'bg-rose-100 text-rose-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
          <p className="text-slate-500 text-sm mt-1">Buscar, invitar y gestionar usuarios del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Tab */}
      {tab === 'buscar' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Buscar</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" 
                  placeholder="Nombre o email..." 
                  value={q} 
                  onChange={e => setQ(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Rol</label>
                <select 
                  className="h-10 w-full px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  value={rol} 
                  onChange={e => setRol(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="estudiante">Estudiante</option>
                  <option value="profesor">Profesor</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Colegio ID</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none" 
                  placeholder="ID" 
                  value={colegioId} 
                  onChange={e => setColegioId(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Estado</label>
                <select 
                  className="h-10 w-full px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none"
                  value={estado} 
                  onChange={e => setEstado(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="flex items-end">
                <button 
                  className="h-10 px-6 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50"
                  onClick={buscarUsuarios} 
                  disabled={cargandoLista}
                >
                  {cargandoLista ? '...' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          {errorLista && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {errorLista}
            </div>
          )}

          {/* Results */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">ID</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Usuario</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Rol</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Colegio</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Creado</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500">#{u.id}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold">
                            {u.nombre?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800">{u.nombre}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${rolColors[u.rol] || 'bg-slate-100 text-slate-600'}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.colegioId ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          u.estado === 'activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {u.estado ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {u.creadoEn ? new Date(u.creadoEn).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                          onClick={async () => {
                            if (!window.confirm(`¿Resetear contraseña de ${u.email}?`)) return
                            try {
                              const r = await adminResetPassword({ usuarioId: u.id })
                              setResetRes(r)
                              alert(`Password temporal: ${r.passwordTemporal || 'Ver respuesta'}`)
                            } catch (e) {
                              alert(e.message)
                            }
                          }}
                        >
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lista.length === 0 && !cargandoLista && (
                    <tr>
                      <td className="px-4 py-12 text-center text-slate-400" colSpan={7}>
                        <div className="text-4xl mb-2">🔍</div>
                        No se encontraron usuarios
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
              <div className="text-sm text-slate-500">
                Mostrando {lista.length} resultados
              </div>
              <div className="flex items-center gap-2">
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
                <button
                  className="h-8 px-3 rounded border bg-white text-sm disabled:opacity-50"
                  onClick={() => setOffset(o => Math.max(0, o - limit))}
                  disabled={offset === 0}
                >
                  Anterior
                </button>
                <button
                  className="h-8 px-3 rounded border bg-white text-sm"
                  onClick={() => setOffset(o => o + limit)}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Tab */}
      {tab === 'invitar' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Invite Director */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span>👔</span> Invitar Director
              </h3>
            </div>
            <form className="p-6 space-y-4" onSubmit={submitInvitarDirector}>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Nombre completo</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-amber-500 outline-none" 
                  placeholder="Juan Pérez" 
                  value={invNombreD} 
                  onChange={e => setInvNombreD(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-amber-500 outline-none" 
                  type="email"
                  placeholder="director@colegio.edu" 
                  value={invEmailD} 
                  onChange={e => setInvEmailD(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">ID del Colegio</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-amber-500 outline-none" 
                  type="number"
                  placeholder="1" 
                  value={invColegioD} 
                  onChange={e => setInvColegioD(e.target.value)} 
                  required 
                />
              </div>
              <button 
                className="w-full h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                disabled={invLoadingD}
              >
                {invLoadingD ? 'Enviando...' : 'Enviar Invitación'}
              </button>
              {invErrorD && <div className="text-red-600 text-sm">{invErrorD}</div>}
              {invResD && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                  <div className="font-medium text-emerald-700 mb-2">✓ Director invitado</div>
                  <div className="text-slate-600 space-y-1">
                    <div>ID: {invResD.id}</div>
                    <div>Email: {invResD.email}</div>
                    {invResD.passwordTemporal && (
                      <div className="mt-2 p-2 bg-white rounded border font-mono text-xs">
                        Password: {invResD.passwordTemporal}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Invite Profesor */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-6 py-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span>👨‍🏫</span> Invitar Profesor
              </h3>
            </div>
            <form className="p-6 space-y-4" onSubmit={submitInvitarProfesor}>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Nombre completo</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none" 
                  placeholder="María García" 
                  value={invNombreP} 
                  onChange={e => setInvNombreP(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none" 
                  type="email"
                  placeholder="profesor@colegio.edu" 
                  value={invEmailP} 
                  onChange={e => setInvEmailP(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">ID del Colegio</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none" 
                  type="number"
                  placeholder="1" 
                  value={invColegioP} 
                  onChange={e => setInvColegioP(e.target.value)} 
                  required 
                />
              </div>
              <button 
                className="w-full h-10 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                disabled={invLoadingP}
              >
                {invLoadingP ? 'Enviando...' : 'Enviar Invitación'}
              </button>
              {invErrorP && <div className="text-red-600 text-sm">{invErrorP}</div>}
              {invResP && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                  <div className="font-medium text-emerald-700 mb-2">✓ Profesor invitado</div>
                  <div className="text-slate-600 space-y-1">
                    <div>ID: {invResP.id}</div>
                    <div>Email: {invResP.email}</div>
                    {invResP.passwordTemporal && (
                      <div className="mt-2 p-2 bg-white rounded border font-mono text-xs">
                        Password: {invResP.passwordTemporal}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Reset Tab */}
      {tab === 'reset' && (
        <div className="max-w-xl">
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span>🔑</span> Reset de Contraseña
              </h3>
              <p className="text-white/80 text-sm mt-1">Restablecer contraseña de cualquier usuario</p>
            </div>
            <form className="p-6 space-y-4" onSubmit={submitResetPassword}>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                💡 Puedes buscar por ID de usuario o por email
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">ID de Usuario</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-rose-500 outline-none" 
                  type="number"
                  placeholder="123" 
                  value={resetUsuarioId} 
                  onChange={e => setResetUsuarioId(e.target.value)} 
                />
              </div>
              <div className="text-center text-slate-400 text-sm">— o —</div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email</label>
                <input 
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-rose-500 outline-none" 
                  type="email"
                  placeholder="usuario@colegio.edu" 
                  value={resetEmail} 
                  onChange={e => setResetEmail(e.target.value)} 
                />
              </div>
              <button 
                className="w-full h-10 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium hover:shadow-lg transition-all disabled:opacity-50"
                disabled={resetLoading || (!resetUsuarioId && !resetEmail)}
              >
                {resetLoading ? 'Procesando...' : 'Resetear Contraseña'}
              </button>
              {resetError && <div className="text-red-600 text-sm">{resetError}</div>}
              {resetRes && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                  <div className="font-medium text-emerald-700 mb-2">✓ Contraseña reseteada</div>
                  <div className="text-slate-600 space-y-1">
                    <div>Usuario ID: {resetRes.id}</div>
                    <div>Email: {resetRes.email}</div>
                    {resetRes.passwordTemporal && (
                      <div className="mt-2 p-3 bg-white rounded border">
                        <div className="text-xs text-slate-500 mb-1">Nueva contraseña temporal:</div>
                        <div className="font-mono text-lg">{resetRes.passwordTemporal}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
