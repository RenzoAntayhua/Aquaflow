import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearProfesor, getProfesores, actualizarProfesor, eliminarProfesor } from '../../lib/api'

export default function DirectorReglas() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [profesores, setProfesores] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  
  // Edit state
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editEmail, setEditEmail] = useState('')

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    loadProfesores()
  }, [colegioId])

  async function loadProfesores() {
    try {
      const list = await getProfesores({ colegioId })
      setProfesores(list)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 3000)
    return () => clearTimeout(t)
  }, [msg])

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await crearProfesor({ colegioId: Number(colegioId), nombre, email })
      setNombre('')
      setEmail('')
      setShowForm(false)
      await loadProfesores()
      setMsg('✓ Profesor creado exitosamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(p) {
    setEditId(p.id)
    setEditNombre(p.nombre || '')
    setEditEmail(p.email || '')
  }

  async function saveEdit() {
    if (!editId) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await actualizarProfesor({ id: editId, nombre: editNombre, email: editEmail })
      setEditId(null)
      await loadProfesores()
      setMsg('✓ Profesor actualizado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function cancelEdit() {
    setEditId(null)
    setEditNombre('')
    setEditEmail('')
  }

  async function handleDelete(id, nombre) {
    if (!window.confirm(`¿Estás seguro de eliminar al profesor "${nombre}"?`)) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await eliminarProfesor({ id })
      await loadProfesores()
      setMsg('✓ Profesor eliminado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredProfesores = profesores.filter(p =>
    (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Profesores</h1>
          <p className="text-slate-500 text-sm mt-1">Administra el equipo docente de tu institución</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all"
        >
          <span>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Cancelar' : 'Nuevo Profesor'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl shadow-lg">
              👨‍🏫
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">{profesores.length}</div>
              <div className="text-xs text-slate-400">Total Profesores</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl shadow-lg">
              ✅
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">{profesores.filter(p => p.estado === 'activo').length || profesores.length}</div>
              <div className="text-xs text-slate-400">Activos</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-lg">
              📧
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">{profesores.filter(p => p.email).length}</div>
              <div className="text-xs text-slate-400">Con Email</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
            <h2 className="text-white font-semibold text-lg">Nuevo Profesor</h2>
            <p className="text-white/80 text-sm">Se creará una cuenta con contraseña temporal</p>
          </div>
          <form className="p-6" onSubmit={submit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Nombre Completo *</label>
                <input
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                  placeholder="Juan García"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Email *</label>
                <input
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                  type="email"
                  placeholder="profesor@colegio.edu.pe"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-6 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Profesor'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            className="h-10 w-full pl-10 pr-4 rounded-lg border text-sm focus:border-violet-500 outline-none"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500">
          {filteredProfesores.length} de {profesores.length}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Profesor</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProfesores.map(p => {
              const isEditing = editId === p.id
              
              return (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="h-9 w-full px-2 rounded-lg border text-sm"
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {p.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="font-medium text-slate-700">{p.nombre}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="h-9 w-full px-2 rounded-lg border text-sm"
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                      />
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">{p.email}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.estado === 'activo' || !p.estado
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.estado || 'activo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={loading}
                          className="h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="h-8 px-3 rounded-lg border text-slate-600 text-xs hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(p)}
                          className="h-8 px-3 rounded-lg border text-violet-600 text-xs hover:bg-violet-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nombre)}
                          className="h-8 px-3 rounded-lg border text-red-600 text-xs hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {filteredProfesores.length === 0 && (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={4}>
                  <div className="text-4xl mb-2">👨‍🏫</div>
                  {searchTerm ? 'No se encontraron profesores' : 'No hay profesores registrados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
