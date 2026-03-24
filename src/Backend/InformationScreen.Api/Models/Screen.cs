namespace InformationScreen.Api.Models;

public enum DefaultContentType
{
    None,
    Video,
    Slideshow,
    Static
}

public class Screen
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DefaultContentType DefaultContentType { get; set; } = DefaultContentType.None;
    public string? DefaultContentData { get; set; }
    public int IdleTimeoutSeconds { get; set; } = 120;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ScreenTile> ScreenTiles { get; set; } = new List<ScreenTile>();
}
