using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/tiles")]
[Authorize]
public class AdminTilesController : ControllerBase
{
    private readonly ITileService _tileService;
    private readonly IAuditService _audit;
    private readonly IContentCache _cache;

    public AdminTilesController(ITileService tileService, IAuditService audit, IContentCache cache)
    {
        _tileService = tileService;
        _audit = audit;
        _cache = cache;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value), User.FindFirst(ClaimTypes.Name)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _tileService.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var tile = await _tileService.GetByIdAsync(id);
        if (tile == null) return NotFound();
        return Ok(tile);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTileRequest request)
    {
        var tile = await _tileService.CreateAsync(request);
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Erstellt", "Inhalt", tile.Id, tile.Title);
        await _cache.TouchAsync("tiles");
        return CreatedAtAction(nameof(GetById), new { id = tile.Id }, tile);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTileRequest request)
    {
        var tile = await _tileService.UpdateAsync(id, request);
        if (tile == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Inhalt", id, tile.Title);
        await _cache.TouchAsync("tiles");
        return Ok(tile);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _tileService.GetByIdAsync(id);
        if (!await _tileService.DeleteAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Inhalt", id, existing?.Title);
        await _cache.TouchAsync("tiles");
        return NoContent();
    }
}
