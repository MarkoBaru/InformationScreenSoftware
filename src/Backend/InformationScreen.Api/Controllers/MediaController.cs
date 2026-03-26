using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/media")]
public class MediaController : ControllerBase
{
    private readonly MediaService _mediaService;

    public MediaController(MediaService mediaService)
    {
        _mediaService = mediaService;
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetMedia(int id)
    {
        var asset = await _mediaService.GetByIdAsync(id);
        if (asset == null) return NotFound();

        if (!System.IO.File.Exists(asset.FilePath))
            return NotFound();

        // ASCII-safe filename for header, UTF-8 filename* for modern browsers
        var safeFileName = new string(asset.FileName.Select(c => c > 127 ? '_' : c).ToArray());
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{safeFileName}\"; filename*=UTF-8''{Uri.EscapeDataString(asset.FileName)}";
        return PhysicalFile(asset.FilePath, asset.MimeType, enableRangeProcessing: true);
    }
}
