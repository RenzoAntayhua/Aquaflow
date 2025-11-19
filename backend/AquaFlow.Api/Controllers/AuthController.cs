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
            var existe = await db.Usuarios.AnyAsync(u => u.Email == req.email);
            if (existe) return Conflict(new { mensaje = "El email ya está registrado." });

            if (!Enum.TryParse<RolUsuario>(req.rol, ignoreCase: true, out var rol))
                return BadRequest(new { mensaje = "Rol inválido." });

            if (rol != RolUsuario.estudiante)
                return BadRequest(new { mensaje = "Sólo estudiantes pueden registrarse. Profesores y directores reciben credenciales por invitación." });

            if (req.colegioId is null)
                return BadRequest(new { mensaje = "Debe seleccionar un colegio al registrarse como estudiante." });

            var hash = BCrypt.Net.BCrypt.HashPassword(req.password);
            var usuario = new Usuario
            {
                ColegioId = req.colegioId,
                Rol = rol,
                Nombre = req.nombre,
                Email = req.email,
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
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
            if (usuario is null) return Unauthorized();
            var ok = BCrypt.Net.BCrypt.Verify(req.password, usuario.PasswordHash);
            if (!ok) return Unauthorized();

            var claims = new[]
            {
                new System.Security.Claims.Claim("userId", usuario.Id.ToString()),
                new System.Security.Claims.Claim("rol", usuario.Rol.ToString()),
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
            return Ok(new { token = jwt, usuario = new { usuario.Id, usuario.Nombre, usuario.Email, rol = usuario.Rol.ToString().ToLowerInvariant(), usuario.ColegioId, Estado = usuario.Estado, requiereCambioPassword = string.Equals(usuario.Estado, "requiere_cambio", StringComparison.OrdinalIgnoreCase) } });
        }

        [HttpPost("password/reset/solicitar")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetSolicitar([FromServices] AquaFlowDbContext db, [FromBody] ResetRequest req)
        {
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Email == req.email);
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
                return Ok(new { mensaje = "Token generado", token });
            }
            return Ok(new { mensaje = "Si el email existe, se generó un token." });
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