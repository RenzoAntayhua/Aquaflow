using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/espacios")]
    [Authorize]
    public class EspaciosController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db, [FromQuery] int? colegioId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var query = db.Espacios.AsQueryable();
            if (rol == "admin")
            {
                if (colegioId.HasValue) query = query.Where(e => e.ColegioId == colegioId.Value);
            }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                query = query.Where(e => e.ColegioId == actor.ColegioId!.Value);
            }
            else return Forbid();
            var espacios = await query.OrderBy(e => e.Etiqueta).ToListAsync();
            return Ok(espacios);
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] Espacio nuevo)
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
                nuevo.ColegioId = actor.ColegioId!.Value;
            }
            else if (rol == "admin")
            {
                if (nuevo.ColegioId <= 0) return BadRequest(new { mensaje = "ColegioId requerido" });
            }
            else return Forbid();
            db.Espacios.Add(nuevo);
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_crear_espacio, ColegioId = nuevo.ColegioId, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = nuevo.Id, etiqueta = nuevo.Etiqueta, tipo = nuevo.Tipo, aulaId = nuevo.AulaId, ip }) });
                await db.SaveChangesAsync();
            }
            return Created($"/api/espacios/{nuevo.Id}", nuevo);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Actualizar([FromServices] AquaFlowDbContext db, int id, [FromBody] Espacio cambios)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var esp = await db.Espacios.FirstOrDefaultAsync(e => e.Id == id);
            if (esp is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != esp.ColegioId) return Forbid();
            }
            else return Forbid();
            if (!string.IsNullOrWhiteSpace(cambios.Etiqueta)) esp.Etiqueta = cambios.Etiqueta;
            esp.Tipo = cambios.Tipo;
            if (cambios.AulaId.HasValue)
            {
                var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == cambios.AulaId.Value);
                if (aula is null || aula.ColegioId != esp.ColegioId) return BadRequest(new { mensaje = "Aula inválida para el colegio" });
                esp.AulaId = cambios.AulaId.Value;
            }
            else
            {
                esp.AulaId = null;
            }
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_actualizar_espacio, ColegioId = esp.ColegioId, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = esp.Id, etiqueta = esp.Etiqueta, tipo = esp.Tipo, aulaId = esp.AulaId, ip }) });
                await db.SaveChangesAsync();
            }
            return Ok(esp);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Eliminar([FromServices] AquaFlowDbContext db, int id)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var esp = await db.Espacios.FirstOrDefaultAsync(e => e.Id == id);
            if (esp is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != esp.ColegioId) return Forbid();
            }
            else return Forbid();
            db.Espacios.Remove(esp);
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_eliminar_espacio, ColegioId = esp.ColegioId, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = id, ip }) });
                await db.SaveChangesAsync();
            }
            return NoContent();
        }
    }
}