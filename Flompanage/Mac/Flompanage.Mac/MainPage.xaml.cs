using Flompanage.Mac.Services;

namespace Flompanage.Mac;

public partial class MainPage : ContentPage
{
    private const string ActionScheme = "flompanage-action://";
    private bool _bridgeInjected;

    public MainPage()
    {
        InitializeComponent();
        Loaded += OnLoaded;
    }

    private async void OnLoaded(object? sender, EventArgs e)
    {
        await MacNotificationService.EnsurePermissionAsync();

        if (string.IsNullOrEmpty(MacServerLauncher.BaseUrl))
        {
            try
            {
                await MacServerLauncher.StartAsync();
            }
            catch (Exception ex)
            {
                await DisplayAlert("Flompanage", ex.Message, "OK");
                return;
            }
        }

        var version = GetUiVersion();
        AppWebView.Source = $"{MacServerLauncher.BaseUrl.TrimEnd('/')}/?shell={Uri.EscapeDataString(version)}";
    }

    private void OnWebViewNavigating(object? sender, WebNavigatingEventArgs e)
    {
        if (!e.Url.StartsWith(ActionScheme, StringComparison.OrdinalIgnoreCase))
            return;

        e.Cancel = true;
        HandleBridgeAction(e.Url);
    }

    private async void OnWebViewNavigated(object? sender, WebNavigatedEventArgs e)
    {
        if (_bridgeInjected || e.Result != WebNavigationResult.Success)
            return;

        _bridgeInjected = true;

        const string script = """
            (function () {
              if (window.flompanageMac) return;
              window.flompanageMac = {
                postMessage: function (msg) {
                  var payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
                  window.location.href = 'flompanage-action://message/' + encodeURIComponent(payload);
                }
              };
            })();
            """;

        try
        {
            await AppWebView.EvaluateJavaScriptAsync(script);
        }
        catch { }
    }

    private void HandleBridgeAction(string url)
    {
        try
        {
            var payload = url[ActionScheme.Length..];
            if (!payload.StartsWith("message/", StringComparison.OrdinalIgnoreCase))
                return;

            var encoded = payload["message/".Length..];
            var json = Uri.UnescapeDataString(encoded);

            if (WebMessageParser.TryParseOpenUrl(json, out var openUrl))
            {
                _ = Launcher.OpenAsync(openUrl);
                return;
            }

            if (WebMessageParser.TryParseNotify(json, out var title, out var message))
                MacNotificationService.Show(title, message);
        }
        catch { }
    }

    private static string GetUiVersion()
    {
        try
        {
            var version = typeof(MauiProgram).Assembly.GetName().Version;
            if (version != null)
                return $"{version.Major}.{version.Minor}.{version.Build}";
        }
        catch { }

        return "1.0.0";
    }
}
