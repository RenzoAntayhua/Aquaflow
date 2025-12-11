using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Writes;

namespace AquaFlow.Api.Services
{
    public interface IInfluxDbService
    {
        Task WriteFlowDataAsync(string sensorId, double caudalLmin, double litrosTotales, double frecuencia, Dictionary<string, string>? tags = null);
        Task WriteEventoUsoAsync(string sensorId, double litrosConsumidos, int duracionSegundos, double caudalPromedio, double caudalMaximo, Dictionary<string, string>? tags = null);
        Task<List<FlowDataPoint>> QueryFlowDataAsync(string sensorId, string timeRange = "-1h");
        Task<List<EventoUso>> QueryEventosUsoAsync(string sensorId, string timeRange = "-24h");
        Task<FlowAggregation?> GetAggregatedDataAsync(string sensorId, string timeRange = "-24h", string aggregateWindow = "1h");
        Task<List<FlowDataPoint>> QueryFlowDataByEspacioAsync(int espacioId, string timeRange = "-1h");
        Task<double> GetTotalLitrosAsync(string sensorId, string timeRange = "-24h");
        Task<ResumenConsumo> GetResumenConsumoAsync(string sensorId, string timeRange = "-24h");
        bool IsConnected { get; }
    }

    public class EventoUso
    {
        public DateTime Time { get; set; }
        public string? SensorId { get; set; }
        public double LitrosConsumidos { get; set; }
        public int DuracionSegundos { get; set; }
        public double CaudalPromedio { get; set; }
        public double CaudalMaximo { get; set; }
        public int? EspacioId { get; set; }
        public int? ColegioId { get; set; }
    }

    public class ResumenConsumo
    {
        public string SensorId { get; set; } = string.Empty;
        public string TimeRange { get; set; } = string.Empty;
        public double TotalLitros { get; set; }
        public int TotalEventos { get; set; }
        public double PromedioLitrosPorEvento { get; set; }
        public double PromedioDuracionSegundos { get; set; }
        public double CaudalPromedioGeneral { get; set; }
        public List<EventoUso> UltimosEventos { get; set; } = new();
    }

    public class FlowDataPoint
    {
        public DateTime Time { get; set; }
        public double CaudalLmin { get; set; }
        public double LitrosTotales { get; set; }
        public double Frecuencia { get; set; }
        public string? SensorId { get; set; }
        public int? EspacioId { get; set; }
        public int? ColegioId { get; set; }
    }

    public class FlowAggregation
    {
        public string SensorId { get; set; } = string.Empty;
        public string TimeRange { get; set; } = string.Empty;
        public double TotalLitros { get; set; }
        public double PromedioLmin { get; set; }
        public double MaximoLmin { get; set; }
        public double MinimoLmin { get; set; }
        public List<FlowBucket> Buckets { get; set; } = new();
    }

    public class FlowBucket
    {
        public DateTime Time { get; set; }
        public double SumaLitros { get; set; }
        public double PromedioCaudalLmin { get; set; }
    }

    public class InfluxDbService : IInfluxDbService, IDisposable
    {
        private readonly InfluxDBClient? _client;
        private readonly string _bucket;
        private readonly string _org;
        private readonly ILogger<InfluxDbService> _logger;
        private readonly bool _isConfigured;

        public bool IsConnected => _isConfigured && _client != null;

        public InfluxDbService(ILogger<InfluxDbService> logger)
        {
            _logger = logger;

            var url = Environment.GetEnvironmentVariable("INFLUXDB_URL");
            var token = Environment.GetEnvironmentVariable("INFLUXDB_TOKEN");
            _bucket = Environment.GetEnvironmentVariable("INFLUXDB_BUCKET") ?? "aquaflow_sensors";
            _org = Environment.GetEnvironmentVariable("INFLUXDB_ORG") ?? "";

            if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(_org))
            {
                _logger.LogWarning("InfluxDB no está configurado. Variables requeridas: INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG");
                _isConfigured = false;
                return;
            }

            try
            {
                _client = new InfluxDBClient(url, token);
                _isConfigured = true;
                _logger.LogInformation("InfluxDB conectado: {Url}, Bucket: {Bucket}, Org: {Org}", url, _bucket, _org);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al conectar con InfluxDB");
                _isConfigured = false;
            }
        }

