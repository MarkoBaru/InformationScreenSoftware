using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoCategoryService : ICategoryService
{
    private readonly MongoContext _ctx;

    public MongoCategoryService(MongoContext ctx)
    {
        _ctx = ctx;
    }

    private IMongoCollection<MongoCategory> Categories => _ctx.GetCollection<MongoCategory>("categories");
    private IMongoCollection<MongoTile> Tiles => _ctx.GetCollection<MongoTile>("tiles");

    public async Task<List<CategoryDto>> GetAllAsync()
    {
        var categories = await Categories.Find(_ => true).ToListAsync();

        // Count tiles per category
        var tiles = await Tiles.Find(_ => true).ToListAsync();
        var tileCounts = tiles.Where(t => t.CategoryId.HasValue)
            .GroupBy(t => t.CategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        return categories.OrderBy(c => c.SortOrder).ThenBy(c => c.Name).Select(c => new CategoryDto(
            c.Id, c.Name, c.IconUrl,
            tileCounts.GetValueOrDefault(c.Id, 0),
            c.SortOrder
        )).ToList();
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        var allCats = await Categories.Find(_ => true).ToListAsync();
        var maxSort = allCats.Count > 0 ? allCats.Max(c => c.SortOrder) : -1;

        var category = new MongoCategory
        {
            Id = await _ctx.GetNextIdAsync("categories"),
            Name = request.Name,
            IconUrl = request.IconUrl,
            SortOrder = maxSort + 1
        };

        await Categories.InsertOneAsync(category);
        return new CategoryDto(category.Id, category.Name, category.IconUrl, 0, category.SortOrder);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryRequest request)
    {
        var update = Builders<MongoCategory>.Update
            .Set(c => c.Name, request.Name)
            .Set(c => c.IconUrl, request.IconUrl);

        var result = await Categories.UpdateOneAsync(c => c.Id == id, update);
        if (result.MatchedCount == 0) return null;

        var tileCount = await Tiles.CountDocumentsAsync(t => t.CategoryId == id);
        return new CategoryDto(id, request.Name, request.IconUrl, (int)tileCount,
            (await Categories.Find(c => c.Id == id).FirstOrDefaultAsync())?.SortOrder ?? 0);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await Categories.DeleteOneAsync(c => c.Id == id);
        if (result.DeletedCount == 0) return false;

        // Set categoryId to null on orphaned tiles
        var update = Builders<MongoTile>.Update.Set(t => t.CategoryId, null);
        await Tiles.UpdateManyAsync(t => t.CategoryId == id, update);

        return true;
    }

    public async Task ReorderAsync(List<int> categoryIds)
    {
        for (int i = 0; i < categoryIds.Count; i++)
        {
            var update = Builders<MongoCategory>.Update.Set(c => c.SortOrder, i);
            await Categories.UpdateOneAsync(c => c.Id == categoryIds[i], update);
        }
    }
}
