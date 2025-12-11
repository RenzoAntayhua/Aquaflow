using System.ComponentModel.DataAnnotations;

namespace AquaFlow.Api.Models
{
    // ============================================
    // DTOs para recibir datos del ESP32
    // ============================================

    /// <summary>
    /// Payload que envía el ESP32 con datos del sensor de flujo (modo streaming)
    /// </summary>
    public class SensorFlowDataDto
    {
        /// <summary>
        /// ID único del sensor/dispositivo (ej: "ESP32_CAUDAL_001")
        /// </summary>
        [Required]
        [StringLength(50)]
        public string SensorId { get; set; } = string.Empty;

        /// <summary>
        /// Caudal instantáneo en litros por minuto
        /// </summary>
        [Required]
        [Range(0, 1000)]
        public double CaudalLmin { get; set; }

        /// <summary>
        /// Litros totales acumulados desde el inicio del dispositivo
        /// </summary>
        [Required]
        [Range(0, double.MaxValue)]
        public double LitrosTotales { get; set; }

        /// <summary>
        /// Frecuencia del sensor en Hz
        /// </summary>
        [Range(0, 10000)]
        public double Frecuencia { get; set; }

        /// <summary>
        /// API Key del dispositivo para autenticación
        /// </summary>
        [Required]
        [StringLength(100)]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// ID del espacio asociado (opcional, puede venir del registro del dispositivo)
        /// </summary>
        public int? EspacioId { get; set; }
    }

    /// <summary>
    /// Payload de evento de uso de agua (cuando se cierra el grifo)
    /// Un registro = una vez que alguien usó el agua
    /// </summary>
    public class EventoUsoAguaDto
    {
        [Required]
        [StringLength(50)]
        public string SensorId { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Litros consumidos en este evento de uso
        /// </summary>
        [Required]
        [Range(0, 10000)]
        public double LitrosConsumidos { get; set; }

        /// <summary>
        /// Duración del uso en segundos
        /// </summary>
        [Required]
        [Range(0, 86400)]
        public int DuracionSegundos { get; set; }

        /// <summary>
        /// Caudal promedio durante el uso (L/min)
        /// </summary>
        [Range(0, 1000)]
        public double CaudalPromedio { get; set; }

        /// <summary>
        /// Caudal máximo registrado durante el uso (L/min)
        /// </summary>
        [Range(0, 1000)]
        public double CaudalMaximo { get; set; }

        /// <summary>
        /// Timestamp del ESP32 cuando se abrió el grifo
        /// </summary>
        public long TimestampInicio { get; set; }

        /// <summary>
        /// Timestamp del ESP32 cuando se cerró el grifo
        /// </summary>
        public long TimestampFin { get; set; }
    }

    /// <summary>
    /// Payload para enviar múltiples lecturas en batch (útil si el ESP32 pierde conexión)
    /// </summary>
    public class SensorFlowBatchDto
    {
        [Required]
        [StringLength(50)]
        public string SensorId { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string ApiKey { get; set; } = string.Empty;

        [Required]
        [MinLength(1)]
        [MaxLength(100)]
        public List<FlowReading> Readings { get; set; } = new();
    }

    public class FlowReading
    {
        /// <summary>
        /// Timestamp Unix en milisegundos
        /// </summary>
        public long Timestamp { get; set; }

        public double CaudalLmin { get; set; }
        public double LitrosTotales { get; set; }
        public double Frecuencia { get; set; }
    }

    // ============================================
    // DTOs para consultas desde el Frontend
    // ============================================

    /// <summary>
    /// Parámetros para consulta de datos históricos
    /// </summary>
    public class FlowQueryParams
    {
        /// <summary>
        /// ID del sensor
        /// </summary>
        public string? SensorId { get; set; }

        /// <summary>
        /// ID del espacio (para consultar todos los sensores de un espacio)
        /// </summary>
        public int? EspacioId { get; set; }

