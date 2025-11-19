using Microsoft.AspNetCore.Mvc;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/salud")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() => Ok(new { estado = "ok", ts = DateTime.UtcNow });
    }
}