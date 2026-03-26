using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Data;
using InformationScreen.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Allow large file uploads (videos up to 1GB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1024L * 1024 * 1024;
});

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<ScreenService>();
builder.Services.AddScoped<TileService>();
builder.Services.AddScoped<MediaService>();
builder.Services.AddScoped<CategoryService>();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// CORS for dev (Vite frontends)
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevCors", policy =>
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
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevCors");
}

// app.UseHttpsRedirection(); // disabled for dev – Vite proxy uses HTTP

// Serve kiosk frontend from wwwroot/kiosk
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();

// SPA fallback: serve index.html for kiosk routes
app.MapFallbackToFile("index.html");

app.Run();
