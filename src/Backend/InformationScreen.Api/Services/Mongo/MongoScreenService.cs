using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoScreenService : IScreenService
{
    private readonly MongoContext _ctx;

    public MongoScreenService(MongoContext ctx)
    {
        _ctx = ctx;
    }

    private IMongoCollection<MongoScreen> Screens => _ctx.GetCollection<MongoScreen>("screens");
    private IMongoCollection<MongoTile> Tiles => _ctx.GetCollection<MongoTile>("tiles");
    private IMongoCollection<MongoCategory> Categories => _ctx.GetCollection<MongoCategory>("categories");

    public async Task<ScreenDto?> GetBySlugAsync(string slug)
    {
        var screen = await Screens.Find(s => s.Slug == slug && s.IsActive).FirstOrDefaultAsync();
        if (screen == null) return null;
        return await MapToDto(screen, activeOnly: true);
    }

    public async Task<List<ScreenListDto>> GetAllAsync()
    {
        var screens = await Screens.Find(_ => true).SortBy(s => s.Name).ToListAsync();
        return screens.Select(s => new ScreenListDto(
            s.Id, s.Name, s.Slug,
            Enum.Parse<DefaultContentType>(s.DefaultContentType),
            s.IdleTimeoutSeconds, s.IsActive, s.Tiles.Count
        )).ToList();
    }

    public async Task<ScreenDto?> GetByIdAsync(int id)
    {
        var screen = await Screens.Find(s => s.Id == id).FirstOrDefaultAsync();
        if (screen == null) return null;
        return await MapToDto(screen, activeOnly: false);
    }

    public async Task<ScreenDto> CreateAsync(CreateScreenRequest request)
    {
        var screen = new MongoScreen
        {
            Id = await _ctx.GetNextIdAsync("screens"),
            Name = request.Name,
            Slug = request.Slug,
            DefaultContentType = request.DefaultContentType.ToString(),
            DefaultContentData = request.DefaultContentData,
            IdleTimeoutSeconds = request.IdleTimeoutSeconds
        };

        await Screens.InsertOneAsync(screen);

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            request.DefaultContentType, screen.DefaultContentData,
            screen.IdleTimeoutSeconds, screen.IsActive, new List<TileDto>()
        );
    }

    public async Task<ScreenDto?> UpdateAsync(int id, UpdateScreenRequest request)
    {
        var update = Builders<MongoScreen>.Update
            .Set(s => s.Name, request.Name)
            .Set(s => s.Slug, request.Slug)
            .Set(s => s.DefaultContentType, request.DefaultContentType.ToString())
            .Set(s => s.DefaultContentData, request.DefaultContentData)
            .Set(s => s.IdleTimeoutSeconds, request.IdleTimeoutSeconds)
            .Set(s => s.IsActive, request.IsActive)
            .Set(s => s.UpdatedAt, DateTime.UtcNow);

        var result = await Screens.UpdateOneAsync(s => s.Id == id, update);
        if (result.MatchedCount == 0) return null;

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await Screens.DeleteOneAsync(s => s.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<bool> UpdateTileAssignmentsAsync(int screenId, UpdateScreenTilesRequest request)
    {
        var tiles = request.Tiles.Select(t => new MongoScreenTile
        {
            TileId = t.TileId,
            SortOrderOverride = t.SortOrderOverride
        }).ToList();

        var update = Builders<MongoScreen>.Update
            .Set(s => s.Tiles, tiles)
            .Set(s => s.UpdatedAt, DateTime.UtcNow);

        var result = await Screens.UpdateOneAsync(s => s.Id == screenId, update);
        return result.MatchedCount > 0;
    }

    private async Task<ScreenDto> MapToDto(MongoScreen screen, bool activeOnly)
    {
        var tileIds = screen.Tiles.Select(t => t.TileId).ToList();
        if (tileIds.Count == 0)
        {
            return new ScreenDto(
                screen.Id, screen.Name, screen.Slug,
                Enum.Parse<DefaultContentType>(screen.DefaultContentType),
                screen.DefaultContentData, screen.IdleTimeoutSeconds, screen.IsActive,
                new List<TileDto>()
            );
        }

        var tileFilter = Builders<MongoTile>.Filter.In(t => t.Id, tileIds);
        if (activeOnly)
            tileFilter &= Builders<MongoTile>.Filter.Eq(t => t.IsActive, true);

        var tiles = await Tiles.Find(tileFilter).ToListAsync();
        var tileMap = tiles.ToDictionary(t => t.Id);

        var categoryIds = tiles.Where(t => t.CategoryId.HasValue).Select(t => t.CategoryId!.Value).Distinct().ToList();
        var categories = categoryIds.Count > 0
            ? (await Categories.Find(Builders<MongoCategory>.Filter.In(c => c.Id, categoryIds)).ToListAsync())
                .ToDictionary(c => c.Id)
            : new Dictionary<int, MongoCategory>();

        var tileDtos = screen.Tiles
            .Where(st => tileMap.ContainsKey(st.TileId))
            .Select(st =>
            {
                var t = tileMap[st.TileId];
                var catName = t.CategoryId.HasValue && categories.TryGetValue(t.CategoryId.Value, out var cat)
                    ? cat.Name : null;
                return new TileDto(
                    t.Id, t.Title, t.Description, t.ImageUrl,
                    Enum.Parse<ContentType>(t.ContentType),
                    t.LinkUrl,
                    Enum.Parse<LinkTarget>(t.LinkTarget),
                    t.ArticleBody,
                    st.SortOrderOverride ?? t.SortOrder,
                    t.IsActive,
                    t.ActiveFrom,
                    t.ActiveTo,
                    t.ParentTileId,
                    t.CategoryId, catName
                );
            })
            .OrderBy(t => t.SortOrder)
            .ToList();

        return new ScreenDto(
            screen.Id, screen.Name, screen.Slug,
            Enum.Parse<DefaultContentType>(screen.DefaultContentType),
            screen.DefaultContentData, screen.IdleTimeoutSeconds, screen.IsActive,
            tileDtos
        );
    }
}
