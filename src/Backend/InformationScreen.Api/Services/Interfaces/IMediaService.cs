using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Services.Interfaces;

public interface IMediaService
{
    Task<List<MediaAssetDto>> GetAllAsync();
    Task<MediaAsset?> GetByIdAsync(int id);
    Task<MediaAssetDto> UploadAsync(IFormFile file);
    Task<bool> DeleteAsync(int id);
}
