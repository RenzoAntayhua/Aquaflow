import { useEffect, useMemo, useState } from 'react'
import { adminBuscarUsuarios, adminInvitarDirector, adminInvitarProfesor, adminResetPassword } from '../../lib/api'

export default function Usuarios() {
  const [tab, setTab] = useState('buscar')

  const [q, setQ] = useState('')
  const [rol, setRol] = useState('')
  const [colegioId, setColegioId] = useState('')
  const [estado, setEstado] = useState('')
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [lista, setLista] = useState([])
  const [cargandoLista, setCargandoLista] = useState(false)
  const [errorLista, setErrorLista] = useState('')

  const filtros = useMemo(() => ({ q: q || undefined, rol: rol || undefined, colegioId: colegioId ? Number(colegioId) : undefined, estado: estado || undefined, limit, offset }), [q, rol, colegioId, estado, limit, offset])

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

  const [invNombreD, setInvNombreD] = useState('')
  const [invEmailD, setInvEmailD] = useState('')
  const [invColegioD, setInvColegioD] = useState('')
  const [invResD, setInvResD] = useState(null)
  const [invErrorD, setInvErrorD] = useState('')
  const [invLoadingD, setInvLoadingD] = useState(false)

  async function submitInvitarDirector(e) {
    e.preventDefault()
    if (!window.confirm(`¿Confirmas invitar al Director "${invNombreD}" (${invEmailD}) para el colegio ${invColegioD}?`)) return
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

  const [invNombreP, setInvNombreP] = useState('')
  const [invEmailP, setInvEmailP] = useState('')
  const [invColegioP, setInvColegioP] = useState('')
  const [invResP, setInvResP] = useState(null)
  const [invErrorP, setInvErrorP] = useState('')
  const [invLoadingP, setInvLoadingP] = useState(false)

  async function submitInvitarProfesor(e) {
    e.preventDefault()
    if (!window.confirm(`¿Confirmas invitar al Profesor "${invNombreP}" (${invEmailP}) para el colegio ${invColegioP}?`)) return
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

  const [resetUsuarioId, setResetUsuarioId] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetRes, setResetRes] = useState(null)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

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

  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Gestión de Usuarios</h2>
      <div className="flex gap-2 text-sm">
        <button className={`h-8 px-3 rounded-md border ${tab==='buscar'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700'}`} onClick={() => setTab('buscar')}>Búsqueda</button>
        <button className={`h-8 px-3 rounded-md border ${tab==='invitar'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700'}`} onClick={() => setTab('invitar')}>Invitar</button>
        <button className={`h-8 px-3 rounded-md border ${tab==='reset'?'bg-blue-600 text-white border-blue-600':'bg-white text-slate-700'}`} onClick={() => setTab('reset')}>Reset Password</button>
      </div>

      {tab === 'buscar' && (
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="Texto (nombre/email)" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="h-9 px-3 rounded-md border text-sm" value={rol} onChange={e=>setRol(e.target.value)}>
              <option value="">Rol</option>
              <option value="estudiante">Estudiante</option>
              <option value="profesor">Profesor</option>
              <option value="director">Director</option>
              <option value="admin">Admin</option>
            </select>
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="ColegioId" value={colegioId} onChange={e=>setColegioId(e.target.value)} />
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="Estado" value={estado} onChange={e=>setEstado(e.target.value)} />
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="Limit" type="number" min={1} max={200} value={limit} onChange={e=>setLimit(Number(e.target.value))} />
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="Offset" type="number" min={0} value={offset} onChange={e=>setOffset(Number(e.target.value))} />
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" onClick={buscarUsuarios} disabled={cargandoLista}>Buscar</button>
            {cargandoLista && <span className="text-sm text-slate-500">Cargando...</span>}
          </div>
          {errorLista && <div className="text-sm text-red-700">{errorLista}</div>}
          <div className="overflow-x-auto rounded-md border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Nombre</th>
                  <th className="text-left px-3 py-2">Email</th>
                  <th className="text-left px-3 py-2">Rol</th>
                  <th className="text-left px-3 py-2">Colegio</th>
                  <th className="text-left px-3 py-2">Estado</th>
                  <th className="text-left px-3 py-2">Creado</th>
                  <th className="text-left px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2">{u.id}</td>
                    <td className="px-3 py-2">{u.nombre}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.rol}</td>
                    <td className="px-3 py-2">{u.colegioId ?? '—'}</td>
                    <td className="px-3 py-2">{u.estado ?? '—'}</td>
                    <td className="px-3 py-2">{u.creadoEn ? new Date(u.creadoEn).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        className="h-7 px-3 rounded-md bg-slate-100 border text-xs"
                        onClick={async () => {
                          const uid = u.id
                          const mail = u.email
                          if (!window.confirm(`¿Resetear contraseña de ${mail || `ID ${uid}`}?`)) return
                          try {
                            const r = await adminResetPassword({ usuarioId: uid })
                            setResetRes(r)
                          } catch (e) {
                            setResetError(String(e.message || e))
                          }
                        }}
                      >Reset</button>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && !cargandoLista && (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>Sin resultados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'invitar' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-md border p-4 shadow">
            <h3 className="font-semibold mb-3">Invitar Director</h3>
            <form className="grid gap-3" onSubmit={submitInvitarDirector}>
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="Nombre" value={invNombreD} onChange={e=>setInvNombreD(e.target.value)} required />
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="Email" type="email" value={invEmailD} onChange={e=>setInvEmailD(e.target.value)} required />
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="ColegioId" type="number" value={invColegioD} onChange={e=>setInvColegioD(e.target.value)} required />
              <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" disabled={invLoadingD} type="submit">Invitar</button>
            </form>
            {invErrorD && <div className="mt-2 text-sm text-red-700">{invErrorD}</div>}
            {invResD && (
              <div className="mt-3 text-sm">
                <div>ID: {invResD.id}</div>
                <div>Nombre: {invResD.nombre}</div>
                <div>Email: {invResD.email}</div>
                <div>ColegioId: {invResD.colegioId}</div>
                <div>Correo enviado: {String(invResD.emailEnviado)}</div>
                {invResD.passwordTemporal && <div>Password temporal: {invResD.passwordTemporal}</div>}
              </div>
            )}
          </div>
          <div className="bg-white rounded-md border p-4 shadow">
            <h3 className="font-semibold mb-3">Invitar Profesor</h3>
            <form className="grid gap-3" onSubmit={submitInvitarProfesor}>
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="Nombre" value={invNombreP} onChange={e=>setInvNombreP(e.target.value)} required />
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="Email" type="email" value={invEmailP} onChange={e=>setInvEmailP(e.target.value)} required />
              <input className="h-9 px-3 rounded-md border text-sm" placeholder="ColegioId" type="number" value={invColegioP} onChange={e=>setInvColegioP(e.target.value)} required />
              <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" disabled={invLoadingP} type="submit">Invitar</button>
            </form>
            {invErrorP && <div className="mt-2 text-sm text-red-700">{invErrorP}</div>}
            {invResP && (
              <div className="mt-3 text-sm">
                <div>ID: {invResP.id}</div>
                <div>Nombre: {invResP.nombre}</div>
                <div>Email: {invResP.email}</div>
                <div>ColegioId: {invResP.colegioId}</div>
                <div>Correo enviado: {String(invResP.emailEnviado)}</div>
                {invResP.passwordTemporal && <div>Password temporal: {invResP.passwordTemporal}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'reset' && (
        <div className="bg-white rounded-md border p-4 shadow">
          <h3 className="font-semibold mb-3">Reset de contraseña de usuario</h3>
          <form className="grid md:grid-cols-2 gap-3" onSubmit={submitResetPassword}>
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="UsuarioId" type="number" value={resetUsuarioId} onChange={e=>setResetUsuarioId(e.target.value)} />
            <input className="h-9 px-3 rounded-md border text-sm" placeholder="Email" type="email" value={resetEmail} onChange={e=>setResetEmail(e.target.value)} />
            <div className="md:col-span-2 flex gap-2">
              <button className="h-9 px-4 rounded-md bg-blue-600 text-white text-sm" disabled={resetLoading} type="submit">Resetear</button>
              <span className="text-slate-500 text-sm">Completa uno de los dos campos</span>
            </div>
          </form>
          {resetError && <div className="mt-2 text-sm text-red-700">{resetError}</div>}
          {resetRes && (
            <div className="mt-3 text-sm">
              <div>ID: {resetRes.id}</div>
              <div>Email: {resetRes.email}</div>
              <div>Correo enviado: {String(resetRes.emailEnviado)}</div>
              {resetRes.passwordTemporal && <div>Password temporal: {resetRes.passwordTemporal}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}