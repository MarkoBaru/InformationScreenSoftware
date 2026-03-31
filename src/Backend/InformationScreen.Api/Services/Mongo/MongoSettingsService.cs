using MongoDB.Driver;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoSettingsService : ISettingsService
{
    private readonly MongoContext _ctx;

    public MongoSettingsService(MongoContext ctx)
    {
        _ctx = ctx;
    }

    private IMongoCollection<MongoSetting> Settings => _ctx.GetCollection<MongoSetting>("settings");

    public async Task<Dictionary<string, string>> GetAllAsync()
    {
        var all = await Settings.Find(_ => true).ToListAsync();
        return all.ToDictionary(s => s.Key, s => s.Value);
    }

    public async Task<Dictionary<string, string>> UpdateAsync(Dictionary<string, string> settings)
    {
        foreach (var (key, value) in settings)
        {
            var filter = Builders<MongoSetting>.Filter.Eq(s => s.Key, key);
            var update = Builders<MongoSetting>.Update
                .Set(s => s.Value, value)
                .SetOnInsert(s => s.Key, key);
            await Settings.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
        }
        return await GetAllAsync();
    }
}
