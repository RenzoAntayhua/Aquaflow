using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/usuarios")]
    [Authorize]
    public class UsuariosController : ControllerBase
    {
        
        [HttpGet("{usuarioId:int}/perfil")]
        public async Task<IActionResult> Perfil([FromServices] AquaFlowDbContext db, int usuarioId)
        {
            // Proyección para evitar traer datos innecesarios
            var usuario = await db.Usuarios
                .Where(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante)
                .Select(u => new { u.Id, u.Nombre, u.Email, u.ColegioId })
                .FirstOrDefaultAsync();
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });

            // Tracking necesario para posible actualización
            var agg = await db.PerfilEstudianteAggs.AsTracking().FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            var stale = agg is null || (DateTime.UtcNow - agg.UltimaActualizacion).TotalSeconds > 60;
            if (stale)
            {
                var monedas = await db.Puntos
                    .Where(p => p.UsuarioId == usuarioId)
                    .SumAsync(p => (int?)p.Valor) ?? 0;

                var juegosCompletados = await db.Eventos
                    .CountAsync(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada));

                var payloads = await db.Eventos
                    .Where(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada))
                    .Select(e => e.Payload)
                    .ToListAsync();
                double litrosAhorrados = 0.0;
                foreach (var pl in payloads)
                {
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(pl ?? "{}");
                        var root = doc.RootElement;
                        if (root.TryGetProperty("litrosAhorrados", out var la) && la.ValueKind == System.Text.Json.JsonValueKind.Number)
                            litrosAhorrados += la.GetDouble();
                        else if (root.TryGetProperty("litros", out var l) && l.ValueKind == System.Text.Json.JsonValueKind.Number)
                            litrosAhorrados += l.GetDouble();
                        else if (root.TryGetProperty("ahorroLitros", out var al) && al.ValueKind == System.Text.Json.JsonValueKind.Number)
                            litrosAhorrados += al.GetDouble();
                    }
                    catch { }
                }

                string nivelActual = monedas >= 1000 ? "Héroe del Agua" :
                                     monedas >= 500 ? "Guardían del Agua" :
                                     monedas >= 200 ? "Aprendiz del Agua" :
                                     "Explorador";

                int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
                int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));

                if (agg is null)
                {
                    agg = new PerfilEstudianteAgg
                    {
                        UsuarioId = usuarioId,
                        MonedasTotal = monedas,
                        LitrosAhorradosTotal = litrosAhorrados,
                        JuegosCompletados = juegosCompletados,
                        NivelActual = nivelActual,
                        SiguienteUmbral = siguienteUmbral,
                        ProgresoMonedas = progresoMonedas,
                        UltimaActualizacion = DateTime.UtcNow
                    };
                    db.PerfilEstudianteAggs.Add(agg);
                }
                else
                {
                    agg.MonedasTotal = monedas;
                    agg.LitrosAhorradosTotal = litrosAhorrados;
                    agg.JuegosCompletados = juegosCompletados;
                    agg.NivelActual = nivelActual;
                    agg.SiguienteUmbral = siguienteUmbral;
                    agg.ProgresoMonedas = progresoMonedas;
                    agg.UltimaActualizacion = DateTime.UtcNow;
                }
                await db.SaveChangesAsync();
            }

            var insignias = await db.InsigniasUsuario
                .Where(iu => iu.UsuarioId == usuarioId && iu.Estado == "aprobada")
                .Join(db.Insignias, iu => iu.InsigniaId, i => i.Id, (iu, i) => new { i.Id, i.Nombre, i.Descripcion, i.IconoUrl, iu.OtorgadaEn })
                .OrderBy(i => i.Nombre)
                .ToListAsync();

            return Ok(new {
                usuario,
                monedas = agg!.MonedasTotal,
                nivelActual = agg.NivelActual,
                progresoMonedas = agg.ProgresoMonedas,
                siguienteUmbral = agg.SiguienteUmbral,
                juegosCompletados = agg.JuegosCompletados,
                litrosAhorrados = agg.LitrosAhorradosTotal,
                insignias
            });
        }

        [HttpPost("{usuarioId:int}/perfil/recalcular")]
        public async Task<IActionResult> Recalcular([FromServices] AquaFlowDbContext db, int usuarioId)
        {
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });

            var monedas = await db.Puntos
                .Where(p => p.UsuarioId == usuarioId)
                .Select(p => p.Valor)
                .DefaultIfEmpty(0)
                .SumAsync();

            var juegosCompletados = await db.Eventos
                .CountAsync(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada));

            var payloads = await db.Eventos
                .Where(e => e.UsuarioId == usuarioId && (e.Tipo == TipoEvento.reto_completado || e.Tipo == TipoEvento.trivia_completada))
                .Select(e => e.Payload)
                .ToListAsync();
            double litrosAhorrados = 0.0;
            foreach (var pl in payloads)
            {
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(pl ?? "{}");
                    var root = doc.RootElement;
                    if (root.TryGetProperty("litrosAhorrados", out var la) && la.ValueKind == System.Text.Json.JsonValueKind.Number)
                        litrosAhorrados += la.GetDouble();
                    else if (root.TryGetProperty("litros", out var l) && l.ValueKind == System.Text.Json.JsonValueKind.Number)
                        litrosAhorrados += l.GetDouble();
                    else if (root.TryGetProperty("ahorroLitros", out var al) && al.ValueKind == System.Text.Json.JsonValueKind.Number)
                        litrosAhorrados += al.GetDouble();
                }
                catch { }
            }

            string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
            int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
            int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));

            var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            if (agg is null)
            {
                agg = new PerfilEstudianteAgg
                {
                    UsuarioId = usuarioId,
                    MonedasTotal = monedas,
                    LitrosAhorradosTotal = litrosAhorrados,
                    JuegosCompletados = juegosCompletados,
                    NivelActual = nivelActual,
                    SiguienteUmbral = siguienteUmbral,
                    ProgresoMonedas = progresoMonedas,
                    UltimaActualizacion = DateTime.UtcNow
                };
                db.PerfilEstudianteAggs.Add(agg);
            }
            else
            {
                agg.MonedasTotal = monedas;
                agg.LitrosAhorradosTotal = litrosAhorrados;
                agg.JuegosCompletados = juegosCompletados;
                agg.NivelActual = nivelActual;
                agg.SiguienteUmbral = siguienteUmbral;
                agg.ProgresoMonedas = progresoMonedas;
                agg.UltimaActualizacion = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "Perfil recalculado" });
        }

        [HttpPost("{usuarioId:int}/juegos/resultado")]
        public async Task<IActionResult> RegistrarJuego([FromServices] AquaFlowDbContext db, int usuarioId, [FromBody] System.Text.Json.JsonElement req)
        {
            var tipoStr = req.TryGetProperty("tipo", out var tProp) ? tProp.GetString() : null;
            var litros = req.TryGetProperty("litrosAhorrados", out var lProp) && lProp.ValueKind == System.Text.Json.JsonValueKind.Number ? lProp.GetDouble() : 0.0;
            var juegoId = req.TryGetProperty("juegoId", out var jProp) ? jProp.GetString() : null;
            var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.ValueKind == System.Text.Json.JsonValueKind.Number ? aProp.GetInt32() : (int?)null;
            if (string.IsNullOrWhiteSpace(tipoStr)) return BadRequest(new { mensaje = "tipo requerido: reto|trivia" });
            if (!Enum.TryParse<TipoEvento>(tipoStr == "reto" ? "reto_completado" : "trivia_completada", ignoreCase: true, out var tipo))
                return BadRequest(new { mensaje = "tipo inválido" });
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });
            if (!string.IsNullOrWhiteSpace(juegoId))
            {
                var existe = await db.Eventos.AnyAsync(e => e.UsuarioId == usuarioId && e.Tipo == tipo && e.Payload.Contains("\"juegoId\":\"" + juegoId + "\""));
                if (existe) return Ok(new { mensaje = "Resultado ya registrado" });
            }
            var payload = System.Text.Json.JsonSerializer.Serialize(new { litrosAhorrados = litros, juegoId });
            db.Eventos.Add(new Evento { Tipo = tipo, ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId, UsuarioId = usuarioId, Payload = payload });
            await db.SaveChangesAsync();
            var recompensa = (int)Math.Floor(litros / 10.0);
            if (recompensa > 0)
            {
                db.Puntos.Add(new Puntos { ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId ?? 0, UsuarioId = usuarioId, Valor = recompensa, Motivo = "recompensa_juego", EventoOrigenId = null });
                await db.SaveChangesAsync();
            }
            var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            if (agg is null)
            {
                var monedas = recompensa;
                string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
                int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
                int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
                agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = monedas, LitrosAhorradosTotal = litros, JuegosCompletados = 1, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
                db.PerfilEstudianteAggs.Add(agg);
            }
            else
            {
                agg.LitrosAhorradosTotal += litros;
                agg.JuegosCompletados += 1;
                if (recompensa > 0)
                {
                    agg.MonedasTotal += recompensa;
                    string nivelActual = agg.MonedasTotal >= 1000 ? "Héroe del Agua" : agg.MonedasTotal >= 500 ? "Guardían del Agua" : agg.MonedasTotal >= 200 ? "Aprendiz del Agua" : "Explorador";
                    int siguienteUmbral = agg.MonedasTotal >= 1000 ? 1000 : agg.MonedasTotal >= 500 ? 1000 : agg.MonedasTotal >= 200 ? 500 : 200;
                    int progresoMonedas = Math.Min(100, (int)Math.Round((agg.MonedasTotal * 100.0) / Math.Max(1, siguienteUmbral)));
                    agg.NivelActual = nivelActual;
                    agg.SiguienteUmbral = siguienteUmbral;
                    agg.ProgresoMonedas = progresoMonedas;
                }
                agg.UltimaActualizacion = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();
            return Created($"/api/usuarios/{usuarioId}/juegos/resultado", new { mensaje = "Registro de juego creado" });
        }

        [HttpGet("{usuarioId:int}/retos/{retoId:int}/jugado")]
        public async Task<IActionResult> RetoJugado([FromServices] AquaFlowDbContext db, int usuarioId, int retoId)
        {
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });
            var jugado = await db.Eventos.AnyAsync(e => e.UsuarioId == usuarioId && e.Tipo == TipoEvento.trivia_completada && e.Payload.Contains("\"juegoId\":\"reto:" + retoId + "\""));
            return Ok(new { jugado });
        }

        [HttpPost("{usuarioId:int}/puntos")]
        public async Task<IActionResult> Puntos([FromServices] AquaFlowDbContext db, int usuarioId, [FromBody] System.Text.Json.JsonElement req)
        {
            var valor = req.TryGetProperty("valor", out var vProp) && vProp.ValueKind == System.Text.Json.JsonValueKind.Number ? vProp.GetInt32() : 0;
            var motivo = req.TryGetProperty("motivo", out var mProp) ? mProp.GetString() : string.Empty;
            var aulaId = req.TryGetProperty("aulaId", out var aProp) && aProp.ValueKind == System.Text.Json.JsonValueKind.Number ? aProp.GetInt32() : 0;
            if (valor == 0) return BadRequest(new { mensaje = "valor requerido" });
            var usuario = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == usuarioId && u.Rol == RolUsuario.estudiante);
            if (usuario is null) return NotFound(new { mensaje = "Usuario no encontrado" });
            db.Puntos.Add(new Puntos { ColegioId = usuario.ColegioId ?? 0, AulaId = aulaId, UsuarioId = usuarioId, Valor = valor, Motivo = motivo ?? string.Empty, EventoOrigenId = null });
            await db.SaveChangesAsync();
            var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            var monedas = (agg?.MonedasTotal ?? 0) + valor;
            string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
            int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
            int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
            if (agg is null)
            {
                agg = new PerfilEstudianteAgg { UsuarioId = usuarioId, MonedasTotal = monedas, LitrosAhorradosTotal = 0.0, JuegosCompletados = 0, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
                db.PerfilEstudianteAggs.Add(agg);
            }
            else
            {
                agg.MonedasTotal = monedas;
                agg.NivelActual = nivelActual;
                agg.SiguienteUmbral = siguienteUmbral;
                agg.ProgresoMonedas = progresoMonedas;
                agg.UltimaActualizacion = DateTime.UtcNow;
            }
            await db.SaveChangesAsync();
            return Created($"/api/usuarios/{usuarioId}/puntos", new { mensaje = "Puntos agregados" });
        }

        [HttpGet("/api/director/auditoria")]
        public async Task<IActionResult> AuditoriaDirector([FromServices] AquaFlowDbContext db, [FromQuery] string? tipo, [FromQuery] DateTime? desde, [FromQuery] DateTime? hasta, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
        {
            var rolClaim = User?.FindFirst("rol")?.Value;
            var userIdClaim = User?.FindFirst("userId")?.Value;
            if (string.IsNullOrWhiteSpace(rolClaim) || string.IsNullOrWhiteSpace(userIdClaim)) return Unauthorized();
            if (!string.Equals(rolClaim, "director", StringComparison.OrdinalIgnoreCase)) return Forbid();
            if (!int.TryParse(userIdClaim, out var actorId)) return Unauthorized();
            var actor = await db.Usuarios.FirstOrDefaultAsync(u => u.Id == actorId);
            if (actor is null || !actor.ColegioId.HasValue) return Forbid();

            var tiposDir = new[] {
                TipoEvento.director_crear_aula, TipoEvento.director_actualizar_aula, TipoEvento.director_eliminar_aula,
                TipoEvento.director_crear_profesor, TipoEvento.director_actualizar_profesor, TipoEvento.director_eliminar_profesor,
                TipoEvento.director_crear_espacio, TipoEvento.director_actualizar_espacio, TipoEvento.director_eliminar_espacio
            };
            var query = db.Eventos.Where(e => tiposDir.Contains(e.Tipo) && e.ColegioId == actor.ColegioId.Value && e.UsuarioId == actorId);
            if (!string.IsNullOrWhiteSpace(tipo) && Enum.TryParse<TipoEvento>(tipo, ignoreCase: true, out var te))
                query = query.Where(e => e.Tipo == te);
            if (desde.HasValue) query = query.Where(e => e.CreadoEn >= desde.Value);
            if (hasta.HasValue) query = query.Where(e => e.CreadoEn <= hasta.Value);
            var total = await query.CountAsync();
            var lista = await query.OrderByDescending(e => e.CreadoEn).Skip(offset).Take(limit).Select(e => new {
                e.Id,
                tipo = e.Tipo.ToString(),
                e.ColegioId,
                e.AulaId,
                e.UsuarioId,
                e.Payload,
                e.CreadoEn
            }).ToListAsync();
            var items = lista.Select(l => {
                int? targetId = null; string? email = null; string? etiqueta = null; string? ip = null;
                try
                {
                    using var doc = JsonDocument.Parse(l.Payload ?? "{}");
                    var root = doc.RootElement;
                    if (root.TryGetProperty("targetId", out var tProp) && tProp.ValueKind == JsonValueKind.Number) targetId = tProp.GetInt32();
                    if (root.TryGetProperty("email", out var eProp) && eProp.ValueKind == JsonValueKind.String) email = eProp.GetString();
                    if (root.TryGetProperty("etiqueta", out var etProp) && etProp.ValueKind == JsonValueKind.String) etiqueta = etProp.GetString();
                    if (root.TryGetProperty("ip", out var ipProp) && ipProp.ValueKind == JsonValueKind.String) ip = ipProp.GetString();
                }
                catch { }
                return new { id = l.Id, tipo = l.tipo, l.ColegioId, l.AulaId, targetId, email, etiqueta, ip, l.CreadoEn };
            }).ToList();
            return Ok(new { total, items });
        }
    }
}