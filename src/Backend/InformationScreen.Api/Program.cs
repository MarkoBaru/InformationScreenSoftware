using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using InformationScreen.Api.Data;
using InformationScreen.Api.Services;
using InformationScreen.Api.Services.Interfaces;
using InformationScreen.Api.Services.Mongo;

var builder = WebApplication.CreateBuilder(args);

// Allow large file uploads (videos up to 1GB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1024L * 1024 * 1024;
});

// Database provider: "Sqlite" (default) or "MongoDB"
// Env-Variable hat Vorrang vor appsettings.json (wichtig fuer Azure Container Apps)
var databaseProvider = Environment.GetEnvironmentVariable("DATABASE_PROVIDER");
if (string.IsNullOrEmpty(databaseProvider))
    databaseProvider = builder.Configuration["DatabaseProvider"] ?? "Sqlite";

Console.WriteLine($"[STARTUP] DATABASE_PROVIDER = {databaseProvider}");

if (databaseProvider.Equals("MongoDB", StringComparison.OrdinalIgnoreCase))
{
    // MongoDB / Cosmos DB MongoDB API
    var mongoConnectionString = Environment.GetEnvironmentVariable("MONGODB_CONNECTION");
    if (string.IsNullOrEmpty(mongoConnectionString))
        mongoConnectionString = builder.Configuration["MongoDB:ConnectionString"];
    if (string.IsNullOrEmpty(mongoConnectionString))
        mongoConnectionString = "mongodb://localhost:27017";

    var mongoDatabaseName = Environment.GetEnvironmentVariable("MONGODB_DATABASE");
    if (string.IsNullOrEmpty(mongoDatabaseName))
        mongoDatabaseName = builder.Configuration["MongoDB:DatabaseName"] ?? "informationscreen";

    Console.WriteLine($"[STARTUP] MongoDB Database = {mongoDatabaseName}");
    Console.WriteLine($"[STARTUP] MongoDB Connection String Length = {mongoConnectionString.Length}");
    Console.WriteLine($"[STARTUP] MongoDB Connection String starts with = {mongoConnectionString.Substring(0, Math.Min(40, mongoConnectionString.Length))}...");

    builder.Services.AddSingleton(new MongoContext(mongoConnectionString, mongoDatabaseName));
    builder.Services.AddScoped<IScreenService, MongoScreenService>();
    builder.Services.AddScoped<ITileService, MongoTileService>();
    builder.Services.AddScoped<IMediaService, MongoMediaService>();
    builder.Services.AddScoped<ICategoryService, MongoCategoryService>();
}
else
{
    // SQLite (default for local development)
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
    builder.Services.AddScoped<IScreenService, ScreenService>();
    builder.Services.AddScoped<ITileService, TileService>();
    builder.Services.AddScoped<IMediaService, MediaService>();
    builder.Services.AddScoped<ICategoryService, CategoryService>();
}

// Auth Service (needs DbContext for both modes – SQLite always registered for AuthService)
if (databaseProvider.Equals("MongoDB", StringComparison.OrdinalIgnoreCase))
{
    // For MongoDB mode, we still need SQLite for auth (user management)
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")
            ?? "Data Source=informationscreen.db"));
}
builder.Services.AddScoped<AuthService>();

// JWT Authentication
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY");
if (string.IsNullOrEmpty(jwtKey))
    jwtKey = builder.Configuration["Jwt:Key"] ?? "InfoScreen-Default-SuperSecret-Key-Min32Chars!!";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER");
if (string.IsNullOrEmpty(jwtIssuer))
    jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "InformationScreen";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtIssuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// CORS
var allowedOrigins = builder.Configuration["AllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");

builder.Services.AddCors(options =>
{
    if (!string.IsNullOrEmpty(allowedOrigins))
    {
        // Production: explicit origins
        options.AddPolicy("AppCors", policy =>
        {
            policy.WithOrigins(allowedOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries))
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    }
    else
    {
        // Development: localhost range
        options.AddPolicy("AppCors", policy =>
        {
            policy.SetIsOriginAllowed(origin =>
                  {
                      var uri = new Uri(origin);
                      return uri.Host == "localhost" && uri.Port >= 5100 && uri.Port <= 5200;
                  })
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
    }
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate SQLite on startup (always needed – auth uses SQLite in both modes)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Ensure default admin user exists
{
    using var scope = app.Services.CreateScope();
    var authService = scope.ServiceProvider.GetRequiredService<AuthService>();
    await authService.EnsureDefaultAdminAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AppCors");

app.UseAuthentication();
app.UseAuthorization();

// Serve kiosk frontend from wwwroot/kiosk
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// SPA fallback: serve index.html for kiosk routes
app.MapFallbackToFile("index.html");

app.Run();
