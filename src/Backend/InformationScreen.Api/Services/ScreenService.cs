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

    public async Task<ScreenDto?> GetBySlugAsync(string slug)
    {
        var screen = await _db.Screens
            .Include(s => s.ScreenTiles)
                .ThenInclude(st => st.Tile)
                    .ThenInclude(t => t.Category)
            .FirstOrDefaultAsync(s => s.Slug == slug && s.IsActive);

        if (screen == null) return null;

        var tiles = screen.ScreenTiles
            .Where(st => st.Tile.IsActive)
            .OrderBy(st => st.SortOrderOverride ?? st.Tile.SortOrder)
            .Select(st => new TileDto(
                st.Tile.Id,
                st.Tile.Title,
                st.Tile.Description,
                st.Tile.ImageUrl,
                st.Tile.ContentType,
                st.Tile.LinkUrl,
                st.Tile.LinkTarget,
                st.Tile.ArticleBody,
                st.SortOrderOverride ?? st.Tile.SortOrder,
                st.Tile.IsActive,
                st.Tile.ActiveFrom,
                st.Tile.ActiveTo,
                st.Tile.NewsFrom,
                st.Tile.NewsTo,
                st.Tile.ParentTileId,
                st.Tile.CategoryId,
                st.Tile.Category?.Name
            ))
            .ToList();

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            screen.DefaultContentType, screen.DefaultContentData,
            screen.IdleTimeoutSeconds, screen.SlideshowIntervalSeconds, screen.IsActive, tiles
        );
    }

    public async Task<List<ScreenListDto>> GetAllAsync()
    {
        return await _db.Screens
            .OrderBy(s => s.Name)
            .Select(s => new ScreenListDto(
                s.Id, s.Name, s.Slug,
                s.DefaultContentType, s.IdleTimeoutSeconds,
                s.IsActive, s.ScreenTiles.Count
            ))
            .ToListAsync();
    }

    public async Task<ScreenDto?> GetByIdAsync(int id)
    {
        var screen = await _db.Screens
            .Include(s => s.ScreenTiles)
                .ThenInclude(st => st.Tile)
                    .ThenInclude(t => t.Category)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (screen == null) return null;

        var tiles = screen.ScreenTiles
            .OrderBy(st => st.SortOrderOverride ?? st.Tile.SortOrder)
            .Select(st => new TileDto(
                st.Tile.Id, st.Tile.Title, st.Tile.Description,
                st.Tile.ImageUrl, st.Tile.ContentType, st.Tile.LinkUrl, st.Tile.LinkTarget,
                st.Tile.ArticleBody,
                st.SortOrderOverride ?? st.Tile.SortOrder,
                st.Tile.IsActive,
                st.Tile.ActiveFrom,
                st.Tile.ActiveTo,
                st.Tile.NewsFrom,
                st.Tile.NewsTo,
                st.Tile.ParentTileId,
                st.Tile.CategoryId, st.Tile.Category?.Name
            ))
            .ToList();

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            screen.DefaultContentType, screen.DefaultContentData,
            screen.IdleTimeoutSeconds, screen.SlideshowIntervalSeconds, screen.IsActive, tiles
        );
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
            SlideshowIntervalSeconds = request.SlideshowIntervalSeconds
        };

        _db.Screens.Add(screen);
        await _db.SaveChangesAsync();

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            screen.DefaultContentType, screen.DefaultContentData,
            screen.IdleTimeoutSeconds, screen.SlideshowIntervalSeconds, screen.IsActive, new List<TileDto>()
        );
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
