using System.Collections.Concurrent;
using MongoDB.Driver;
using MongoDB.Bson.Serialization.Attributes;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoContentCache : IContentCache
{
    // Maximale Cache-Dauer als Sicherheitsnetz (z.B. für zeitbasierte ActiveFrom/ActiveTo-Felder)
    private static readonly TimeSpan MaxCacheAge = TimeSpan.FromMinutes(5);

    private readonly MongoContext _ctx;
    private readonly ConcurrentDictionary<string, CacheEntry> _cache = new();

    public MongoContentCache(MongoContext ctx)
    {
        _ctx = ctx;
    }

    public async Task<T?> GetOrLoadAsync<T>(string cacheKey, string[] areas, Func<Task<T?>> loader) where T : class
    {
        if (_cache.TryGetValue(cacheKey, out var entry) && DateTime.UtcNow - entry.CachedAt < MaxCacheAge)
        {
            var dbTimestamp = await GetMaxTimestampAsync(areas);
            if (dbTimestamp <= entry.CachedAt)
            {
                return (T?)entry.Data;
            }
        }

        var data = await loader();
        if (data != null)
        {
            _cache[cacheKey] = new CacheEntry(data, DateTime.UtcNow);
        }
        else
        {
            _cache.TryRemove(cacheKey, out _);
        }
        return data;
    }

    public async Task TouchAsync(string area)
    {
        var collection = _ctx.GetCollection<MongoChangeTracker>("changeTrackers");
        var filter = Builders<MongoChangeTracker>.Filter.Eq(x => x.Area, area);
        var update = Builders<MongoChangeTracker>.Update.Set(x => x.LastModified, DateTime.UtcNow);
        await collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
    }

    private async Task<DateTime> GetMaxTimestampAsync(string[] areas)
    {
        var collection = _ctx.GetCollection<MongoChangeTracker>("changeTrackers");
        var filter = Builders<MongoChangeTracker>.Filter.In(x => x.Area, areas);
        var trackers = await collection.Find(filter).ToListAsync();
        return trackers.Count == 0 ? DateTime.MinValue : trackers.Max(t => t.LastModified);
    }

    private sealed record CacheEntry(object Data, DateTime CachedAt);
}

public class MongoChangeTracker
{
    [BsonId]
    public string Area { get; set; } = string.Empty;
    public DateTime LastModified { get; set; } = DateTime.UtcNow;
}
