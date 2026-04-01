using InformationScreen.Api.DTOs;

namespace InformationScreen.Api.Services.Interfaces;

public interface IAnnouncementService
{
    Task<List<AnnouncementDto>> GetAllAsync();
    Task<AnnouncementDto?> GetByIdAsync(int id);
    Task<AnnouncementDto> CreateAsync(CreateAnnouncementRequest request);
    Task<AnnouncementDto?> UpdateAsync(int id, UpdateAnnouncementRequest request);
    Task<bool> DeleteAsync(int id);
    Task<List<AnnouncementDto>> GetActiveForScreenAsync(int screenId);
}
