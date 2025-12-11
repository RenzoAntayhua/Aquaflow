using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Services;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    public class PlantillasRetosController : ControllerBase
    {
        private readonly ICacheService _cache;

        public PlantillasRetosController(ICacheService cache)
        {
            _cache = cache;
        }

        [HttpGet]
        [Route("api/plantillas-retos")]
        [ResponseCache(Duration = 300)] // Cache HTTP de 5 minutos
        public async Task<IActionResult> List([FromServices] AquaFlowDbContext db)
        {
            var plantillas = await _cache.GetPlantillasRetosAsync(db);
            return Ok(plantillas);
        }
    }
}
