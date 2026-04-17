using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/media")]
public class MediaController : ControllerBase
{
    private readonly IMediaService _mediaService;

    public MediaController(IMediaService mediaService)
    {
        _mediaService = mediaService;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetMedia(int id)
    {
        var asset = await _mediaService.GetByIdAsync(id);
        if (asset == null) return NotFound();

        var stream = await _mediaService.GetFileStreamAsync(id);
        if (stream == null) return NotFound();

        var safeFileName = new string(asset.FileName.Select(c => c > 127 ? '_' : c).ToArray());
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{safeFileName}\"; filename*=UTF-8''{Uri.EscapeDataString(asset.FileName)}";
        Response.Headers["Cache-Control"] = "public, max-age=86400, immutable";
        return File(stream, asset.MimeType, enableRangeProcessing: true);
    }
}
