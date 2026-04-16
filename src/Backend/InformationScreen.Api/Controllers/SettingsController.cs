using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settings;
    private readonly IAuditService _audit;
    private readonly IContentCache _cache;

    public SettingsController(ISettingsService settings, IAuditService audit, IContentCache cache)
    {
        _settings = settings;
        _audit = audit;
        _cache = cache;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        var result = await _cache.GetOrLoadAsync(
            "settings",
            new[] { "settings" },
            async () => await _settings.GetAllAsync());
        return Ok(result);
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, string> settings)
    {
        var result = await _settings.UpdateAsync(settings);
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var username = User.FindFirst(ClaimTypes.Name)!.Value;
        await _audit.LogAsync(userId, username, "Bearbeitet", "Einstellungen", details: string.Join(", ", settings.Keys));
        await _cache.TouchAsync("settings");
        return Ok(result);
    }
}
