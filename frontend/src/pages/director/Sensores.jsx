import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useEffect, useState } from 'react'
import { 
  crearEspacio, getEspacios, actualizarEspacio, eliminarEspacio,
  getSensoresColegio, registrarDispositivo, regenerarApiKeyDispositivo, 
  cambiarEstadoDispositivo, eliminarDispositivo 
} from '../../lib/api'

const tipoOptions = [
  { value: 'bano', label: 'Baño', icon: '🚻', color: 'bg-blue-100 text-blue-700' },
  { value: 'lavadero', label: 'Lavadero', icon: '🚿', color: 'bg-teal-100 text-teal-700' },
  { value: 'patio', label: 'Patio', icon: '🌳', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'otro', label: 'Otro', icon: '📍', color: 'bg-slate-100 text-slate-700' },
]

const tipoSensorOptions = [
  { value: 'YF-S201', label: 'YF-S201 (Estándar)', desc: '1-30 L/min' },
  { value: 'YF-B1', label: 'YF-B1 (Alto flujo)', desc: '1-60 L/min' },
  { value: 'YF-S401', label: 'YF-S401 (Bajo flujo)', desc: '0.3-6 L/min' },
]

const tipoEnum = { bano: 0, lavadero: 1, patio: 2, otro: 3 }
const tipoFromNum = ['bano', 'lavadero', 'patio', 'otro']

