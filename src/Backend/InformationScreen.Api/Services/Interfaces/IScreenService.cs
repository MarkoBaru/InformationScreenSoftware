using InformationScreen.Api.DTOs;

namespace InformationScreen.Api.Services.Interfaces;

public interface IScreenService
{
    Task<ScreenDto?> GetBySlugAsync(string slug);
    Task<List<ScreenListDto>> GetAllAsync();
    Task<ScreenDto?> GetByIdAsync(int id);
    Task<ScreenDto> CreateAsync(CreateScreenRequest request);
    Task<ScreenDto?> UpdateAsync(int id, UpdateScreenRequest request);
    Task<bool> DeleteAsync(int id);
    Task<bool> UpdateTileAssignmentsAsync(int screenId, UpdateScreenTilesRequest request);
}
