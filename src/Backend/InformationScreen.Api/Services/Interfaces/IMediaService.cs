using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Services.Interfaces;

public interface IMediaService
{
    Task<List<MediaAssetDto>> GetAllAsync();
    Task<MediaAsset?> GetByIdAsync(int id);
    Task<MediaAssetDto> UploadAsync(IFormFile file, string? title = null, string? description = null, string? tags = null);
    Task<MediaAssetDto?> UpdateMetadataAsync(int id, string? title, string? description, string? tags);
    Task<bool> DeleteAsync(int id);
    Task<Stream?> GetFileStreamAsync(int id);
}
