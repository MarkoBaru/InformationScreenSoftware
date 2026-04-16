using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/tiles")]
public class TilesController : ControllerBase
{
    private readonly ITileService _tileService;
    private readonly IContentCache _cache;

    public TilesController(ITileService tileService, IContentCache cache)
    {
        _tileService = tileService;
        _cache = cache;
    }

    [HttpGet("news/screen/{screenId:int}")]
    public async Task<IActionResult> GetNewsTilesForScreen(int screenId)
    {
        var tiles = await _cache.GetOrLoadAsync(
            $"news:{screenId}",
            new[] { "tiles", "categories", "media", "screens" },
            async () => await _tileService.GetNewsTilesForScreenAsync(screenId));
        return Ok(tiles);
    }
}
