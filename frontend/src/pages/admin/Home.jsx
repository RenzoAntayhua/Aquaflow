import { useEffect, useState } from 'react'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-slate-500 text-sm">Cargando estadísticas...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <div className="text-red-500 text-3xl mb-2">⚠️</div>
        <div className="text-red-700 font-medium">Error al cargar</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
          <p className="text-slate-500 text-sm mt-1">Resumen general del sistema AquaPlay</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Última actualización</div>
          <div className="text-sm text-slate-600">{new Date().toLocaleString()}</div>
        </div>
      </div>

      {stats && (
        <>
          {/* Main KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon="🏫"
              label="Colegios"
              value={stats.colegios}
              color="blue"
              description="Instituciones registradas"
            />
            <StatCard
              icon="📚"
              label="Aulas"
              value={stats.aulas}
              color="indigo"
              description="Salones activos"
            />
            <StatCard
              icon="👥"
              label="Usuarios"
              value={stats.usuarios}
              color="emerald"
              description="Total registrados"
            />
            <StatCard
              icon="📍"
              label="Espacios"
              value={stats.espacios}
              color="amber"
              description="Puntos de medición"
            />
          </div>

          {/* Users by Role */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">👤</span>
              Usuarios por Rol
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RoleCard role="Estudiantes" count={stats.estudiantes} icon="🎓" color="sky" />
              <RoleCard role="Profesores" count={stats.profesores} icon="👨‍🏫" color="violet" />
              <RoleCard role="Directores" count={stats.directores} icon="👔" color="rose" />
              <RoleCard role="Admins" count={stats.admins} icon="🛡️" color="slate" />
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Gamification Stats */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-sm">🎮</span>
                Gamificación
              </h2>
              <div className="space-y-3">
                <StatRow icon="📱" label="Dispositivos IoT" value={stats.dispositivos} />
                <StatRow icon="🏅" label="Insignias" value={stats.insignias} />
                <StatRow icon="🎯" label="Plantillas de Retos" value={stats.plantillasRetos} />
                <StatRow icon="❓" label="Preguntas en Banco" value={stats.preguntas} />
              </div>
            </div>

            {/* Ubigeo Coverage */}
            <div className="bg-white rounded-xl border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm">🗺️</span>
                Cobertura Geográfica
              </h2>
              <div className="space-y-3">
                <StatRow icon="🏔️" label="Departamentos" value={stats.ubigeo?.departamentos ?? 0} />
                <StatRow icon="🏙️" label="Provincias" value={stats.ubigeo?.provincias ?? 0} />
                <StatRow icon="📍" label="Distritos" value={stats.ubigeo?.distritos ?? 0} />
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total localidades</span>
                  <span className="font-semibold text-slate-700">
                    {(stats.ubigeo?.departamentos ?? 0) + (stats.ubigeo?.provincias ?? 0) + (stats.ubigeo?.distritos ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickAction href="/admin/colegios" icon="🏫" label="Nuevo Colegio" />
              <QuickAction href="/admin/usuarios" icon="👤" label="Gestionar Usuarios" />
              <QuickAction href="/admin/auditoria" icon="📋" label="Ver Auditoría" />
              <QuickAction href="/admin/reportes" icon="📊" label="Reportes" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color, description }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  }
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 bg-gradient-to-br ${colors[color]} rounded-xl flex items-center justify-center text-2xl shadow-lg`}>
          {icon}
        </div>
        <span className="text-3xl font-bold text-slate-800">{value}</span>
      </div>
      <div className="mt-3">
        <div className="font-semibold text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
    </div>
  )
}

function RoleCard({ role, count, icon, color }) {
  const colors = {
    sky: 'bg-sky-50 border-sky-200 text-sky-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  return (
    <div className={`rounded-xl border-2 p-4 ${colors[color]} transition-transform hover:scale-105`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-sm opacity-80">{role}</div>
    </div>
  )
}

function StatRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <span className="text-slate-600">{label}</span>
      </div>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  )
}

function QuickAction({ href, icon, label }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-lg px-4 py-3 transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </a>
  )
}