export default function DirectorSensores() {
  const { colegioId } = useParams()
  const { user } = useAuth()
  
  // Estados generales
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [activeTab, setActiveTab] = useState('espacios') // 'espacios' | 'dispositivos'
  const [searchTerm, setSearchTerm] = useState('')
  
  // Espacios
  const [espacios, setEspacios] = useState([])
  const [showEspacioForm, setShowEspacioForm] = useState(false)
  const [etiqueta, setEtiqueta] = useState('')
  const [tipo, setTipo] = useState('bano')
  const [editId, setEditId] = useState(null)
  const [editEtiqueta, setEditEtiqueta] = useState('')
  const [editTipo, setEditTipo] = useState('bano')

  // Dispositivos
  const [dispositivos, setDispositivos] = useState([])
  const [showDispForm, setShowDispForm] = useState(false)
  const [dispNombre, setDispNombre] = useState('')
  const [dispSensorId, setDispSensorId] = useState('')
  const [dispTipoSensor, setDispTipoSensor] = useState('YF-S201')
  const [dispEspacioId, setDispEspacioId] = useState('')
  const [dispDescripcion, setDispDescripcion] = useState('')
  
  // Modal para mostrar API Key
  const [showApiKeyModal, setShowApiKeyModal] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')
  const [newDispositivo, setNewDispositivo] = useState(null)

  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    loadEspacios()
    loadDispositivos()
  }, [colegioId])

  async function loadEspacios() {
    try {
      const list = await getEspacios({ colegioId })
      setEspacios(list)
    } catch (e) {
      setError(e.message)
    }
  }

  async function loadDispositivos() {
    try {
      const list = await getSensoresColegio({ colegioId })
      setDispositivos(list)
    } catch (e) {
      // Si no hay dispositivos o error, lista vacía
      setDispositivos([])
    }
  }

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(''), 4000)
    return () => clearTimeout(t)
  }, [msg])

  // ========== ESPACIOS ==========
  async function submitEspacio(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await crearEspacio({ colegioId: Number(colegioId), etiqueta, tipo: tipoEnum[tipo] })
      setEtiqueta('')
      setTipo('bano')
      setShowEspacioForm(false)
      await loadEspacios()
      setMsg('✓ Espacio creado exitosamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function startEditEspacio(esp) {
    setEditId(esp.id)
    setEditEtiqueta(esp.etiqueta || '')
    const t = typeof esp.tipo === 'number' ? tipoFromNum[esp.tipo] : (esp.tipo || 'bano')
    setEditTipo(t)
  }

  async function saveEditEspacio() {
    if (!editId) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await actualizarEspacio({ id: editId, etiqueta: editEtiqueta, tipo: tipoEnum[editTipo] })
      setEditId(null)
      await loadEspacios()
      setMsg('✓ Espacio actualizado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function cancelEditEspacio() {
    setEditId(null)
    setEditEtiqueta('')
    setEditTipo('bano')
  }

  async function handleDeleteEspacio(id, etiquetaEsp) {
    if (!window.confirm(`¿Estás seguro de eliminar el espacio "${etiquetaEsp}"?`)) return
    setLoading(true)
    setError('')
    setMsg('')
    try {
      await eliminarEspacio({ id })
      await loadEspacios()
      setMsg('✓ Espacio eliminado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ========== DISPOSITIVOS ==========
  async function submitDispositivo(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMsg('')
    try {
      const result = await registrarDispositivo({
        nombre: dispNombre,
        sensorId: dispSensorId,
        tipoSensor: dispTipoSensor,
        espacioId: Number(dispEspacioId),
        descripcion: dispDescripcion
      })
      
      // Guardar datos para mostrar en modal
      setNewDispositivo(result)
      setNewApiKey(result.apiKey)
      setShowApiKeyModal(true)
      
      // Limpiar form
      setDispNombre('')
      setDispSensorId('')
      setDispTipoSensor('YF-S201')
      setDispEspacioId('')
      setDispDescripcion('')
      setShowDispForm(false)
      
      await loadDispositivos()
      setMsg('✓ Dispositivo registrado exitosamente')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerarApiKey(disp) {
    if (!window.confirm(`¿Regenerar la API Key del dispositivo "${disp.nombre}"? Deberás actualizar el código del ESP32.`)) return
    setLoading(true)
    setError('')
    try {
      const result = await regenerarApiKeyDispositivo({ id: disp.id })
      setNewApiKey(result.apiKey)
      setNewDispositivo({ ...disp, apiKey: result.apiKey })
      setShowApiKeyModal(true)
      setMsg('✓ API Key regenerada')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleEstado(disp) {
    const nuevoEstado = disp.estado === 'activo' ? 'inactivo' : 'activo'
    setLoading(true)
    setError('')
    try {
      await cambiarEstadoDispositivo({ id: disp.id, estado: nuevoEstado })
      await loadDispositivos()
      setMsg(`✓ Dispositivo ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}`)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDispositivo(disp) {
    if (!window.confirm(`¿Eliminar el dispositivo "${disp.nombre}"? Esta acción no se puede deshacer.`)) return
    setLoading(true)
    setError('')
    try {
      await eliminarDispositivo({ id: disp.id })
      await loadDispositivos()
      setMsg('✓ Dispositivo eliminado')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    setMsg('✓ Copiado al portapapeles')
  }

  // Filtros
  const filteredEspacios = espacios.filter(e =>
    (e.etiqueta || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDispositivos = dispositivos.filter(d =>
    (d.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.sensorId || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTipoInfo = (tipoVal) => {
    const key = typeof tipoVal === 'number' ? tipoFromNum[tipoVal] : tipoVal
    return tipoOptions.find(t => t.value === key) || tipoOptions[3]
  }

  // Stats
  const countByType = espacios.reduce((acc, e) => {
    const key = typeof e.tipo === 'number' ? tipoFromNum[e.tipo] : (e.tipo || 'otro')
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const dispositivosActivos = dispositivos.filter(d => d.estado === 'activo').length
  const dispositivosOnline = dispositivos.filter(d => d.online).length

  // Mapeo de dispositivos a espacios
  const dispositivosPorEspacio = dispositivos.reduce((acc, d) => {
    if (d.espacioId) {
      acc[d.espacioId] = acc[d.espacioId] || []
      acc[d.espacioId].push(d)
    }
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sensores IoT</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona espacios y dispositivos de medición</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('espacios')}
          className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${
            activeTab === 'espacios'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📍 Espacios ({espacios.length})
        </button>
        <button
          onClick={() => setActiveTab('dispositivos')}
          className={`px-4 py-2 -mb-px text-sm font-medium transition-colors ${
            activeTab === 'dispositivos'
              ? 'border-b-2 border-teal-600 text-teal-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          📡 Dispositivos ({dispositivos.length})
        </button>
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
          <button onClick={() => setError('')} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* ========== TAB ESPACIOS ========== */}
      {activeTab === 'espacios' && (
        <>
          {/* Stats by Type */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {tipoOptions.map(opt => (
              <div key={opt.value} className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${opt.color} flex items-center justify-center text-xl`}>
                    {opt.icon}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-800">{countByType[opt.value] || 0}</div>
                    <div className="text-xs text-slate-400">{opt.label}s</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                className="h-10 w-full pl-10 pr-4 rounded-lg border text-sm focus:border-teal-500 outline-none"
                placeholder="Buscar espacios..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowEspacioForm(!showEspacioForm)}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-medium hover:shadow-lg hover:shadow-teal-500/30 transition-all"
            >
              <span>{showEspacioForm ? '✕' : '+'}</span>
              {showEspacioForm ? 'Cancelar' : 'Nuevo Espacio'}
            </button>
          </div>

          {/* Form Espacio */}
          {showEspacioForm && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">Nuevo Espacio</h2>
                <p className="text-white/80 text-sm">Registra un nuevo punto de medición de agua</p>
              </div>
              <form className="p-6" onSubmit={submitEspacio}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Etiqueta / Nombre *</label>
                    <input
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-teal-500 outline-none"
                      placeholder="Ej. Baños 2° piso"
                      value={etiqueta}
                      onChange={e => setEtiqueta(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Tipo de Espacio *</label>
                    <select
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-teal-500 outline-none"
                      value={tipo}
                      onChange={e => setTipo(e.target.value)}
                    >
                      {tipoOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 px-6 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creando...' : 'Crear Espacio'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid Espacios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEspacios.map(esp => {
              const tipoInfo = getTipoInfo(esp.tipo)
              const isEditing = editId === esp.id
              const sensoresVinculados = dispositivosPorEspacio[esp.id] || []
              
              return (
                <div key={esp.id} className="bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {isEditing ? (
                    <div className="p-4 space-y-3">
                      <input
                        className="h-10 w-full px-3 rounded-lg border text-sm"
                        value={editEtiqueta}
                        onChange={e => setEditEtiqueta(e.target.value)}
                        placeholder="Etiqueta"
                      />
                      <select
                        className="h-10 w-full px-3 rounded-lg border text-sm"
                        value={editTipo}
                        onChange={e => setEditTipo(e.target.value)}
                      >
                        {tipoOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveEditEspacio}
                          disabled={loading}
                          className="flex-1 h-9 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={cancelEditEspacio}
                          className="flex-1 h-9 rounded-lg border text-slate-600 text-sm hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`h-2 ${tipoInfo.color.replace('text-', 'bg-').replace('-700', '-500')}`} />
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl ${tipoInfo.color} flex items-center justify-center text-2xl`}>
                              {tipoInfo.icon}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800">{esp.etiqueta}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${tipoInfo.color}`}>
                                {tipoInfo.label}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">#{esp.id}</span>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t">
                          {sensoresVinculados.length > 0 ? (
                            <div className="space-y-2">
                              {sensoresVinculados.map(sensor => (
                                <div key={sensor.id} className="flex items-center gap-2 text-xs">
                                  <span className={`w-2 h-2 rounded-full ${sensor.online ? 'bg-green-500' : 'bg-slate-300'}`} />
                                  <span className="text-slate-600">{sensor.sensorId}</span>
                                  <span className={`px-1.5 py-0.5 rounded ${sensor.online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {sensor.online ? 'Online' : 'Offline'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>📡</span>
                              <span>Sin sensor vinculado</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEditEspacio(esp)}
                            className="h-8 w-8 rounded-lg border text-blue-600 hover:bg-blue-50 flex items-center justify-center"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteEspacio(esp.id, esp.etiqueta)}
                            className="h-8 w-8 rounded-lg border text-red-600 hover:bg-red-50 flex items-center justify-center"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            
            {filteredEspacios.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border">
                <div className="text-4xl mb-2">🚿</div>
                {searchTerm ? 'No se encontraron espacios' : 'No hay espacios registrados'}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========== TAB DISPOSITIVOS ========== */}
      {activeTab === 'dispositivos' && (
        <>
          {/* Stats Dispositivos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xl">📡</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{dispositivos.length}</div>
                  <div className="text-xs text-slate-400">Total</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl">✓</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{dispositivosActivos}</div>
                  <div className="text-xs text-slate-400">Activos</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center text-xl">🟢</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{dispositivosOnline}</div>
                  <div className="text-xs text-slate-400">Online</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <div className="text-2xl font-bold text-slate-800">{dispositivosActivos - dispositivosOnline}</div>
                  <div className="text-xs text-slate-400">Offline</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                className="h-10 w-full pl-10 pr-4 rounded-lg border text-sm focus:border-teal-500 outline-none"
                placeholder="Buscar dispositivos..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowDispForm(!showDispForm)}
              disabled={espacios.length === 0}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:shadow-lg hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={espacios.length === 0 ? 'Primero crea un espacio' : ''}
            >
              <span>{showDispForm ? '✕' : '+'}</span>
              {showDispForm ? 'Cancelar' : 'Nuevo Dispositivo'}
            </button>
          </div>

          {espacios.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>Primero debes crear al menos un espacio para poder vincular dispositivos.</span>
              </div>
            </div>
          )}

          {/* Form Dispositivo */}
          {showDispForm && espacios.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
                <h2 className="text-white font-semibold text-lg">Nuevo Dispositivo IoT</h2>
                <p className="text-white/80 text-sm">Registra un ESP32 con sensor de flujo</p>
              </div>
              <form className="p-6" onSubmit={submitDispositivo}>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Nombre del dispositivo *</label>
                    <input
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                      placeholder="Ej. Sensor Baño Principal"
                      value={dispNombre}
                      onChange={e => setDispNombre(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Sensor ID (único) *</label>
                    <input
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none font-mono"
                      placeholder="Ej. ESP32_CAUDAL_001"
                      value={dispSensorId}
                      onChange={e => setDispSensorId(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                      required
                    />
                    <p className="text-xs text-slate-400 mt-1">Solo letras, números y guiones bajos</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Tipo de Sensor</label>
                    <select
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                      value={dispTipoSensor}
                      onChange={e => setDispTipoSensor(e.target.value)}
                    >
                      {tipoSensorOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} - {opt.desc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Espacio donde se instalará *</label>
                    <select
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                      value={dispEspacioId}
                      onChange={e => setDispEspacioId(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar espacio...</option>
                      {espacios.map(esp => {
                        const info = getTipoInfo(esp.tipo)
                        return (
                          <option key={esp.id} value={esp.id}>{info.icon} {esp.etiqueta}</option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-slate-600 mb-1 block">Descripción (opcional)</label>
                    <input
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-violet-500 outline-none"
                      placeholder="Ej. Sensor instalado en el grifo principal del baño"
                      value={dispDescripcion}
                      onChange={e => setDispDescripcion(e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 px-6 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Registrando...' : 'Registrar Dispositivo'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista Dispositivos */}
          <div className="space-y-3">
            {filteredDispositivos.map(disp => {
              const espacio = espacios.find(e => e.id === disp.espacioId)
              const tipoInfo = espacio ? getTipoInfo(espacio.tipo) : null
              
              return (
                <div key={disp.id} className="bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        disp.online ? 'bg-green-100' : 'bg-slate-100'
                      }`}>
                        📡
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{disp.nombre}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            disp.estado === 'activo' 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {disp.estado}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            disp.online 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {disp.online ? '🟢 Online' : '🔴 Offline'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{disp.sensorId}</span>
                          {tipoInfo && (
                            <span className="flex items-center gap-1">
                              <span>{tipoInfo.icon}</span>
                              <span>{espacio?.etiqueta}</span>
                            </span>
                          )}
                        </div>
                        {disp.ultimaLectura && (
                          <div className="text-xs text-slate-400 mt-1">
                            Última lectura: {new Date(disp.ultimaLectura).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRegenerarApiKey(disp)}
                        className="h-8 px-3 rounded-lg border text-violet-600 hover:bg-violet-50 text-xs font-medium flex items-center gap-1"
                        title="Regenerar API Key"
                      >
                        🔑 API Key
                      </button>
                      <button
                        onClick={() => handleToggleEstado(disp)}
                        className={`h-8 w-8 rounded-lg border flex items-center justify-center ${
                          disp.estado === 'activo' 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={disp.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      >
                        {disp.estado === 'activo' ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleDeleteDispositivo(disp)}
                        className="h-8 w-8 rounded-lg border text-red-600 hover:bg-red-50 flex items-center justify-center"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {filteredDispositivos.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">
                <div className="text-4xl mb-2">📡</div>
                {searchTerm ? 'No se encontraron dispositivos' : 'No hay dispositivos registrados'}
                {!searchTerm && espacios.length > 0 && (
                  <p className="mt-2 text-sm">Haz clic en "Nuevo Dispositivo" para añadir uno</p>
                )}
              </div>
            )}
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-medium text-blue-800">¿Cómo configurar el ESP32?</h3>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Registra el dispositivo usando el formulario de arriba</li>
                  <li>Copia el <strong>Sensor ID</strong> y la <strong>API Key</strong> que se generan</li>
                  <li>En el código del ESP32, actualiza las variables <code className="bg-blue-100 px-1 rounded">SENSOR_ID</code> y <code className="bg-blue-100 px-1 rounded">API_KEY</code></li>
                  <li>Sube el código al ESP32 y ¡listo!</li>
                </ol>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal API Key */}
      {showApiKeyModal && newDispositivo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
              <h2 className="text-white font-semibold text-lg">🔑 Credenciales del Dispositivo</h2>
              <p className="text-white/80 text-sm">Guarda esta información, la API Key solo se muestra una vez</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Sensor ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 px-3 py-2 rounded-lg font-mono text-sm">
                    {newDispositivo.sensorId}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newDispositivo.sensorId)}
                    className="h-10 w-10 rounded-lg border hover:bg-slate-50 flex items-center justify-center"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">API Key <span className="text-red-500">(⚠️ Guárdala ahora)</span></label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg font-mono text-sm text-amber-800 break-all">
                    {newApiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newApiKey)}
                    className="h-10 w-10 rounded-lg border hover:bg-slate-50 flex items-center justify-center"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4 text-sm">
                <p className="font-medium text-slate-700 mb-2">Código para el ESP32:</p>
                <pre className="bg-slate-800 text-green-400 p-3 rounded-lg overflow-x-auto text-xs">
{`const char* SENSOR_ID = "${newDispositivo.sensorId}";
const char* API_KEY = "${newApiKey}";`}
                </pre>
              </div>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  setShowApiKeyModal(false)
                  setNewApiKey('')
                  setNewDispositivo(null)
                }}
                className="w-full h-10 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors"
              >
                Entendido, ya guardé la información
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
