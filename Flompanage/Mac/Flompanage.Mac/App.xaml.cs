using Flompanage.Mac.Services;

namespace Flompanage.Mac;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
        LocalServerHost.Start();
        MainPage = new MainPage();
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
