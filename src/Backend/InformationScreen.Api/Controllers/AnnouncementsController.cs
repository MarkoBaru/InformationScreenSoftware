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
}
