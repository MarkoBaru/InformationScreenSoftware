using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Services;

public class CategoryService
{
    private readonly AppDbContext _db;

    public CategoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<CategoryDto>> GetAllAsync()
    {
        var categories = await _db.Categories
            .Include(c => c.Tiles)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return categories.Select(c => new CategoryDto(
            c.Id, c.Name, c.IconUrl, c.Tiles.Count
        )).ToList();
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name,
            IconUrl = request.IconUrl
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return new CategoryDto(category.Id, category.Name, category.IconUrl, 0);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryRequest request)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return null;

        category.Name = request.Name;
        category.IconUrl = request.IconUrl;

        await _db.SaveChangesAsync();
        return new CategoryDto(category.Id, category.Name, category.IconUrl,
            await _db.Tiles.CountAsync(t => t.CategoryId == id));
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return false;

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return true;
    }
}
