using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Mongo;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly MongoContext? _mongoContext;
    private readonly IScreenService _screenService;

    public HealthController(IServiceProvider services, IScreenService screenService)
    {
        _mongoContext = services.GetService<MongoContext>();
        _screenService = screenService;
    }

    [HttpGet("db")]
    public async Task<IActionResult> CheckDb()
    {
        if (_mongoContext == null)
            return Ok("DatabaseProvider: Sqlite (MongoContext not registered)");

        var result = await _mongoContext.DiagnoseAsync();
        return Ok(result);
    }

    [HttpGet("screens")]
    public async Task<IActionResult> TestScreens()
    {
        try
        {
            var screens = await _screenService.GetAllAsync();
            return Ok(new { count = screens.Count, screens });
        }
        catch (Exception ex)
        {
            return Ok($"ERROR: {ex.GetType().Name}: {ex.Message}\nStackTrace: {ex.StackTrace}\nInner: {ex.InnerException?.Message}");
        }
    }
}
