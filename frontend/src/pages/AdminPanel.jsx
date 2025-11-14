import { useEffect, useState } from 'react'
import { crearColegioConDirector, getCiudades, getColegios } from '../lib/api'
import UbigeoSelector from '../components/UbigeoSelector'

export default function AdminPanel() {
  const formatNivel = (raw) => {
    if (!raw) return '—'
    const v = String(raw).toLowerCase()
    if (v === 'primaria_secundaria' || v === 'primaria-secundaria') return 'Primaria-Secundaria'
    if (v === 'primaria') return 'Primaria'
    if (v === 'secundaria') return 'Secundaria'
    return raw
  }
  const [colegios, setColegios] = useState([])
  const [ciudades, setCiudades] = useState([])
  const [error, setError] = useState('')

  // Form colegio
  const [nombreColegio, setNombreColegio] = useState('')
  const [ciudadColegio, setCiudadColegio] = useState('')
  const [emailColegio, setEmailColegio] = useState('')
  const [directorNombre, setDirectorNombre] = useState('')
  const [directorEmail, setDirectorEmail] = useState('')
  const [distritoId, setDistritoId] = useState(null)
  // Campos adicionales de la tabla Colegios
  const [codigoLocal, setCodigoLocal] = useState('')
  const [nivel, setNivel] = useState('primaria')
  const [direccion, setDireccion] = useState('')
  const [direccionExacta, setDireccionExacta] = useState('')
  const [telefono, setTelefono] = useState('')
  const [estado, setEstado] = useState('activo')
  const [loadingColegio, setLoadingColegio] = useState(false)

  // Aulas (el administrador no crea aulas; sección removida)

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [cols, ciuds] = await Promise.all([getColegios(), getCiudades()])
        if (!alive) return
        setColegios(cols)
        setCiudades(ciuds)
      } catch (e) {
        setError('No se pudieron cargar datos iniciales')
      }
    }
    load()
    return () => { alive = false }
  }, [])

  // Sin carga de aulas en el panel del administrador

  async function submitColegio(e) {
    e.preventDefault()
    setError('')
    setLoadingColegio(true)
    try {
      if (!distritoId) {
        setError('Debes seleccionar un distrito')
        setLoadingColegio(false)
        return
      }
      const phoneOk = /^\+?[\d\s-]{7,15}$/.test(telefono)
      if (!phoneOk) {
        setError('Teléfono inválido. Usa 7-15 caracteres: dígitos, espacios o guiones, con "+" opcional al inicio.')
        setLoadingColegio(false)
        return
      }
      const resp = await crearColegioConDirector({ nombre: nombreColegio, distritoId, ciudad: ciudadColegio, emailContacto: emailColegio, directorNombre, directorEmail, codigoLocal, nivel, direccion, direccionExacta, telefono, estado })
      const cols = await getColegios()
      setColegios(cols)
      setNombreColegio('')
      setCiudadColegio('')
      setEmailColegio('')
      setDirectorNombre('')
      setDirectorEmail('')
      setDistritoId(null)
      setCodigoLocal('')
      setNivel('primaria')
      setDireccion('')
      setDireccionExacta('')
      setTelefono('')
      setEstado('activo')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingColegio(false)
    }
  }

  // Sin formulario de aulas para administrador

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold text-primary">Panel del Administrador</h1>
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700 text-sm">{error}</div>}

      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Alta de Colegio</h2>
          <form className="space-y-3" onSubmit={submitColegio}>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="nombreColegio">Nombre</label>
              <input id="nombreColegio" className="h-10 w-full rounded-md border px-3 text-sm" value={nombreColegio} onChange={e=>setNombreColegio(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="codigoLocal">Código Local</label>
                <input id="codigoLocal" className="h-10 w-full rounded-md border px-3 text-sm" value={codigoLocal} onChange={e=>setCodigoLocal(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="nivel">Nivel</label>
                <select id="nivel" className="h-10 w-full rounded-md border px-3 text-sm" value={nivel} onChange={e=>setNivel(e.target.value)} required>
                  <option value="primaria">Primaria</option>
                  <option value="secundaria">Secundaria</option>
                  <option value="primaria-secundaria">Primaria-Secundaria</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm">Ubicación (Departamento/Provincia/Distrito)</label>
              <UbigeoSelector onChange={({ distrito }) => {
                const nombre = distrito ? (distrito.Nombre || distrito.nombre || '') : ''
                const id = distrito ? (distrito.Id || distrito.id) : null
                setCiudadColegio(nombre)
                setDistritoId(id)
              }} />
              <div className="text-xs text-muted-foreground">Se guardará el nombre del distrito como ciudad y el `distritoId` cuando esté disponible.</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="direccion">Dirección</label>
                <input id="direccion" className="h-10 w-full rounded-md border px-3 text-sm" value={direccion} onChange={e=>setDireccion(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="direccionExacta">Dirección exacta</label>
                <input id="direccionExacta" className="h-10 w-full rounded-md border px-3 text-sm" value={direccionExacta} onChange={e=>setDireccionExacta(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm" htmlFor="telefono">Teléfono</label>
                <input id="telefono" className="h-10 w-full rounded-md border px-3 text-sm" value={telefono} onChange={e=>setTelefono(e.target.value)} required pattern="^\+?[\d\s-]{7,15}$" title="Usa 7-15 caracteres: dígitos, espacios o guiones. Opcional '+' al inicio." />
              </div>
              <div className="space-y-1">
                <label className="text-sm" htmlFor="estado">Estado</label>
                <select id="estado" className="h-10 w-full rounded-md border px-3 text-sm" value={estado} onChange={e=>setEstado(e.target.value)} required>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="emailColegio">Email de contacto</label>
              <input id="emailColegio" type="email" className="h-10 w-full rounded-md border px-3 text-sm" value={emailColegio} onChange={e=>setEmailColegio(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="directorNombre">Director - Nombre</label>
              <input id="directorNombre" className="h-10 w-full rounded-md border px-3 text-sm" value={directorNombre} onChange={e=>setDirectorNombre(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm" htmlFor="directorEmail">Director - Email</label>
              <input id="directorEmail" type="email" className="h-10 w-full rounded-md border px-3 text-sm" value={directorEmail} onChange={e=>setDirectorEmail(e.target.value)} required />
            </div>
            <button className="bg-primary text-primary-foreground h-10 rounded-md px-4" disabled={loadingColegio || !distritoId}>
              {loadingColegio ? 'Guardando…' : 'Crear colegio + director'}
            </button>
          </form>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow">
          <h2 className="text-lg font-semibold mb-3">Colegios registrados</h2>
          <div className="space-y-2 max-h-64 overflow-auto">
            {colegios.map(col => (
              <div key={col.Id || col.id} className="flex justify-between text-sm border rounded-md p-2">
                <span>{col.Nombre || col.nombre}</span>
                <span className="text-muted-foreground">
                  {formatNivel(col.Nivel || col.nivel)} · {col.Ciudad || col.ciudad}
                </span>
              </div>
            ))}
            {colegios.length === 0 && <p className="text-muted-foreground text-sm">No hay colegios aún.</p>}
          </div>
        </div>
      </section>

      {/* Sección de aulas removida para el administrador */}
    </div>
  )
}