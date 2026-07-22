using Flompanage.Mac.Server.Services;

var host = LocalServerHost.BuildHost();
await host.StartAsync();

var portFile = Path.Combine(LocalServerHost.GetConfigDir(), "server-port.txt");
Directory.CreateDirectory(LocalServerHost.GetConfigDir());
await File.WriteAllTextAsync(portFile, LocalServerHost.KestrelUrl);

Console.WriteLine($"READY {LocalServerHost.KestrelUrl}");

var exit = new TaskCompletionSource();
Console.CancelKeyPress += (_, e) =>
{
    e.Cancel = true;
    exit.TrySetResult();
};

AppDomain.CurrentDomain.ProcessExit += (_, _) => exit.TrySetResult();
await exit.Task;

await host.StopAsync();
