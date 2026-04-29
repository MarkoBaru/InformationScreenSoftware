using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services;

public class ScreenService : IScreenService
{
    private readonly AppDbContext _db;

    public ScreenService(AppDbContext db)
    {
        _db = db;
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private static TileDto MapTile(ScreenTile st) => new(
        st.Tile.Id, st.Tile.Title, st.Tile.Description,
        st.Tile.ImageUrl, st.Tile.ContentType, st.Tile.LinkUrl, st.Tile.LinkTarget,
        st.Tile.ArticleBody,
        st.SortOrderOverride ?? st.Tile.SortOrder,
        st.Tile.IsActive,
        st.Tile.ActiveFrom, st.Tile.ActiveTo,
        st.Tile.NewsFrom, st.Tile.NewsTo,
        st.Tile.ParentTileId,
        st.Tile.CategoryId, st.Tile.Category?.Name
    );

    private IQueryable<Screen> ScreensWithTiles() =>
        _db.Screens
            .Include(s => s.ScreenTiles)
                .ThenInclude(st => st.Tile)
                    .ThenInclude(t => t.Category);

    private static ScreenDto BuildDto(Screen screen, Screen? parent)
    {
        var ownTiles = screen.ScreenTiles
            .OrderBy(st => st.SortOrderOverride ?? st.Tile.SortOrder)
            .Select(MapTile)
            .ToList();

        var inheritedTiles = parent != null
            ? parent.ScreenTiles
                .OrderBy(st => st.SortOrderOverride ?? st.Tile.SortOrder)
                .Select(MapTile)
                .ToList()
            : new List<TileDto>();

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            screen.DefaultContentType, screen.DefaultContentData,
            screen.IdleTimeoutSeconds, screen.SlideshowIntervalSeconds, screen.IsActive,
            screen.ParentScreenId, parent?.Name,
            ownTiles, inheritedTiles
        );
    }

    // ─── public API ───────────────────────────────────────────────────────────

    public async Task<ScreenDto?> GetBySlugAsync(string slug)
    {
        var screen = await ScreensWithTiles()
            .FirstOrDefaultAsync(s => s.Slug == slug && s.IsActive);

        if (screen == null) return null;

        Screen? parent = null;
        if (screen.ParentScreenId.HasValue)
        {
            parent = await ScreensWithTiles()
                .FirstOrDefaultAsync(s => s.Id == screen.ParentScreenId.Value);
        }

        return BuildDto(screen, parent);
    }

    public async Task<List<ScreenListDto>> GetAllAsync()
    {
        var screens = await _db.Screens
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.Id, s.Name, s.Slug,
                s.DefaultContentType, s.IdleTimeoutSeconds, s.IsActive,
                TileCount = s.ScreenTiles.Count,
                s.ParentScreenId
            })
            .ToListAsync();

        var allIds = screens.Select(s => s.Id).ToHashSet();
        var parentIds = screens.Where(s => s.ParentScreenId.HasValue).Select(s => s.ParentScreenId!.Value).ToHashSet();

        var parentNames = await _db.Screens
            .Where(s => parentIds.Contains(s.Id))
            .Select(s => new { s.Id, s.Name })
            .ToDictionaryAsync(x => x.Id, x => x.Name);

        var childCounts = screens
            .Where(s => s.ParentScreenId.HasValue)
            .GroupBy(s => s.ParentScreenId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        return screens.Select(s => new ScreenListDto(
            s.Id, s.Name, s.Slug,
            s.DefaultContentType, s.IdleTimeoutSeconds, s.IsActive,
            s.TileCount,
            s.ParentScreenId,
            s.ParentScreenId.HasValue && parentNames.TryGetValue(s.ParentScreenId.Value, out var pn) ? pn : null,
            childCounts.TryGetValue(s.Id, out var cc) ? cc : 0
        )).ToList();
    }

    public async Task<ScreenDto?> GetByIdAsync(int id)
    {
        var screen = await ScreensWithTiles()
            .FirstOrDefaultAsync(s => s.Id == id);

        if (screen == null) return null;

        Screen? parent = null;
        if (screen.ParentScreenId.HasValue)
        {
            parent = await ScreensWithTiles()
                .FirstOrDefaultAsync(s => s.Id == screen.ParentScreenId.Value);
        }

        return BuildDto(screen, parent);
    }

    public async Task<ScreenDto> CreateAsync(CreateScreenRequest request)
    {
        var screen = new Screen
        {
            Name = request.Name,
            Slug = request.Slug,
            DefaultContentType = request.DefaultContentType,
            DefaultContentData = request.DefaultContentData,
            IdleTimeoutSeconds = request.IdleTimeoutSeconds,
            SlideshowIntervalSeconds = request.SlideshowIntervalSeconds,
            ParentScreenId = request.ParentScreenId
        };

        _db.Screens.Add(screen);
        await _db.SaveChangesAsync();

        return BuildDto(screen, null);
    }

    public async Task<ScreenDto?> UpdateAsync(int id, UpdateScreenRequest request)
    {
        var screen = await _db.Screens.FindAsync(id);
        if (screen == null) return null;

        screen.Name = request.Name;
        screen.Slug = request.Slug;
        screen.DefaultContentType = request.DefaultContentType;
        screen.DefaultContentData = request.DefaultContentData;
        screen.IdleTimeoutSeconds = request.IdleTimeoutSeconds;
        screen.SlideshowIntervalSeconds = request.SlideshowIntervalSeconds;
        screen.IsActive = request.IsActive;
        screen.ParentScreenId = request.ParentScreenId;
        screen.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var screen = await _db.Screens.FindAsync(id);
        if (screen == null) return false;

        _db.Screens.Remove(screen);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdateTileAssignmentsAsync(int screenId, UpdateScreenTilesRequest request)
    {
        var screen = await _db.Screens.Include(s => s.ScreenTiles).FirstOrDefaultAsync(s => s.Id == screenId);
        if (screen == null) return false;

        screen.ScreenTiles.Clear();

        foreach (var assignment in request.Tiles)
        {
            screen.ScreenTiles.Add(new ScreenTile
            {
                ScreenId = screenId,
                TileId = assignment.TileId,
                SortOrderOverride = assignment.SortOrderOverride
            });
        }

        screen.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }
}

