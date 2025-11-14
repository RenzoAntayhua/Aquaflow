using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AquaFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class ColegioSchemaUpgrade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Nombre",
                table: "colegios",
                newName: "nombre_ie");

            migrationBuilder.RenameColumn(
                name: "EmailContacto",
                table: "colegios",
                newName: "email_institucional");

            migrationBuilder.RenameColumn(
                name: "CreadoEn",
                table: "colegios",
                newName: "fecha_registro");

            migrationBuilder.RenameColumn(
                name: "Ciudad",
                table: "colegios",
                newName: "distrito");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "colegios",
                newName: "id_colegio");

            migrationBuilder.AlterColumn<string>(
                name: "nombre_ie",
                table: "colegios",
                type: "character varying(160)",
                maxLength: 160,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "email_institucional",
                table: "colegios",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "fecha_registro",
                table: "colegios",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "NOW()",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AlterColumn<string>(
                name: "distrito",
                table: "colegios",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "codigo_local",
                table: "colegios",
                type: "character varying(12)",
                maxLength: 12,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "direccion",
                table: "colegios",
                type: "character varying(180)",
                maxLength: 180,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "colegios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "activo");

            migrationBuilder.AddColumn<string>(
                name: "nivel",
                table: "colegios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "telefono",
                table: "colegios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_colegios_codigo_local",
                table: "colegios",
                column: "codigo_local",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_colegios_distrito",
                table: "colegios",
                column: "distrito");

            migrationBuilder.AddCheckConstraint(
                name: "CK_colegios_estado",
                table: "colegios",
                sql: "estado IN ('activo','inactivo')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios",
                sql: "nivel IN ('inicial','primaria','secundaria','combinado')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_colegios_codigo_local",
                table: "colegios");

            migrationBuilder.DropIndex(
                name: "IX_colegios_distrito",
                table: "colegios");

            migrationBuilder.DropCheckConstraint(
                name: "CK_colegios_estado",
                table: "colegios");

            migrationBuilder.DropCheckConstraint(
                name: "CK_colegios_nivel",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "codigo_local",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "direccion",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "nivel",
                table: "colegios");

            migrationBuilder.DropColumn(
                name: "telefono",
                table: "colegios");

            migrationBuilder.RenameColumn(
                name: "nombre_ie",
                table: "colegios",
                newName: "Nombre");

            migrationBuilder.RenameColumn(
                name: "fecha_registro",
                table: "colegios",
                newName: "CreadoEn");

            migrationBuilder.RenameColumn(
                name: "email_institucional",
                table: "colegios",
                newName: "EmailContacto");

            migrationBuilder.RenameColumn(
                name: "distrito",
                table: "colegios",
                newName: "Ciudad");

            migrationBuilder.RenameColumn(
                name: "id_colegio",
                table: "colegios",
                newName: "Id");

            migrationBuilder.AlterColumn<string>(
                name: "Nombre",
                table: "colegios",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(160)",
                oldMaxLength: 160);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreadoEn",
                table: "colegios",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "NOW()");

            migrationBuilder.AlterColumn<string>(
                name: "EmailContacto",
                table: "colegios",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(256)",
                oldMaxLength: 256,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Ciudad",
                table: "colegios",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(80)",
                oldMaxLength: 80,
                oldNullable: true);
        }
    }
}
