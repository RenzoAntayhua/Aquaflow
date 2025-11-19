using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/retos")]
    public class RetosController : ControllerBase
    {
        [HttpPut("{retoId:int}/estado")]
        public async Task<IActionResult> CambiarEstado([FromServices] AquaFlowDbContext db, int retoId, [FromBody] System.Text.Json.JsonElement req)
        {
            var reto = await db.RetosAula.FirstOrDefaultAsync(r => r.Id == retoId);
            if (reto is null) return NotFound();
            var estadoStr = req.TryGetProperty("estado", out var eProp) ? eProp.GetString() : null;
            if (string.IsNullOrWhiteSpace(estadoStr)) return BadRequest(new { mensaje = "Estado requerido" });
            if (!Enum.TryParse<EstadoReto>(estadoStr, ignoreCase: true, out var estado)) return BadRequest(new { mensaje = "Estado inválido" });
            var prevEstado = reto.Estado;
            reto.Estado = estado;
            await db.SaveChangesAsync();

            if (prevEstado != EstadoReto.completado && estado == EstadoReto.completado)
            {
                var plantilla = await db.PlantillasRetos.FirstOrDefaultAsync(p => p.Id == reto.PlantillaId);
                var aula = await db.Aulas.FirstOrDefaultAsync(a => a.Id == reto.AulaId);
                var estudiantes = await db.Inscripciones.Where(i => i.AulaId == reto.AulaId).Select(i => i.EstudianteId).ToListAsync();
                foreach (var uid in estudiantes)
                {
                    var puntos = plantilla?.PuntosRecompensa ?? 0;
                    if (puntos > 0)
                        db.Puntos.Add(new Puntos { ColegioId = aula?.ColegioId ?? 0, AulaId = reto.AulaId, UsuarioId = uid, Valor = puntos, Motivo = "recompensa_reto", EventoOrigenId = reto.Id });

                    if (plantilla?.InsigniaId is int insId)
                    {
                        var ins = await db.Insignias.FirstOrDefaultAsync(i => i.Id == insId);
                        if (ins is not null)
                        {
                            var estadoIns = ins.RequiereValidacion ? "pendiente" : "aprobada";
                            db.InsigniasUsuario.Add(new InsigniaUsuario { UsuarioId = uid, InsigniaId = ins.Id, OtorgadaEn = DateTime.UtcNow, Estado = estadoIns });
                        }
                    }

                    db.Eventos.Add(new Evento { Tipo = TipoEvento.reto_completado, ColegioId = aula?.ColegioId ?? 0, AulaId = reto.AulaId, UsuarioId = uid, Payload = System.Text.Json.JsonSerializer.Serialize(new { retoId = reto.Id, puntosOtorgados = puntos }) });

                    var agg = await db.PerfilEstudianteAggs.FirstOrDefaultAsync(a => a.UsuarioId == uid);
                    if (agg is null)
                    {
                        var monedas = puntos;
                        string nivelActual = monedas >= 1000 ? "Héroe del Agua" : monedas >= 500 ? "Guardían del Agua" : monedas >= 200 ? "Aprendiz del Agua" : "Explorador";
                        int siguienteUmbral = monedas >= 1000 ? 1000 : monedas >= 500 ? 1000 : monedas >= 200 ? 500 : 200;
                        int progresoMonedas = Math.Min(100, (int)Math.Round((monedas * 100.0) / Math.Max(1, siguienteUmbral)));
                        agg = new PerfilEstudianteAgg { UsuarioId = uid, MonedasTotal = monedas, LitrosAhorradosTotal = 0.0, JuegosCompletados = 1, NivelActual = nivelActual, SiguienteUmbral = siguienteUmbral, ProgresoMonedas = progresoMonedas, UltimaActualizacion = DateTime.UtcNow };
                        db.PerfilEstudianteAggs.Add(agg);
                    }
                    else
                    {
                        agg.JuegosCompletados += 1;
                        if (puntos > 0)
                        {
                            agg.MonedasTotal += puntos;
                            string nivelActual = agg.MonedasTotal >= 1000 ? "Héroe del Agua" : agg.MonedasTotal >= 500 ? "Guardían del Agua" : agg.MonedasTotal >= 200 ? "Aprendiz del Agua" : "Explorador";
                            int siguienteUmbral = agg.MonedasTotal >= 1000 ? 1000 : agg.MonedasTotal >= 500 ? 1000 : agg.MonedasTotal >= 200 ? 500 : 200;
                            int progresoMonedas = Math.Min(100, (int)Math.Round((agg.MonedasTotal * 100.0) / Math.Max(1, siguienteUmbral)));
                            agg.NivelActual = nivelActual;
                            agg.SiguienteUmbral = siguienteUmbral;
                            agg.ProgresoMonedas = progresoMonedas;
                        }
                        agg.UltimaActualizacion = DateTime.UtcNow;
                    }
                }
                await db.SaveChangesAsync();
            }

            return Ok(reto);
        }
    }
}