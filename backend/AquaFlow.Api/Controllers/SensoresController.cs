using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using AquaFlow.Api.Data;
using AquaFlow.Api.Models;
using AquaFlow.Api.Services;
using System.Security.Cryptography;

namespace AquaFlow.Api.Controllers
{
    [ApiController]
    [Route("api/sensores")]
    public class SensoresController : ControllerBase
    {
        private readonly AquaFlowDbContext _db;
        private readonly IInfluxDbService _influx;
        private readonly ILogger<SensoresController> _logger;

        public SensoresController(
            AquaFlowDbContext db, 
            IInfluxDbService influx,
            ILogger<SensoresController> logger)
        {
            _db = db;
            _influx = influx;
            _logger = logger;
        }

        // ============================================
        // ENDPOINTS PARA ESP32 (Sin autenticación JWT)
        // ============================================

        /// <summary>
        /// Recibe datos del sensor de flujo desde el ESP32
        /// POST /api/sensores/flow
        /// </summary>
        [HttpPost("flow")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveFlowData([FromBody] SensorFlowDataDto data)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { error = "Datos inválidos", detalles = ModelState });
            }

            // Validar API Key del dispositivo
            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == data.SensorId && d.ApiKey == data.ApiKey);

            if (dispositivo == null)
            {
                _logger.LogWarning("Intento de envío con credenciales inválidas. SensorId: {SensorId}", data.SensorId);
                return Unauthorized(new { error = "Credenciales de dispositivo inválidas" });
            }

            if (dispositivo.Estado != "activo")
            {
                return StatusCode(403, new { error = "Dispositivo desactivado" });
            }

            try
            {
                // Preparar tags para InfluxDB
                var tags = new Dictionary<string, string>
                {
                    { "colegio_id", dispositivo.ColegioId.ToString() },
                    { "dispositivo_id", dispositivo.Id.ToString() }
                };

                if (dispositivo.EspacioId.HasValue)
                {
                    tags.Add("espacio_id", dispositivo.EspacioId.Value.ToString());
                }

                if (dispositivo.AulaId.HasValue)
                {
                    tags.Add("aula_id", dispositivo.AulaId.Value.ToString());
                }

                // Escribir en InfluxDB
                await _influx.WriteFlowDataAsync(
                    data.SensorId,
                    data.CaudalLmin,
                    data.LitrosTotales,
                    data.Frecuencia,
                    tags
                );

                // Actualizar última lectura del dispositivo
                dispositivo.UltimaLectura = DateTime.UtcNow;
                _db.Dispositivos.Update(dispositivo);
                await _db.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    timestamp = DateTime.UtcNow,
                    message = "Datos recibidos correctamente"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al procesar datos del sensor {SensorId}", data.SensorId);
                return StatusCode(500, new { error = "Error interno al procesar datos" });
            }
        }

        /// <summary>
        /// Recibe un evento de uso de agua (cuando se cierra el grifo)
        /// POST /api/sensores/evento
        /// </summary>
        [HttpPost("evento")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveEventoUso([FromBody] EventoUsoAguaDto data)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { error = "Datos inválidos", detalles = ModelState });
            }

            // Validar API Key del dispositivo
            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == data.SensorId && d.ApiKey == data.ApiKey);

            if (dispositivo == null)
            {
                _logger.LogWarning("Evento con credenciales inválidas. SensorId: {SensorId}", data.SensorId);
                return Unauthorized(new { error = "Credenciales de dispositivo inválidas" });
            }

            if (dispositivo.Estado != "activo")
            {
                return StatusCode(403, new { error = "Dispositivo desactivado" });
            }

            // Ignorar eventos con consumo insignificante
            if (data.LitrosConsumidos < 0.01)
            {
                return Ok(new { success = true, message = "Evento ignorado (consumo insignificante)" });
            }

            try
            {
                // Preparar tags para InfluxDB
                var tags = new Dictionary<string, string>
                {
                    { "colegio_id", dispositivo.ColegioId.ToString() },
                    { "dispositivo_id", dispositivo.Id.ToString() }
                };

                if (dispositivo.EspacioId.HasValue)
                {
                    tags.Add("espacio_id", dispositivo.EspacioId.Value.ToString());
                }

                if (dispositivo.AulaId.HasValue)
                {
                    tags.Add("aula_id", dispositivo.AulaId.Value.ToString());
                }

                // Escribir en InfluxDB
                await _influx.WriteEventoUsoAsync(
                    data.SensorId,
                    data.LitrosConsumidos,
                    data.DuracionSegundos,
                    data.CaudalPromedio,
                    data.CaudalMaximo,
                    tags
                );

                // Actualizar última lectura del dispositivo
                dispositivo.UltimaLectura = DateTime.UtcNow;
                _db.Dispositivos.Update(dispositivo);
                await _db.SaveChangesAsync();

                _logger.LogInformation("🚿 Evento de uso recibido - Sensor: {SensorId}, Litros: {Litros}, Duración: {Duracion}s",
                    data.SensorId, data.LitrosConsumidos, data.DuracionSegundos);

                return Ok(new { 
                    success = true, 
                    timestamp = DateTime.UtcNow,
                    message = "Evento de uso registrado",
                    litros = data.LitrosConsumidos,
                    duracion = data.DuracionSegundos
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al procesar evento de uso del sensor {SensorId}", data.SensorId);
                return StatusCode(500, new { error = "Error interno al procesar evento" });
            }
        }

        /// <summary>
        /// Obtiene resumen de consumo de un sensor
        /// GET /api/sensores/{sensorId}/resumen?timeRange=-24h
        /// </summary>
        [HttpGet("{sensorId}/resumen")]
        [Authorize]
        public async Task<IActionResult> GetResumenConsumo(string sensorId, [FromQuery] string timeRange = "-24h")
        {
            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == sensorId);

            if (dispositivo == null)
            {
                return NotFound(new { error = "Sensor no encontrado" });
            }

            var resumen = await _influx.GetResumenConsumoAsync(sensorId, timeRange);
            
            return Ok(resumen);
        }

        /// <summary>
        /// Obtiene eventos de uso de un sensor
        /// GET /api/sensores/{sensorId}/eventos?timeRange=-24h
        /// </summary>
        [HttpGet("{sensorId}/eventos")]
        [Authorize]
        public async Task<IActionResult> GetEventosUso(string sensorId, [FromQuery] string timeRange = "-24h")
        {
            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == sensorId);

            if (dispositivo == null)
            {
                return NotFound(new { error = "Sensor no encontrado" });
            }

            var eventos = await _influx.QueryEventosUsoAsync(sensorId, timeRange);
            
            return Ok(new {
                sensorId,
                timeRange,
                totalEventos = eventos.Count,
                totalLitros = eventos.Sum(e => e.LitrosConsumidos),
                eventos
            });
        }

        /// <summary>
        /// Recibe batch de datos (cuando el ESP32 pierde conexión y los envía luego)
        /// POST /api/sensores/flow/batch
        /// </summary>
        [HttpPost("flow/batch")]
        [AllowAnonymous]
        public async Task<IActionResult> ReceiveFlowBatch([FromBody] SensorFlowBatchDto data)
        {
            if (!ModelState.IsValid || data.Readings.Count == 0)
            {
                return BadRequest(new { error = "Datos inválidos" });
            }

            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == data.SensorId && d.ApiKey == data.ApiKey);

            if (dispositivo == null)
            {
                return Unauthorized(new { error = "Credenciales de dispositivo inválidas" });
            }

            var tags = new Dictionary<string, string>
            {
                { "colegio_id", dispositivo.ColegioId.ToString() },
                { "dispositivo_id", dispositivo.Id.ToString() }
            };

            if (dispositivo.EspacioId.HasValue)
                tags.Add("espacio_id", dispositivo.EspacioId.Value.ToString());

            int processed = 0;
            foreach (var reading in data.Readings.Take(100)) // Limitar a 100 por batch
            {
                try
                {
                    await _influx.WriteFlowDataAsync(
                        data.SensorId,
                        reading.CaudalLmin,
                        reading.LitrosTotales,
                        reading.Frecuencia,
                        tags
                    );
                    processed++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error en batch item para sensor {SensorId}", data.SensorId);
                }
            }

            return Ok(new { success = true, processed, total = data.Readings.Count });
        }

        /// <summary>
        /// Health check para el ESP32
        /// GET /api/sensores/ping
        /// </summary>
        [HttpGet("ping")]
        [AllowAnonymous]
        public IActionResult Ping()
        {
            return Ok(new { 
                status = "ok", 
                timestamp = DateTime.UtcNow,
                influxConnected = _influx.IsConnected
            });
        }

        // ============================================
        // ENDPOINTS PARA FRONTEND (Requieren JWT)
        // ============================================

        /// <summary>
        /// Obtiene datos históricos de un sensor
        /// GET /api/sensores/{sensorId}/data?timeRange=-1h
        /// </summary>
        [HttpGet("{sensorId}/data")]
        [Authorize]
        public async Task<IActionResult> GetSensorData(
            string sensorId, 
            [FromQuery] string timeRange = "-1h")
        {
            // Validar acceso al sensor
            var dispositivo = await _db.Dispositivos
                .FirstOrDefaultAsync(d => d.NumeroSerie == sensorId);

            if (dispositivo == null)
            {
                return NotFound(new { error = "Sensor no encontrado" });
            }

            // TODO: Validar que el usuario tiene acceso al colegio del dispositivo

            var data = await _influx.QueryFlowDataAsync(sensorId, timeRange);
            var aggregation = await _influx.GetAggregatedDataAsync(sensorId, timeRange, "5m");

            return Ok(new FlowChartDataResponse
            {
                SensorId = sensorId,
                TimeRange = timeRange,
                Data = data.Select(d => new FlowChartPoint
                {
                    Timestamp = d.Time,
                    CaudalLmin = d.CaudalLmin,
                    LitrosTotales = d.LitrosTotales
                }).ToList(),
                Summary = new FlowSummary
                {
                    TotalLitros = aggregation?.TotalLitros ?? 0,
                    PromedioLmin = aggregation?.PromedioLmin ?? 0,
                    MaximoLmin = aggregation?.MaximoLmin ?? 0,
                    MinimoLmin = aggregation?.MinimoLmin ?? 0,
                    UltimaLectura = data.LastOrDefault()?.Time
                }
            });
        }

        /// <summary>
        /// Obtiene resumen de consumo por colegio
        /// GET /api/sensores/consumo/colegio/{colegioId}
        /// </summary>
        [HttpGet("consumo/colegio/{colegioId:int}")]
        [Authorize]
        public async Task<IActionResult> GetConsumoByColegioAsync(int colegioId)
        {
            var colegio = await _db.Colegios.FindAsync(colegioId);
            if (colegio == null)
            {
                return NotFound(new { error = "Colegio no encontrado" });
            }

            var dispositivos = await _db.Dispositivos
                .Where(d => d.ColegioId == colegioId && d.Estado == "activo")
                .ToListAsync();

            var sensoresStatus = new List<SensorStatusDto>();
            double litrosHoy = 0, litrosSemana = 0, litrosMes = 0;

            foreach (var disp in dispositivos)
            {
                if (string.IsNullOrEmpty(disp.NumeroSerie)) continue;

                var litrosHoySensor = await _influx.GetTotalLitrosAsync(disp.NumeroSerie, "-24h");
                var litrosSemanaSensor = await _influx.GetTotalLitrosAsync(disp.NumeroSerie, "-7d");
                var litrosMesSensor = await _influx.GetTotalLitrosAsync(disp.NumeroSerie, "-30d");

                litrosHoy += litrosHoySensor;
                litrosSemana += litrosSemanaSensor;
                litrosMes += litrosMesSensor;

                // Obtener última lectura
                var ultimaData = await _influx.QueryFlowDataAsync(disp.NumeroSerie, "-5m");
                var ultimaLectura = ultimaData.LastOrDefault();

                // Obtener nombre del espacio
                string? nombreEspacio = null;
                if (disp.EspacioId.HasValue)
                {
                    var espacio = await _db.Espacios.FindAsync(disp.EspacioId.Value);
                    nombreEspacio = espacio?.Etiqueta;
                }

                sensoresStatus.Add(new SensorStatusDto
                {
                    SensorId = disp.NumeroSerie,
                    DispositivoId = disp.Id,
                    NombreDispositivo = disp.EtiquetaUbicacion,
                    EspacioId = disp.EspacioId,
                    NombreEspacio = nombreEspacio,
                    Online = disp.UltimaLectura.HasValue && 
                             disp.UltimaLectura.Value > DateTime.UtcNow.AddMinutes(-5),
                    UltimaLectura = disp.UltimaLectura,
                    CaudalActual = ultimaLectura?.CaudalLmin ?? 0,
                    LitrosHoy = litrosHoySensor,
                    LitrosSemana = litrosSemanaSensor,
                    LitrosMes = litrosMesSensor
                });
            }

            // Calcular consumo por espacio
            var espacios = await _db.Espacios
                .Where(e => e.ColegioId == colegioId)
                .ToListAsync();

            var consumosPorEspacio = new List<ConsumoEspacioDto>();
            foreach (var espacio in espacios)
            {
                var sensoresEspacio = sensoresStatus.Where(s => s.EspacioId == espacio.Id).ToList();
                var litrosEspacioHoy = sensoresEspacio.Sum(s => s.LitrosHoy);

                consumosPorEspacio.Add(new ConsumoEspacioDto
                {
                    EspacioId = espacio.Id,
                    NombreEspacio = espacio.Etiqueta,
                    TipoEspacio = espacio.Tipo.ToString(),
                    LitrosHoy = litrosEspacioHoy,
                    LitrosSemana = sensoresEspacio.Sum(s => s.LitrosSemana),
                    Porcentaje = litrosHoy > 0 ? (litrosEspacioHoy / litrosHoy) * 100 : 0
                });
            }

            return Ok(new ConsumoColegioDto
            {
                ColegioId = colegioId,
                NombreColegio = colegio.Nombre,
                LitrosHoy = litrosHoy,
                LitrosSemana = litrosSemana,
                LitrosMes = litrosMes,
                Sensores = sensoresStatus,
                ConsumosPorEspacio = consumosPorEspacio.OrderByDescending(c => c.LitrosHoy).ToList()
            });
        }

        /// <summary>
        /// Lista todos los sensores de un colegio
        /// GET /api/sensores/colegio/{colegioId}
        /// </summary>
        [HttpGet("colegio/{colegioId:int}")]
        [Authorize]
        public async Task<IActionResult> GetSensoresByColegioAsync(int colegioId)
        {
            var dispositivos = await _db.Dispositivos
                .Where(d => d.ColegioId == colegioId && d.Tipo == TipoDispositivo.flujo)
                .ToListAsync();

            var result = new List<object>();
            foreach (var disp in dispositivos)
            {
                string? nombreEspacio = null;
                if (disp.EspacioId.HasValue)
                {
                    var espacio = await _db.Espacios.FindAsync(disp.EspacioId.Value);
                    nombreEspacio = espacio?.Etiqueta;
                }

                result.Add(new
                {
                    id = disp.Id,
                    sensorId = disp.NumeroSerie,
                    nombre = disp.EtiquetaUbicacion,
                    espacioId = disp.EspacioId,
                    nombreEspacio,
                    estado = disp.Estado,
                    online = disp.UltimaLectura.HasValue && 
                             disp.UltimaLectura.Value > DateTime.UtcNow.AddMinutes(-5),
                    ultimaLectura = disp.UltimaLectura,
                    creadoEn = disp.CreadoEn
                });
            }

            return Ok(result);
        }

        // ============================================
        // GESTIÓN DE DISPOSITIVOS (Director/Admin)
        // ============================================

        /// <summary>
        /// Registra un nuevo dispositivo IoT y genera su API Key
        /// POST /api/sensores/dispositivos
        /// </summary>
        [HttpPost("dispositivos")]
        [Authorize(Roles = "director,admin")]
        public async Task<IActionResult> RegistrarDispositivo([FromBody] RegistrarDispositivoDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Verificar que el espacio existe
            var espacio = await _db.Espacios.FindAsync(dto.EspacioId);
            if (espacio == null)
            {
                return BadRequest(new { error = "Espacio no encontrado" });
            }

            // Verificar que el sensorId no esté en uso
            var existe = await _db.Dispositivos.AnyAsync(d => d.NumeroSerie == dto.SensorId);
            if (existe)
            {
                return Conflict(new { error = "Ya existe un dispositivo con ese SensorId" });
            }

            // Generar API Key segura
            var apiKey = GenerateApiKey();

            var dispositivo = new Dispositivo
            {
                ColegioId = espacio.ColegioId,
                EspacioId = dto.EspacioId,
                AulaId = espacio.AulaId,
                Tipo = TipoDispositivo.flujo,
                EtiquetaUbicacion = dto.Nombre,
                NumeroSerie = dto.SensorId,
                ApiKey = apiKey,
                TipoSensor = dto.TipoSensor,
                Descripcion = dto.Descripcion,
                Estado = "activo",
                CreadoEn = DateTime.UtcNow
            };

            _db.Dispositivos.Add(dispositivo);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Dispositivo registrado: {SensorId} para colegio {ColegioId}", 
                dto.SensorId, espacio.ColegioId);

            return CreatedAtAction(nameof(GetDispositivoById), new { id = dispositivo.Id }, new DispositivoRegistradoDto
            {
                Id = dispositivo.Id,
                Nombre = dispositivo.EtiquetaUbicacion,
                SensorId = dispositivo.NumeroSerie!,
                ApiKey = apiKey, // Solo se muestra una vez
                TipoSensor = dispositivo.TipoSensor ?? "YF-S201",
                EspacioId = dto.EspacioId,
                NombreEspacio = espacio.Etiqueta,
                ColegioId = espacio.ColegioId,
                Estado = dispositivo.Estado,
                FechaCreacion = dispositivo.CreadoEn
            });
        }

        /// <summary>
        /// Obtiene un dispositivo por ID
        /// GET /api/sensores/dispositivos/{id}
        /// </summary>
        [HttpGet("dispositivos/{id:int}")]
        [Authorize]
        public async Task<IActionResult> GetDispositivoById(int id)
        {
            var disp = await _db.Dispositivos.FindAsync(id);
            if (disp == null)
            {
                return NotFound();
            }

            string? nombreEspacio = null;
            if (disp.EspacioId.HasValue)
            {
                var espacio = await _db.Espacios.FindAsync(disp.EspacioId.Value);
                nombreEspacio = espacio?.Etiqueta;
            }

            return Ok(new
            {
                id = disp.Id,
                nombre = disp.EtiquetaUbicacion,
                sensorId = disp.NumeroSerie,
                tipoSensor = disp.TipoSensor,
                espacioId = disp.EspacioId,
                nombreEspacio,
                colegioId = disp.ColegioId,
                estado = disp.Estado,
                ultimaLectura = disp.UltimaLectura,
                creadoEn = disp.CreadoEn
            });
        }

        /// <summary>
        /// Regenera la API Key de un dispositivo
        /// POST /api/sensores/dispositivos/{id}/regenerar-key
        /// </summary>
        [HttpPost("dispositivos/{id:int}/regenerar-key")]
        [Authorize(Roles = "director,admin")]
        public async Task<IActionResult> RegenerarApiKey(int id)
        {
            var disp = await _db.Dispositivos.FindAsync(id);
            if (disp == null)
            {
                return NotFound();
            }

            var newApiKey = GenerateApiKey();
            disp.ApiKey = newApiKey;
            await _db.SaveChangesAsync();

            _logger.LogInformation("API Key regenerada para dispositivo {Id}", id);

            return Ok(new { 
                id = disp.Id, 
                sensorId = disp.NumeroSerie,
                apiKey = newApiKey,
                mensaje = "API Key regenerada. Actualiza la configuración del ESP32."
            });
        }

        /// <summary>
        /// Activa/Desactiva un dispositivo
        /// PATCH /api/sensores/dispositivos/{id}/estado
        /// </summary>
        [HttpPatch("dispositivos/{id:int}/estado")]
        [Authorize(Roles = "director,admin")]
        public async Task<IActionResult> CambiarEstadoDispositivo(int id, [FromBody] CambiarEstadoDto dto)
        {
            var disp = await _db.Dispositivos.FindAsync(id);
            if (disp == null)
            {
                return NotFound();
            }

            disp.Estado = dto.Estado;
            await _db.SaveChangesAsync();

            return Ok(new { id = disp.Id, estado = disp.Estado });
        }

        /// <summary>
        /// Elimina un dispositivo
        /// DELETE /api/sensores/dispositivos/{id}
        /// </summary>
        [HttpDelete("dispositivos/{id:int}")]
        [Authorize(Roles = "director,admin")]
        public async Task<IActionResult> EliminarDispositivo(int id)
        {
            var disp = await _db.Dispositivos.FindAsync(id);
            if (disp == null)
            {
                return NotFound();
            }

            _db.Dispositivos.Remove(disp);
            await _db.SaveChangesAsync();

            _logger.LogInformation("Dispositivo eliminado: {Id}", id);

            return NoContent();
        }

        // ============================================
        // Helpers
        // ============================================

        private static string GenerateApiKey()
        {
            var bytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "")
                .Replace("/", "")
                .Replace("=", "")
                .Substring(0, 40);
        }
    }

    public class CambiarEstadoDto
    {
        public string Estado { get; set; } = "activo";
    }
}

