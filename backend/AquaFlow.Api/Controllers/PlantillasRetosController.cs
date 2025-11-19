using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    public class PlantillasRetosController : ControllerBase
    {
        [HttpGet]
        [Route("api/plantillas-retos")]
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db)
        {
            var plantillas = await db.PlantillasRetos.Where(p => p.Activa).ToListAsync();
            return Ok(plantillas);
        }
    }
}