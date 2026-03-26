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

        // Azure Blob Storage: FilePath is an HTTP URL → redirect
        if (asset.FilePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            return Redirect(asset.FilePath);

        if (!System.IO.File.Exists(asset.FilePath))
            return NotFound();

        // ASCII-safe filename for header, UTF-8 filename* for modern browsers
        var safeFileName = new string(asset.FileName.Select(c => c > 127 ? '_' : c).ToArray());
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{safeFileName}\"; filename*=UTF-8''{Uri.EscapeDataString(asset.FileName)}";
        return PhysicalFile(asset.FilePath, asset.MimeType, enableRangeProcessing: true);
    }
}
