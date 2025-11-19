const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '')

async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    throw new Error('Sesión expirada, por favor inicia sesión nuevamente')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || `Error ${res.status}`)
  }
  return res.json()
}

export async function getConsumoAgregado({ aulaId = 1, periodo = 'semana' }) {
  return apiFetch(`/api/consumo/agregado?aulaId=${aulaId}&periodo=${periodo}`)
}

export async function getPlantillasRetos() {
  return apiFetch(`/api/plantillas-retos`)
}

export async function crearRetoAula({ aulaId, plantillaId, fechaInicio, fechaFin, parametros = {} }) {
  return apiFetch(`/api/aulas/${aulaId}/retos`, {
    method: 'POST',
    body: {
      PlantillaId: plantillaId,
      FechaInicio: fechaInicio,
      FechaFin: fechaFin,
      Parametros: JSON.stringify(parametros),
      Estado: 0
    }
  })
}

export async function getRetosAula({ aulaId }) {
  return apiFetch(`/api/aulas/${aulaId}/retos`)
}

export async function actualizarEstadoReto({ retoId, estado }) {
  return apiFetch(`/api/retos/${retoId}/estado`, { method: 'PUT', body: { estado } })
}

// Perfil del estudiante
export async function getPerfilUsuario({ usuarioId }) {
  return apiFetch(`/api/usuarios/${usuarioId}/perfil`)
}

// Preguntas y Bancos
export async function crearPregunta({ texto, tipo, opciones = [], respuestaCorrecta, categoria, dificultad, creadorId, colegioId }) {
  return apiFetch(`/api/preguntas`, { method: 'POST', body: { texto, tipo, opciones, respuestaCorrecta, categoria, dificultad, creadorId, colegioId } })
}

export async function listarPreguntas({ tipo, categoria, dificultad, activa = true } = {}) {
  const params = new URLSearchParams()
  if (tipo) params.set('tipo', tipo)
  if (categoria) params.set('categoria', categoria)
  if (dificultad) params.set('dificultad', dificultad)
  if (typeof activa === 'boolean') params.set('activa', String(activa))
  return apiFetch(`/api/preguntas?${params.toString()}`)
}

export async function crearBanco({ nombre, alcance = 'aula', colegioId, creadorId }) {
  return apiFetch(`/api/bancos`, { method: 'POST', body: { nombre, alcance, colegioId, creadorId } })
}

export async function asociarPreguntasABanco({ bancoId, preguntaIds }) {
  return apiFetch(`/api/bancos/${bancoId}/preguntas`, { method: 'POST', body: { preguntaIds } })
}

// (Sesiones eliminadas)

// Resultados y puntos
export async function registrarResultadoJuego({ usuarioId, tipo, litrosAhorrados = 0, juegoId, aulaId }) {
  return apiFetch(`/api/usuarios/${usuarioId}/juegos/resultado`, { method: 'POST', body: { tipo, litrosAhorrados, juegoId, aulaId } })
}

export async function agregarPuntosUsuario({ usuarioId, valor, motivo = 'trivia_reto', aulaId }) {
  return apiFetch(`/api/usuarios/${usuarioId}/puntos`, { method: 'POST', body: { valor, motivo, aulaId } })
}

export async function verificarRetoJugado({ usuarioId, retoId }) {
  return apiFetch(`/api/usuarios/${usuarioId}/retos/${retoId}/jugado`)
}

// Admin stats
export async function getAdminStats() {
  return apiFetch(`/api/admin/stats`)
}

