using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/tiles")]
public class AdminTilesController : ControllerBase
{
    private readonly TileService _tileService;

    public AdminTilesController(TileService tileService)
    {
        _tileService = tileService;
    }

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
        return CreatedAtAction(nameof(GetById), new { id = tile.Id }, tile);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTileRequest request)
    {
        var tile = await _tileService.UpdateAsync(id, request);
        if (tile == null) return NotFound();
        return Ok(tile);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await _tileService.DeleteAsync(id)) return NotFound();
        return NoContent();
    }
}
