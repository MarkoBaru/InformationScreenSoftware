using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/screens")]
[Authorize]
public class AdminScreensController : ControllerBase
{
    private readonly IScreenService _screenService;
    private readonly IAuditService _audit;
    private readonly IContentCache _cache;

    public AdminScreensController(IScreenService screenService, IAuditService audit, IContentCache cache)
    {
        _screenService = screenService;
        _audit = audit;
        _cache = cache;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value), User.FindFirst(ClaimTypes.Name)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _screenService.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var screen = await _screenService.GetByIdAsync(id);
        if (screen == null) return NotFound();
        return Ok(screen);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateScreenRequest request)
    {
        var screen = await _screenService.CreateAsync(request);
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Erstellt", "Screen", screen.Id, screen.Name);
        await _cache.TouchAsync("screens");
        return CreatedAtAction(nameof(GetById), new { id = screen.Id }, screen);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateScreenRequest request)
    {
        var screen = await _screenService.UpdateAsync(id, request);
        if (screen == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Screen", id, screen.Name);
        await _cache.TouchAsync("screens");
        return Ok(screen);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _screenService.GetByIdAsync(id);
        if (!await _screenService.DeleteAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Screen", id, existing?.Name);
        await _cache.TouchAsync("screens");
        return NoContent();
    }

    [HttpPut("{id:int}/tiles")]
    public async Task<IActionResult> UpdateTiles(int id, [FromBody] UpdateScreenTilesRequest request)
    {
        if (!await _screenService.UpdateTileAssignmentsAsync(id, request)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Screen", id, "Tile-Zuordnungen aktualisiert");
        await _cache.TouchAsync("screens");
        return NoContent();
    }
}
