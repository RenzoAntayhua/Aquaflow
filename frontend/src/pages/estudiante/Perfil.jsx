import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getPerfilUsuario } from '../../lib/api'

export default function EstudiantePerfil() {
  const { user } = useAuth()
  const [perfil, setPerfil] = useState(null)
  if (user?.requiereCambioPassword) return <Navigate to="/password-change" replace />

  useEffect(() => {
    const usuarioId = user?.Id || user?.id
    if (usuarioId) getPerfilUsuario({ usuarioId }).then(setPerfil).catch(() => {})
  }, [user])

  const nombre = user?.Nombre || user?.nombre || 'Estudiante'
  const email = user?.Email || user?.email || '—'
  const colegio = user?.colegioNombre || 'Colegio'
  const grado = user?.grado || '—'

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-title">Mi Perfil de Héroe 🧑‍🚀</h1>
        <p className="text-muted-foreground">Tu progreso en la conservación del agua</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-card rounded-xl border p-6 shadow flex flex-col gap-6">
          <div>
            <h2 className="font-semibold text-title mb-3">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md bg-info-card px-3 py-2 text-sm">Nombre <div className="font-semibold">{nombre}</div></div>
              <div className="rounded-md bg-info-card px-3 py-2 text-sm">Correo <div className="font-semibold">{email}</div></div>
              <div className="rounded-md bg-info-card px-3 py-2 text-sm">Colegio <div className="font-semibold">{colegio}</div></div>
              <div className="rounded-md bg-info-card px-3 py-2 text-sm">Grado <div className="font-semibold">{grado}</div></div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-soft-divider">Estudiante</div>
          </div>

          <div>
            <h2 className="font-semibold text-title mb-3">Estadísticas de Conservación</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Stat title="Litros ahorrados" value={perfil ? Math.round(perfil.litrosAhorrados) + 'L' : '—'} icon="💧" />
              <Stat title="Juegos completados" value={perfil ? perfil.juegosCompletados : '—'} icon="🎮" />
              <Stat title="Nivel actual" value={perfil ? perfil.nivelActual : '—'} icon="🌍" />
              <Stat title="Monedas" value={perfil ? perfil.monedas : '—'} icon="🪙" />
            </div>
            <div className="mt-4">
              <div className="text-xs mb-1">Progreso al siguiente nivel</div>
              <div className="h-3 bg-soft-divider rounded-full overflow-hidden">
                <div className="h-3 bg-primary-light" style={{ width: `${perfil ? perfil.progresoMonedas : 0}%` }} />
              </div>
              <div className="text-xs mt-1 text-muted-foreground">{perfil ? (perfil.siguienteUmbral >= 1000 ? 'Héroe del Agua' : perfil.siguienteUmbral >= 500 ? 'Guardían del Agua' : 'Aprendiz del Agua') : '—'}</div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-title mb-3">Colección de Medallas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {perfil?.insignias?.length ? (
                perfil.insignias.map((m, i) => (
                  <Medal key={m.Id || i} name={m.Nombre || m.nombre} desc={m.Descripcion || m.descripcion || ''} unlocked />
                ))
              ) : (
                <div className="text-sm text-muted-foreground">Sin medallas aún</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow flex flex-col gap-4">
          <div>
            <h2 className="font-semibold text-title mb-3">Tu Compañero</h2>
            <div className="h-40 rounded-md bg-gradient-to-b from-blue-100 to-blue-200 flex items-center justify-center text-4xl">🐠</div>
            <p className="text-sm text-muted-foreground mt-3">Tito Guardián</p>
            <p className="text-sm text-muted-foreground">Protejo este arrecife gracias a tus decisiones inteligentes.</p>
            <div className="text-sm mt-2 inline-flex items-center gap-2"><span className="text-gold">🪙</span> <span>{perfil ? `${perfil.monedas} monedas disponibles` : '—'}</span></div>
          </div>
          <div>
            <h3 className="font-semibold text-title mb-2">Tienda de decoraciones</h3>
            <ul className="grid gap-2 text-sm">
              {[
                { n: 'Generador de burbujas', d: 'Añade burbujas que animan a Tito a nadar.' },
                { n: 'Algas danzantes', d: 'Algas suaves que dan color al fondo de la pecera.' },
                { n: 'Caracol brillante', d: 'Un caracol amistoso que descansa en la parte baja.' },
                { n: 'Coral luminoso', d: 'Colores que iluminan el centro de la pecera.' },
              ].map((it, i) => (
                <li key={i} className="flex items-center justify-between rounded-md bg-soft-divider px-3 py-2">
                  <div>
                    <div className="font-medium">{it.n}</div>
                    <div className="text-xs text-muted-foreground">{it.d}</div>
                  </div>
                  <button className="h-8 px-3 rounded-md bg-primary-light text-primary-foreground">Quitar</button>
                </li>
              ))}
              {[
                { n: 'Estrella curiosa', d: 'Una estrella de mar que saluda a tus visitantes.', p: 30 },
                { n: 'Linterna marina', d: 'Un brillo cálido bajo la superficie.', p: 60 },
              ].map((it, i) => (
                <li key={'shop-'+i} className="flex items-center justify-between rounded-md bg-soft-divider px-3 py-2">
                  <div>
                    <div className="font-medium">{it.n}</div>
                    <div className="text-xs text-muted-foreground">{it.d}</div>
                  </div>
                  <button className="h-8 px-3 rounded-md bg-soft-divider text-muted-foreground">Sin monedas</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-6 shadow">
        <h2 className="font-semibold text-title mb-3">Juegos Completados</h2>
        <div className="grid gap-2 text-sm text-muted-foreground">Lista en construcción…</div>
      </div>
    </div>
  )
}

function Stat({ title, value, icon }) {
  return (
    <div className="rounded-md bg-info-card px-3 py-4 text-sm flex items-center gap-3">
      <div className="text-xl">{icon}</div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </div>
    </div>
  )
}

function Medal({ name, desc, unlocked = false, required }) {
  return (
    <div className="rounded-md bg-info-card px-3 py-3 text-sm flex items-center justify-between">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="text-xs">
        {unlocked ? (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary-foreground">Desbloqueada</span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-soft-divider text-muted-foreground">{required} requeridos</span>
        )}
      </div>
    </div>
  )
}