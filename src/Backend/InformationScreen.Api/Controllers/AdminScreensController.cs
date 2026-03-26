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

    public AdminScreensController(IScreenService screenService)
    {
        _screenService = screenService;
    }

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
        return CreatedAtAction(nameof(GetById), new { id = screen.Id }, screen);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateScreenRequest request)
    {
        var screen = await _screenService.UpdateAsync(id, request);
        if (screen == null) return NotFound();
        return Ok(screen);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await _screenService.DeleteAsync(id)) return NotFound();
        return NoContent();
    }

    [HttpPut("{id:int}/tiles")]
    public async Task<IActionResult> UpdateTiles(int id, [FromBody] UpdateScreenTilesRequest request)
    {
        if (!await _screenService.UpdateTileAssignmentsAsync(id, request)) return NotFound();
        return NoContent();
    }
}
