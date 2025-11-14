using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AquaFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class PerfilEstudianteAggs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios");

            migrationBuilder.CreateTable(
                name: "perfil_estudiante_aggs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    MonedasTotal = table.Column<int>(type: "integer", nullable: false),
                    LitrosAhorradosTotal = table.Column<double>(type: "double precision", nullable: false),
                    JuegosCompletados = table.Column<int>(type: "integer", nullable: false),
                    NivelActual = table.Column<string>(type: "text", nullable: false),
                    SiguienteUmbral = table.Column<int>(type: "integer", nullable: false),
                    ProgresoMonedas = table.Column<int>(type: "integer", nullable: false),
                    UltimaActualizacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_perfil_estudiante_aggs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_puntos_UsuarioId_CreadoEn",
                table: "puntos",
                columns: new[] { "UsuarioId", "CreadoEn" });

            migrationBuilder.CreateIndex(
                name: "IX_eventos_UsuarioId_Tipo_CreadoEn",
                table: "eventos",
                columns: new[] { "UsuarioId", "Tipo", "CreadoEn" });

            migrationBuilder.AddCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios",
                sql: "nivel IN ('primaria','secundaria','primaria_secundaria')");

            migrationBuilder.CreateIndex(
                name: "IX_perfil_estudiante_aggs_UsuarioId",
                table: "perfil_estudiante_aggs",
                column: "UsuarioId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "perfil_estudiante_aggs");

            migrationBuilder.DropIndex(
                name: "IX_puntos_UsuarioId_CreadoEn",
                table: "puntos");

            migrationBuilder.DropIndex(
                name: "IX_eventos_UsuarioId_Tipo_CreadoEn",
                table: "eventos");

            migrationBuilder.DropCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios");

            migrationBuilder.AddCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios",
                sql: "nivel IN ('inicial','primaria','secundaria','combinado')");
        }
    }
}
