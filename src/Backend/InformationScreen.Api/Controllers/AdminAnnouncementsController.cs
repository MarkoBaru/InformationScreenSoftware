using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/announcements")]
[Authorize]
public class AdminAnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _service;
    private readonly IAuditService _audit;

    public AdminAnnouncementsController(IAnnouncementService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value), User.FindFirst(ClaimTypes.Name)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _service.GetAllAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request)
    {
        var item = await _service.CreateAsync(request);
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Erstellt", "Nachricht", item.Id, item.Title);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAnnouncementRequest request)
    {
        var item = await _service.UpdateAsync(id, request);
        if (item == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Nachricht", id, item.Title);
        return Ok(item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _service.GetByIdAsync(id);
        if (!await _service.DeleteAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Nachricht", id, existing?.Title);
        return NoContent();
    }
}
