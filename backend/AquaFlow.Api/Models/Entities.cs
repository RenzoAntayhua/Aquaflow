namespace AquaFlow.Api.Models
{
    public enum RolUsuario { estudiante, profesor, director, admin }
    public enum TipoEspacio { bano, lavadero, patio, otro }
    public enum TipoDispositivo { flujo, presion, humedad }
    public enum EstadoReto { activo, pausado, completado, fallido }
    public enum TipoEvento { reto_completado, insignia_otorgada, trivia_completada, umbral_superado, inscripcion_solicitada }
    public enum PeriodoConsumo { dia, semana, mes }
    public enum NivelEducativo { primaria, secundaria, primaria_secundaria }
    public enum TipoPregunta { trivia, verdadero_falso }
    public enum EstadoColegio { activo, inactivo }

    public class Colegio
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty; // mapeado a nombre_ie
        public string? Ciudad { get; set; } // mapeado a distrito
        public string? EmailContacto { get; set; } // mapeado a email_institucional
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow; // mapeado a fecha_registro

        public string? CodigoLocal { get; set; }
        public NivelEducativo Nivel { get; set; } = NivelEducativo.primaria;
        public string? Direccion { get; set; }
        public string? DireccionExacta { get; set; }
        public string? Telefono { get; set; }
        public EstadoColegio Estado { get; set; } = EstadoColegio.activo;
        public int? DistritoId { get; set; }
    }

    // Catálogos de ubicación (UBIGEO Perú)
    public class Departamento
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string CodigoUbigeo { get; set; } = string.Empty; // 2 dígitos
        public string Estado { get; set; } = "activo";
    }

    public class Provincia
    {
        public int Id { get; set; }
        public int DepartamentoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string CodigoUbigeo { get; set; } = string.Empty; // 4 dígitos
        public string Estado { get; set; } = "activo";
    }

    public class Distrito
    {
        public int Id { get; set; }
        public int ProvinciaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string CodigoUbigeo { get; set; } = string.Empty; // 6 dígitos
        public string Estado { get; set; } = "activo";
    }

    public class Usuario
    {
        public int Id { get; set; }
        public int? ColegioId { get; set; }
        public RolUsuario Rol { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Estado { get; set; } = "activo";
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class Aula
    {
        public int Id { get; set; }
        public int ColegioId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Grado { get; set; }
        public int? ProfesorId { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class Inscripcion
    {
        public int Id { get; set; }
        public int AulaId { get; set; }
        public int EstudianteId { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class Espacio
    {
        public int Id { get; set; }
        public int ColegioId { get; set; }
        public int? AulaId { get; set; }
        public TipoEspacio Tipo { get; set; }
        public string Etiqueta { get; set; } = string.Empty;
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class Dispositivo
    {
        public int Id { get; set; }
        public int ColegioId { get; set; }
        public int? EspacioId { get; set; }
        public int? AulaId { get; set; }
        public TipoDispositivo Tipo { get; set; }
        public string EtiquetaUbicacion { get; set; } = string.Empty;
        public string? NumeroSerie { get; set; }
        public string Estado { get; set; } = "activo";
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class PlantillaReto
    {
        public int Id { get; set; }
        public string Alcance { get; set; } = "aula"; // aula | colegio
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string TipoObjetivo { get; set; } = "reduccion_porcentual";
        public string ParametrosDefault { get; set; } = "{}"; // JSON
        public string ParametrosRango { get; set; } = "{}"; // JSON
        public int? InsigniaId { get; set; }
        public int PuntosRecompensa { get; set; } = 100;
        public bool Activa { get; set; } = true;
    }

    public class RetoAula
    {
        public int Id { get; set; }
        public int PlantillaId { get; set; }
        public int AulaId { get; set; }
        public int? CreadoPor { get; set; } // usuario_id
        public DateTime FechaInicio { get; set; }
        public DateTime FechaFin { get; set; }
        public string Parametros { get; set; } = "{}"; // JSON
        public EstadoReto Estado { get; set; } = EstadoReto.activo;
    }

    public class Insignia
    {
        public int Id { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public string? IconoUrl { get; set; }
        public bool RequiereValidacion { get; set; }
    }

    public class InsigniaUsuario
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public int InsigniaId { get; set; }
        public DateTime? OtorgadaEn { get; set; }
        public int? ValidadaPor { get; set; } // profesor_id
        public string Estado { get; set; } = "pendiente"; // pendiente | aprobada | rechazada
    }

    public class Puntos
    {
        public int Id { get; set; }
        public int ColegioId { get; set; }
        public int AulaId { get; set; }
        public int? UsuarioId { get; set; }
        public int Valor { get; set; }
        public string Motivo { get; set; } = string.Empty;
        public int? EventoOrigenId { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class Evento
    {
        public int Id { get; set; }
        public TipoEvento Tipo { get; set; }
        public int ColegioId { get; set; }
        public int? AulaId { get; set; }
        public int? UsuarioId { get; set; }
        public string Payload { get; set; } = "{}"; // JSON
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class ConsumoAgregado
    {
        public int Id { get; set; }
        public int ColegioId { get; set; }
        public int? AulaId { get; set; }
        public int? EspacioId { get; set; }
        public int? DispositivoId { get; set; }
        public PeriodoConsumo Periodo { get; set; }
        public DateTime InicioPeriodo { get; set; }
        public double LitrosTotal { get; set; }
        public double? LitrosPorEstudiante { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class RecuperacionToken
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiraEn { get; set; }
        public bool Usado { get; set; }
    }

    public class PerfilEstudianteAgg
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public int MonedasTotal { get; set; }
        public double LitrosAhorradosTotal { get; set; }
        public int JuegosCompletados { get; set; }
        public string NivelActual { get; set; } = "Explorador";
        public int SiguienteUmbral { get; set; } = 200;
        public int ProgresoMonedas { get; set; } = 0;
        public DateTime UltimaActualizacion { get; set; } = DateTime.UtcNow;
    }

    public class Pregunta
    {
        public int Id { get; set; }
        public string Texto { get; set; } = string.Empty;
        public TipoPregunta Tipo { get; set; }
        public string Opciones { get; set; } = "[]";
        public string RespuestaCorrecta { get; set; } = string.Empty;
        public string? Categoria { get; set; }
        public string? Dificultad { get; set; }
        public bool Activa { get; set; } = true;
        public int? CreadorId { get; set; }
        public int? ColegioId { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class BancoPreguntas
    {
        public int Id { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Alcance { get; set; } = "aula";
        public int? ColegioId { get; set; }
        public int? CreadorId { get; set; }
        public bool Activo { get; set; } = true;
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class BancoPregunta
    {
        public int Id { get; set; }
        public int BancoId { get; set; }
        public int PreguntaId { get; set; }
    }

    public class SesionTrivia
    {
        public int Id { get; set; }
        public int AulaId { get; set; }
        public int CreadorId { get; set; }
        public string Estado { get; set; } = "activa";
        public string Config { get; set; } = "{}";
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }

    public class SesionPregunta
    {
        public int Id { get; set; }
        public int SesionId { get; set; }
        public int PreguntaId { get; set; }
        public int Orden { get; set; }
    }

    public class IntentoRespuesta
    {
        public int Id { get; set; }
        public int SesionId { get; set; }
        public int UsuarioId { get; set; }
        public int PreguntaId { get; set; }
        public string Respuesta { get; set; } = string.Empty;
        public bool Correcta { get; set; }
        public int Puntos { get; set; }
        public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    }
}