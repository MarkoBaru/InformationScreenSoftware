using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
public class AdminMediaController : ControllerBase
{
    private readonly MediaService _mediaService;

    public AdminMediaController(MediaService mediaService)
    {
        _mediaService = mediaService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _mediaService.GetAllAsync());
    }

    [HttpPost("upload")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 200 * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var allowedTypes = new HashSet<string>
        {
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
            "video/mp4", "video/webm", "video/ogg",
            "application/pdf"
        };

        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest("File type not allowed.");

        const long maxSize = 100 * 1024 * 1024; // 100MB
        if (file.Length > maxSize)
            return BadRequest("File too large. Maximum size is 100MB.");

        var asset = await _mediaService.UploadAsync(file);
        return Ok(asset);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await _mediaService.DeleteAsync(id)) return NotFound();
        return NoContent();
    }
}
