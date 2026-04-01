using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoTileService : ITileService
{
    private readonly MongoContext _ctx;

    public MongoTileService(MongoContext ctx)
    {
        _ctx = ctx;
    }

    private IMongoCollection<MongoTile> Tiles => _ctx.GetCollection<MongoTile>("tiles");
    private IMongoCollection<MongoCategory> Categories => _ctx.GetCollection<MongoCategory>("categories");
    private IMongoCollection<MongoScreen> Screens => _ctx.GetCollection<MongoScreen>("screens");

    public async Task<List<TileListDto>> GetAllAsync()
    {
        var tiles = await Tiles.Find(_ => true).ToListAsync();
        return await MapToListDtos(tiles);
    }

    public async Task<TileListDto?> GetByIdAsync(int id)
    {
        var tile = await Tiles.Find(t => t.Id == id).FirstOrDefaultAsync();
        if (tile == null) return null;
        var list = await MapToListDtos(new List<MongoTile> { tile });
        return list.FirstOrDefault();
    }

    public async Task<TileListDto> CreateAsync(CreateTileRequest request)
    {
        var tile = new MongoTile
        {
            Id = await _ctx.GetNextIdAsync("tiles"),
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            ContentType = request.ContentType.ToString(),
            LinkUrl = request.LinkUrl ?? string.Empty,
            LinkTarget = request.LinkTarget.ToString(),
            ArticleBody = request.ArticleBody,
            SortOrder = request.SortOrder,
            ActiveFrom = request.ActiveFrom,
            ActiveTo = request.ActiveTo,
            NewsFrom = request.NewsFrom,
            NewsTo = request.NewsTo,
            ParentTileId = request.ParentTileId,
            CategoryId = request.CategoryId
        };

        Console.WriteLine($"[MongoTileService] Inserting tile Id={tile.Id}, Title={tile.Title}");
        try
        {
            await Tiles.InsertOneAsync(tile);
            Console.WriteLine($"[MongoTileService] Insert OK for tile Id={tile.Id}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MongoTileService] Insert FAILED: {ex.GetType().Name}: {ex.Message}");
            throw;
        }

        // Assign to screens
        if (request.ScreenIds?.Count > 0)
        {
            foreach (var screenId in request.ScreenIds)
            {
                var push = Builders<MongoScreen>.Update.Push(s => s.Tiles,
                    new MongoScreenTile { TileId = tile.Id });
                await Screens.UpdateOneAsync(s => s.Id == screenId, push);
            }
        }

        return (await GetByIdAsync(tile.Id))!;
    }

    public async Task<TileListDto?> UpdateAsync(int id, UpdateTileRequest request)
    {
        var update = Builders<MongoTile>.Update
            .Set(t => t.Title, request.Title)
            .Set(t => t.Description, request.Description)
            .Set(t => t.ImageUrl, request.ImageUrl)
            .Set(t => t.ContentType, request.ContentType.ToString())
            .Set(t => t.LinkUrl, request.LinkUrl ?? string.Empty)
            .Set(t => t.LinkTarget, request.LinkTarget.ToString())
            .Set(t => t.ArticleBody, request.ArticleBody)
            .Set(t => t.SortOrder, request.SortOrder)
            .Set(t => t.IsActive, request.IsActive)
            .Set(t => t.ActiveFrom, request.ActiveFrom)
            .Set(t => t.ActiveTo, request.ActiveTo)
            .Set(t => t.NewsFrom, request.NewsFrom)
            .Set(t => t.NewsTo, request.NewsTo)
            .Set(t => t.ParentTileId, request.ParentTileId)
            .Set(t => t.CategoryId, request.CategoryId)
            .Set(t => t.UpdatedAt, DateTime.UtcNow);

        var result = await Tiles.UpdateOneAsync(t => t.Id == id, update);
        if (result.MatchedCount == 0) return null;

        // Update screen assignments if provided
        if (request.ScreenIds != null)
        {
            // Remove tile from all screens first
            var pull = Builders<MongoScreen>.Update.PullFilter(
                s => s.Tiles, st => st.TileId == id);
            await Screens.UpdateManyAsync(_ => true, pull);

            // Add to selected screens
            foreach (var screenId in request.ScreenIds)
            {
                var push = Builders<MongoScreen>.Update.Push(s => s.Tiles,
                    new MongoScreenTile { TileId = id });
                await Screens.UpdateOneAsync(s => s.Id == screenId, push);
            }
        }

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await Tiles.DeleteOneAsync(t => t.Id == id);
        if (result.DeletedCount == 0) return false;

        // Remove tile references from all screens
        var pull = Builders<MongoScreen>.Update.PullFilter(
            s => s.Tiles, st => st.TileId == id);
        await Screens.UpdateManyAsync(_ => true, pull);

        return true;
    }

    public async Task<List<TileDto>> GetNewsTilesForScreenAsync(int screenId)
    {
        var swissTz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Zurich");
        var swissNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, swissTz);

        var screen = await Screens.Find(s => s.Id == screenId).FirstOrDefaultAsync();
        if (screen == null) return new List<TileDto>();

        var tileIds = screen.Tiles.Select(t => t.TileId).ToList();
        if (tileIds.Count == 0) return new List<TileDto>();

        var tiles = await Tiles.Find(
            Builders<MongoTile>.Filter.In(t => t.Id, tileIds) &
            Builders<MongoTile>.Filter.Eq(t => t.IsActive, true)
        ).ToListAsync();

        var categoryIds = tiles.Where(t => t.CategoryId.HasValue)
            .Select(t => t.CategoryId!.Value).Distinct().ToList();
        var categories = categoryIds.Count > 0
            ? (await Categories.Find(Builders<MongoCategory>.Filter.In(c => c.Id, categoryIds)).ToListAsync())
                .ToDictionary(c => c.Id)
            : new Dictionary<int, MongoCategory>();

        var sortMap = screen.Tiles.ToDictionary(st => st.TileId, st => st.SortOrderOverride);

        return tiles
            .Where(t => t.NewsFrom.HasValue && t.NewsTo.HasValue &&
                        swissNow >= t.NewsFrom.Value && swissNow <= t.NewsTo.Value)
            .Select(t =>
            {
                var catName = t.CategoryId.HasValue && categories.TryGetValue(t.CategoryId.Value, out var cat)
                    ? cat.Name : null;
                sortMap.TryGetValue(t.Id, out var sortOverride);
                return new TileDto(
                    t.Id, t.Title, t.Description, t.ImageUrl,
                    Enum.Parse<ContentType>(t.ContentType),
                    t.LinkUrl,
                    Enum.Parse<LinkTarget>(t.LinkTarget),
                    t.ArticleBody,
                    sortOverride ?? t.SortOrder,
                    t.IsActive,
                    t.ActiveFrom, t.ActiveTo,
                    t.NewsFrom, t.NewsTo,
                    t.ParentTileId,
                    t.CategoryId, catName
                );
            })
            .OrderBy(t => t.SortOrder)
            .ToList();
    }

    private async Task<List<TileListDto>> MapToListDtos(List<MongoTile> tiles)
    {
        if (tiles.Count == 0) return new List<TileListDto>();

        // Load categories
        var categoryIds = tiles.Where(t => t.CategoryId.HasValue)
            .Select(t => t.CategoryId!.Value).Distinct().ToList();
        var categories = categoryIds.Count > 0
            ? (await Categories.Find(Builders<MongoCategory>.Filter.In(c => c.Id, categoryIds)).ToListAsync())
                .ToDictionary(c => c.Id)
            : new Dictionary<int, MongoCategory>();

        // Load screen assignments
        var tileIds = tiles.Select(t => t.Id).ToHashSet();
        var screens = await Screens.Find(s => s.Tiles.Any(st => tileIds.Contains(st.TileId))).ToListAsync();
        var tileScreenMap = new Dictionary<int, List<string>>();
        foreach (var screen in screens)
        {
            foreach (var st in screen.Tiles.Where(st => tileIds.Contains(st.TileId)))
            {
                if (!tileScreenMap.ContainsKey(st.TileId))
                    tileScreenMap[st.TileId] = new List<string>();
                tileScreenMap[st.TileId].Add(screen.Name);
            }
        }

        return tiles.Select(t =>
        {
            var catName = t.CategoryId.HasValue && categories.TryGetValue(t.CategoryId.Value, out var cat)
                ? cat.Name : null;
            tileScreenMap.TryGetValue(t.Id, out var screenNames);
            return new TileListDto(
                t.Id, t.Title, t.Description, t.ImageUrl,
                Enum.Parse<ContentType>(t.ContentType),
                t.LinkUrl,
                Enum.Parse<LinkTarget>(t.LinkTarget),
                t.ArticleBody, t.SortOrder, t.IsActive,
                t.ActiveFrom, t.ActiveTo, t.NewsFrom, t.NewsTo, t.ParentTileId,
                t.CategoryId, catName,
                screenNames ?? new List<string>()
            );
        }).ToList();
    }
}
