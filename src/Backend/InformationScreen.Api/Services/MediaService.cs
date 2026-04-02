using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services;

public class MediaService : IMediaService
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
            m.MimeType, m.FileSizeBytes, m.Title, m.Description, m.Tags, m.UploadedAt
        )).ToList();
    }

    public async Task<MediaAsset?> GetByIdAsync(int id)
    {
        return await _db.MediaAssets.FindAsync(id);
    }

    public async Task<MediaAssetDto> UploadAsync(IFormFile file, string? title = null, string? description = null, string? tags = null)
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
            FileSizeBytes = file.Length,
            Title = title,
            Description = description,
            Tags = tags
        };

        _db.MediaAssets.Add(asset);
        await _db.SaveChangesAsync();

        return new MediaAssetDto(
            asset.Id, asset.FileName,
            $"/api/media/{asset.Id}",
            asset.MimeType, asset.FileSizeBytes, asset.Title, asset.Description, asset.Tags, asset.UploadedAt
        );
    }

    public async Task<Stream?> GetFileStreamAsync(int id)
    {
        var asset = await _db.MediaAssets.FindAsync(id);
        if (asset == null || !File.Exists(asset.FilePath)) return null;
        return new FileStream(asset.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var asset = await _db.MediaAssets.FindAsync(id);
        if (asset == null) return false;

        if (File.Exists(asset.FilePath))
        {
            try
            {
                File.Delete(asset.FilePath);
            }
            catch (IOException)
            {
                // Datei ist noch gesperrt – kurz warten und nochmal versuchen
                await Task.Delay(200);
                try { File.Delete(asset.FilePath); } catch (IOException) { /* Datei bleibt übrig, DB-Eintrag wird trotzdem entfernt */ }
            }
        }

        _db.MediaAssets.Remove(asset);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<MediaAssetDto?> UpdateMetadataAsync(int id, string? title, string? description, string? tags)
    {
        var asset = await _db.MediaAssets.FindAsync(id);
        if (asset == null) return null;

        asset.Title = title;
        asset.Description = description;
        asset.Tags = tags;
        await _db.SaveChangesAsync();

        return new MediaAssetDto(
            asset.Id, asset.FileName,
            $"/api/media/{asset.Id}",
            asset.MimeType, asset.FileSizeBytes, asset.Title, asset.Description, asset.Tags, asset.UploadedAt
        );
    }
}
