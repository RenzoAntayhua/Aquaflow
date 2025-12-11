import { useEffect, useState } from 'react'
import { crearColegioConDirector, getColegios } from '../../lib/api'
import UbigeoSelector from '../../components/UbigeoSelector'

export default function Colegios() {
  const [colegios, setColegios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Form state
  const [nombre, setNombre] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [email, setEmail] = useState('')
  const [directorNombre, setDirectorNombre] = useState('')
  const [directorEmail, setDirectorEmail] = useState('')
  const [distritoId, setDistritoId] = useState(null)
  const [codigoLocal, setCodigoLocal] = useState('')
  const [nivel, setNivel] = useState('primaria')
  const [direccion, setDireccion] = useState('')
  const [direccionExacta, setDireccionExacta] = useState('')
  const [telefono, setTelefono] = useState('')
  const [estado, setEstado] = useState('activo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadColegios()
  }, [])

  async function loadColegios() {
    try {
      const cols = await getColegios()
      setColegios(cols)
    } catch (e) {
      setError('No se pudieron cargar colegios')
    } finally {
      setLoading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!distritoId) {
      setError('Debes seleccionar un distrito')
      return
    }
    
    const phoneOk = /^\+?[\d\s-]{7,15}$/.test(telefono)
    if (!phoneOk) {
      setError('Teléfono inválido. Usa 7-15 caracteres.')
      return
    }
    
    setSubmitting(true)
    try {
      await crearColegioConDirector({
        nombre, distritoId, ciudad, emailContacto: email,
        directorNombre, directorEmail, codigoLocal, nivel,
        direccion, direccionExacta, telefono, estado
      })
      await loadColegios()
      setSuccess('Colegio y director creados exitosamente')
      resetForm()
      setShowForm(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setNombre(''); setCiudad(''); setEmail(''); setDirectorNombre('')
    setDirectorEmail(''); setDistritoId(null); setCodigoLocal('')
    setNivel('primaria'); setDireccion(''); setDireccionExacta('')
    setTelefono(''); setEstado('activo')
  }

  const formatNivel = (raw) => {
    if (!raw) return '—'
    const v = String(raw).toLowerCase()
    if (v === 'primaria_secundaria' || v === 'primaria-secundaria' || v === '2') return 'Primaria-Secundaria'
    if (v === 'primaria' || v === '0') return 'Primaria'
    if (v === 'secundaria' || v === '1') return 'Secundaria'
    return raw
  }

  const filteredColegios = colegios.filter(col => {
    const name = (col.Nombre || col.nombre || '').toLowerCase()
    const city = (col.Ciudad || col.ciudad || '').toLowerCase()
    return name.includes(searchTerm.toLowerCase()) || city.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Colegios</h1>
          <p className="text-slate-500 text-sm mt-1">{colegios.length} instituciones registradas</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg hover:shadow-blue-500/30 transition-all"
        >
          <span>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Cancelar' : 'Nuevo Colegio'}
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-emerald-500 text-xl">✓</span>
          <span className="text-emerald-700">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <h2 className="text-white font-semibold text-lg">Alta de Colegio + Director</h2>
            <p className="text-white/80 text-sm">Complete los datos para registrar un nuevo colegio</p>
          </div>
          <form className="p-6" onSubmit={submit}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - School Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span>🏫</span> Información del Colegio
                </h3>
                
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Nombre del Colegio *</label>
                  <input 
                    className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                    placeholder="I.E. San Martín"
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Código Local *</label>
                    <input 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                      placeholder="123456"
                      value={codigoLocal} 
                      onChange={e => setCodigoLocal(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Nivel *</label>
                    <select 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
                      value={nivel} 
                      onChange={e => setNivel(e.target.value)}
                    >
                      <option value="primaria">Primaria</option>
                      <option value="secundaria">Secundaria</option>
                      <option value="primaria-secundaria">Primaria-Secundaria</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Ubicación (Departamento/Provincia/Distrito) *</label>
                  <UbigeoSelector onChange={({ distrito }) => {
                    const nombreD = distrito ? (distrito.Nombre || distrito.nombre || '') : ''
                    const id = distrito ? (distrito.Id || distrito.id) : null
                    setCiudad(nombreD)
                    setDistritoId(id)
                  }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Dirección *</label>
                    <input 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                      placeholder="Av. Principal 123"
                      value={direccion} 
                      onChange={e => setDireccion(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Referencia</label>
                    <input 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                      placeholder="Frente al parque"
                      value={direccionExacta} 
                      onChange={e => setDireccionExacta(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Teléfono *</label>
                    <input 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                      placeholder="+51 999 999 999"
                      value={telefono} 
                      onChange={e => setTelefono(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Estado</label>
                    <select 
                      className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none"
                      value={estado} 
                      onChange={e => setEstado(e.target.value)}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Email de Contacto *</label>
                  <input 
                    className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                    type="email"
                    placeholder="contacto@colegio.edu.pe"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              {/* Right Column - Director Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <span>👔</span> Información del Director
                </h3>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  💡 Se creará una cuenta para el director con una contraseña temporal
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Nombre del Director *</label>
                  <input 
                    className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                    placeholder="Juan Pérez"
                    value={directorNombre} 
                    onChange={e => setDirectorNombre(e.target.value)} 
                    required 
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Email del Director *</label>
                  <input 
                    className="h-10 w-full px-3 rounded-lg border text-sm focus:border-blue-500 outline-none" 
                    type="email"
                    placeholder="director@colegio.edu.pe"
                    value={directorEmail} 
                    onChange={e => setDirectorEmail(e.target.value)} 
                    required 
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !distritoId}
                    className="w-full h-12 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Creando...' : '🏫 Crear Colegio + Director'}
                  </button>
                </div>
              </div>
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
            placeholder="Buscar por nombre o ciudad..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-slate-500">
          {filteredColegios.length} de {colegios.length}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredColegios.map(col => (
            <div 
              key={col.Id || col.id} 
              className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl shadow-lg">
                    🏫
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{col.Nombre || col.nombre}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        📍 {col.Ciudad || col.ciudad || '—'}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="flex items-center gap-1">
                        📚 {formatNivel(col.Nivel || col.nivel)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    (col.Estado || col.estado) === 'activo' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {(col.Estado || col.estado) || 'activo'}
                  </span>
                  <span className="text-slate-400 text-sm">#{col.Id || col.id}</span>
                </div>
              </div>
              {(col.Direccion || col.direccion) && (
                <div className="mt-3 pt-3 border-t text-sm text-slate-500">
                  📬 {col.Direccion || col.direccion}
                  {(col.DireccionExacta || col.direccionExacta) && ` - ${col.DireccionExacta || col.direccionExacta}`}
                </div>
              )}
            </div>
          ))}
          
          {filteredColegios.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">🏫</div>
              {searchTerm ? 'No se encontraron colegios' : 'No hay colegios registrados'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
