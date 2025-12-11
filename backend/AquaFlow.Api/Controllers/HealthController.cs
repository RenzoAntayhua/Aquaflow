using Microsoft.AspNetCore.Mvc;
using AquaFlow.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/salud")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> Get([FromServices] AquaFlowDbContext db)
        {
            var dbStatus = "disconnected";
            var dbLatency = -1L;
            
            try
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                var canConnect = await db.Database.CanConnectAsync();
                sw.Stop();
                
                if (canConnect)
                {
                    dbStatus = "connected";
                    dbLatency = sw.ElapsedMilliseconds;
                }
            }
            catch
            {
                dbStatus = "error";
            }

            var status = dbStatus == "connected" ? "healthy" : "degraded";
            var statusCode = dbStatus == "connected" ? 200 : 503;

            return StatusCode(statusCode, new
            {
                status,
                timestamp = DateTime.UtcNow,
                version = "1.0.0",
                environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                services = new
                {
                    database = new
                    {
                        status = dbStatus,
                        latencyMs = dbLatency > 0 ? dbLatency : (long?)null
                    }
                }
            });
        }

        [HttpGet("ping")]
        public IActionResult Ping()
        {
            return Ok(new { pong = true, ts = DateTime.UtcNow });
        }

        [HttpGet("ready")]
        public async Task<IActionResult> Ready([FromServices] AquaFlowDbContext db)
        {
            try
            {
                // Verificar que la BD está lista
                await db.Database.CanConnectAsync();
                return Ok(new { ready = true });
            }
            catch
            {
                return StatusCode(503, new { ready = false, reason = "database_unavailable" });
            }
        }
    }
}
