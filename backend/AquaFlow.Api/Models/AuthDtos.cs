namespace AquaFlow.Api.Models
{
    // DTOs simples para autenticación
    public record RegistroRequest(string nombre, string email, string password, string rol = "estudiante", int? colegioId = null);
    public record LoginRequest(string email, string password);
    public record ResetRequest(string email);
    public record ResetConfirmRequest(string token, string newPassword);
    public record ChangePasswordRequest(string actual, string nueva);
}