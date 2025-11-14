using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AquaFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class TriviaSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "bancos_preguntas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "text", nullable: false),
                    Alcance = table.Column<string>(type: "text", nullable: false),
                    ColegioId = table.Column<int>(type: "integer", nullable: true),
                    CreadorId = table.Column<int>(type: "integer", nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bancos_preguntas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "bancos_preguntas_items",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    BancoId = table.Column<int>(type: "integer", nullable: false),
                    PreguntaId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bancos_preguntas_items", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "intentos_respuestas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SesionId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    PreguntaId = table.Column<int>(type: "integer", nullable: false),
                    Respuesta = table.Column<string>(type: "text", nullable: false),
                    Correcta = table.Column<bool>(type: "boolean", nullable: false),
                    Puntos = table.Column<int>(type: "integer", nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_intentos_respuestas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "preguntas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Opciones = table.Column<string>(type: "text", nullable: false),
                    RespuestaCorrecta = table.Column<string>(type: "text", nullable: false),
                    Categoria = table.Column<string>(type: "text", nullable: true),
                    Dificultad = table.Column<string>(type: "text", nullable: true),
                    Activa = table.Column<bool>(type: "boolean", nullable: false),
                    CreadorId = table.Column<int>(type: "integer", nullable: true),
                    ColegioId = table.Column<int>(type: "integer", nullable: true),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_preguntas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "sesiones_preguntas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SesionId = table.Column<int>(type: "integer", nullable: false),
                    PreguntaId = table.Column<int>(type: "integer", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
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
                    CreadorId = table.Column<int>(type: "integer", nullable: false),
                    Estado = table.Column<string>(type: "text", nullable: false),
                    Config = table.Column<string>(type: "text", nullable: false),
                    CreadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sesiones_trivia", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bancos_preguntas_items_BancoId_PreguntaId",
                table: "bancos_preguntas_items",
                columns: new[] { "BancoId", "PreguntaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_preguntas_Tipo_Categoria_Dificultad_Activa",
                table: "preguntas",
                columns: new[] { "Tipo", "Categoria", "Dificultad", "Activa" });

            migrationBuilder.CreateIndex(
                name: "IX_sesiones_preguntas_SesionId_Orden",
                table: "sesiones_preguntas",
                columns: new[] { "SesionId", "Orden" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "bancos_preguntas");

            migrationBuilder.DropTable(
                name: "bancos_preguntas_items");

            migrationBuilder.DropTable(
                name: "intentos_respuestas");

            migrationBuilder.DropTable(
                name: "preguntas");

            migrationBuilder.DropTable(
                name: "sesiones_preguntas");

            migrationBuilder.DropTable(
                name: "sesiones_trivia");
        }
    }
}