// Admin: Usuarios
export async function adminBuscarUsuarios({ q, rol, colegioId, estado, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (rol) params.set('rol', rol)
  if (colegioId) params.set('colegioId', String(colegioId))
  if (estado) params.set('estado', estado)
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
  const qs = params.toString()
  return apiFetch(`/api/admin/usuarios${qs ? `?${qs}` : ''}`)
}

export async function adminInvitarDirector({ nombre, email, colegioId }) {
  return apiFetch(`/api/admin/usuarios/invitar-director`, { method: 'POST', body: { nombre, email, colegioId } })
}

export async function adminInvitarProfesor({ nombre, email, colegioId }) {
  return apiFetch(`/api/admin/usuarios/invitar-profesor`, { method: 'POST', body: { nombre, email, colegioId } })
}

export async function adminResetPassword({ usuarioId, email }) {
  const body = {}
  if (usuarioId) body.usuarioId = usuarioId
  if (email) body.email = email
  return apiFetch(`/api/admin/usuarios/reset-password`, { method: 'POST', body })
}

export async function adminAuditoria({ tipo, adminId, desde, hasta, email, targetId, limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (tipo) params.set('tipo', tipo)
  if (adminId) params.set('adminId', String(adminId))
  if (desde) params.set('desde', new Date(desde).toISOString())
  if (hasta) params.set('hasta', new Date(hasta).toISOString())
  if (email) params.set('email', email)
  if (targetId) params.set('targetId', String(targetId))
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
  const qs = params.toString()
  return apiFetch(`/api/admin/auditoria${qs ? `?${qs}` : ''}`)
}

// Estudiantes (inscripciones)
export async function getEstudiantesAula({ aulaId }) {
  return apiFetch(`/api/aulas/${aulaId}/estudiantes`)
}

export async function agregarEstudianteExistente({ aulaId, estudianteId }) {
  return apiFetch(`/api/aulas/${aulaId}/estudiantes`, { method: 'POST', body: { estudianteId } })
}

export async function crearYAgregarEstudiante({ aulaId, nombre, email }) {
  return apiFetch(`/api/aulas/${aulaId}/estudiantes`, { method: 'POST', body: { nombre, email } })
}

export async function eliminarEstudianteDeAula({ aulaId, estudianteId }) {
  const res = await fetch(`${BASE_URL}/api/aulas/${aulaId}/estudiantes/${estudianteId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('No se pudo eliminar')
  return true
}

export async function getCodigoAula({ aulaId }) {
  return apiFetch(`/api/aulas/${aulaId}/codigo`)
}

export async function getSolicitudesAula({ aulaId }) {
  return apiFetch(`/api/aulas/${aulaId}/solicitudes`)
}

export async function aprobarSolicitud({ aulaId, usuarioId }) {
  return apiFetch(`/api/aulas/${aulaId}/solicitudes/${usuarioId}/aprobar`, { method: 'POST' })
}

export async function rechazarSolicitud({ aulaId, usuarioId }) {
  return apiFetch(`/api/aulas/${aulaId}/solicitudes/${usuarioId}/rechazar`, { method: 'POST' })
}

export async function getPerfilEstudiantesAula({ aulaId }) {
  return apiFetch(`/api/aulas/${aulaId}/perfil-estudiantes`)
}

export async function getEventosAula({ aulaId, tipo, limit = 50, offset = 0 }) {
  const params = new URLSearchParams()
  if (tipo) params.set('tipo', tipo)
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
  const qs = params.toString()
  return apiFetch(`/api/aulas/${aulaId}/eventos${qs ? `?${qs}` : ''}`)
}

export async function solicitarIngresoAula({ codigo, aulaId, usuarioId }) {
  const body = {}
  if (codigo) body.codigo = codigo
  if (aulaId) body.aulaId = aulaId
  if (usuarioId) body.usuarioId = usuarioId
  return apiFetch(`/api/aulas/solicitar-ingreso`, { method: 'POST', body })
}

export async function getCiudades() {
  const res = await fetch(`${BASE_URL}/api/ciudades`)
  if (!res.ok) throw new Error('Error al obtener ciudades')
  return res.json()
}

export async function getColegios() {
  const res = await fetch(`${BASE_URL}/api/colegios`)
  if (!res.ok) throw new Error('Error al obtener colegios')
  return res.json()
}

export async function crearColegio({ nombre, ciudad, emailContacto }) {
  const res = await fetch(`${BASE_URL}/api/colegios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, ciudad, emailContacto })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || 'Error al crear colegio')
  }
  return res.json()
}

export async function crearColegioConDirector({ nombre, distritoId = null, ciudad = null, emailContacto = null, directorNombre, directorEmail, codigoLocal = null, nivel = null, direccion = null, direccionExacta = null, telefono = null, estado = null }) {
  const payload = { nombre, distritoId, ciudad, emailContacto, directorNombre, directorEmail, codigoLocal, nivel, direccion, direccionExacta, telefono, estado }
  const res = await fetch(`${BASE_URL}/api/colegios/alta-completa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || err.error || 'Error al crear colegio y director')
  }
  return res.json()
}


export async function registrar({ nombre, email, password, rol = 'estudiante', colegioId = null }) {
  const res = await fetch(`${BASE_URL}/auth/registrar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password, rol, colegioId })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || 'Error al registrar')
  }
  return res.json()
}

