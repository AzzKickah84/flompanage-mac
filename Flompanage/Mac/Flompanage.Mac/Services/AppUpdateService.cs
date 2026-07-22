using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Flompanage.Mac.Services;

internal sealed class UpdateChannelConfig
{
    [JsonPropertyName("githubRepo")]
    public string? GithubRepo { get; set; }

    [JsonPropertyName("manifestUrl")]
    public string? ManifestUrl { get; set; }
}

internal sealed class AppUpdateInfo
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "";

    [JsonPropertyName("downloadUrl")]
    public string DownloadUrl { get; set; } = "";

    [JsonPropertyName("releasePageUrl")]
    public string? ReleasePageUrl { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }
}

internal static class AppUpdateService
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static async Task<AppUpdateInfo?> FetchLatestAsync()
    {
        var channel = LoadChannelConfig();
        if (!string.IsNullOrWhiteSpace(channel.ManifestUrl))
            return await FetchFromManifestAsync(channel.ManifestUrl.Trim());

        if (!string.IsNullOrWhiteSpace(channel.GithubRepo))
            return await FetchFromGitHubAsync(channel.GithubRepo.Trim());

        return null;
    }

    internal static UpdateChannelConfig LoadChannelConfigForAbout() => LoadChannelConfig();

    private static UpdateChannelConfig LoadChannelConfig()
    {
        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, "update-channel.json");
            if (!File.Exists(path))
                return new UpdateChannelConfig { GithubRepo = "AzzKickah84/flompanage-mac" };

            var json = File.ReadAllText(path);
            var config = JsonSerializer.Deserialize<UpdateChannelConfig>(json);
            if (config == null)
                return new UpdateChannelConfig { GithubRepo = "AzzKickah84/flompanage-mac" };

            if (string.IsNullOrWhiteSpace(config.GithubRepo) && string.IsNullOrWhiteSpace(config.ManifestUrl))
                config.GithubRepo = "AzzKickah84/flompanage-mac";

            return config;
        }
        catch
        {
            return new UpdateChannelConfig { GithubRepo = "AzzKickah84/flompanage-mac" };
        }
    }

    private static async Task<AppUpdateInfo?> FetchFromManifestAsync(string url)
    {
        using var res = await Http.GetAsync(url);
        if (!res.IsSuccessStatusCode) return null;

        await using var stream = await res.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        var version = NormalizeVersion(GetString(root, "version"));
        var downloadUrl = GetString(root, "downloadUrl");
        if (string.IsNullOrEmpty(version) || string.IsNullOrEmpty(downloadUrl)) return null;

        return new AppUpdateInfo
        {
            Version = version,
            DownloadUrl = downloadUrl,
            ReleasePageUrl = GetString(root, "releasePageUrl"),
            Notes = GetString(root, "notes"),
        };
    }

    private static async Task<AppUpdateInfo?> FetchFromGitHubAsync(string repo)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"https://api.github.com/repos/{repo}/releases/latest");
        req.Headers.TryAddWithoutValidation("User-Agent", "Flompanage-Mac-UpdateCheck");
        req.Headers.TryAddWithoutValidation("Accept", "application/vnd.github+json");

        using var res = await Http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return null;

        await using var stream = await res.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        var version = NormalizeVersion(GetString(root, "tag_name"));
        var downloadUrl = PickInstallerAsset(root);
        if (string.IsNullOrEmpty(version) || string.IsNullOrEmpty(downloadUrl)) return null;

        return new AppUpdateInfo
        {
            Version = version,
            DownloadUrl = downloadUrl,
            ReleasePageUrl = GetString(root, "html_url"),
            Notes = GetString(root, "body"),
        };
    }

    private static string? PickInstallerAsset(JsonElement release)
    {
        if (!release.TryGetProperty("assets", out var assets) || assets.ValueKind != JsonValueKind.Array)
            return null;

        string? fallback = null;
        foreach (var asset in assets.EnumerateArray())
        {
            var name = GetString(asset, "name");
            var url = GetString(asset, "browser_download_url");
            if (string.IsNullOrEmpty(name) || string.IsNullOrEmpty(url)) continue;

            if (Regex.IsMatch(name, @"^Flompanage-Mac-[\d.]+\.dmg$", RegexOptions.IgnoreCase))
                return url;

            if (name.EndsWith(".dmg", StringComparison.OrdinalIgnoreCase))
                fallback ??= url;
        }

        return fallback;
    }

    private static string NormalizeVersion(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "" : value.Trim().TrimStart('v', 'V');

    private static string? GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    public static string Serialize(AppUpdateInfo info) => JsonSerializer.Serialize(info, JsonOptions);
}
