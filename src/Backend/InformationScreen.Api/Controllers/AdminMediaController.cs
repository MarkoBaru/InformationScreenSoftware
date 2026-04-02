using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/media")]
[Authorize]
public class AdminMediaController : ControllerBase
{
    private readonly IMediaService _mediaService;

    public AdminMediaController(IMediaService mediaService)
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
    [RequestFormLimits(MultipartBodyLengthLimit = 1024L * 1024 * 1024)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string? title = null, [FromForm] string? description = null, [FromForm] string? tags = null)
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

        const long maxSize = 1024L * 1024 * 1024; // 1GB
        if (file.Length > maxSize)
            return BadRequest($"Die Datei ist zu gross ({file.Length / 1024 / 1024} MB). Maximal erlaubt: 1 GB.");

        var asset = await _mediaService.UploadAsync(file, title, description, tags);
        return Ok(asset);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateMetadata(int id, [FromBody] UpdateMediaMetadataRequest request)
    {
        var result = await _mediaService.UpdateMetadataAsync(id, request.Title, request.Description, request.Tags);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await _mediaService.DeleteAsync(id)) return NotFound();
        return NoContent();
    }
}

public record UpdateMediaMetadataRequest(string? Title, string? Description, string? Tags);
