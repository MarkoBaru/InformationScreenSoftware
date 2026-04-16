using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/screens")]
public class ScreensController : ControllerBase
{
    private readonly IScreenService _screenService;
    private readonly IContentCache _cache;

    public ScreensController(IScreenService screenService, IContentCache cache)
    {
        _screenService = screenService;
        _cache = cache;
    }

    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var screen = await _cache.GetOrLoadAsync(
            $"screen:{slug}",
            new[] { "screens", "tiles", "categories", "media" },
            () => _screenService.GetBySlugAsync(slug));
        if (screen == null) return NotFound();
        return Ok(screen);
    }
}
