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

        var version = ShellRuntime.GetClientVersion();
        var url = $"{LocalServerHost.KestrelUrl.TrimEnd('/')}/?shell={Uri.EscapeDataString(version)}";
        AppWebView.Source = url;
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
        ShellRuntime.WebViewVersion = "WKWebView (macOS)";

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
        catch
        {
            // Bridge injection failed — notifications and external links fall back to browser APIs.
        }
    }

    private void HandleBridgeAction(string url)
    {
        try
        {
            var payload = url[ActionScheme.Length..];
            if (payload.StartsWith("message/", StringComparison.OrdinalIgnoreCase))
            {
                var encoded = payload["message/".Length..];
                var json = Uri.UnescapeDataString(encoded);

                if (WebMessageParser.TryParseOpenUrl(json, out var openUrl))
                {
                    _ = Launcher.OpenAsync(openUrl);
                    return;
                }

                if (WebMessageParser.TryParseNotify(json, out var title, out var message))
                {
                    MacNotificationService.Show(title, message);
                }
            }
        }
        catch
        {
            // Ignore malformed bridge messages.
        }
    }
}
