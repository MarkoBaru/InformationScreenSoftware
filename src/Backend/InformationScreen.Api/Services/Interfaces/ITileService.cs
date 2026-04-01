using InformationScreen.Api.DTOs;

namespace InformationScreen.Api.Services.Interfaces;

public interface ITileService
{
    Task<List<TileListDto>> GetAllAsync();
    Task<TileListDto?> GetByIdAsync(int id);
    Task<TileListDto> CreateAsync(CreateTileRequest request);
    Task<TileListDto?> UpdateAsync(int id, UpdateTileRequest request);
    Task<bool> DeleteAsync(int id);
    Task<List<TileDto>> GetNewsTilesForScreenAsync(int screenId);
}
