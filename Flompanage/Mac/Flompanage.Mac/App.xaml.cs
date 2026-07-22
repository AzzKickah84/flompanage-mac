using Flompanage.Mac.Services;

namespace Flompanage.Mac;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
        MainPage = new MainPage();
    }

    protected override async void OnStart()
    {
        base.OnStart();
        try
        {
            await MacServerLauncher.StartAsync();
        }
        catch (Exception ex)
        {
            await Current!.MainPage!.DisplayAlert(
                "Flompanage — Opstartfout",
                $"Kan de lokale server niet starten: {ex.Message}",
                "OK");
        }
    }

    protected override void OnSleep()
    {
        base.OnSleep();
        MacServerLauncher.Stop();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = base.CreateWindow(activationState);
        window.Title = "Flompanage";
        window.Width = 1360;
        window.Height = 900;
        window.MinimumWidth = 960;
        window.MinimumHeight = 640;
        return window;
    }
}
