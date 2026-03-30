using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Mongo;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly MongoContext? _mongoContext;

    public HealthController(IServiceProvider services)
    {
        _mongoContext = services.GetService<MongoContext>();
    }

    [HttpGet("db")]
    public async Task<IActionResult> CheckDb()
    {
        if (_mongoContext == null)
            return Ok("DatabaseProvider: Sqlite (MongoContext not registered)");

        var result = await _mongoContext.DiagnoseAsync();
        return Ok(result);
    }
}
