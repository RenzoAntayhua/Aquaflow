namespace AquaFlow.Api.Models
{
    public record AltaColegioConDirectorRequest(
        string nombre,
        int? distritoId,
        string? ciudad,
        string? emailContacto,
        string directorNombre,
        string directorEmail,
        string? codigoLocal = null,
        string? nivel = null,
        string? direccion = null,
        string? direccionExacta = null,
        string? telefono = null,
        string? estado = null
    );

    public record AltaColegioConDirectorResponse(
        int colegioId,
        string colegioNombre,
        string? colegioCiudad,
        int directorId,
        string directorNombre,
        string directorEmail,
        bool emailEnviado,
        string? passwordTemporal
    );
}