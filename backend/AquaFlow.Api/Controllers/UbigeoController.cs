using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using AquaFlow.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/ubigeo")]
    public class UbigeoController : ControllerBase
    {
        private readonly ICacheService _cache;

        public UbigeoController(ICacheService cache)
        {
            _cache = cache;
        }

        [HttpGet("departamentos")]
        [ResponseCache(Duration = 3600)] // Cache HTTP de 1 hora
        public async Task<IActionResult> Departamentos([FromServices] AquaFlowDbContext db)
        {
            var deps = await _cache.GetDepartamentosAsync(db);
            var result = deps.Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo });
            return Ok(result);
        }

        [HttpGet("provincias")]
        [ResponseCache(Duration = 3600, VaryByQueryKeys = new[] { "departamentoId" })]
        public async Task<IActionResult> Provincias([FromServices] AquaFlowDbContext db, [FromQuery] int departamentoId)
        {
            if (departamentoId <= 0)
                return BadRequest(new { mensaje = "departamentoId requerido" });
                
            var provs = await _cache.GetProvinciasAsync(db, departamentoId);
            var result = provs.Select(p => new { id = p.Id, nombre = p.Nombre, codigo_ubigeo = p.CodigoUbigeo, departamento_id = p.DepartamentoId });
            return Ok(result);
        }

        [HttpGet("distritos")]
        [ResponseCache(Duration = 3600, VaryByQueryKeys = new[] { "provinciaId" })]
        public async Task<IActionResult> Distritos([FromServices] AquaFlowDbContext db, [FromQuery] int provinciaId)
        {
            if (provinciaId <= 0)
                return BadRequest(new { mensaje = "provinciaId requerido" });
                
            var dists = await _cache.GetDistritosAsync(db, provinciaId);
            var result = dists.Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo, provincia_id = d.ProvinciaId });
            return Ok(result);
        }
    }
}
