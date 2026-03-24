namespace InformationScreen.Api.Models;

public class ScreenTile
{
    public int ScreenId { get; set; }
    public Screen Screen { get; set; } = null!;

    public int TileId { get; set; }
    public Tile Tile { get; set; } = null!;

    public int? SortOrderOverride { get; set; }
}
