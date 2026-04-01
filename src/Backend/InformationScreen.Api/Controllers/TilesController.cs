using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/tiles")]
public class TilesController : ControllerBase
{
    private readonly ITileService _tileService;

    public TilesController(ITileService tileService)
    {
        _tileService = tileService;
    }

    [HttpGet("news/screen/{screenId:int}")]
    public async Task<IActionResult> GetNewsTilesForScreen(int screenId)
    {
        return Ok(await _tileService.GetNewsTilesForScreenAsync(screenId));
    }
}
