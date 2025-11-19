using Microsoft.AspNetCore.Mvc;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/consumo")]
    public class ConsumoController : ControllerBase
    {
        [HttpGet("agregado")]
        public IActionResult Agregado([FromQuery] int aulaId, [FromQuery] string periodo)
        {
            var ahora = DateTime.UtcNow.Date;
            var puntos = Enumerable.Range(0, 7).Select(i => new
            {
                fecha = ahora.AddDays(-i),
                litros = (double)(120 - i * 5)
            }).OrderBy(p => p.fecha);

            double total = puntos.Sum(p => p.litros);
            double lineaBase = 140.0;
            double reduccionPct = lineaBase > 0.0 ? Math.Round((1.0 - (total / (lineaBase * 7.0))) * 100.0, 2) : 0.0;

            return Ok(new
            {
                aulaId,
                periodo,
                totalLitros = total,
                lineaBase,
                reduccionPct,
                serie = puntos
            });
        }
    }
}