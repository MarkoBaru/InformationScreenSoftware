namespace InformationScreen.Api.Services.Interfaces;

public interface ISettingsService
{
    Task<Dictionary<string, string>> GetAllAsync();
    Task<Dictionary<string, string>> UpdateAsync(Dictionary<string, string> settings);
}
