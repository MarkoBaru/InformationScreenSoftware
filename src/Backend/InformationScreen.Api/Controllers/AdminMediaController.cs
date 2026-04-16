using System.Security.Claims;
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
    private readonly IAuditService _audit;

    public AdminMediaController(IMediaService mediaService, IAuditService audit)
    {
        _mediaService = mediaService;
        _audit = audit;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value), User.FindFirst(ClaimTypes.Name)!.Value);

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
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Hochgeladen", "Medien", asset.Id, asset.FileName);
        return Ok(asset);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateMetadata(int id, [FromBody] UpdateMediaMetadataRequest request)
    {
        var result = await _mediaService.UpdateMetadataAsync(id, request.Title, request.Description, request.Tags);
        if (result == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Medien", id, result.FileName);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _mediaService.GetAllAsync();
        var media = existing.FirstOrDefault(m => m.Id == id);
        if (!await _mediaService.DeleteAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Medien", id, media?.FileName);
        return NoContent();
    }
}

public record UpdateMediaMetadataRequest(string? Title, string? Description, string? Tags);
