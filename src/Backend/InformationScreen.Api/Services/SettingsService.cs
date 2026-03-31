using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services;

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;

    public SettingsService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Dictionary<string, string>> GetAllAsync()
    {
        return await _db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
    }

    public async Task<Dictionary<string, string>> UpdateAsync(Dictionary<string, string> settings)
    {
        foreach (var (key, value) in settings)
        {
            var existing = await _db.Settings.FirstOrDefaultAsync(s => s.Key == key);
            if (existing != null)
            {
                existing.Value = value;
            }
            else
            {
                _db.Settings.Add(new AppSetting { Key = key, Value = value });
            }
        }
        await _db.SaveChangesAsync();
        return await _db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
    }
}