        /// <summary>
        /// Escribe datos del sensor de flujo en InfluxDB
        /// </summary>
        public async Task WriteFlowDataAsync(string sensorId, double caudalLmin, double litrosTotales, double frecuencia, Dictionary<string, string>? tags = null)
        {
            if (!_isConfigured || _client == null)
            {
                _logger.LogWarning("InfluxDB no configurado. Datos no escritos para sensor {SensorId}", sensorId);
                return;
            }

            try
            {
                var writeApi = _client.GetWriteApi();

                var point = PointData
                    .Measurement("flujo_agua")
                    .Tag("sensor_id", sensorId);

                // Agregar tags adicionales si existen
                if (tags != null)
                {
                    foreach (var tag in tags)
                    {
                        point = point.Tag(tag.Key, tag.Value);
                    }
                }

                point = point
                    .Field("caudal_lmin", caudalLmin)
                    .Field("litros_totales", litrosTotales)
                    .Field("frecuencia_hz", frecuencia)
                    .Timestamp(DateTime.UtcNow, WritePrecision.Ms);

                await _client.GetWriteApiAsync().WritePointAsync(point, _bucket, _org);

                _logger.LogDebug("Datos escritos para sensor {SensorId}: {Caudal} L/min, {Litros} L total", 
                    sensorId, caudalLmin, litrosTotales);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al escribir datos en InfluxDB para sensor {SensorId}", sensorId);
                throw;
            }
        }

