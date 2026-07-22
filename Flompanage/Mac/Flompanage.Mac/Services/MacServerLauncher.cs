using System.Diagnostics;

namespace Flompanage.Mac.Services;

internal static class MacServerLauncher
{
    private static Process? _serverProcess;

    internal static string BaseUrl { get; private set; } = "";

    internal static async Task StartAsync()
    {
        if (!string.IsNullOrEmpty(BaseUrl))
            return;

        var serverExe = ResolveServerPath();
        if (!File.Exists(serverExe))
            throw new FileNotFoundException("Flompanage.Server niet gevonden", serverExe);

        var portFile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Library",
            "Application Support",
            "Flompanage",
            "server-port.txt");

        if (File.Exists(portFile))
            File.Delete(portFile);

        _serverProcess = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = serverExe,
                WorkingDirectory = Path.GetDirectoryName(serverExe) ?? AppContext.BaseDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
            },
            EnableRaisingEvents = true,
        };

        var ready = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        _serverProcess.OutputDataReceived += (_, e) =>
        {
            if (string.IsNullOrWhiteSpace(e.Data)) return;
            if (e.Data.StartsWith("READY ", StringComparison.Ordinal))
                ready.TrySetResult(e.Data["READY ".Length..].Trim());
        };

        if (!_serverProcess.Start())
            throw new InvalidOperationException("Kon Flompanage.Server niet starten");

        _serverProcess.BeginOutputReadLine();

        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        try
        {
            BaseUrl = await ready.Task.WaitAsync(timeout.Token);
        }
        catch
        {
            if (File.Exists(portFile))
                BaseUrl = (await File.ReadAllTextAsync(portFile)).Trim();
            else
                throw new TimeoutException("Flompanage.Server startte niet binnen 30 seconden");
        }
    }

    internal static void Stop()
    {
        try
        {
            if (_serverProcess is { HasExited: false })
                _serverProcess.Kill(entireProcessTree: true);
        }
        catch { }

        _serverProcess?.Dispose();
        _serverProcess = null;
    }

    private static string ResolveServerPath()
    {
        var baseDir = AppContext.BaseDirectory;
        var candidates = new[]
        {
            Path.Combine(baseDir, "Flompanage.Server"),
            Path.Combine(baseDir, "..", "Resources", "Flompanage.Server", "Flompanage.Server"),
            Path.Combine(baseDir, "..", "MacOS", "Flompanage.Server"),
        };

        foreach (var path in candidates)
        {
            var full = Path.GetFullPath(path);
            if (File.Exists(full))
                return full;
        }

        return Path.GetFullPath(candidates[0]);
    }
}
