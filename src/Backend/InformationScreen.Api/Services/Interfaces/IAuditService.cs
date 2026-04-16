using InformationScreen.Api.DTOs;

namespace InformationScreen.Api.Services.Interfaces;

public interface IAuditService
{
    Task LogAsync(int userId, string username, string action, string entityType, int? entityId = null, string? details = null);
    Task<List<AuditLogDto>> GetLogsAsync(int limit = 200);
}
