using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Services;

public class MediaService
{
    private readonly AppDbContext _db;
    private readonly string _uploadPath;

    public MediaService(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _uploadPath = Path.Combine(env.ContentRootPath, "Uploads");
        Directory.CreateDirectory(_uploadPath);
    }

    public async Task<List<MediaAssetDto>> GetAllAsync()
    {
        var assets = await _db.MediaAssets
            .OrderByDescending(m => m.UploadedAt)
            .ToListAsync();

        return assets.Select(m => new MediaAssetDto(
            m.Id, m.FileName,
            $"/api/media/{m.Id}",
            m.MimeType, m.FileSizeBytes, m.UploadedAt
        )).ToList();
    }

    public async Task<MediaAsset?> GetByIdAsync(int id)
    {
        return await _db.MediaAssets.FindAsync(id);
    }

    public async Task<MediaAssetDto> UploadAsync(IFormFile file)
    {
        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(_uploadPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var asset = new MediaAsset
        {
            FileName = file.FileName,
            FilePath = filePath,
            MimeType = file.ContentType,
            FileSizeBytes = file.Length
        };

        _db.MediaAssets.Add(asset);
        await _db.SaveChangesAsync();

        return new MediaAssetDto(
            asset.Id, asset.FileName,
            $"/api/media/{asset.Id}",
            asset.MimeType, asset.FileSizeBytes, asset.UploadedAt
        );
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var asset = await _db.MediaAssets.FindAsync(id);
        if (asset == null) return false;

        if (File.Exists(asset.FilePath))
            File.Delete(asset.FilePath);

        _db.MediaAssets.Remove(asset);
        await _db.SaveChangesAsync();
        return true;
    }
}
