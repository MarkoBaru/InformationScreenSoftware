namespace InformationScreen.Kiosk;

static class Program
{
    [STAThread]
    static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();

        // Default URL — can be overridden via command line: KioskShell.exe "http://localhost:5173/kiosk/ma7-og1"
        var url = "http://localhost:5173/kiosk/";
        if (args.Length > 0 && Uri.TryCreate(args[0], UriKind.Absolute, out _))
        {
            url = args[0];
        }

        Application.Run(new KioskForm(url));
    }
}