        /// <summary>
        /// Escribe un evento de uso de agua (cuando se cierra el grifo)
        /// </summary>
        public async Task WriteEventoUsoAsync(string sensorId, double litrosConsumidos, int duracionSegundos, double caudalPromedio, double caudalMaximo, Dictionary<string, string>? tags = null)
        {
            if (!_isConfigured || _client == null)
            {
                _logger.LogWarning("InfluxDB no configurado. Evento no escrito para sensor {SensorId}", sensorId);
                return;
            }

            try
            {
                var point = PointData
                    .Measurement("evento_uso")
                    .Tag("sensor_id", sensorId);

                // Agregar tags adicionales si existen
                if (tags != null)
                {
                    foreach (var tag in tags)
                    {
                        point = point.Tag(tag.Key, tag.Value);
                    }
                }

                point = point
                    .Field("litros_consumidos", litrosConsumidos)
                    .Field("duracion_segundos", duracionSegundos)
                    .Field("caudal_promedio", caudalPromedio)
                    .Field("caudal_maximo", caudalMaximo)
                    .Timestamp(DateTime.UtcNow, WritePrecision.Ms);

                await _client.GetWriteApiAsync().WritePointAsync(point, _bucket, _org);

                _logger.LogInformation("📊 Evento de uso registrado - Sensor: {SensorId}, Litros: {Litros}, Duración: {Duracion}s", 
                    sensorId, litrosConsumidos, duracionSegundos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al escribir evento de uso para sensor {SensorId}", sensorId);
                throw;
            }
        }

        /// <summary>
        /// Consulta eventos de uso para un sensor específico
        /// </summary>
        public async Task<List<EventoUso>> QueryEventosUsoAsync(string sensorId, string timeRange = "-24h")
        {
            if (!_isConfigured || _client == null)
            {
                return new List<EventoUso>();
            }

            try
            {
                var queryApi = _client.GetQueryApi();
                var flux = $@"
                    from(bucket: ""{_bucket}"")
                    |> range(start: {timeRange})
                    |> filter(fn: (r) => r._measurement == ""evento_uso"")
                    |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                    |> pivot(rowKey: [""_time""], columnKey: [""_field""], valueColumn: ""_value"")
                    |> sort(columns: [""_time""], desc: true)
                ";

                var tables = await queryApi.QueryAsync(flux, _org);
                var eventos = new List<EventoUso>();

                foreach (var table in tables)
                {
                    foreach (var record in table.Records)
                    {
                        var evento = new EventoUso
                        {
                            Time = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow,
                            SensorId = record.GetValueByKey("sensor_id")?.ToString()
                        };

                        var litrosVal = record.GetValueByKey("litros_consumidos");
                        var duracionVal = record.GetValueByKey("duracion_segundos");
                        var promedioVal = record.GetValueByKey("caudal_promedio");
                        var maxVal = record.GetValueByKey("caudal_maximo");
                        var espacioVal = record.GetValueByKey("espacio_id");
                        var colegioVal = record.GetValueByKey("colegio_id");

                        if (litrosVal != null) evento.LitrosConsumidos = Convert.ToDouble(litrosVal);
                        if (duracionVal != null) evento.DuracionSegundos = Convert.ToInt32(duracionVal);
                        if (promedioVal != null) evento.CaudalPromedio = Convert.ToDouble(promedioVal);
                        if (maxVal != null) evento.CaudalMaximo = Convert.ToDouble(maxVal);
                        if (espacioVal != null && int.TryParse(espacioVal.ToString(), out var espId)) evento.EspacioId = espId;
                        if (colegioVal != null && int.TryParse(colegioVal.ToString(), out var colId)) evento.ColegioId = colId;

                        eventos.Add(evento);
                    }
                }

                return eventos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al consultar eventos de uso para sensor {SensorId}", sensorId);
                return new List<EventoUso>();
            }
        }

        /// <summary>
        /// Obtiene un resumen del consumo de agua
        /// </summary>
        public async Task<ResumenConsumo> GetResumenConsumoAsync(string sensorId, string timeRange = "-24h")
        {
            var resumen = new ResumenConsumo
            {
                SensorId = sensorId,
                TimeRange = timeRange
            };

            if (!_isConfigured || _client == null)
            {
                return resumen;
            }

            try
            {
                var eventos = await QueryEventosUsoAsync(sensorId, timeRange);
                
                resumen.TotalEventos = eventos.Count;
                resumen.TotalLitros = eventos.Sum(e => e.LitrosConsumidos);
                resumen.PromedioLitrosPorEvento = eventos.Count > 0 ? eventos.Average(e => e.LitrosConsumidos) : 0;
                resumen.PromedioDuracionSegundos = eventos.Count > 0 ? eventos.Average(e => e.DuracionSegundos) : 0;
                resumen.CaudalPromedioGeneral = eventos.Count > 0 ? eventos.Average(e => e.CaudalPromedio) : 0;
                resumen.UltimosEventos = eventos.Take(10).ToList();

                return resumen;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener resumen de consumo para sensor {SensorId}", sensorId);
                return resumen;
            }
        }

        /// <summary>
        /// Consulta datos de flujo para un sensor específico
        /// </summary>
        public async Task<List<FlowDataPoint>> QueryFlowDataAsync(string sensorId, string timeRange = "-1h")
        {
            if (!_isConfigured || _client == null)
            {
                return new List<FlowDataPoint>();
            }

            var flux = $@"
                from(bucket: ""{_bucket}"")
                |> range(start: {timeRange})
                |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                |> pivot(rowKey: [""_time""], columnKey: [""_field""], valueColumn: ""_value"")
                |> sort(columns: [""_time""], desc: false)
            ";

            return await ExecuteFlowQuery(flux);
        }

        /// <summary>
        /// Consulta datos de flujo por espacio (múltiples sensores)
        /// </summary>
        public async Task<List<FlowDataPoint>> QueryFlowDataByEspacioAsync(int espacioId, string timeRange = "-1h")
        {
            if (!_isConfigured || _client == null)
            {
                return new List<FlowDataPoint>();
            }

            var flux = $@"
                from(bucket: ""{_bucket}"")
                |> range(start: {timeRange})
                |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                |> filter(fn: (r) => r.espacio_id == ""{espacioId}"")
                |> pivot(rowKey: [""_time""], columnKey: [""_field""], valueColumn: ""_value"")
                |> sort(columns: [""_time""], desc: false)
            ";

            return await ExecuteFlowQuery(flux);
        }

        /// <summary>
        /// Obtiene datos agregados por ventana de tiempo
        /// </summary>
        public async Task<FlowAggregation?> GetAggregatedDataAsync(string sensorId, string timeRange = "-24h", string aggregateWindow = "1h")
        {
            if (!_isConfigured || _client == null)
            {
                return null;
            }

            try
            {
                var queryApi = _client.GetQueryApi();

                // Consulta para totales y promedios
                var statsFlux = $@"
                    from(bucket: ""{_bucket}"")
                    |> range(start: {timeRange})
                    |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                    |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                    |> filter(fn: (r) => r._field == ""caudal_lmin"")
                ";

                var sumFlux = statsFlux + @"
                    |> sum()
                ";

                var meanFlux = statsFlux + @"
                    |> mean()
                ";

                var maxFlux = statsFlux + @"
                    |> max()
                ";

                var minFlux = statsFlux + @"
                    |> min()
                ";

                // Consulta para buckets (agrupación por tiempo)
                var bucketsFlux = $@"
                    from(bucket: ""{_bucket}"")
                    |> range(start: {timeRange})
                    |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                    |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                    |> filter(fn: (r) => r._field == ""caudal_lmin"")
                    |> aggregateWindow(every: {aggregateWindow}, fn: mean, createEmpty: false)
                    |> yield(name: ""mean"")
                ";

                var result = new FlowAggregation
                {
                    SensorId = sensorId,
                    TimeRange = timeRange
                };

                // Ejecutar consultas en paralelo
                var sumTask = queryApi.QueryAsync(sumFlux, _org);
                var meanTask = queryApi.QueryAsync(meanFlux, _org);
                var maxTask = queryApi.QueryAsync(maxFlux, _org);
                var minTask = queryApi.QueryAsync(minFlux, _org);
                var bucketsTask = queryApi.QueryAsync(bucketsFlux, _org);

                await Task.WhenAll(sumTask, meanTask, maxTask, minTask, bucketsTask);

                // Procesar resultados
                var sumTables = await sumTask;
                var meanTables = await meanTask;
                var maxTables = await maxTask;
                var minTables = await minTask;
                var bucketsTables = await bucketsTask;

                if (sumTables.Any() && sumTables[0].Records.Any())
                {
                    var val = sumTables[0].Records[0].GetValue();
                    result.TotalLitros = val != null ? Convert.ToDouble(val) / 60.0 : 0; // Convertir L/min acumulado a litros aproximados
                }

                if (meanTables.Any() && meanTables[0].Records.Any())
                {
                    var val = meanTables[0].Records[0].GetValue();
                    result.PromedioLmin = val != null ? Convert.ToDouble(val) : 0;
                }

                if (maxTables.Any() && maxTables[0].Records.Any())
                {
                    var val = maxTables[0].Records[0].GetValue();
                    result.MaximoLmin = val != null ? Convert.ToDouble(val) : 0;
                }

                if (minTables.Any() && minTables[0].Records.Any())
                {
                    var val = minTables[0].Records[0].GetValue();
                    result.MinimoLmin = val != null ? Convert.ToDouble(val) : 0;
                }

                // Procesar buckets
                foreach (var table in bucketsTables)
                {
                    foreach (var record in table.Records)
                    {
                        var time = record.GetTime();
                        var value = record.GetValue();

                        if (time.HasValue && value != null)
                        {
                            result.Buckets.Add(new FlowBucket
                            {
                                Time = time.Value.ToDateTimeUtc(),
                                PromedioCaudalLmin = Convert.ToDouble(value)
                            });
                        }
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener datos agregados para sensor {SensorId}", sensorId);
                return null;
            }
        }

        /// <summary>
        /// Obtiene el total de litros consumidos en un período
        /// </summary>
        public async Task<double> GetTotalLitrosAsync(string sensorId, string timeRange = "-24h")
        {
            if (!_isConfigured || _client == null)
            {
                return 0;
            }

            try
            {
                var queryApi = _client.GetQueryApi();

                // Obtener el último valor de litros_totales menos el primero del período
                var flux = $@"
                    first_val = from(bucket: ""{_bucket}"")
                        |> range(start: {timeRange})
                        |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                        |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                        |> filter(fn: (r) => r._field == ""litros_totales"")
                        |> first()
                        |> yield(name: ""first"")

                    last_val = from(bucket: ""{_bucket}"")
                        |> range(start: {timeRange})
                        |> filter(fn: (r) => r._measurement == ""flujo_agua"")
                        |> filter(fn: (r) => r.sensor_id == ""{sensorId}"")
                        |> filter(fn: (r) => r._field == ""litros_totales"")
                        |> last()
                        |> yield(name: ""last"")
                ";

                var tables = await queryApi.QueryAsync(flux, _org);

                double firstVal = 0, lastVal = 0;

                foreach (var table in tables)
                {
                    foreach (var record in table.Records)
                    {
                        var name = record.GetValueByKey("result")?.ToString();
                        var value = record.GetValue();

                        if (value != null)
                        {
                            if (name == "first")
                                firstVal = Convert.ToDouble(value);
                            else if (name == "last")
                                lastVal = Convert.ToDouble(value);
                        }
                    }
                }

                return Math.Max(0, lastVal - firstVal);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener total de litros para sensor {SensorId}", sensorId);
                return 0;
            }
        }

        private async Task<List<FlowDataPoint>> ExecuteFlowQuery(string flux)
        {
            var results = new List<FlowDataPoint>();

            try
            {
                var queryApi = _client!.GetQueryApi();
                var tables = await queryApi.QueryAsync(flux, _org);

                foreach (var table in tables)
                {
                    foreach (var record in table.Records)
                    {
                        var point = new FlowDataPoint
                        {
                            Time = record.GetTime()?.ToDateTimeUtc() ?? DateTime.UtcNow,
                            SensorId = record.GetValueByKey("sensor_id")?.ToString()
                        };

                        // Extraer campos
                        var caudalVal = record.GetValueByKey("caudal_lmin");
                        var litrosVal = record.GetValueByKey("litros_totales");
                        var freqVal = record.GetValueByKey("frecuencia_hz");
                        var espacioVal = record.GetValueByKey("espacio_id");
                        var colegioVal = record.GetValueByKey("colegio_id");

                        if (caudalVal != null) point.CaudalLmin = Convert.ToDouble(caudalVal);
                        if (litrosVal != null) point.LitrosTotales = Convert.ToDouble(litrosVal);
                        if (freqVal != null) point.Frecuencia = Convert.ToDouble(freqVal);
                        if (espacioVal != null && int.TryParse(espacioVal.ToString(), out var espId)) point.EspacioId = espId;
                        if (colegioVal != null && int.TryParse(colegioVal.ToString(), out var colId)) point.ColegioId = colId;

                        results.Add(point);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al ejecutar consulta Flux");
            }

            return results;
        }

        public void Dispose()
        {
            _client?.Dispose();
        }
    }
}

