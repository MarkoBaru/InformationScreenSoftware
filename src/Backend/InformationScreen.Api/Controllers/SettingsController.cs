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

    public SettingsController(ISettingsService settings, IAuditService audit)
    {
        _settings = settings;
        _audit = audit;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _settings.GetAllAsync());
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromBody] Dictionary<string, string> settings)
    {
        var result = await _settings.UpdateAsync(settings);
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var username = User.FindFirst(ClaimTypes.Name)!.Value;
        await _audit.LogAsync(userId, username, "Bearbeitet", "Einstellungen", details: string.Join(", ", settings.Keys));
        return Ok(result);
    }
}
