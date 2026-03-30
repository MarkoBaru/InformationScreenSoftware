using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InformationScreen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFolderAndScheduling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ActiveFrom",
                table: "Tiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ActiveTo",
                table: "Tiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ParentTileId",
                table: "Tiles",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tiles_ParentTileId",
                table: "Tiles",
                column: "ParentTileId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tiles_Tiles_ParentTileId",
                table: "Tiles",
                column: "ParentTileId",
                principalTable: "Tiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tiles_Tiles_ParentTileId",
                table: "Tiles");

            migrationBuilder.DropIndex(
                name: "IX_Tiles_ParentTileId",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "ActiveFrom",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "ActiveTo",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "ParentTileId",
                table: "Tiles");
        }
    }
}
