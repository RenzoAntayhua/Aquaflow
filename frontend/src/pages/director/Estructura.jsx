import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { crearAula, getAulas, getProfesores, getEspacios, actualizarAula, eliminarAula } from '../../lib/api'

export default function DirectorEstructura() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  const [aulas, setAulas] = useState([])
  const [profesores, setProfesores] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state
  const [nombre, setNombre] = useState('')
  const [grado, setGrado] = useState('')
  const [profesorId, setProfesorId] = useState('')
  
  // Edit state
  const [editId, setEditId] = useState(null)
  const [editNombre, setEditNombre] = useState('')
  const [editGrado, setEditGrado] = useState('')
  const [editProfesorId, setEditProfesorId] = useState('')

  // Stats
  const [countAulas, setCountAulas] = useState(0)
  const [countProfesores, setCountProfesores] = useState(0)
  const [countEspacios, setCountEspacios] = useState(0)

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    loadData()
  }, [colegioId])

  async function loadData() {
    try {
      const [aulasList, profList, espaciosList] = await Promise.all([
        getAulas({ colegioId }),
        getProfesores({ colegioId }),
        getEspacios({ colegioId })
      ])
      setAulas(aulasList)
      setCountAulas(aulasList.length)
      setProfesores(profList)
      setCountProfesores(profList.length)
      setCountEspacios(espaciosList.length)
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
      await crearAula({
        colegioId: Number(colegioId),
        nombre,
        grado,
        profesorId: profesorId ? Number(profesorId) : null
      })
      setProfesorId('')
      setNombre('')
      setGrado('')
      setShowForm(false)
      await loadData()
      setMsg('✓ Aula creada exitosamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEdit(a) {
    setEditId(a.id)
    setEditNombre(a.nombre || '')
    setEditGrado(a.grado || '')
    setEditProfesorId(a.profesorId || '')
  }

  async function saveEdit() {
    if (!editId) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await actualizarAula({
        id: editId,
        nombre: editNombre,
        grado: editGrado,
        profesorId: editProfesorId ? Number(editProfesorId) : null
      })
      setEditId(null)
      await loadData()
      setMsg('✓ Aula actualizada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function cancelEdit() {
    setEditId(null)
    setEditNombre('')
    setEditGrado('')
    setEditProfesorId('')
  }

  async function handleDelete(id, nombre) {
    if (!window.confirm(`¿Estás seguro de eliminar el aula "${nombre}"?`)) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await eliminarAula({ id })
      await loadData()
      setMsg('✓ Aula eliminada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredAulas = aulas.filter(a => 
    (a.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.grado || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Aulas</h1>
          <p className="text-slate-500 text-sm mt-1">Administra las aulas de tu institución</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          <span>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Cancelar' : 'Nueva Aula'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon="📚" label="Aulas" value={countAulas} color="blue" />
        <StatCard icon="👨‍🏫" label="Profesores" value={countProfesores} color="violet" />
        <StatCard icon="🚿" label="Espacios" value={countEspacios} color="teal" />
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-white font-semibold text-lg">Nueva Aula</h2>
          </div>
          <form className="p-6" onSubmit={submit}>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Nombre del Aula *</label>
                <input
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
                  placeholder="Ej. 2°A"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Grado</label>
                <input
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
                  placeholder="Ej. 2° Primaria"
                  value={grado}
                  onChange={e => setGrado(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Profesor Asignado</label>
                <select
                  className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
                  value={profesorId}
                  onChange={e => setProfesorId(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {profesores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="h-10 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Aula'}
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
            className="h-10 w-full pl-10 pr-4 rounded-lg border text-sm focus:border-blue-500 outline-none"
            placeholder="Buscar aulas..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500">
          {filteredAulas.length} de {aulas.length}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Aula</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Grado</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Profesor</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAulas.map(a => {
              const prof = profesores.find(p => p.id === a.profesorId)
              const isEditing = editId === a.id
              
              return (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="h-9 w-full px-2 rounded-lg border text-sm"
                        value={editNombre}
                        onChange={e => setEditNombre(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                          {a.nombre?.charAt(0) || '?'}
                        </div>
                        <span className="font-medium text-slate-700">{a.nombre}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="h-9 w-full px-2 rounded-lg border text-sm"
                        value={editGrado}
                        onChange={e => setEditGrado(e.target.value)}
                      />
                    ) : (
                      <span className="text-slate-600">{a.grado || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        className="h-9 w-full px-2 rounded-lg border text-sm"
                        value={editProfesorId}
                        onChange={e => setEditProfesorId(e.target.value)}
                      >
                        <option value="">Sin asignar</option>
                        {profesores.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-600">{prof?.nombre || '—'}</span>
                    )}
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
                          onClick={() => startEdit(a)}
                          className="h-8 px-3 rounded-lg border text-blue-600 text-xs hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(a.id, a.nombre)}
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
            {filteredAulas.length === 0 && (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={4}>
                  <div className="text-4xl mb-2">📚</div>
                  {searchTerm ? 'No se encontraron aulas' : 'No hay aulas registradas'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const colors = {
    blue: 'from-blue-500 to-indigo-600',
    violet: 'from-violet-500 to-purple-600',
    teal: 'from-teal-500 to-emerald-600',
  }
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-2xl shadow-lg`}>
          {icon}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  )
}
