namespace InformationScreen.Api.Services.Interfaces;

public interface IContentCache
{
    Task<T?> GetOrLoadAsync<T>(string cacheKey, string[] areas, Func<Task<T?>> loader) where T : class;
    Task TouchAsync(string area);
}
