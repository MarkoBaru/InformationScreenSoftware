using Microsoft.EntityFrameworkCore;
using InformationScreen.Api.Models;

namespace InformationScreen.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Screen> Screens => Set<Screen>();
    public DbSet<Tile> Tiles => Set<Tile>();
    public DbSet<ScreenTile> ScreenTiles => Set<ScreenTile>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<AppUser> Users => Set<AppUser>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Screen>(e =>
        {
            e.HasKey(s => s.Id);
            e.HasIndex(s => s.Slug).IsUnique();
            e.Property(s => s.Name).IsRequired().HasMaxLength(200);
            e.Property(s => s.Slug).IsRequired().HasMaxLength(200);
        });

        modelBuilder.Entity<Tile>(e =>
        {
            e.HasKey(t => t.Id);
            e.Property(t => t.Title).IsRequired().HasMaxLength(200);
            e.Property(t => t.LinkUrl).IsRequired().HasMaxLength(2000);
            e.HasOne(t => t.Category)
             .WithMany(c => c.Tiles)
             .HasForeignKey(t => t.CategoryId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ScreenTile>(e =>
        {
            e.HasKey(st => new { st.ScreenId, st.TileId });
            e.HasOne(st => st.Screen)
             .WithMany(s => s.ScreenTiles)
             .HasForeignKey(st => st.ScreenId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(st => st.Tile)
             .WithMany(t => t.ScreenTiles)
             .HasForeignKey(st => st.TileId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Category>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.Name).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<MediaAsset>(e =>
        {
            e.HasKey(m => m.Id);
            e.Property(m => m.FileName).IsRequired().HasMaxLength(500);
            e.Property(m => m.FilePath).IsRequired().HasMaxLength(1000);
            e.Property(m => m.MimeType).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<AppUser>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Username).IsUnique();
            e.Property(u => u.Username).IsRequired().HasMaxLength(100);
            e.Property(u => u.PasswordHash).IsRequired();
            e.Property(u => u.DisplayName).IsRequired().HasMaxLength(200);
        });
    }
}
