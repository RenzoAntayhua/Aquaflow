using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    public class ColegiosController : ControllerBase
    {
        [HttpGet]
        [Route("api/colegios")]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db)
        {
            var colegios = await db.Colegios.OrderBy(c => c.Nombre).ToListAsync();
            return Ok(colegios);
        }

        [HttpGet]
        [Route("api/ciudades")]
        public async Task<IActionResult> Ciudades([FromServices] AquaFlowDbContext db)
        {
            var ciudades = await db.Colegios
                .Where(c => c.Ciudad != null && c.Ciudad != "")
                .Select(c => c.Ciudad!)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();
            return Ok(ciudades);
        }

        [HttpPost]
        [Route("api/colegios")]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] Colegio nuevo)
        {
            if (string.IsNullOrWhiteSpace(nuevo.Nombre))
                return BadRequest(new { error = "El nombre del colegio es obligatorio" });

            if (nuevo.DistritoId.HasValue)
            {
                var distrito = await db.Distritos.FindAsync(nuevo.DistritoId.Value);
                if (distrito == null)
                    return BadRequest(new { error = "Distrito no encontrado", distrito_id = nuevo.DistritoId });
                if (string.IsNullOrWhiteSpace(nuevo.Ciudad))
                    nuevo.Ciudad = distrito.Nombre;
            }

            db.Colegios.Add(nuevo);
            await db.SaveChangesAsync();
            return Created($"/api/colegios/{nuevo.Id}", nuevo);
        }

        [HttpPost]
        [Route("api/colegios/alta-completa")]
        public async Task<IActionResult> AltaCompleta([FromServices] AquaFlowDbContext db, [FromBody] AltaColegioConDirectorRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.nombre))
                return BadRequest(new { error = "El nombre del colegio es obligatorio" });
            if (string.IsNullOrWhiteSpace(req.directorNombre) || string.IsNullOrWhiteSpace(req.directorEmail))
                return BadRequest(new { error = "Datos del director incompletos" });
            if (!req.distritoId.HasValue)
                return BadRequest(new { error = "Debe seleccionar un distrito" });
            if (string.IsNullOrWhiteSpace(req.codigoLocal))
                return BadRequest(new { error = "El código local es obligatorio" });
            if (string.IsNullOrWhiteSpace(req.nivel))
                return BadRequest(new { error = "El nivel es obligatorio" });
            if (string.IsNullOrWhiteSpace(req.direccion))
                return BadRequest(new { error = "La dirección es obligatoria" });
            if (string.IsNullOrWhiteSpace(req.direccionExacta))
                return BadRequest(new { error = "La dirección exacta es obligatoria" });
            if (string.IsNullOrWhiteSpace(req.telefono))
                return BadRequest(new { error = "El teléfono es obligatorio" });
            if (string.IsNullOrWhiteSpace(req.estado))
                return BadRequest(new { error = "El estado es obligatorio" });
            if (string.IsNullOrWhiteSpace(req.emailContacto))
                return BadRequest(new { error = "El email de contacto es obligatorio" });

            var existeDirector = await db.Usuarios.AnyAsync(u => u.Email == req.directorEmail);
            if (existeDirector) return Conflict(new { mensaje = "El email del director ya está registrado." });

            string? ciudadFinal = req.ciudad;
            if (req.distritoId.HasValue)
            {
                var distrito = await db.Distritos.FindAsync(req.distritoId.Value);
                if (distrito is null)
                    return BadRequest(new { error = "Distrito no encontrado", distrito_id = req.distritoId });
                if (string.IsNullOrWhiteSpace(ciudadFinal)) ciudadFinal = distrito.Nombre;
            }

            var telefonoValido = System.Text.RegularExpressions.Regex.IsMatch(req.telefono!, "^\\+?[\\d\\s-]{7,15}$");
            if (!telefonoValido)
                return BadRequest(new { error = "Formato de teléfono inválido" });

            var colegio = new Colegio
            {
                Nombre = req.nombre,
                Ciudad = ciudadFinal,
                EmailContacto = req.emailContacto,
                DistritoId = req.distritoId,
                CodigoLocal = req.codigoLocal,
                Direccion = req.direccion,
                DireccionExacta = req.direccionExacta,
                Telefono = req.telefono
            };

            var nivelStr = req.nivel!.Replace('-', '_');
            if (Enum.TryParse<NivelEducativo>(nivelStr, true, out var nivelEnum))
                colegio.Nivel = nivelEnum;
            else
                return BadRequest(new { error = "Nivel inválido" });

            if (!string.IsNullOrWhiteSpace(req.estado) && Enum.TryParse<EstadoColegio>(req.estado, true, out var estadoEnum))
                colegio.Estado = estadoEnum;

            db.Colegios.Add(colegio);
            await db.SaveChangesAsync();

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
                ColegioId = colegio.Id,
                Rol = RolUsuario.director,
                Nombre = req.directorNombre,
                Email = req.directorEmail,
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
                var from = Environment.GetEnvironmentVariable("SMTP_FROM") ?? req.emailContacto ?? "no-reply@aquaflow";
                if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
                {
                    using var client = new System.Net.Mail.SmtpClient(host, port);
                    client.EnableSsl = true;
                    if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(pass))
                        client.Credentials = new System.Net.NetworkCredential(user, pass);
                    var mail = new System.Net.Mail.MailMessage(from, req.directorEmail)
                    {
                        Subject = "Credenciales de Director - AquaFlow",
                        Body = $"Hola {req.directorNombre},\n\nSe ha creado el colegio '{req.nombre}'.\nTus credenciales de acceso:\nEmail: {req.directorEmail}\nPassword temporal: {passwordPlano}\n\nPor favor inicia sesión y cambia tu contraseña.",
                    };
                    await client.SendMailAsync(mail);
                    emailEnviado = true;
                }
            }
            catch { emailEnviado = false; }

            var resp = new AltaColegioConDirectorResponse(
                colegio.Id,
                colegio.Nombre,
                colegio.Ciudad,
                director.Id,
                director.Nombre,
                director.Email,
                emailEnviado,
                emailEnviado ? null : passwordPlano
            );

            return Created($"/api/colegios/{colegio.Id}", resp);
        }

        
    }
}