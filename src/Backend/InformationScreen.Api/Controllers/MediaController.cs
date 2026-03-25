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

        var stream = System.IO.File.OpenRead(asset.FilePath);
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{asset.FileName}\"";
        return File(stream, asset.MimeType);
    }
}
