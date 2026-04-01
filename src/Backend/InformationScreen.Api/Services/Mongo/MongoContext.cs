using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace InformationScreen.Api.Services.Mongo;

public class MongoContext
{
    private readonly IMongoDatabase _database;

    public MongoContext(string connectionString, string databaseName = "informationscreen")
    {
        Console.WriteLine($"[MongoContext] Connecting to database '{databaseName}'...");
        var settings = MongoClientSettings.FromConnectionString(connectionString);
        settings.ServerSelectionTimeout = TimeSpan.FromSeconds(10);
        settings.ConnectTimeout = TimeSpan.FromSeconds(10);
        var client = new MongoClient(settings);
        _database = client.GetDatabase(databaseName);
        try
        {
            EnsureIndexes();
            Console.WriteLine($"[MongoContext] Connected and indexes ensured.");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"[MongoContext] WARNING: EnsureIndexes failed (non-fatal): {ex.GetType().Name}: {ex.Message}");
        }
    }

    public IMongoCollection<T> GetCollection<T>(string name) =>
        _database.GetCollection<T>(name);

    /// <summary>Test write+read against the database. Returns diagnostic info.</summary>
    public async Task<string> DiagnoseAsync()
    {
        var diag = new System.Text.StringBuilder();
        try
        {
            diag.AppendLine($"Database: {_database.DatabaseNamespace.DatabaseName}");

            // List collections
            var collections = await _database.ListCollectionNamesAsync();
            var names = await collections.ToListAsync();
            diag.AppendLine($"Collections: {string.Join(", ", names)}");

            // Test counter write
            var id = await GetNextIdAsync("_diag_test");
            diag.AppendLine($"Counter write OK: _diag_test seq={id}");

            // Test document write
            var testCol = _database.GetCollection<BsonDocument>("_diag_test");
            var doc = new BsonDocument { { "_id", id }, { "ts", DateTime.UtcNow } };
            await testCol.InsertOneAsync(doc);
            diag.AppendLine($"InsertOne OK: _id={id}");

            // Test document read
            var read = await testCol.Find(Builders<BsonDocument>.Filter.Eq("_id", id)).FirstOrDefaultAsync();
            diag.AppendLine(read != null ? $"Read OK: {read}" : "Read FAILED: document not found");

            // Cleanup
            await testCol.DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("_id", id));
            diag.AppendLine("Cleanup OK");
        }
        catch (Exception ex)
        {
            diag.AppendLine($"ERROR: {ex.GetType().Name}: {ex.Message}");
            if (ex.InnerException != null)
                diag.AppendLine($"INNER: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}");
        }
        return diag.ToString();
    }

    public async Task<int> GetNextIdAsync(string collectionName)
    {
        var counters = _database.GetCollection<BsonDocument>("counters");
        var filter = Builders<BsonDocument>.Filter.Eq("_id", collectionName);
        var update = Builders<BsonDocument>.Update.Inc("seq", 1);
        var options = new FindOneAndUpdateOptions<BsonDocument>
        {
            IsUpsert = true,
            ReturnDocument = ReturnDocument.After
        };
        var result = await counters.FindOneAndUpdateAsync(filter, update, options);
        return result["seq"].AsInt32;
    }

    private void EnsureIndexes()
    {
        // Unique slug index on screens
        var screens = _database.GetCollection<MongoScreen>("screens");
        screens.Indexes.CreateOne(new CreateIndexModel<MongoScreen>(
            Builders<MongoScreen>.IndexKeys.Ascending(s => s.Slug),
            new CreateIndexOptions { Unique = true }));

        // Index on tiles sortOrder
        var tiles = _database.GetCollection<MongoTile>("tiles");
        tiles.Indexes.CreateOne(new CreateIndexModel<MongoTile>(
            Builders<MongoTile>.IndexKeys.Ascending(t => t.SortOrder)));

        // Index on mediaAssets uploadedAt descending
        var media = _database.GetCollection<MongoMediaAsset>("mediaAssets");
        media.Indexes.CreateOne(new CreateIndexModel<MongoMediaAsset>(
            Builders<MongoMediaAsset>.IndexKeys.Descending(m => m.UploadedAt)));

        // Unique username index on users
        var users = _database.GetCollection<MongoUser>("users");
        users.Indexes.CreateOne(new CreateIndexModel<MongoUser>(
            Builders<MongoUser>.IndexKeys.Ascending(u => u.Username),
            new CreateIndexOptions { Unique = true }));
    }
}

// MongoDB document models
public class MongoScreen
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string DefaultContentType { get; set; } = "None";
    public string? DefaultContentData { get; set; }
    public int IdleTimeoutSeconds { get; set; } = 120;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public List<MongoScreenTile> Tiles { get; set; } = new();
}

public class MongoScreenTile
{
    public int TileId { get; set; }
    public int? SortOrderOverride { get; set; }
}

public class MongoTile
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string ContentType { get; set; } = "Link";
    public string LinkUrl { get; set; } = string.Empty;
    public string LinkTarget { get; set; } = "Embedded";
    public string? ArticleBody { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ActiveFrom { get; set; }
    public DateTime? ActiveTo { get; set; }
    public int? ParentTileId { get; set; }
    public int? CategoryId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class MongoCategory
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MongoMediaAsset
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}

public class MongoUser
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "User";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class MongoSetting
{
    [BsonId]
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public class MongoAnnouncement
{
    [BsonId]
    [BsonRepresentation(BsonType.Int32)]
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime? ActiveFrom { get; set; }
    public DateTime? ActiveTo { get; set; }
    public List<int> ExcludedScreenIds { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
