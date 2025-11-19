using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Data.Common;
using System.Text.Json;
using System.Linq;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private static object? _cache;
        private static DateTime _cacheTs = DateTime.MinValue;
        private static readonly Dictionary<string, List<DateTime>> _rate = new();
        private static readonly object _rateLock = new();
        private static readonly List<DateTime> _emailFailTimes = new();
        private static DateTime _lastAlertTs = DateTime.MinValue;

        private static bool IsLimited(string key, params (int maxCount, TimeSpan window)[] rules)
        {
            lock (_rateLock)
            {
                if (!_rate.TryGetValue(key, out var list))
                {
                    list = new List<DateTime>();
                    _rate[key] = list;
                }
                var now = DateTime.UtcNow;
                list.RemoveAll(t => t < now.AddDays(-2));
                foreach (var rule in rules)
                {
                    var count = list.Count(t => t > now - rule.window);
                    if (count >= rule.maxCount) return true;
                }
                list.Add(now);
                return false;
            }
        }

        private async Task RegistrarFalloEmailYAvisar(AquaFlowDbContext db, int actorAdminId, string accion, string? email, int? targetId)
        {
            var now = DateTime.UtcNow;
            lock (_rateLock)
            {
                _emailFailTimes.Add(now);
                _emailFailTimes.RemoveAll(t => t < now.AddHours(-24));
            }
            var recientes10m = _emailFailTimes.Count(t => t > now.AddMinutes(-10));
            if (recientes10m >= 3 && (now - _lastAlertTs).TotalMinutes > 10)
            {
                _lastAlertTs = now;
                var alertTo = Environment.GetEnvironmentVariable("ALERT_TO") ?? Environment.GetEnvironmentVariable("SMTP_FROM");
                var host = Environment.GetEnvironmentVariable("SMTP_HOST");
                var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
                var user = Environment.GetEnvironmentVariable("SMTP_USER");
                var pass = Environment.GetEnvironmentVariable("SMTP_PASS");
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";
                try
                {
                    if (!string.IsNullOrWhiteSpace(alertTo) && !string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                    {
                        using var client = new System.Net.Mail.SmtpClient(host, port);
                        client.EnableSsl = true;
                        if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                            client.Credentials = new System.Net.NetworkCredential(user, pass);
                        var mail = new System.Net.Mail.MailMessage(from, alertTo)
                        {
                            Subject = "ALERTA: Fallos de envío de email en AquaFlow",
                            Body = $"Se detectaron {recientes10m} fallos de correo en los últimos 10 minutos.\nÚltima acción: {accion}\nEmail: {email}\nTargetId: {targetId}\nHora: {now:o}"
                        };
                        await client.SendMailAsync(mail);
                    }
                }
                catch { }
                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                db.Eventos.Add(new Evento { Tipo = TipoEvento.admin_alerta_email, ColegioId = 0, UsuarioId = actorAdminId, Payload = JsonSerializer.Serialize(new { recientes10m, accion, email, targetId, ip }) });
                await db.SaveChangesAsync();
            }
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromServices] AquaFlowDbContext db)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();

            if ((DateTime.UtcNow - _cacheTs).TotalSeconds < 30 && _cache is not null)
                return Ok(_cache);

            var sql = @"SELECT
                (SELECT COUNT(*) FROM colegios) AS colegios,
                (SELECT COUNT(*) FROM aulas) AS aulas,
                (SELECT COUNT(*) FROM usuarios) AS usuarios,
                (SELECT COUNT(*) FROM usuarios WHERE ""Rol"" = 0) AS estudiantes,
                (SELECT COUNT(*) FROM usuarios WHERE ""Rol"" = 1) AS profesores,
                (SELECT COUNT(*) FROM usuarios WHERE ""Rol"" = 2) AS directores,
                (SELECT COUNT(*) FROM usuarios WHERE ""Rol"" = 3) AS admins,
                (SELECT COUNT(*) FROM espacios) AS espacios,
                (SELECT COUNT(*) FROM dispositivos) AS dispositivos,
                (SELECT COUNT(*) FROM insignias) AS insignias,
                (SELECT COUNT(*) FROM plantillas_retos) AS plantillasRetos,
                (SELECT COUNT(*) FROM preguntas) AS preguntas,
                (SELECT COUNT(*) FROM departamentos) AS departamentos,
                (SELECT COUNT(*) FROM provincias) AS provincias,
                (SELECT COUNT(*) FROM distritos) AS distritos";

            await using DbConnection con = db.Database.GetDbConnection();
            await con.OpenAsync();
            await using var cmd = con.CreateCommand();
            cmd.CommandText = sql;
            await using var rdr = await cmd.ExecuteReaderAsync();
            if (await rdr.ReadAsync())
            {
                var data = new
                {
                    colegios = rdr.GetInt32(0),
                    aulas = rdr.GetInt32(1),
                    usuarios = rdr.GetInt32(2),
                    estudiantes = rdr.GetInt32(3),
                    profesores = rdr.GetInt32(4),
                    directores = rdr.GetInt32(5),
                    admins = rdr.GetInt32(6),
                    espacios = rdr.GetInt32(7),
                    dispositivos = rdr.GetInt32(8),
                    insignias = rdr.GetInt32(9),
                    plantillasRetos = rdr.GetInt32(10),
                    preguntas = rdr.GetInt32(11),
                    ubigeo = new { departamentos = rdr.GetInt32(12), provincias = rdr.GetInt32(13), distritos = rdr.GetInt32(14) }
                };
                _cache = data;
                _cacheTs = DateTime.UtcNow;
                return Ok(data);
            }
            return Ok(new { });
        }

        [HttpGet("usuarios")]
        public async Task<IActionResult> BuscarUsuarios([FromServices] AquaFlowDbContext db, [FromQuery] string? q, [FromQuery] string? rol, [FromQuery] int? colegioId, [FromQuery] string? estado, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();

            var query = db.Usuarios.AsQueryable();
            if (!string.IsNullOrWhiteSpace(q))
            {
                var ql = q.Trim().ToLower();
                query = query.Where(u => u.Nombre.ToLower().Contains(ql) || u.Email.ToLower().Contains(ql));
            }
            if (!string.IsNullOrWhiteSpace(rol) && Enum.TryParse<RolUsuario>(rol, ignoreCase: true, out var r))
                query = query.Where(u => u.Rol == r);
            else
                query = query.Where(u => u.Rol == RolUsuario.director || u.Rol == RolUsuario.admin);
            if (colegioId.HasValue)
                query = query.Where(u => u.ColegioId == colegioId.Value);
            if (!string.IsNullOrWhiteSpace(estado))
                query = query.Where(u => u.Estado == estado);

            if (limit < 1) limit = 50;
            if (limit > 200) limit = 200;
            if (offset < 0) offset = 0;

            var lista = await query
                .OrderByDescending(u => u.CreadoEn)
                .Skip(offset)
                .Take(limit)
                .Select(u => new { u.Id, u.Nombre, u.Email, rol = u.Rol.ToString(), u.ColegioId, u.Estado, u.CreadoEn })
                .ToListAsync();
            return Ok(lista);
        }

        [HttpPost("usuarios/invitar-director")]
        public async Task<IActionResult> InvitarDirector([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();
            var adminIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(adminIdClaim)) return Unauthorized();
            if (!int.TryParse(adminIdClaim, out var adminId)) return Unauthorized();

            var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
            var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
            var colegioId = req.TryGetProperty("colegioId", out var cProp) && cProp.ValueKind == System.Text.Json.JsonValueKind.Number ? cProp.GetInt32() : 0;
            if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(email) || colegioId <= 0)
                return BadRequest(new { mensaje = "nombre, email y colegioId requeridos" });
            var rlKey = $"admin:{adminId}:invitar_director";
            if (IsLimited(rlKey, (5, TimeSpan.FromMinutes(1)), (50, TimeSpan.FromDays(1)))) return StatusCode(429, new { mensaje = "Rate limit excedido" });
            var existeColegio = await db.Colegios.AnyAsync(c => c.Id == colegioId);
            if (!existeColegio) return NotFound(new { mensaje = "Colegio no encontrado" });
            var existeUsuario = await db.Usuarios.AnyAsync(u => u.Email == email);
            if (existeUsuario) return Conflict(new { mensaje = "El email ya está registrado" });

            string GenerarPassword()
            {
                var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
                var bytes = new byte[12];
                rng.GetBytes(bytes);
                var base64 = System.Convert.ToBase64String(bytes);
                return new string(base64.Where(char.IsLetterOrDigit).Take(12).ToArray());
            }

            var passwordPlano = GenerarPassword();
            var hash = BCrypt.Net.BCrypt.HashPassword(passwordPlano);
            var director = new Usuario
            {
                ColegioId = colegioId,
                Rol = RolUsuario.director,
                Nombre = nombre!,
                Email = email!,
                PasswordHash = hash,
                Estado = "requiere_cambio"
            };
            db.Usuarios.Add(director);
            await db.SaveChangesAsync();

            bool emailEnviado = false;
            try
            {
                var host = Environment.GetEnvironmentVariable("SMTP_HOST");
                var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
                var user = Environment.GetEnvironmentVariable("SMTP_USER");
                var pass = Environment.GetEnvironmentVariable("SMTP_PASS");
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";
                if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                {
                    using var client = new System.Net.Mail.SmtpClient(host, port);
                    client.EnableSsl = true;
                    if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                        client.Credentials = new System.Net.NetworkCredential(user, pass);
                    var mail = new System.Net.Mail.MailMessage(from, email)
                    {
                        Subject = "Credenciales de Director - AquaFlow",
                        Body = $"Hola {nombre},\n\nSe ha creado tu cuenta de director.\nTus credenciales:\nEmail: {email}\nPassword temporal: {passwordPlano}\n\nInicia sesión y cambia tu contraseña.",
                    };
                    await client.SendMailAsync(mail);
                    emailEnviado = true;
                }
            }
            catch { emailEnviado = false; }
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            db.Eventos.Add(new Evento { Tipo = TipoEvento.admin_invitar_director, ColegioId = colegioId, UsuarioId = adminId, Payload = JsonSerializer.Serialize(new { targetId = director.Id, email = director.Email, emailEnviado, ip }) });
            if (!emailEnviado) await RegistrarFalloEmailYAvisar(db, adminId, "invitar_director", director.Email, director.Id);
            await db.SaveChangesAsync();
            return Created($"/api/admin/usuarios/{director.Id}", new { director.Id, director.Nombre, director.Email, director.ColegioId, emailEnviado, passwordTemporal = emailEnviado ? null : passwordPlano });
        }

        [HttpPost("usuarios/invitar-profesor")]
        public async Task<IActionResult> InvitarProfesor([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();
            var adminIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(adminIdClaim)) return Unauthorized();
            if (!int.TryParse(adminIdClaim, out var adminId)) return Unauthorized();

            var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
            var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
            var colegioId = req.TryGetProperty("colegioId", out var cProp) && cProp.ValueKind == System.Text.Json.JsonValueKind.Number ? cProp.GetInt32() : 0;
            if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(email) || colegioId <= 0)
                return BadRequest(new { mensaje = "nombre, email y colegioId requeridos" });
            var rlKey = $"admin:{adminId}:invitar_profesor";
            if (IsLimited(rlKey, (5, TimeSpan.FromMinutes(1)), (50, TimeSpan.FromDays(1)))) return StatusCode(429, new { mensaje = "Rate limit excedido" });
            var existeColegio = await db.Colegios.AnyAsync(c => c.Id == colegioId);
            if (!existeColegio) return NotFound(new { mensaje = "Colegio no encontrado" });
            var existeUsuario = await db.Usuarios.AnyAsync(u => u.Email == email);
            if (existeUsuario) return Conflict(new { mensaje = "El email ya está registrado" });

            string GenerarPassword()
            {
                var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
                var bytes = new byte[12];
                rng.GetBytes(bytes);
                var base64 = System.Convert.ToBase64String(bytes);
                return new string(base64.Where(char.IsLetterOrDigit).Take(12).ToArray());
            }

            var passwordPlano = GenerarPassword();
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
                var user = Environment.GetEnvironmentVariable("SMTP_USER");
                var pass = Environment.GetEnvironmentVariable("SMTP_PASS");
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";
                if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                {
                    using var client = new System.Net.Mail.SmtpClient(host, port);
                    client.EnableSsl = true;
                    if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                        client.Credentials = new System.Net.NetworkCredential(user, pass);
                    var mail = new System.Net.Mail.MailMessage(from, email)
                    {
                        Subject = "Credenciales de Profesor - AquaFlow",
                        Body = $"Hola {nombre},\n\nSe ha creado tu cuenta de profesor.\nTus credenciales:\nEmail: {email}\nPassword temporal: {passwordPlano}\n\nInicia sesión y cambia tu contraseña.",
                    };
                    await client.SendMailAsync(mail);
                    emailEnviado = true;
                }
            }
            catch { emailEnviado = false; }
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            db.Eventos.Add(new Evento { Tipo = TipoEvento.admin_invitar_profesor, ColegioId = colegioId, UsuarioId = adminId, Payload = JsonSerializer.Serialize(new { targetId = profesor.Id, email = profesor.Email, emailEnviado, ip }) });
            if (!emailEnviado) await RegistrarFalloEmailYAvisar(db, adminId, "invitar_profesor", profesor.Email, profesor.Id);
            await db.SaveChangesAsync();
            return Created($"/api/admin/usuarios/{profesor.Id}", new { profesor.Id, profesor.Nombre, profesor.Email, profesor.ColegioId, emailEnviado, passwordTemporal = emailEnviado ? null : passwordPlano });
        }

        [HttpPost("usuarios/reset-password")]
        public async Task<IActionResult> ResetPasswordAdmin([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();
            var adminIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(adminIdClaim)) return Unauthorized();
            if (!int.TryParse(adminIdClaim, out var adminId)) return Unauthorized();

            var usuarioId = req.TryGetProperty("usuarioId", out var uProp) && uProp.ValueKind == System.Text.Json.JsonValueKind.Number ? uProp.GetInt32() : (int?)null;
            var email = req.TryGetProperty("email", out var eProp) ? eProp.GetString() : null;
            Usuario? usuario = null;
            if (usuarioId.HasValue)
                usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId.Value);
            else if (!string.IsNullOrWhiteSpace(email))
                usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == email);
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });
            var u = usuario!;

            var rlKey = $"admin:{adminId}:reset_password";
            if (IsLimited(rlKey, (10, TimeSpan.FromMinutes(1)), (100, TimeSpan.FromDays(1)))) return StatusCode(429, new { mensaje = "Rate limit excedido" });

            string GenerarPassword()
            {
                var rng = System.Security.Cryptography.RandomNumberGenerator.Create();
                var bytes = new byte[12];
                rng.GetBytes(bytes);
                var base64 = System.Convert.ToBase64String(bytes);
                return new string(base64.Where(char.IsLetterOrDigit).Take(12).ToArray());
            }

            var passwordPlano = GenerarPassword();
            u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordPlano);
            u.Estado = "requiere_cambio";
            await db.SaveChangesAsync();

            bool emailEnviado = false;
            try
            {
                var host = Environment.GetEnvironmentVariable("SMTP_HOST");
                var portStr = Environment.GetEnvironmentVariable("SMTP_PORT");
                var user = Environment.GetEnvironmentVariable("SMTP_USER");
                var pass = Environment.GetEnvironmentVariable("SMTP_PASS");
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? "no-reply@aquaflow";
                if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                {
                    using var client = new System.Net.Mail.SmtpClient(host, port);
                    client.EnableSsl = true;
                    if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                        client.Credentials = new System.Net.NetworkCredential(user, pass);
                    var mail = new System.Net.Mail.MailMessage(from, u.Email)
                    {
                        Subject = "Reseteo de Contraseña - AquaFlow",
                        Body = $"Hola {u.Nombre},\n\nTu contraseña fue reseteada por el administrador.\nPassword temporal: {passwordPlano}\n\nInicia sesión y cambia tu contraseña.",
                    };
                    await client.SendMailAsync(mail);
                    emailEnviado = true;
                }
            }
            catch { emailEnviado = false; }
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            db.Eventos.Add(new Evento { Tipo = TipoEvento.admin_reset_password, ColegioId = u.ColegioId ?? 0, UsuarioId = adminId, Payload = JsonSerializer.Serialize(new { targetId = u.Id, email = u.Email, emailEnviado, ip }) });
            if (!emailEnviado) await RegistrarFalloEmailYAvisar(db, adminId, "reset_password", u.Email, u.Id);
            await db.SaveChangesAsync();
            return Ok(new { u.Id, u.Email, emailEnviado, passwordTemporal = emailEnviado ? null : passwordPlano });
        }

        [HttpGet("auditoria")]
        public async Task<IActionResult> Auditoria([FromServices] AquaFlowDbContext db, [FromQuery] string? tipo, [FromQuery] int? adminId, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, [FromQuery] string? email, [FromQuery] int? targetId, [FromQuery] int limit = 100, [FromQuery] int offset = 0)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "admin", StringComparison.OrdinalIgnoreCase)) return Forbid();
            var adminIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(adminIdClaim)) return Unauthorized();
            if (!int.TryParse(adminIdClaim, out var currentAdminId)) return Unauthorized();

            var tipos = new[] { TipoEvento.admin_invitar_director, TipoEvento.admin_invitar_profesor, TipoEvento.admin_reset_password };
            var query = db.Eventos.Where(e => tipos.Contains(e.Tipo));
            if (!string.IsNullOrWhiteSpace(tipo) && Enum.TryParse<TipoEvento>(tipo, ignoreCase: true, out var te))
                query = query.Where(e => e.Tipo == te);
            if (adminId.HasValue)
                query = query.Where(e => e.UsuarioId == adminId.Value);
            if (!string.IsNullOrWhiteSpace(email))
                query = query.Where(e => e.Payload.Contains(email));
            if (targetId.HasValue)
                query = query.Where(e => e.Payload.Contains("\"targetId\":" + targetId.Value));
            if (desde.HasValue)
                query = query.Where(e => e.CreadoEn >= desde.Value);
            if (hasta.HasValue)
                query = query.Where(e => e.CreadoEn <= hasta.Value);
            if (limit < 1) limit = 100;
            if (limit > 500) limit = 500;
            if (offset < 0) offset = 0;

            var total = await query.CountAsync();
            var items = await query.OrderByDescending(e => e.CreadoEn).Skip(offset).Take(limit).ToListAsync();
            var lista = items.Select(e =>
            {
                int? targetId = null;
                string? email = null;
                bool? emailEnviado = null;
                string? ip = null;
                try
                {
                    var el = JsonSerializer.Deserialize<JsonElement>(e.Payload);
                    if (el.ValueKind != JsonValueKind.Undefined)
                    {
                        if (el.TryGetProperty("targetId", out var tProp) && tProp.ValueKind == JsonValueKind.Number) targetId = tProp.GetInt32();
                        if (el.TryGetProperty("email", out var eProp) && eProp.ValueKind == JsonValueKind.String) email = eProp.GetString();
                        if (el.TryGetProperty("emailEnviado", out var eeProp) && eeProp.ValueKind == JsonValueKind.True || eeProp.ValueKind == JsonValueKind.False) emailEnviado = eeProp.GetBoolean();
                        if (el.TryGetProperty("ip", out var ipProp) && ipProp.ValueKind == JsonValueKind.String) ip = ipProp.GetString();
                    }
                }
                catch { }
                return new { e.Id, tipo = e.Tipo.ToString(), actorId = e.UsuarioId, e.ColegioId, e.AulaId, targetId, email, emailEnviado, ip, e.CreadoEn };
            });
            return Ok(new { total, items = lista });
        }
    }
}