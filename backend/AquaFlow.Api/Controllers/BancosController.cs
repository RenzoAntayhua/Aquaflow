using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/bancos")]
    [Authorize]
    public class BancosController : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> Crear([FromServices] AquaFlowDbContext db, [FromBody] System.Text.Json.JsonElement req)
        {
            var nombre = req.TryGetProperty("nombre", out var nProp) ? nProp.GetString() : null;
            var alcance = req.TryGetProperty("alcance", out var aProp) ? aProp.GetString() : "aula";
            var colegioId = req.TryGetProperty("colegioId", out var coProp) && coProp.ValueKind == System.Text.Json.JsonValueKind.Number ? coProp.GetInt32() : (int?)null;
            var creadorId = req.TryGetProperty("creadorId", out var crProp) && crProp.ValueKind == System.Text.Json.JsonValueKind.Number ? crProp.GetInt32() : (int?)null;
            if (string.IsNullOrWhiteSpace(nombre)) return BadRequest(new { mensaje = "nombre requerido" });
            var b = new BancoPreguntas { Nombre = nombre!, Alcance = alcance!, ColegioId = colegioId, CreadorId = creadorId, Activo = true };
            db.BancosPreguntas.Add(b);
            await db.SaveChangesAsync();
            return Created($"/api/bancos/{b.Id}", b);
        }

        [HttpPost("{bancoId:int}/preguntas")]
        public async Task<IActionResult> AsociarPreguntas([FromServices] AquaFlowDbContext db, int bancoId, [FromBody] System.Text.Json.JsonElement req)
        {
            var banco = await db.BancosPreguntas.FirstOrDefaultAsync(b => b.Id == bancoId);
            if (banco is null) return NotFound();
            var ids = req.TryGetProperty("preguntaIds", out var listProp) && listProp.ValueKind == System.Text.Json.JsonValueKind.Array ? listProp.EnumerateArray().Where(e => e.ValueKind == System.Text.Json.JsonValueKind.Number).Select(e => e.GetInt32()).ToList() : new List<int>();
            if (ids.Count == 0) return BadRequest(new { mensaje = "preguntaIds requeridos" });
            foreach (var pid in ids)
            {
                var exists = await db.BancosPreguntasPreguntas.AnyAsync(x => x.BancoId == bancoId && x.PreguntaId == pid);
                if (!exists) db.BancosPreguntasPreguntas.Add(new BancoPregunta { BancoId = bancoId, PreguntaId = pid });
            }
            await db.SaveChangesAsync();
            return Ok(new { mensaje = "asociadas" });
        }
    }
}