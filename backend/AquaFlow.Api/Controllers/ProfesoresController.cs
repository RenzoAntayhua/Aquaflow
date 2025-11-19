using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/profesores")]
    [Authorize]
    public class ProfesoresController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db, [FromQuery] int? colegioId)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);

            var query = db.Usuarios.Where(u => u.Rol == RolUsuario.profesor);
            if (rol == "admin")
            {
                if (colegioId.HasValue) query = query.Where(u => u.ColegioId == colegioId.Value);
            }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                query = query.Where(u => u.ColegioId == actor.ColegioId!.Value);
            }
            else return Forbid();
            var profesores = await query.OrderBy(u => u.Nombre).Select(u => new { u.Id, u.Nombre, u.Email, u.ColegioId }).ToListAsync();
            return Ok(profesores);
        }

        [HttpPost]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
            var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
            var colegioId = req.TryGetProperty("colegioId", out var cProp) ? cProp.GetInt32() : 0;
            if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || !actor.ColegioId.HasValue) return Forbid();
                colegioId = actor.ColegioId!.Value;
            }
            else if (rol != "admin") return Forbid();
            if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(email) || colegioId <= 0)
                return BadRequest(new { mensaje = "Datos incompletos: nombre, email y colegioId son requeridos" });

            var existe = await db.Usuarios.AnyAsync(u => u.Email == email);
            if (existe) return Conflict(new { mensaje = "El email ya está registrado" });

            var passwordPlano = Guid.NewGuid().ToString("N").Substring(0, 10);
            var hash = BCrypt.Net.BCrypt.HashPassword(passwordPlano);
            var profesor = new Usuario
            {
                ColegioId = colegioId,
                Rol = RolUsuario.profesor,
                Nombre = nombre!,
                Email = email!,
                PasswordHash = hash,
                Estado = "requiere_cambio"
            };
            db.Usuarios.Add(profesor);
            await db.SaveChangesAsync();

            bool emailEnviado = false;
            try
            {
                var host = Environment.GetEnvironmentVariable("SMTP_HOST");
                var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
                var userS = Environment.GetEnvironmentVariable("SMTP_USER");
                var passS = Environment.GetEnvironmentVariable("SMTP_PASS");
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";
                if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                {
                    using var client = new System.Net.Mail.SmtpClient(host, port);
                    client.EnableSsl = true;
                    if (!string.IsNullOrWhiteSpace(userS) && !string.IsNullOrWhiteSpace(passS))
                        client.Credentials = new System.Net.NetworkCredential(userS, passS);
                    var mail = new System.Net.Mail.MailMessage(from, profesor.Email)
                    {
                        Subject = "Credenciales de Profesor - AquaFlow",
                        Body = $"Hola {profesor.Nombre},\n\nSe ha creado tu cuenta de profesor en AquaFlow.\nTus credenciales de acceso:\nEmail: {profesor.Email}\nPassword temporal: {passwordPlano}\n\nPor favor inicia sesión y cambia tu contraseña.",
                    };
                    await client.SendMailAsync(mail);
                    emailEnviado = true;
                }
            }
            catch { emailEnviado = false; }
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_crear_profesor, ColegioId = profesor.ColegioId ?? 0, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = profesor.Id, email = profesor.Email, emailEnviado, ip }) });
                await db.SaveChangesAsync();
            }
            return Created($"/api/profesores/{profesor.Id}", new { profesor.Id, profesor.Nombre, profesor.Email, profesor.ColegioId, passwordTemporal = passwordPlano, emailEnviado });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Actualizar([FromServices] AquaFlowDbContext db, int id, [FromBody] System.Text.Json.JsonElement req)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var profesor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == id && u.Rol == RolUsuario.profesor);
            if (profesor is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != profesor.ColegioId) return Forbid();
            }
            else return Forbid();
            var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
            var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
            if (!string.IsNullOrWhiteSpace(nombre)) profesor.Nombre = nombre!;
            if (!string.IsNullOrWhiteSpace(email) && !string.Equals(email, profesor.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existe = await db.Usuarios.AnyAsync(u => u.Email == email);
                if (existe) return Conflict(new { mensaje = "El email ya está registrado" });
                profesor.Email = email!;
            }
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_actualizar_profesor, ColegioId = profesor.ColegioId ?? 0, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = profesor.Id, nombre = profesor.Nombre, email = profesor.Email, ip }) });
                await db.SaveChangesAsync();
            }
            return Ok(new { profesor.Id, profesor.Nombre, profesor.Email, profesor.ColegioId });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Eliminar([FromServices] AquaFlowDbContext db, int id)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            var rol = rolClaim.ToLowerInvariant();
            int.TryParse(userIdClaim, out var actorId);
            var profesor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == id && u.Rol == RolUsuario.profesor);
            if (profesor is null) return NotFound();
            if (rol == "admin") { }
            else if (rol == "director")
            {
                var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
                if (actor is null || actor.ColegioId != profesor.ColegioId) return Forbid();
            }
            else return Forbid();
            var aulas = await db.Aulas.Where(a => a.ProfesorId == profesor.Id).ToListAsync();
            foreach (var a in aulas) a.ProfesorId = null;
            db.Usuarios.Remove(profesor);
            await db.SaveChangesAsync();
            if (rol == "director")
            {
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.director_eliminar_profesor, ColegioId = profesor.ColegioId ?? 0, UsuarioId = actorId, Payload = JsonSerializer.Serialize(new { targetId = id, ip }) });
                await db.SaveChangesAsync();
            }
            return NoContent();
        }
    }
}