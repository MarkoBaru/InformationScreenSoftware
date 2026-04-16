using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/admin/audit-logs")]
[Authorize(Roles = "Admin")]
public class AdminAuditLogController : ControllerBase
{
    private readonly IAuditService _auditService;

    public AdminAuditLogController(IAuditService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int limit = 200)
    {
        if (limit < 1) limit = 1;
        if (limit > 1000) limit = 1000;
        return Ok(await _auditService.GetLogsAsync(limit));
    }
}
