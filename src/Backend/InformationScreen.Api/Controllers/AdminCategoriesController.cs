using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/categories")]
[Authorize]
public class AdminCategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly IAuditService _audit;

    public AdminCategoriesController(ICategoryService categoryService, IAuditService audit)
    {
        _categoryService = categoryService;
        _audit = audit;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value), User.FindFirst(ClaimTypes.Name)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _categoryService.GetAllAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request)
    {
        var category = await _categoryService.CreateAsync(request);
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Erstellt", "Kategorie", category.Id, category.Name);
        return Ok(category);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _categoryService.UpdateAsync(id, request);
        if (category == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Kategorie", id, category.Name);
        return Ok(category);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _categoryService.GetAllAsync();
        var cat = existing.FirstOrDefault(c => c.Id == id);
        if (!await _categoryService.DeleteAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Kategorie", id, cat?.Name);
        return NoContent();
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> Reorder([FromBody] ReorderCategoriesRequest request)
    {
        await _categoryService.ReorderAsync(request.CategoryIds);
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Kategorie", details: "Reihenfolge geändert");
        return NoContent();
    }
}
