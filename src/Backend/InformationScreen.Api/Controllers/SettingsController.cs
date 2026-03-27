using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly AppDbContext _db;

    public SettingsController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// GET api/settings — returns all settings as key-value pairs (public, no auth needed for kiosk)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
        return Ok(settings);
    }

    /// <summary>
    /// PUT api/settings — bulk-update settings (admin only)
    /// </summary>
    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, string> settings)
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
        return Ok(await _db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value));
    }
}
