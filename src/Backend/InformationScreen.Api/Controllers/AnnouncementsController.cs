using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/announcements")]
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _service;

    public AnnouncementsController(IAnnouncementService service)
    {
        _service = service;
    }

    [HttpGet("screen/{screenId:int}")]
    public async Task<IActionResult> GetForScreen(int screenId)
    {
        return Ok(await _service.GetActiveForScreenAsync(screenId));
    }

    [HttpGet("debug")]
    public async Task<IActionResult> Debug()
    {
        var swissTz = TimeZoneInfo.FindSystemTimeZoneById("Europe/Zurich");
        var swissNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, swissTz);
        var all = await _service.GetAllAsync();
        return Ok(new
        {
            serverUtcNow = DateTime.UtcNow.ToString("o"),
            serverLocalNow = DateTime.Now.ToString("o"),
            swissNow = swissNow.ToString("o"),
            totalAnnouncements = all.Count,
            announcements = all.Select(a => new
            {
                a.Id, a.Title, a.IsActive,
                activeFrom = a.ActiveFrom?.ToString("o"),
                activeTo = a.ActiveTo?.ToString("o"),
                a.ExcludedScreenIds
            })
        });
    }
