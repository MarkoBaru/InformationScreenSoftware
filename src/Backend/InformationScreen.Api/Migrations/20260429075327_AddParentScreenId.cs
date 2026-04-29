using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InformationScreen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddParentScreenId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "NewsFrom",
                table: "Tiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NewsTo",
                table: "Tiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ParentScreenId",
                table: "Screens",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SlideshowIntervalSeconds",
                table: "Screens",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "MediaAssets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tags",
                table: "MediaAssets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "MediaAssets",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Categories",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Screens_ParentScreenId",
                table: "Screens",
                column: "ParentScreenId");

            migrationBuilder.AddForeignKey(
                name: "FK_Screens_Screens_ParentScreenId",
                table: "Screens",
                column: "ParentScreenId",
                principalTable: "Screens",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Screens_Screens_ParentScreenId",
                table: "Screens");

            migrationBuilder.DropIndex(
                name: "IX_Screens_ParentScreenId",
                table: "Screens");

            migrationBuilder.DropColumn(
                name: "NewsFrom",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "NewsTo",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "ParentScreenId",
                table: "Screens");

            migrationBuilder.DropColumn(
                name: "SlideshowIntervalSeconds",
                table: "Screens");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "MediaAssets");

            migrationBuilder.DropColumn(
                name: "Tags",
                table: "MediaAssets");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "MediaAssets");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Categories");
        }
    }
}
