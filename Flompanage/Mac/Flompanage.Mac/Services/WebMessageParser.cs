using System.Text.Json;

namespace Flompanage.Mac.Services;

internal static class WebMessageParser
{
    internal static bool TryParseOpenUrl(string webMessage, out string url)
    {
        url = "";
        try
        {
            using var doc = JsonDocument.Parse(webMessage);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.String)
            {
                var inner = root.GetString();
                if (string.IsNullOrWhiteSpace(inner)) return false;
                using var innerDoc = JsonDocument.Parse(inner);
                return TryReadOpenUrl(innerDoc.RootElement, out url);
            }

            return TryReadOpenUrl(root, out url);
        }
        catch
        {
            return false;
        }
    }

    internal static bool TryParseNotify(string webMessage, out string title, out string message)
    {
        title = "Flompanage";
        message = "";
        try
        {
            using var doc = JsonDocument.Parse(webMessage);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.String)
            {
                var inner = root.GetString();
                if (string.IsNullOrWhiteSpace(inner)) return false;
                using var innerDoc = JsonDocument.Parse(inner);
                return TryReadNotify(innerDoc.RootElement, out title, out message);
            }

            return TryReadNotify(root, out title, out message);
        }
        catch
        {
            return false;
        }
    }

    private static bool TryReadOpenUrl(JsonElement root, out string url)
    {
        url = "";
        if (!root.TryGetProperty("type", out var typeEl) || typeEl.GetString() != "openUrl")
            return false;
        if (!root.TryGetProperty("url", out var urlEl))
            return false;

        url = urlEl.GetString() ?? "";
        return url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || url.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
    }

    private static bool TryReadNotify(JsonElement root, out string title, out string message)
    {
        title = "Flompanage";
        message = "";
        if (!root.TryGetProperty("type", out var typeEl) || typeEl.GetString() != "notify")
            return false;
        if (!root.TryGetProperty("message", out var messageEl))
            return false;

        message = messageEl.GetString() ?? "";
        if (string.IsNullOrWhiteSpace(message)) return false;

        if (root.TryGetProperty("title", out var titleEl))
            title = titleEl.GetString() ?? "Flompanage";

        return true;
    }
}
