using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InsightForgeAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFileContentToAnalysis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FileContent",
                table: "Analyses",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FileContent",
                table: "Analyses");
        }
    }
}
