using InformationScreen.Api.Models;

namespace InformationScreen.Api.DTOs;

// === Screen DTOs ===

public record ScreenDto(
    int Id,
    string Name,
    string Slug,
    DefaultContentType DefaultContentType,
    string? DefaultContentData,
    int IdleTimeoutSeconds,
    bool IsActive,
    List<TileDto> Tiles
);

public record ScreenListDto(
    int Id,
    string Name,
    string Slug,
    DefaultContentType DefaultContentType,
    int IdleTimeoutSeconds,
    bool IsActive,
    int TileCount
);

public record CreateScreenRequest(
    string Name,
    string Slug,
    DefaultContentType DefaultContentType,
    string? DefaultContentData,
    int IdleTimeoutSeconds
);

public record UpdateScreenRequest(
    string Name,
    string Slug,
    DefaultContentType DefaultContentType,
    string? DefaultContentData,
    int IdleTimeoutSeconds,
    bool IsActive
);

// === Tile DTOs ===

public record TileDto(
    int Id,
    string Title,
    string? Description,
    string? ImageUrl,
    ContentType ContentType,
    string LinkUrl,
    LinkTarget LinkTarget,
    string? ArticleBody,
    int SortOrder,
    bool IsActive,
    DateTime? ActiveFrom,
    DateTime? ActiveTo,
    int? ParentTileId,
    int? CategoryId,
    string? CategoryName
);

public record TileListDto(
    int Id,
    string Title,
    string? Description,
    string? ImageUrl,
    ContentType ContentType,
    string LinkUrl,
    LinkTarget LinkTarget,
    string? ArticleBody,
    int SortOrder,
    bool IsActive,
    DateTime? ActiveFrom,
    DateTime? ActiveTo,
    int? ParentTileId,
    int? CategoryId,
    string? CategoryName,
    List<string> AssignedScreens
);

public record CreateTileRequest(
    string Title,
    string? Description,
    string? ImageUrl,
    ContentType ContentType,
    string? LinkUrl,
    LinkTarget LinkTarget,
    string? ArticleBody,
    int SortOrder,
    DateTime? ActiveFrom,
    DateTime? ActiveTo,
    int? ParentTileId,
    int? CategoryId,
    List<int>? ScreenIds
);

public record UpdateTileRequest(
    string Title,
    string? Description,
    string? ImageUrl,
    ContentType ContentType,
    string? LinkUrl,
    LinkTarget LinkTarget,
    string? ArticleBody,
    int SortOrder,
    bool IsActive,
    DateTime? ActiveFrom,
    DateTime? ActiveTo,
    int? ParentTileId,
    int? CategoryId,
    List<int>? ScreenIds
);

// === Screen Tile Assignment ===

public record ScreenTileAssignment(
    int TileId,
    int? SortOrderOverride
);

public record UpdateScreenTilesRequest(
    List<ScreenTileAssignment> Tiles
);

// === Category DTOs ===

public record CategoryDto(
    int Id,
    string Name,
    string? IconUrl,
    int TileCount,
    int SortOrder
);

public record CreateCategoryRequest(
    string Name,
    string? IconUrl
);

public record UpdateCategoryRequest(
    string Name,
    string? IconUrl
);

public record ReorderCategoriesRequest(
    List<int> CategoryIds
);

// === Media DTOs ===

public record MediaAssetDto(
    int Id,
    string FileName,
    string Url,
    string MimeType,
    long FileSizeBytes,
    DateTime UploadedAt
);

// === Auth DTOs ===

public record LoginRequest(
    string Username,
    string Password
);

public record LoginResponse(
    string Token,
    UserDto User
);

public record UserDto(
    int Id,
    string Username,
    string DisplayName,
    UserRole Role,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string Username,
    string Password,
    string DisplayName,
    UserRole Role
);

public record UpdateUserRequest(
    string DisplayName,
    UserRole Role,
    bool IsActive,
    string? Password
);
