#if MACCATALYST
using Foundation;
using UserNotifications;
#endif

namespace Flompanage.Mac.Services;

internal static class MacNotificationService
{
    private static bool _requested;

    internal static async Task EnsurePermissionAsync()
    {
#if MACCATALYST
        if (_requested) return;
        _requested = true;

        var center = UNUserNotificationCenter.Current;
        var (granted, _) = await center.RequestAuthorizationAsync(UNAuthorizationOptions.Alert | UNAuthorizationOptions.Sound);
        _ = granted;
#else
        await Task.CompletedTask;
#endif
    }

    internal static void Show(string title, string message)
    {
#if MACCATALYST
        var content = new UNMutableNotificationContent
        {
            Title = title,
            Body = message,
        };

        var request = UNNotificationRequest.FromIdentifier(
            Guid.NewGuid().ToString("N"),
            content,
            trigger: null);

        UNUserNotificationCenter.Current.AddNotificationRequest(request, null);
#endif
    }
}
