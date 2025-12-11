using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("auth")]
    public class AuthController : ControllerBase
    {
        // Rate limiting para login
        private static readonly Dictionary<string, List<DateTime>> _loginAttempts = new();
        private static readonly object _loginLock = new();

        private static bool IsLoginLimited(string key)
        {
            lock (_loginLock)
            {
                if (!_loginAttempts.TryGetValue(key, out var list))
                {
                    list = new List<DateTime>();
                    _loginAttempts[key] = list;
                }
                var now = DateTime.UtcNow;
                list.RemoveAll(t => t < now.AddMinutes(-15));
                // Máximo 5 intentos por minuto, 20 por 15 minutos
                var lastMinute = list.Count(t => t > now.AddMinutes(-1));
                var last15Min = list.Count;
                if (lastMinute >= 5 || last15Min >= 20) return true;
                list.Add(now);
                return false;
            }
        }

        private static SymmetricSecurityKey BuildKey()
        {
            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "dev-secret-please-change";
            byte[] keyBytes = Encoding.UTF8.GetBytes(jwtSecret);
            if (keyBytes.Length < 32)
            {
                using var sha = System.Security.Cryptography.SHA256.Create();
                keyBytes = sha.ComputeHash(keyBytes);
            }
            return new SymmetricSecurityKey(keyBytes);
        }

        private static (string issuer, string audience) GetJwtIssAud()
        {
            var issuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "aquaflow";
            var audience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "aquaflow-frontend";
            return (issuer, audience);
        }

        [HttpPost("registrar")]
        [AllowAnonymous]
        public async Task<IActionResult> Registrar([FromServices] AquaFlowDbContext db, [FromBody] RegistroRequest req)
        {
            // Validar campos requeridos
            if (string.IsNullOrWhiteSpace(req.nombre))
                return BadRequest(new { mensaje = "El nombre es requerido." });
            if (string.IsNullOrWhiteSpace(req.email))
                return BadRequest(new { mensaje = "El email es requerido." });
            if (string.IsNullOrWhiteSpace(req.password))
                return BadRequest(new { mensaje = "La contraseña es requerida." });

            // Validar fortaleza de contraseña
            if (req.password.Length < 8)
                return BadRequest(new { mensaje = "La contraseña debe tener al menos 8 caracteres." });

            var existe = await db.Usuarios.AnyAsync(u => u.Email == req.email);
            if (existe) return Conflict(new { mensaje = "El email ya está registrado." });

            if (!Enum.TryParse<RolUsuario>(req.rol, ignoreCase: true, out var rol))
                return BadRequest(new { mensaje = "Rol inválido." });

            if (rol != RolUsuario.estudiante)
                return BadRequest(new { mensaje = "Sólo estudiantes pueden registrarse. Profesores y directores reciben credenciales por invitación." });

            if (req.colegioId is null)
                return BadRequest(new { mensaje = "Debe seleccionar un colegio al registrarse como estudiante." });

            // Verificar que el colegio existe
            var colegioExiste = await db.Colegios.AnyAsync(c => c.Id == req.colegioId.Value);
            if (!colegioExiste)
                return BadRequest(new { mensaje = "El colegio seleccionado no existe." });

            var hash = BCrypt.Net.BCrypt.HashPassword(req.password);
            var usuario = new Usuario
            {
                ColegioId = req.colegioId,
                Rol = rol,
                Nombre = req.nombre.Trim(),
                Email = req.email.Trim().ToLowerInvariant(),
                PasswordHash = hash,
                Estado = "activo"
            };

            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync();
            return Created($"/api/usuarios/{usuario.Id}", new { usuario.Id, usuario.Nombre, usuario.Email, rol = usuario.Rol.ToString().ToLowerInvariant() });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromServices] AquaFlowDbContext db, [FromBody] LoginRequest req)
        {
            // Rate limiting por IP y email
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var emailKey = $"email:{req.email?.ToLowerInvariant()}";
            var ipKey = $"ip:{ip}";
            
            if (IsLoginLimited(emailKey) || IsLoginLimited(ipKey))
                return StatusCode(429, new { mensaje = "Demasiados intentos. Espera unos minutos." });

            var usuario = await db.Usuarios.AsTracking().FirstOrDefaultAsync(u => u.Email == req.email);
            if (usuario is null) return Unauthorized(new { mensaje = "Credenciales inválidas" });
            var ok = BCrypt.Net.BCrypt.Verify(req.password, usuario.PasswordHash);
            if (!ok) return Unauthorized(new { mensaje = "Credenciales inválidas" });

            // Obtener aulaId si es profesor
            int? aulaId = null;
            if (usuario.Rol == RolUsuario.profesor)
            {
                aulaId = await db.Aulas
                    .Where(a => a.ProfesorId == usuario.Id)
                    .Select(a => a.Id)
                    .FirstOrDefaultAsync();
            }

            var claims = new[]
            {
                new System.Security.Claims.Claim("userId", usuario.Id.ToString()),
                new System.Security.Claims.Claim("rol", usuario.Rol.ToString().ToLowerInvariant()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, usuario.Rol.ToString().ToLowerInvariant()),
                new System.Security.Claims.Claim("colegioId", usuario.ColegioId?.ToString() ?? "")
            };

            var (issuer, audience) = GetJwtIssAud();
            var creds = new SigningCredentials(BuildKey(), SecurityAlgorithms.HmacSha256);
            var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            var jwt = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
            return Ok(new { 
                token = jwt, 
                usuario = new { 
                    usuario.Id, 
                    usuario.Nombre, 
                    usuario.Email, 
                    rol = usuario.Rol.ToString().ToLowerInvariant(), 
                    usuario.ColegioId,
                    aulaId,
                    Estado = usuario.Estado, 
                    requiereCambioPassword = string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase) 
                } 
            });
        }

        [HttpPost("password/reset/solicitar")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetSolicitar([FromServices] AquaFlowDbContext db, [FromBody] ResetRequest req)
        {
            // Siempre responder igual para evitar enumeración de emails
            var responseMsg = "Si el email está registrado, recibirás instrucciones para recuperar tu contraseña.";
            
            var usuario = await db.Usuarios.AsTracking().FirstOrDefaultAsync(u => u.Email == req.email);
            if (usuario is not null)
            {
                var token = Guid.NewGuid().ToString("N");
                var rec = new RecuperacionToken
                {
                    UsuarioId = usuario.Id,
                    Token = token,
                    ExpiraEn = DateTime.UtcNow.AddHours(1),
                    Usado = false
                };
                db.RecuperacionTokens.Add(rec);
                await db.SaveChangesAsync();

                // Intentar enviar email con el token
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
                        
                        var mail = new System.Net.Mail.MailMessage(from, req.email)
                        {
                            Subject = "Recuperación de contraseña - AquaFlow",
                            Body = $"Hola {usuario.Nombre},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nTu código de recuperación es: {token}\n\nEste código expira en 1 hora.\n\nSi no solicitaste esto, ignora este mensaje.\n\nSaludos,\nEquipo AquaFlow",
                        };
                        await client.SendMailAsync(mail);
                    }
                }
                catch { /* Silenciar errores de email */ }
            }
            
            return Ok(new { mensaje = responseMsg });
        }

        [HttpPost("password/reset/confirmar")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetConfirmar([FromServices] AquaFlowDbContext db, [FromBody] ResetConfirmRequest req)
        {
            var rec = await db.RecuperacionTokens.FirstOrDefaultAsync(r => r.Token == req.token && !r.Usado && r.ExpiraEn > DateTime.UtcNow);
            if (rec is null) return BadRequest(new { mensaje = "Token inválido o expirado." });

            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == rec.UsuarioId);
            if (usuario is null) return BadRequest(new { mensaje = "Usuario no encontrado." });

            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.newPassword);
            rec.Usado = true;
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "Contraseña actualizada." });
        }

        [HttpPost("password/cambiar")]
        [Authorize]
        public async Task<IActionResult> CambiarPassword([FromServices] AquaFlowDbContext db, [FromBody] ChangePasswordRequest req)
        {
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            if (!int.TryParse(userIdClaim, out var userId)) return Unauthorized();

            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == userId);
            if (usuario is null) return Unauthorized();

            var ok = BCrypt.Net.BCrypt.Verify(req.actual, usuario.PasswordHash);
            if (!ok) return BadRequest(new { mensaje = "Contraseña actual incorrecta." });

            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.nueva);
            if (string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase))
                usuario.Estado = "activo";
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "Contraseña actualizada." });
        }
    }
}