// Ubigeo helpers
export async function getDepartamentos() {
  const res = await fetch(`${BASE_URL}/api/ubigeo/departamentos`)
  if (!res.ok) throw new Error('Error al obtener departamentos')
  return res.json()
}

export async function getProvincias({ departamentoId }) {
  const url = `${BASE_URL}/api/ubigeo/provincias?departamentoId=${departamentoId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener provincias')
  return res.json()
}

export async function getDistritos({ provinciaId }) {
  const url = `${BASE_URL}/api/ubigeo/distritos?provinciaId=${provinciaId}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener distritos')
  return res.json()
}

export async function login({ email, password }) {
  try {
    return await apiFetch(`/auth/login`, { method: 'POST', body: { email, password } })
  } catch (e) {
    if (/401|inválidas/i.test(e.message)) throw new Error('Credenciales inválidas')
    throw e
  }
}

export async function solicitarReset(email) {
  const res = await fetch(`${BASE_URL}/auth/password/reset/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  if (!res.ok) throw new Error('Error al solicitar reset')
  return res.json()
}

export async function confirmarReset(token, newPassword) {
  const res = await fetch(`${BASE_URL}/auth/password/reset/confirmar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  })
  if (!res.ok) throw new Error('Error al confirmar reset')
  return res.json()
}

export async function cambiarPassword({ actual, nueva }, token) {
  return apiFetch(`/auth/password/cambiar`, { method: 'POST', body: { actual, nueva } })
}

// Director: Aulas
export async function getAulas({ colegioId }) {
  const qs = colegioId ? `?colegioId=${colegioId}` : ''
  return apiFetch(`/api/aulas${qs}`)
}

export async function crearAula({ colegioId, nombre, grado, profesorId = null }) {
  return apiFetch(`/api/aulas`, { method: 'POST', body: { colegioId, nombre, grado, profesorId } })
}

export async function actualizarAula({ id, nombre, grado, profesorId = null }) {
  const body = { nombre, grado, profesorId }
  return apiFetch(`/api/aulas/${id}`, { method: 'PUT', body })
}

export async function eliminarAula({ id }) {
  const res = await fetch(`${BASE_URL}/api/aulas/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || 'Error al eliminar aula')
  }
  return true
}

// Director: Profesores
export async function getProfesores({ colegioId }) {
  const qs = colegioId ? `?colegioId=${colegioId}` : ''
  return apiFetch(`/api/profesores${qs}`)
}

export async function crearProfesor({ colegioId, nombre, email }) {
  return apiFetch(`/api/profesores`, { method: 'POST', body: { nombre, email, colegioId } })
}

export async function actualizarProfesor({ id, nombre, email }) {
  const body = {}
  if (nombre) body.nombre = nombre
  if (email) body.email = email
  return apiFetch(`/api/profesores/${id}`, { method: 'PUT', body })
}

export async function eliminarProfesor({ id }) {
  const res = await fetch(`${BASE_URL}/api/profesores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || 'Error al eliminar profesor')
  }
  return true
}

// Director: Espacios
export async function getEspacios({ colegioId }) {
  const qs = colegioId ? `?colegioId=${colegioId}` : ''
  return apiFetch(`/api/espacios${qs}`)
}

export async function crearEspacio({ colegioId, etiqueta, tipo, aulaId = null }) {
  const body = { colegioId, etiqueta, tipo, aulaId }
  return apiFetch(`/api/espacios`, { method: 'POST', body })
}

export async function actualizarEspacio({ id, etiqueta, tipo, aulaId = null }) {
  const body = { etiqueta, tipo, aulaId }
  return apiFetch(`/api/espacios/${id}`, { method: 'PUT', body })
}

export async function eliminarEspacio({ id }) {
  const res = await fetch(`${BASE_URL}/api/espacios/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.mensaje || 'Error al eliminar espacio')
  }
  return true
}
// Director: Auditoría
export async function directorAuditoria({ tipo, desde, hasta, limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams()
  if (tipo) params.set('tipo', tipo)
  if (desde) params.set('desde', new Date(desde).toISOString())
  if (hasta) params.set('hasta', new Date(hasta).toISOString())
  if (limit) params.set('limit', String(limit))
  if (offset) params.set('offset', String(offset))
  const qs = params.toString()
  return apiFetch(`/api/director/auditoria${qs ? `?${qs}` : ''}`)
}