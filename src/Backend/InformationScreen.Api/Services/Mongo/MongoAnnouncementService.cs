using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoAnnouncementService : IAnnouncementService
{
    private readonly MongoContext _ctx;
    private IMongoCollection<MongoAnnouncement> Announcements => _ctx.GetCollection<MongoAnnouncement>("announcements");

    public MongoAnnouncementService(MongoContext ctx) => _ctx = ctx;

    public async Task<List<AnnouncementDto>> GetAllAsync()
    {
        var all = await Announcements.Find(_ => true)
            .SortByDescending(a => a.CreatedAt)
            .ToListAsync();
        return all.Select(Map).ToList();
    }

    public async Task<AnnouncementDto?> GetByIdAsync(int id)
    {
        var a = await Announcements.Find(x => x.Id == id).FirstOrDefaultAsync();
        return a == null ? null : Map(a);
    }

    public async Task<AnnouncementDto> CreateAsync(CreateAnnouncementRequest request)
    {
        var id = await _ctx.GetNextIdAsync("announcements");
        var doc = new MongoAnnouncement
        {
            Id = id,
            Title = request.Title,
            Message = request.Message,
            ActiveFrom = request.ActiveFrom,
            ActiveTo = request.ActiveTo,
            ExcludedScreenIds = request.ExcludedScreenIds ?? new List<int>(),
        };
        await Announcements.InsertOneAsync(doc);
        return Map(doc);
    }

    public async Task<AnnouncementDto?> UpdateAsync(int id, UpdateAnnouncementRequest request)
    {
        var doc = await Announcements.Find(x => x.Id == id).FirstOrDefaultAsync();
        if (doc == null) return null;

        doc.Title = request.Title;
        doc.Message = request.Message;
        doc.IsActive = request.IsActive;
        doc.ActiveFrom = request.ActiveFrom;
        doc.ActiveTo = request.ActiveTo;
        doc.ExcludedScreenIds = request.ExcludedScreenIds ?? new List<int>();
        doc.UpdatedAt = DateTime.UtcNow;

        await Announcements.ReplaceOneAsync(x => x.Id == id, doc);
        return Map(doc);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var result = await Announcements.DeleteOneAsync(x => x.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task<List<AnnouncementDto>> GetActiveForScreenAsync(int screenId)
    {
        var now = DateTime.UtcNow;
        var all = await Announcements.Find(a => a.IsActive).ToListAsync();

        return all
            .Where(a =>
                (a.ActiveFrom == null || a.ActiveFrom <= now) &&
                (a.ActiveTo == null || a.ActiveTo >= now) &&
                !a.ExcludedScreenIds.Contains(screenId))
            .OrderByDescending(a => a.CreatedAt)
            .Select(Map)
            .ToList();
    }

    private static AnnouncementDto Map(MongoAnnouncement a) => new(
        a.Id, a.Title, a.Message, a.IsActive,
        a.ActiveFrom, a.ActiveTo,
        a.ExcludedScreenIds, a.CreatedAt
    );
}
