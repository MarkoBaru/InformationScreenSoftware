using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InformationScreen.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContentTypeAndArticleBody : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ArticleBody",
                table: "Tiles",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ContentType",
                table: "Tiles",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ArticleBody",
                table: "Tiles");

            migrationBuilder.DropColumn(
                name: "ContentType",
                table: "Tiles");
        }
    }
}
