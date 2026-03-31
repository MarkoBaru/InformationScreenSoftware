using MongoDB.Driver;
using Azure.Storage.Blobs;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoMediaService : IMediaService
{
    private readonly MongoContext _ctx;
    private readonly string _uploadPath;
    private readonly BlobContainerClient? _blobContainer;

    public MongoMediaService(MongoContext ctx, IWebHostEnvironment env, IConfiguration config)
    {
        _ctx = ctx;
        _uploadPath = Path.Combine(env.ContentRootPath, "Uploads");
        Directory.CreateDirectory(_uploadPath);

        var blobConnectionString = config["AzureBlobStorage:ConnectionString"];
        if (!string.IsNullOrEmpty(blobConnectionString))
        {
            var containerName = config["AzureBlobStorage:ContainerName"] ?? "media";
            _blobContainer = new BlobContainerClient(blobConnectionString, containerName);
            _blobContainer.CreateIfNotExists();
        }
    }

    private IMongoCollection<MongoMediaAsset> MediaAssets => _ctx.GetCollection<MongoMediaAsset>("mediaAssets");

    public async Task<List<MediaAssetDto>> GetAllAsync()
    {
        var assets = await MediaAssets.Find(_ => true)
            .ToListAsync();

        return assets.OrderByDescending(m => m.UploadedAt).Select(m => new MediaAssetDto(
            m.Id, m.FileName, $"/api/media/{m.Id}",
            m.MimeType, m.FileSizeBytes, m.UploadedAt
        )).ToList();
    }

    public async Task<MediaAsset?> GetByIdAsync(int id)
    {
        var doc = await MediaAssets.Find(m => m.Id == id).FirstOrDefaultAsync();
        if (doc == null) return null;

        return new MediaAsset
        {
            Id = doc.Id,
            FileName = doc.FileName,
            FilePath = doc.FilePath,
            MimeType = doc.MimeType,
            FileSizeBytes = doc.FileSizeBytes,
            UploadedAt = doc.UploadedAt
        };
    }

    public async Task<MediaAssetDto> UploadAsync(IFormFile file)
    {
        var id = await _ctx.GetNextIdAsync("mediaAssets");
        var storedFileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        string filePath;

        if (_blobContainer != null)
        {
            // Upload to Azure Blob Storage
            var blobClient = _blobContainer.GetBlobClient(storedFileName);
            using var stream = file.OpenReadStream();
            await blobClient.UploadAsync(stream, overwrite: true);
            filePath = blobClient.Uri.ToString();
        }
        else
        {
            // Upload to local filesystem
            filePath = Path.Combine(_uploadPath, storedFileName);
            using var stream = new FileStream(filePath, FileMode.Create);
            await file.CopyToAsync(stream);
        }

        var asset = new MongoMediaAsset
        {
            Id = id,
            FileName = file.FileName,
            FilePath = filePath,
            MimeType = file.ContentType,
            FileSizeBytes = file.Length,
            UploadedAt = DateTime.UtcNow
        };

        await MediaAssets.InsertOneAsync(asset);

        return new MediaAssetDto(
            asset.Id, asset.FileName, $"/api/media/{asset.Id}",
            asset.MimeType, asset.FileSizeBytes, asset.UploadedAt
        );
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var asset = await MediaAssets.Find(m => m.Id == id).FirstOrDefaultAsync();
        if (asset == null) return false;

        // Delete the file
        if (_blobContainer != null && asset.FilePath.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            var blobName = new Uri(asset.FilePath).Segments.Last();
            await _blobContainer.DeleteBlobIfExistsAsync(blobName);
        }
        else if (File.Exists(asset.FilePath))
        {
            try { File.Delete(asset.FilePath); }
            catch (IOException)
            {
                await Task.Delay(200);
                try { File.Delete(asset.FilePath); } catch (IOException) { }
            }
        }

        await MediaAssets.DeleteOneAsync(m => m.Id == id);
        return true;
    }
}
