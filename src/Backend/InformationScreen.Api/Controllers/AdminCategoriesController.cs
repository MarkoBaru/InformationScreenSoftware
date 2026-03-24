using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/categories")]
public class AdminCategoriesController : ControllerBase
{
    private readonly CategoryService _categoryService;

    public AdminCategoriesController(CategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _categoryService.GetAllAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request)
    {
        var category = await _categoryService.CreateAsync(request);
        return Ok(category);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryRequest request)
    {
        var category = await _categoryService.UpdateAsync(id, request);
        if (category == null) return NotFound();
        return Ok(category);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!await _categoryService.DeleteAsync(id)) return NotFound();
        return NoContent();
    }
}
