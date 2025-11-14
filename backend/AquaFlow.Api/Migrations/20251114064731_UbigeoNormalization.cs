using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AquaFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class UbigeoNormalization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "direccion_exacta",
                table: "colegios",
                type: "character varying(240)",
                maxLength: 240,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "distrito_id",
                table: "colegios",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "departamentos",
                columns: table => new
                {
                    id_departamento = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    codigo_ubigeo = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "activo")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_departamentos", x => x.id_departamento);
                    table.CheckConstraint("CK_departamentos_estado", "estado IN ('activo','inactivo')");
                });

            migrationBuilder.CreateTable(
                name: "provincias",
                columns: table => new
                {
                    id_provincia = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    departamento_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    codigo_ubigeo = table.Column<string>(type: "character varying(4)", maxLength: 4, nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "activo")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_provincias", x => x.id_provincia);
                    table.CheckConstraint("CK_provincias_estado", "estado IN ('activo','inactivo')");
                    table.ForeignKey(
                        name: "FK_provincias_departamentos_departamento_id",
                        column: x => x.departamento_id,
                        principalTable: "departamentos",
                        principalColumn: "id_departamento",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "distritos",
                columns: table => new
                {
                    id_distrito = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    provincia_id = table.Column<int>(type: "integer", nullable: false),
                    nombre = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    codigo_ubigeo = table.Column<string>(type: "character varying(6)", maxLength: 6, nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "activo")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_distritos", x => x.id_distrito);
                    table.CheckConstraint("CK_distritos_estado", "estado IN ('activo','inactivo')");
                    table.ForeignKey(
                        name: "FK_distritos_provincias_provincia_id",
                        column: x => x.provincia_id,
                        principalTable: "provincias",
                        principalColumn: "id_provincia",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_colegios_distrito_id",
                table: "colegios",
                column: "distrito_id");

            migrationBuilder.CreateIndex(
                name: "IX_departamentos_codigo_ubigeo",
                table: "departamentos",
                column: "codigo_ubigeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_departamentos_nombre",
                table: "departamentos",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_distritos_codigo_ubigeo",
                table: "distritos",
                column: "codigo_ubigeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_distritos_provincia_id_nombre",
                table: "distritos",
                columns: new[] { "provincia_id", "nombre" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provincias_codigo_ubigeo",
                table: "provincias",
                column: "codigo_ubigeo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_provincias_departamento_id_nombre",
                table: "provincias",
                columns: new[] { "departamento_id", "nombre" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_colegios_distritos_distrito_id",
                table: "colegios",
                column: "distrito_id",
                principalTable: "distritos",
                principalColumn: "id_distrito",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_colegios_distritos_distrito_id",
                table: "colegios");

            migrationBuilder.DropTable(
                name: "distritos");

            migrationBuilder.DropTable(
                name: "provincias");

            migrationBuilder.DropTable(
                name: "departamentos");

            migrationBuilder.DropIndex(
                name: "IX_colegios_distrito_id",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "direccion_exacta",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "distrito_id",
                table: "colegios");
        }
    }
}
