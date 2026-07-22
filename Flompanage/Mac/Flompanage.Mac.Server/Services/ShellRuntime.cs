using System.Diagnostics;
using System.Text.Json;

namespace Flompanage.Mac.Server.Services;

internal static class ShellRuntime
{
    internal static string LocalServerUrl { get; set; } = "";
    internal static string? WebViewVersion { get; set; }

    internal static string GetClientVersion()
    {
        try
        {
            var version = typeof(Program).Assembly.GetName().Version;
            if (version != null)
                return $"{version.Major}.{version.Minor}.{version.Build}";
        }
        catch { }

        return "1.0.0";
    }

    internal static string GetWebViewDataFolder()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Library",
            "Application Support",
            "Flompanage",
            "WebKit",
            GetClientVersion());
    }

    internal static object BuildAboutPayload()
    {
        var settings = LocalServerHost.LoadSettingsForAbout();
        var uiBuild = ReadUiBuildInfo();
        var channel = AppUpdateService.LoadChannelConfigForAbout();
        string? executablePath = null;

        try
        {
            executablePath = Environment.ProcessPath;
        }
        catch { }

        return new
        {
            appName = "Flompanage (macOS)",
            platform = "macOS",
            version = GetClientVersion(),
            uiBuildVersion = uiBuild.Version,
            uiBuiltAt = uiBuild.BuiltAt,
            uiAsset = uiBuild.JsAsset,
            installPath = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar),
            executablePath,
            configPath = LocalServerHost.GetConfigDir(),
            webViewDataPath = GetWebViewDataFolder(),
            localServerUrl = LocalServerUrl,
            targetServerUrl = settings.Url,
            dotnetVersion = Environment.Version.ToString(),
            osVersion = Environment.OSVersion.VersionString,
            webView2Version = WebViewVersion,
            updateGithubRepo = channel.GithubRepo,
            updateManifestUrl = channel.ManifestUrl,
            processId = Environment.ProcessId,
            userAgent = $"Flompanage-Mac/{GetClientVersion()}",
        };
    }

    private static (string? Version, string? BuiltAt, string? JsAsset) ReadUiBuildInfo()
    {
        string? version = null;
        string? builtAt = null;
        string? jsAsset = null;

        try
        {
            var buildPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "flompanage-build.json");
            if (File.Exists(buildPath))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(buildPath));
                var root = doc.RootElement;
                if (root.TryGetProperty("version", out var versionEl))
                    version = versionEl.GetString();
                if (root.TryGetProperty("builtAt", out var builtAtEl))
                    builtAt = builtAtEl.GetString();
                if (root.TryGetProperty("jsAsset", out var jsEl))
                    jsAsset = jsEl.GetString();
            }
        }
        catch { }

        if (string.IsNullOrWhiteSpace(jsAsset))
        {
            try
            {
                var assetsDir = Path.Combine(AppContext.BaseDirectory, "wwwroot", "assets");
                if (Directory.Exists(assetsDir))
                {
                    jsAsset = Directory
                        .EnumerateFiles(assetsDir, "index-*.js")
                        .Select(Path.GetFileName)
                        .FirstOrDefault();
                }
            }
            catch { }
        }

        return (version, builtAt, jsAsset);
    }
}
