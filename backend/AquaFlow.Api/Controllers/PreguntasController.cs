using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/preguntas")]
    [Authorize]
    public class PreguntasController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var texto = req.TryGetProperty("texto", out var tProp) ? tProp.GetString() : null;
            var tipoStr = req.TryGetProperty("tipo", out var tpProp) ? tpProp.GetString() : null;
            var opciones = req.TryGetProperty("opciones", out var oProp) ? oProp.GetRawText() : "[]";
            var correcta = req.TryGetProperty("respuestaCorrecta", out var rProp) ? rProp.GetString() : null;
            var categoria = req.TryGetProperty("categoria", out var cProp) ? cProp.GetString() : null;
            var dificultad = req.TryGetProperty("dificultad", out var dProp) ? dProp.GetString() : null;
            var creadorId = req.TryGetProperty("creadorId", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Number ? crProp.GetInt32() : (int?)null;
            var colegioId = req.TryGetProperty("colegioId", out var coProp) && coProp.ValueKind == System.Text.Json.JsonValueKind.Number ? coProp.GetInt32() : (int?)null;
            if (string.IsNullOrWhiteSpace(texto) || string.IsNullOrWhiteSpace(tipoStr) || string.IsNullOrWhiteSpace(correcta))
                return BadRequest(new { mensaje = "texto, tipo y respuestaCorrecta requeridos" });
            if (!Enum.TryParse<TipoPregunta>(tipoStr, ignoreCase: true, out var tipo))
                return BadRequest(new { mensaje = "tipo inválido" });
            var p = new Pregunta { Texto = texto!, Tipo = tipo, Opciones = opciones, RespuestaCorrecta = correcta!, Categoria = categoria, Dificultad = dificultad, CreadorId = creadorId, ColegioId = colegioId };
            db.Preguntas.Add(p);
            await db.SaveChangesAsync();
            return Created($"/api/preguntas/{p.Id}", p);
        }

        [HttpGet]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db, [FromQuery] string? tipo, [FromQuery] string? categoria, [FromQuery] string? dificultad, [FromQuery] bool? activa)
        {
            var q = db.Preguntas.AsQueryable();
            if (!string.IsNullOrWhiteSpace(tipo) && Enum.TryParse<TipoPregunta>(tipo, ignoreCase: true, out var tp)) q = q.Where(p => p.Tipo == tp);
            if (!string.IsNullOrWhiteSpace(categoria)) q = q.Where(p => p.Categoria == categoria);
            if (!string.IsNullOrWhiteSpace(dificultad)) q = q.Where(p => p.Dificultad == dificultad);
            if (activa.HasValue) q = q.Where(p => p.Activa == activa.Value);
            var lista = await q.OrderByDescending(p => p.CreadoEn).Take(200).ToListAsync();
            return Ok(lista);
        }
    }
}