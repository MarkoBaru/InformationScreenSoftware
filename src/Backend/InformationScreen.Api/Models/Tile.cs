namespace InformationScreen.Api.Models;

public enum LinkTarget
{
    Embedded,
    NewTab,
    SameWindow
}

public enum ContentType
{
    Link,
    FullscreenImage,
    Video,
    Pdf,
    Article,
    Schichtplan,
    Stream,
    Folder
}

public class Tile
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public ContentType ContentType { get; set; } = ContentType.Link;
    public string LinkUrl { get; set; } = string.Empty;
    public LinkTarget LinkTarget { get; set; } = LinkTarget.Embedded;
    public string? ArticleBody { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ActiveFrom { get; set; }
    public DateTime? ActiveTo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? ParentTileId { get; set; }
    public Tile? ParentTile { get; set; }
    public ICollection<Tile> ChildTiles { get; set; } = new List<Tile>();

    public int? CategoryId { get; set; }
    public Category? Category { get; set; }
    public ICollection<ScreenTile> ScreenTiles { get; set; } = new List<ScreenTile>();
}
