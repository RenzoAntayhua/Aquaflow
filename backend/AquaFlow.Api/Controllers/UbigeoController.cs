using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/ubigeo")]
    public class UbigeoController : ControllerBase
    {
        [HttpGet("departamentos")]
        public async Task<IActionResult> Departamentos([FromServices] AquaFlowDbContext db)
        {
            var deps = await db.Departamentos
                .OrderBy(d => d.Nombre)
                .Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo })
                .ToListAsync();
            return Ok(deps);
        }

        [HttpGet("provincias")]
        public async Task<IActionResult> Provincias([FromServices] AquaFlowDbContext db, [FromQuery] int departamentoId)
        {
            var provs = await db.Provincias
                .Where(p => p.DepartamentoId == departamentoId)
                .OrderBy(p => p.Nombre)
                .Select(p => new { id = p.Id, nombre = p.Nombre, codigo_ubigeo = p.CodigoUbigeo, departamento_id = p.DepartamentoId })
                .ToListAsync();
            return Ok(provs);
        }

        [HttpGet("distritos")]
        public async Task<IActionResult> Distritos([FromServices] AquaFlowDbContext db, [FromQuery] int provinciaId)
        {
            var dists = await db.Distritos
                .Where(d => d.ProvinciaId == provinciaId)
                .OrderBy(d => d.Nombre)
                .Select(d => new { id = d.Id, nombre = d.Nombre, codigo_ubigeo = d.CodigoUbigeo, provincia_id = d.ProvinciaId })
                .ToListAsync();
            return Ok(dists);
        }
    }
}