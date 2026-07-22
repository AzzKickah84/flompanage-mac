using Flompanage.Mac.Server.Services;

var builder = WebApplication.CreateBuilder(args);
LocalServerHost.ConfigureBuilder(builder);
var app = builder.Build();
LocalServerHost.ConfigureApp(app);

var portFile = Path.Combine(LocalServerHost.GetConfigDir(), "server-port.txt");
Directory.CreateDirectory(LocalServerHost.GetConfigDir());
await File.WriteAllTextAsync(portFile, LocalServerHost.KestrelUrl);

Console.WriteLine($"READY {LocalServerHost.KestrelUrl}");
await app.RunAsync();
