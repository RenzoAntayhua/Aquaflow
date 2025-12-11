using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AquaFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class DispositivoIoTFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "intentos_respuestas");

            migrationBuilder.DropTable(
                name: "sesiones_preguntas");

            migrationBuilder.DropTable(
                name: "sesiones_trivia");

            migrationBuilder.AddColumn<string>(
                name: "ApiKey",
                table: "dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Descripcion",
                table: "dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoSensor",
                table: "dispositivos",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UltimaLectura",
                table: "dispositivos",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApiKey",
                table: "dispositivos");

            migrationBuilder.DropColumn(
                name: "Descripcion",
                table: "dispositivos");

            migrationBuilder.DropColumn(
                name: "TipoSensor",
                table: "dispositivos");

            migrationBuilder.DropColumn(
                name: "UltimaLectura",
                table: "dispositivos");

            migrationBuilder.CreateTable(
                name: "intentos_respuestas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Correcta = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PreguntaId = table.Column<int>(type: "integer", nullable: false),
                    Puntos = table.Column<int>(type: "integer", nullable: false),
                    Respuesta = table.Column<string>(type: "text", nullable: false),
                    SesionId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intentos_respuestas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sesiones_preguntas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Orden = table.Column<int>(type: "integer", nullable: false),
                    PreguntaId = table.Column<int>(type: "integer", nullable: false),
                    SesionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sesiones_preguntas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sesiones_trivia",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AulaId = table.Column<int>(type: "integer", nullable: false),
                    Config = table.Column<string>(type: "text", nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreadorId = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sesiones_trivia", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_sesiones_preguntas_SesionId_Orden",
                table: "sesiones_preguntas",
                columns: new[] { "SesionId", "Orden" },
                unique: true);
        }
    }
}
