import { useEffect, useState } from 'react'
import KPI from '../../components/KPI'
import { getAdminStats } from '../../lib/api'

export default function Home() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getAdminStats()
      .then(res => { if (!alive) return; setStats(res) })
      .catch(e => setError(e.message))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-lg font-semibold">Inicio</h2>
        <p className="text-sm text-muted-foreground">Resumen general del sistema</p>
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Cargando estadísticas…</div>
      )}

      {error && (
        <div className="text-sm text-red-700">{error}</div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI title="Colegios" value={stats.colegios} />
            <KPI title="Aulas" value={stats.aulas} />
            <KPI title="Usuarios" value={stats.usuarios} />
            <KPI title="Espacios" value={stats.espacios} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI title="Estudiantes" value={stats.estudiantes} />
            <KPI title="Profesores" value={stats.profesores} />
            <KPI title="Directores" value={stats.directores} />
            <KPI title="Admins" value={stats.admins} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPI title="Dispositivos" value={stats.dispositivos} />
            <KPI title="Insignias" value={stats.insignias} />
            <KPI title="Plantillas de retos" value={stats.plantillasRetos} />
            <KPI title="Preguntas" value={stats.preguntas} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KPI title="Departamentos" value={stats.ubigeo?.departamentos ?? 0} />
            <KPI title="Provincias" value={stats.ubigeo?.provincias ?? 0} />
            <KPI title="Distritos" value={stats.ubigeo?.distritos ?? 0} />
          </div>
        </>
      )}
    </div>
  )
}