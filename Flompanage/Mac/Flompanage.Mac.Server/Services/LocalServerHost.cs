using System.Text.Json;

namespace Flompanage.Mac.Server.Services;

internal sealed class LoginSettings
{
    public string Url { get; set; } = LocalServerHost.DefaultServerUrl;
    public string Login { get; set; } = "";
}

internal static class LocalServerHost
{
    public const string DefaultServerUrl = "https://www.flompert.nl";

    private static string _targetUrl = DefaultServerUrl;
    private static string _kestrelUrl = "http://localhost:17891";

    private static string ConfigDir =>
        Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Library",
            "Application Support",
            "Flompanage");

    private static string ConfigPath => Path.Combine(ConfigDir, "target-url.txt");
    private static string SettingsPath => Path.Combine(ConfigDir, "login-settings.json");

    internal static string GetConfigDir() => ConfigDir;
    internal static string KestrelUrl => _kestrelUrl;

    internal static LoginSettings LoadSettingsForAbout() => LoadSettings();

    internal static IHost BuildHost()
    {
        _targetUrl = LoadSettings().Url;
        _kestrelUrl = $"http://localhost:{GetStablePort()}";
        ShellRuntime.LocalServerUrl = _kestrelUrl;

        return Host.CreateDefaultBuilder()
            .ConfigureWebHostDefaults(web =>
            {
                web.UseUrls(_kestrelUrl);
                web.Configure(app =>
                {
                    app.UseDefaultFiles();
                    app.UseStaticFiles(new StaticFileOptions
                    {
                        FileProvider = new PhysicalFileProvider(
                            Path.Combine(AppContext.BaseDirectory, "wwwroot")),
                        ServeUnknownFileTypes = true,
                        DefaultContentType = "application/octet-stream",
                        OnPrepareResponse = ctx =>
                        {
                            ctx.Context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
                            ctx.Context.Response.Headers.Pragma = "no-cache";
                            ctx.Context.Response.Headers.Expires = "0";
                        },
                    });

                    app.Use(HandleLocalApiAsync);
                    app.Run(ProxyRequestAsync);
                });
            })
            .Build();
    }

    private static async Task HandleLocalApiAsync(HttpContext context, RequestDelegate next)
    {
        var path = context.Request.Path.Value ?? "";

        if (path == "/api/flompanage/config")
        {
            if (context.Request.Method == "GET")
            {
                var s = LoadSettings();
                await WriteJsonAsync(context, new
                {
                    url = s.Url,
                    login = s.Login,
                    version = ShellRuntime.GetClientVersion(),
                });
                return;
            }

            if (context.Request.Method == "POST")
            {
                try
                {
                    using var reader = new StreamReader(context.Request.Body);
                    var body = await reader.ReadToEndAsync();
                    var json = JsonDocument.Parse(body);
                    var s = LoadSettings();

                    if (json.RootElement.TryGetProperty("url", out var urlEl))
                    {
                        var url = urlEl.GetString();
                        if (!string.IsNullOrEmpty(url))
                            s.Url = url.TrimEnd('/');
                    }

                    if (json.RootElement.TryGetProperty("login", out var loginEl))
                        s.Login = loginEl.GetString() ?? "";

                    SaveSettings(s);
                    await WriteJsonAsync(context, new
                    {
                        ok = true,
                        url = s.Url,
                        login = s.Login,
                        version = ShellRuntime.GetClientVersion(),
                    });
                    return;
                }
                catch
                {
                    context.Response.StatusCode = 400;
                    return;
                }
            }
        }

        if (path == "/api/flompanage/about" && context.Request.Method == "GET")
        {
            context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
            await WriteJsonAsync(context, ShellRuntime.BuildAboutPayload());
            return;
        }

        if (path == "/api/flompanage/update" && context.Request.Method == "GET")
        {
            try
            {
                var update = await AppUpdateService.FetchLatestAsync();
                context.Response.ContentType = "application/json";
                if (update == null)
                {
                    context.Response.StatusCode = 204;
                    return;
                }

                context.Response.StatusCode = 200;
                await context.Response.WriteAsync(AppUpdateService.Serialize(update));
                return;
            }
            catch
            {
                context.Response.StatusCode = 502;
                return;
            }
        }

        await next(context);
    }

    private static async Task ProxyRequestAsync(HttpContext context)
    {
        var request = context.Request;
        var path = request.Path.Value ?? "";
        var isMedia = path.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/api/media/", StringComparison.OrdinalIgnoreCase);

        var timeout = isMedia ? TimeSpan.FromMinutes(30) : TimeSpan.FromSeconds(60);
        using var httpClient = new HttpClient(new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (_, _, _, _) => true,
        })
        {
            Timeout = timeout,
        };

        var targetUrl = $"{_targetUrl}{path}{request.QueryString}";
        var proxyRequest = new HttpRequestMessage(new HttpMethod(request.Method), targetUrl);

        foreach (var header in request.Headers)
        {
            if (header.Key.Equals("Host", StringComparison.OrdinalIgnoreCase)) continue;
            proxyRequest.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
        }

        proxyRequest.Headers.Remove("User-Agent");
        proxyRequest.Headers.TryAddWithoutValidation("User-Agent", $"Flompanage-Mac/{ShellRuntime.GetClientVersion()}");
        proxyRequest.Headers.TryAddWithoutValidation("X-Flompanage", "1");

        if (request.Method is not "GET" and not "HEAD" and not "DELETE")
        {
            using var reader = new StreamReader(request.Body);
            var body = await reader.ReadToEndAsync();
            if (!string.IsNullOrEmpty(body))
            {
                proxyRequest.Content = new StringContent(
                    body,
                    System.Text.Encoding.UTF8,
                    request.ContentType ?? "application/json");
            }
        }

        try
        {
            var response = await httpClient.SendAsync(proxyRequest, HttpCompletionOption.ResponseHeadersRead);
            context.Response.StatusCode = (int)response.StatusCode;

            foreach (var header in response.Headers)
                context.Response.Headers[header.Key] = header.Value.ToArray();
            foreach (var header in response.Content.Headers)
                context.Response.Headers[header.Key] = header.Value.ToArray();

            context.Response.Headers.Remove("transfer-encoding");
            await response.Content.CopyToAsync(context.Response.Body);
        }
        catch
        {
            context.Response.StatusCode = 502;
            context.Response.ContentType = "application/json";
            var errJson =
                $"{{\"error\":\"Kan geen verbinding maken met de server ({_targetUrl}). Zorg dat Flompert.TV draait.\"}}";
            await context.Response.WriteAsync(errJson);
        }
    }

    private static async Task WriteJsonAsync(HttpContext context, object payload)
    {
        context.Response.StatusCode = 200;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(JsonSerializer.Serialize(payload));
    }

    private static LoginSettings LoadSettings()
    {
        LoginSettings? loaded = null;

        try
        {
            if (File.Exists(SettingsPath))
            {
                var json = File.ReadAllText(SettingsPath);
                loaded = JsonSerializer.Deserialize<LoginSettings>(json);
            }
        }
        catch { }

        if (loaded == null || string.IsNullOrWhiteSpace(loaded.Url))
        {
            loaded = new LoginSettings();
            try
            {
                if (File.Exists(ConfigPath))
                {
                    var url = File.ReadAllText(ConfigPath).Trim();
                    if (!string.IsNullOrEmpty(url) &&
                        (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                         url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)))
                    {
                        loaded.Url = url.TrimEnd('/');
                    }
                }
            }
            catch { }
        }

        var normalized = NormalizeServerUrl(loaded.Url);
        if (normalized != loaded.Url.TrimEnd('/'))
        {
            loaded.Url = normalized;
            SaveSettings(loaded);
        }

        return loaded;
    }

    private static void SaveSettings(LoginSettings settings)
    {
        try
        {
            Directory.CreateDirectory(ConfigDir);
            settings.Url = settings.Url.TrimEnd('/');
            var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(SettingsPath, json);
            File.WriteAllText(ConfigPath, settings.Url);
            _targetUrl = settings.Url;
        }
        catch { }
    }

    private static string NormalizeServerUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return DefaultServerUrl;
        var lower = url.Trim().ToLowerInvariant();
        if (lower.Contains("localhost") || lower.Contains("127.0.0.1")) return DefaultServerUrl;
        return url.Trim().TrimEnd('/');
    }

    private static int GetStablePort()
    {
        const int preferred = 17891;
        if (!IsPortInUse(preferred)) return preferred;
        for (var port = 17892; port <= 17899; port++)
            if (!IsPortInUse(port)) return port;
        return FindFreePort();
    }

    private static bool IsPortInUse(int port)
    {
        try
        {
            var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, port);
            listener.Start();
            listener.Stop();
            return false;
        }
        catch
        {
            return true;
        }
    }

    private static int FindFreePort()
    {
        var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
        listener.Start();
        var port = ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}
