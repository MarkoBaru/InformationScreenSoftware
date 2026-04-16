using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoAuditService : IAuditService
{
    private readonly MongoContext _ctx;

    public MongoAuditService(MongoContext ctx)
    {
        _ctx = ctx;
    }

    private IMongoCollection<MongoAuditLog> AuditLogs =>
        _ctx.GetCollection<MongoAuditLog>("auditLogs");

    public async Task LogAsync(int userId, string username, string action, string entityType, int? entityId = null, string? details = null)
    {
        var id = await _ctx.GetNextIdAsync("auditLogs");
        var entry = new MongoAuditLog
        {
            Id = id,
            UserId = userId,
            Username = username,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            Timestamp = DateTime.UtcNow
        };
        await AuditLogs.InsertOneAsync(entry);
    }

    public async Task<List<AuditLogDto>> GetLogsAsync(int limit = 200)
    {
        var logs = await AuditLogs
            .Find(_ => true)
            .SortByDescending(l => l.Timestamp)
            .Limit(limit)
            .ToListAsync();

        return logs.Select(l => new AuditLogDto(
            l.Id,
            l.UserId,
            l.Username,
            l.Action,
            l.EntityType,
            l.EntityId,
            l.Details,
            l.Timestamp
        )).ToList();
    }
}
