using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/aulas")]
    [Authorize]
    public class AulasController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db, [FromQuery] int? colegioId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);

            var query = db.Aulas.AsQueryable();
            if (rol == "admin")
            {
                if (colegioId.HasValue) query = query.Where(a => a.ColegioId == colegioId.Value);
            }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                query = query.Where(a => a.ColegioId == actor.ColegioId!.Value);
            }
            else return Forbid();
            var aulas = await query.OrderBy(a => a.Nombre).ToListAsync();
            return Ok(aulas);
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] Aula nueva)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);

            if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                nueva.ColegioId = actor.ColegioId!.Value;
            }
            else if (rol == "admin")
            {
                if (nueva.ColegioId <= 0) return BadRequest(new { mensaje = "ColegioId requerido" });
            }
            else return Forbid();

            if (nueva.ProfesorId.HasValue)
            {
                var prof = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == nueva.ProfesorId.Value && u.Rol == RolUsuario.profesor);
                if (prof is null || prof.ColegioId != nueva.ColegioId) return BadRequest(new { mensaje = "Profesor inválido para el colegio" });
            }

            db.Aulas.Add(nueva);
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_crear_aula, ColegioId = nueva.ColegioId, AulaId = nueva.Id, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { nombre = nueva.Nombre, grado = nueva.Grado, profesorId = nueva.ProfesorId, ip }) });
                await db.SaveChangesAsync();
            }
            return Created($"/api/aulas/{nueva.Id}", nueva);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Actualizar([FromServices] AquaFlowDbContext db, int id, [FromBody] Aula cambios)
        {
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == id);
            if (aula is null) return NotFound();
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                if (aula.ColegioId != actor.ColegioId!.Value) return Forbid();
            }
            else if (rol != "admin") return Forbid();
            aula.Nombre = string.IsNullOrWhiteSpace(cambios.Nombre) ? aula.Nombre : cambios.Nombre;
            aula.Grado = cambios.Grado ?? aula.Grado;
            aula.ProfesorId = cambios.ProfesorId ?? aula.ProfesorId;
            if (aula.ProfesorId.HasValue)
            {
                var prof = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == aula.ProfesorId.Value && u.Rol == RolUsuario.profesor);
                if (prof is null || prof.ColegioId != aula.ColegioId) return BadRequest(new { mensaje = "Profesor inválido para el colegio" });
            }
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_actualizar_aula, ColegioId = aula.ColegioId, AulaId = aula.Id, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { nombre = aula.Nombre, grado = aula.Grado, profesorId = aula.ProfesorId, ip }) });
                await db.SaveChangesAsync();
            }
            return Ok(aula);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Eliminar([FromServices] AquaFlowDbContext db, int id)
        {
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == id);
            if (aula is null) return NotFound();
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                if (aula.ColegioId != actor.ColegioId!.Value) return Forbid();
            }
            else if (rol != "admin") return Forbid();
            db.Aulas.Remove(aula);
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_eliminar_aula, ColegioId = aula.ColegioId, AulaId = aula.Id, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { ip }) });
                await db.SaveChangesAsync();
            }
            return NoContent();
        }

        [HttpGet("{aulaId:int}/estudiantes")]
        public async Task<IActionResult> Estudiantes([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var lista = await db.Inscripciones
                .Where(i => i.AulaId == aulaId)
                .Join(db.Usuarios, i => i.EstudianteId, u => u.Id, (i, u) => new { u.Id, u.Nombre, u.Email, i.AulaId })
                .OrderBy(u => u.Nombre)
                .ToListAsync();
            return Ok(lista);
        }

        [HttpPost("{aulaId:int}/estudiantes")]
        public async Task<IActionResult> AgregarEstudiante([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound(new { mensaje = "Aula no encontrada" });
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            return BadRequest(new { mensaje = "Flujo actualizado: las inscripciones se realizan por solicitud y aprobación del profesor. No se permite agregar estudiantes directamente al aula." });
        }

        [HttpDelete("{aulaId:int}/estudiantes/{estudianteId:int}")]
        public async Task<IActionResult> EliminarEstudiante([FromServices] AquaFlowDbContext db, int aulaId, int estudianteId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var ins = await db.Inscripciones.FirstOrDefaultAsync(i => i.AulaId == aulaId && i.EstudianteId == estudianteId);
            if (ins is null) return NotFound();
            db.Inscripciones.Remove(ins);
            await db.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{aulaId:int}/codigo")]
        public async Task<IActionResult> Codigo([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            string code = $"AF-{aula.ColegioId}-{aula.Id}";
            return Ok(new { code });
        }

        [HttpPost("solicitar-ingreso")]
        public async Task<IActionResult> SolicitarIngreso([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var code = req.TryGetProperty("codigo", out var cProp) ? cProp.GetString() : null;
            var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.TryGetInt32(out var aid) ? aid : 0;
            var usuarioId = req.TryGetProperty("usuarioId", out var uProp) && uProp.TryGetInt32(out var uid) ? uid : 0;
            if (usuarioId <= 0) return BadRequest(new { mensaje = "usuarioId requerido" });
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var authUserId) || authUserId != usuarioId) return Forbid();
            if (aulaId <= 0 && !string.IsNullOrWhiteSpace(code))
            {
                var parts = code.Split('-');
                if (parts.Length == 3 && int.TryParse(parts[2], out var parsedAula)) aulaId = parsedAula;
            }
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound(new { mensaje = "Aula no encontrada" });
            var yaInscrito = await db.Inscripciones.AnyAsync(i => i.AulaId == aulaId && i.EstudianteId == usuarioId);
            if (yaInscrito) return Conflict(new { mensaje = "Ya inscrito" });
            var yaSolicitado = await db.Eventos.AnyAsync(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada);
            if (yaSolicitado) return Conflict(new { mensaje = "Solicitud ya registrada" });
            var payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "pendiente" });
            db.Eventos.Add(new Evento { Tipo = TipoEvento.inscripcion_solicitada, ColegioId = aula.ColegioId, AulaId = aula.Id, UsuarioId = usuarioId, Payload = payload });
            await db.SaveChangesAsync();
            return Created($"/api/aulas/{aulaId}/solicitudes/{usuarioId}", new { mensaje = "Solicitud registrada" });
        }

        [HttpGet("{aulaId:int}/solicitudes")]
        public async Task<IActionResult> Solicitudes([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var items = await db.Eventos
                .Where(e => e.AulaId == aulaId && e.Tipo == TipoEvento.inscripcion_solicitada && e.Payload.Contains("\"estado\":\"pendiente\""))
                .Join(db.Usuarios, e => e.UsuarioId, u => u.Id, (e, u) => new { u.Id, u.Nombre, u.Email, e.Payload, e.CreadoEn })
                .OrderBy(e => e.CreadoEn)
                .ToListAsync();
            return Ok(items);
        }

        [HttpPost("{aulaId:int}/solicitudes/{usuarioId:int}/aprobar")]
        public async Task<IActionResult> Aprobar([FromServices] AquaFlowDbContext db, int aulaId, int usuarioId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var ins = await db.Inscripciones.FirstOrDefaultAsync(i => i.AulaId == aulaId && i.EstudianteId == usuarioId);
            if (ins is null)
            {
                db.Inscripciones.Add(new Inscripcion { AulaId = aulaId, EstudianteId = usuarioId });
                await db.SaveChangesAsync();
            }
            var eventos = await db.Eventos.Where(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada).ToListAsync();
            foreach (var ev in eventos) ev.Payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "aprobada" });
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "Inscripción aprobada" });
        }

        [HttpPost("{aulaId:int}/solicitudes/{usuarioId:int}/rechazar")]
        public async Task<IActionResult> Rechazar([FromServices] AquaFlowDbContext db, int aulaId, int usuarioId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var eventos = await db.Eventos.Where(e => e.AulaId == aulaId && e.UsuarioId == usuarioId && e.Tipo == TipoEvento.inscripcion_solicitada).ToListAsync();
            if (eventos.Count == 0) return NotFound();
            foreach (var ev in eventos) ev.Payload = System.Text.Json.JsonSerializer.Serialize(new { estado = "rechazada" });
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "Solicitud rechazada" });
        }

        [HttpPost("{aulaId:int}/retos")]
        public async Task<IActionResult> CrearReto([FromServices] AquaFlowDbContext db, int aulaId, [FromBody] RetoAula reto)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            if (reto.AulaId != aulaId) reto.AulaId = aulaId;
            if (reto.FechaInicio.Kind == DateTimeKind.Unspecified) reto.FechaInicio = DateTime.SpecifyKind(reto.FechaInicio, DateTimeKind.Utc);
            if (reto.FechaFin.Kind == DateTimeKind.Unspecified) reto.FechaFin = DateTime.SpecifyKind(reto.FechaFin, DateTimeKind.Utc);
            db.RetosAula.Add(reto);
            await db.SaveChangesAsync();
            return Created($"/api/retos/{reto.Id}", reto);
        }

        [HttpGet("{aulaId:int}/retos")]
        public async Task<IActionResult> ListarRetos([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var lista = await db.RetosAula.Where(r => r.AulaId == aulaId).OrderByDescending(r => r.FechaInicio).ToListAsync();
            return Ok(lista);
        }

        [HttpGet("{aulaId:int}/perfil-estudiantes")]
        public async Task<IActionResult> PerfilEstudiantes([FromServices] AquaFlowDbContext db, int aulaId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var ids = await db.Inscripciones.Where(i => i.AulaId == aulaId).Select(i => i.EstudianteId).ToListAsync();
            var usuarios = await db.Usuarios.Where(u => ids.Contains(u.Id)).Select(u => new { u.Id, u.Nombre, u.Email }).ToListAsync();
            var aggs = await db.PerfilEstudianteAggs.Where(p => ids.Contains(p.UsuarioId)).ToListAsync();
            var mapa = aggs.ToDictionary(a => a.UsuarioId, a => a);
            var resp = usuarios.Select(u => new
            {
                usuarioId = u.Id,
                nombre = u.Nombre,
                email = u.Email,
                monedasTotal = mapa.ContainsKey(u.Id) ? mapa[u.Id].MonedasTotal : 0,
                nivelActual = mapa.ContainsKey(u.Id) ? mapa[u.Id].NivelActual : "Explorador",
                progresoMonedas = mapa.ContainsKey(u.Id) ? mapa[u.Id].ProgresoMonedas : 0,
                siguienteUmbral = mapa.ContainsKey(u.Id) ? mapa[u.Id].SiguienteUmbral : 200,
                litrosAhorradosTotal = mapa.ContainsKey(u.Id) ? mapa[u.Id].LitrosAhorradosTotal : 0.0,
                juegosCompletados = mapa.ContainsKey(u.Id) ? mapa[u.Id].JuegosCompletados : 0,
                ultimaActualizacion = mapa.ContainsKey(u.Id) ? mapa[u.Id].UltimaActualizacion : (DateTime?)null
            });
            return Ok(resp);
        }

        [HttpGet("{aulaId:int}/eventos")]
        public async Task<IActionResult> EventosAula([FromServices] AquaFlowDbContext db, int aulaId, [FromQuery] string? tipo, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == aulaId);
            if (aula is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != aula.ColegioId) return Forbid();
            }
            else if (rol == "profesor")
            {
                if (aula.ProfesorId != actorId) return Forbid();
            }
            else return Forbid();
            var tipos = new[] { TipoEvento.reto_completado, TipoEvento.trivia_completada, TipoEvento.insignia_otorgada };
            var q = db.Eventos.Where(e => e.AulaId == aulaId);
            if (!string.IsNullOrWhiteSpace(tipo) && Enum.TryParse<TipoEvento>(tipo, ignoreCase: true, out var t)) q = q.Where(e => e.Tipo == t);
            else q = q.Where(e => tipos.Contains(e.Tipo));
            if (limit < 1) limit = 50;
            if (limit > 200) limit = 200;
            if (offset < 0) offset = 0;
            var lista = await q.OrderByDescending(e => e.CreadoEn).Skip(offset).Take(limit).Select(e => new { e.Id, tipo = e.Tipo.ToString(), e.Payload, e.CreadoEn, e.UsuarioId }).ToListAsync();
            return Ok(lista);
        }
    }
}