        /// <summary>
        /// ID del colegio (para consultar todos los sensores de un colegio)
        /// </summary>
        public int? ColegioId { get; set; }

        /// <summary>
        /// Rango de tiempo en formato Flux (ej: "-1h", "-24h", "-7d", "-30d")
        /// </summary>
        public string TimeRange { get; set; } = "-1h";

        /// <summary>
        /// Ventana de agregación (ej: "5m", "1h", "1d")
        /// </summary>
        public string AggregateWindow { get; set; } = "5m";
    }

    /// <summary>
    /// Respuesta con datos de flujo para gráficos
    /// </summary>
    public class FlowChartDataResponse
    {
        public string SensorId { get; set; } = string.Empty;
        public string TimeRange { get; set; } = string.Empty;
        public List<FlowChartPoint> Data { get; set; } = new();
        public FlowSummary Summary { get; set; } = new();
    }

    public class FlowChartPoint
    {
        public DateTime Timestamp { get; set; }
        public double CaudalLmin { get; set; }
        public double LitrosTotales { get; set; }
    }

    public class FlowSummary
    {
        public double TotalLitros { get; set; }
        public double PromedioLmin { get; set; }
        public double MaximoLmin { get; set; }
        public double MinimoLmin { get; set; }
        public DateTime? UltimaLectura { get; set; }
    }

    // ============================================
    // DTOs para Dashboard en tiempo real
    // ============================================

    /// <summary>
    /// Estado actual de un sensor
    /// </summary>
    public class SensorStatusDto
    {
        public string SensorId { get; set; } = string.Empty;
        public int? DispositivoId { get; set; }
        public string? NombreDispositivo { get; set; }
        public int? EspacioId { get; set; }
        public string? NombreEspacio { get; set; }
        public bool Online { get; set; }
        public DateTime? UltimaLectura { get; set; }
        public double CaudalActual { get; set; }
        public double LitrosHoy { get; set; }
        public double LitrosSemana { get; set; }
        public double LitrosMes { get; set; }
    }

    /// <summary>
    /// Resumen de consumo para un colegio
    /// </summary>
    public class ConsumoColegioDto
    {
        public int ColegioId { get; set; }
        public string NombreColegio { get; set; } = string.Empty;
        public double LitrosHoy { get; set; }
        public double LitrosAyer { get; set; }
        public double LitrosSemana { get; set; }
        public double LitrosMes { get; set; }
        public double PromedioMensual { get; set; }
        public double VariacionPorcentaje { get; set; }
        public List<SensorStatusDto> Sensores { get; set; } = new();
        public List<ConsumoEspacioDto> ConsumosPorEspacio { get; set; } = new();
    }

    public class ConsumoEspacioDto
    {
        public int EspacioId { get; set; }
        public string NombreEspacio { get; set; } = string.Empty;
        public string TipoEspacio { get; set; } = string.Empty;
        public double LitrosHoy { get; set; }
        public double LitrosSemana { get; set; }
        public double Porcentaje { get; set; }
    }

    // ============================================
    // DTOs para registro de dispositivos
    // ============================================

    /// <summary>
    /// Registrar un nuevo dispositivo IoT
    /// </summary>
    public class RegistrarDispositivoDto
    {
        [Required]
        [StringLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string SensorId { get; set; } = string.Empty;

        /// <summary>
        /// Tipo: "YF-S201", "YF-B1", etc.
        /// </summary>
        [StringLength(50)]
        public string TipoSensor { get; set; } = "YF-S201";

        [Required]
        public int EspacioId { get; set; }

        [StringLength(500)]
        public string? Descripcion { get; set; }
    }

    public class DispositivoRegistradoDto
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string SensorId { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
        public string TipoSensor { get; set; } = string.Empty;
        public int EspacioId { get; set; }
        public string NombreEspacio { get; set; } = string.Empty;
        public int ColegioId { get; set; }
        public string Estado { get; set; } = string.Empty;
        public DateTime FechaCreacion { get; set; }
    }
}

