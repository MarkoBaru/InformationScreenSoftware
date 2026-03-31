using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services;

public class CategoryService : ICategoryService
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
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .ToListAsync();

        return categories.Select(c => new CategoryDto(
            c.Id, c.Name, c.IconUrl, c.Tiles.Count, c.SortOrder
        )).ToList();
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request)
    {
        var maxSort = await _db.Categories.AnyAsync()
            ? await _db.Categories.MaxAsync(c => c.SortOrder)
            : -1;

        var category = new Category
        {
            Name = request.Name,
            IconUrl = request.IconUrl,
            SortOrder = maxSort + 1
        };

        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return new CategoryDto(category.Id, category.Name, category.IconUrl, 0, category.SortOrder);
    }

    public async Task<CategoryDto?> UpdateAsync(int id, UpdateCategoryRequest request)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return null;

        category.Name = request.Name;
        category.IconUrl = request.IconUrl;

        await _db.SaveChangesAsync();
        return new CategoryDto(category.Id, category.Name, category.IconUrl,
            await _db.Tiles.CountAsync(t => t.CategoryId == id), category.SortOrder);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var category = await _db.Categories.FindAsync(id);
        if (category == null) return false;

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task ReorderAsync(List<int> categoryIds)
    {
        var categories = await _db.Categories.ToListAsync();
        for (int i = 0; i < categoryIds.Count; i++)
        {
            var cat = categories.FirstOrDefault(c => c.Id == categoryIds[i]);
            if (cat != null) cat.SortOrder = i;
        }
        await _db.SaveChangesAsync();
    }
}
