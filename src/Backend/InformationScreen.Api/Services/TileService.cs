using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services;

public class TileService : ITileService
{
    private readonly AppDbContext _db;

    public TileService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TileListDto>> GetAllAsync()
    {
        var tiles = await _db.Tiles
            .Include(t => t.Category)
            .Include(t => t.ScreenTiles)
                .ThenInclude(st => st.Screen)
            .OrderBy(t => t.SortOrder)
            .ToListAsync();

        return tiles.Select(t => new TileListDto(
            t.Id, t.Title, t.Description,
            t.ImageUrl, t.ContentType, t.LinkUrl, t.LinkTarget, t.ArticleBody,
            t.SortOrder, t.IsActive,
            t.ActiveFrom, t.ActiveTo, t.ParentTileId,
            t.CategoryId, t.Category?.Name,
            t.ScreenTiles.Select(st => st.Screen.Name).ToList()
        )).ToList();
    }

    public async Task<TileListDto?> GetByIdAsync(int id)
    {
        var tile = await _db.Tiles
            .Include(t => t.Category)
            .Include(t => t.ScreenTiles)
                .ThenInclude(st => st.Screen)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (tile == null) return null;

        return new TileListDto(
            tile.Id, tile.Title, tile.Description,
            tile.ImageUrl, tile.ContentType, tile.LinkUrl, tile.LinkTarget, tile.ArticleBody,
            tile.SortOrder, tile.IsActive,
            tile.ActiveFrom, tile.ActiveTo, tile.ParentTileId,
            tile.CategoryId, tile.Category?.Name,
            tile.ScreenTiles.Select(st => st.Screen.Name).ToList()
        );
    }

    public async Task<TileListDto> CreateAsync(CreateTileRequest request)
    {
        var tile = new Tile
        {
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            ContentType = request.ContentType,
            LinkUrl = request.LinkUrl ?? string.Empty,
            LinkTarget = request.LinkTarget,
            ArticleBody = request.ArticleBody,
            SortOrder = request.SortOrder,
            ActiveFrom = request.ActiveFrom,
            ActiveTo = request.ActiveTo,
            ParentTileId = request.ParentTileId,
            CategoryId = request.CategoryId
        };

        _db.Tiles.Add(tile);
        await _db.SaveChangesAsync();

        if (request.ScreenIds?.Count > 0)
        {
            foreach (var screenId in request.ScreenIds)
            {
                _db.ScreenTiles.Add(new ScreenTile
                {
                    ScreenId = screenId,
                    TileId = tile.Id
                });
            }
            await _db.SaveChangesAsync();
        }

        return (await GetByIdAsync(tile.Id))!;
    }

    public async Task<TileListDto?> UpdateAsync(int id, UpdateTileRequest request)
    {
        var tile = await _db.Tiles.Include(t => t.ScreenTiles).FirstOrDefaultAsync(t => t.Id == id);
        if (tile == null) return null;

        tile.Title = request.Title;
        tile.Description = request.Description;
        tile.ImageUrl = request.ImageUrl;
        tile.ContentType = request.ContentType;
        tile.LinkUrl = request.LinkUrl ?? string.Empty;
        tile.LinkTarget = request.LinkTarget;
        tile.ArticleBody = request.ArticleBody;
        tile.SortOrder = request.SortOrder;
        tile.IsActive = request.IsActive;
        tile.ActiveFrom = request.ActiveFrom;
        tile.ActiveTo = request.ActiveTo;
        tile.ParentTileId = request.ParentTileId;
        tile.CategoryId = request.CategoryId;
        tile.UpdatedAt = DateTime.UtcNow;

        if (request.ScreenIds != null)
        {
            tile.ScreenTiles.Clear();
            foreach (var screenId in request.ScreenIds)
            {
                tile.ScreenTiles.Add(new ScreenTile
                {
                    ScreenId = screenId,
                    TileId = id
                });
            }
        }

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var tile = await _db.Tiles.FindAsync(id);
        if (tile == null) return false;

        _db.Tiles.Remove(tile);
        await _db.SaveChangesAsync();
        return true;
    }
}
