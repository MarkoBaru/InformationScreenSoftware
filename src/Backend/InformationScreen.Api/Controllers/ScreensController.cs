using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/screens")]
public class ScreensController : ControllerBase
{
    private readonly ScreenService _screenService;
    private readonly MediaService _mediaService;

    public ScreensController(ScreenService screenService, MediaService mediaService)
    {
        _screenService = screenService;
        _mediaService = mediaService;
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var screen = await _screenService.GetBySlugAsync(slug);
        if (screen == null) return NotFound();
        return Ok(screen);
    }
}
