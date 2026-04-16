using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditService _audit;

    public AuthController(IAuthService authService, IAuditService audit)
    {
        _authService = authService;
        _audit = audit;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        if (result == null)
            return Unauthorized(new { message = "Benutzername oder Passwort falsch." });
        await _audit.LogAsync(result.User.Id, result.User.Username, "Login", "Auth", details: "Erfolgreich eingeloggt");
        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var user = await _authService.GetUserByIdAsync(userId);
        if (user == null) return Unauthorized();
        return Ok(user);
    }
}

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IAuditService _audit;

    public UsersController(IAuthService authService, IAuditService audit)
    {
        _authService = authService;
        _audit = audit;
    }

    private (int id, string name) CurrentUser =>
        (int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value), User.FindFirst(System.Security.Claims.ClaimTypes.Name)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        return Ok(await _authService.GetAllUsersAsync());
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await _authService.GetUserByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        var user = await _authService.CreateUserAsync(request);
        if (user == null) return Conflict(new { message = "Benutzername existiert bereits." });
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Erstellt", "Benutzer", user.Id, user.Username);
        return Created($"/api/admin/users/{user.Id}", user);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
    {
        var user = await _authService.UpdateUserAsync(id, request);
        if (user == null) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Bearbeitet", "Benutzer", id, user.Username);
        return Ok(user);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _authService.GetUserByIdAsync(id);
        if (!await _authService.DeleteUserAsync(id)) return NotFound();
        var u = CurrentUser;
        await _audit.LogAsync(u.id, u.name, "Gelöscht", "Benutzer", id, existing?.Username);
        return NoContent();
    }
}
