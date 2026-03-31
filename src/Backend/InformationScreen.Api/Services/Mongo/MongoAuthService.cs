using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using InformationScreen.Api.DTOs;
using InformationScreen.Api.Models;
using InformationScreen.Api.Services.Interfaces;

namespace InformationScreen.Api.Services.Mongo;

public class MongoAuthService : IAuthService
{
    private readonly MongoContext _ctx;
    private readonly string _jwtKey;
    private readonly string _jwtIssuer;

    public MongoAuthService(MongoContext ctx, IConfiguration config)
    {
        _ctx = ctx;
        var envKey = Environment.GetEnvironmentVariable("JWT_KEY");
        _jwtKey = !string.IsNullOrEmpty(envKey) ? envKey
            : config["Jwt:Key"] ?? "InfoScreen-Default-SuperSecret-Key-Min32Chars!!";
        var envIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER");
        _jwtIssuer = !string.IsNullOrEmpty(envIssuer) ? envIssuer
            : config["Jwt:Issuer"] ?? "InformationScreen";
    }

    private IMongoCollection<MongoUser> Users => _ctx.GetCollection<MongoUser>("users");

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await Users.Find(u => u.Username == request.Username && u.IsActive)
            .FirstOrDefaultAsync();
        if (user == null) return null;

        if (!VerifyPassword(request.Password, user.PasswordHash))
            return null;

        var token = GenerateToken(user);
        return new LoginResponse(token, MapToDto(user));
    }

    public async Task<List<UserDto>> GetAllUsersAsync()
    {
        var users = await Users.Find(_ => true).SortBy(u => u.Username).ToListAsync();
        return users.Select(MapToDto).ToList();
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var user = await Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto?> CreateUserAsync(CreateUserRequest request)
    {
        var exists = await Users.Find(u => u.Username == request.Username).AnyAsync();
        if (exists) return null;

        var user = new MongoUser
        {
            Id = await _ctx.GetNextIdAsync("users"),
            Username = request.Username,
            PasswordHash = HashPassword(request.Password),
            DisplayName = request.DisplayName,
            Role = request.Role.ToString()
        };

        await Users.InsertOneAsync(user);
        return MapToDto(user);
    }

    public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserRequest request)
    {
        var updateDef = Builders<MongoUser>.Update
            .Set(u => u.DisplayName, request.DisplayName)
            .Set(u => u.Role, request.Role.ToString())
            .Set(u => u.IsActive, request.IsActive);

        if (!string.IsNullOrEmpty(request.Password))
            updateDef = updateDef.Set(u => u.PasswordHash, HashPassword(request.Password));

        var result = await Users.UpdateOneAsync(u => u.Id == id, updateDef);
        if (result.MatchedCount == 0) return null;

        return await GetUserByIdAsync(id);
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var result = await Users.DeleteOneAsync(u => u.Id == id);
        return result.DeletedCount > 0;
    }

    public async Task EnsureDefaultAdminAsync()
    {
        var any = await Users.Find(_ => true).AnyAsync();
        if (!any)
        {
            Console.WriteLine("[MongoAuthService] Creating default admin user...");
            var user = new MongoUser
            {
                Id = await _ctx.GetNextIdAsync("users"),
                Username = "admin",
                PasswordHash = HashPassword("admin"),
                DisplayName = "Administrator",
                Role = UserRole.Admin.ToString()
            };
            await Users.InsertOneAsync(user);
            Console.WriteLine("[MongoAuthService] Default admin created (Id={0})", user.Id);
        }
    }

    private string GenerateToken(MongoUser user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtIssuer,
            audience: _jwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(12),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifyPassword(string password, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 2) return false;
        var salt = Convert.FromBase64String(parts[0]);
        var hash = Convert.FromBase64String(parts[1]);
        var computedHash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(hash, computedHash);
    }

    private static UserDto MapToDto(MongoUser user) =>
        new(user.Id, user.Username, user.DisplayName,
            Enum.Parse<UserRole>(user.Role), user.IsActive, user.CreatedAt);
}
