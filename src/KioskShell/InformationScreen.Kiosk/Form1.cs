using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace InformationScreen.Kiosk;

public class KioskForm : Form
{
    private readonly WebView2 _kioskView;
    private readonly WebView2 _contentView;
    private readonly Panel _backPanel;
    private readonly Button _backButton;
    private readonly string _startUrl;

    public KioskForm(string startUrl)
    {
        _startUrl = startUrl;

        // Fullscreen kiosk window
        Text = "Information Screen";
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;
        TopMost = true;

        // Main kiosk WebView (React app)
        _kioskView = new WebView2 { Dock = DockStyle.Fill };
        Controls.Add(_kioskView);

        // Content overlay WebView (for Power BI etc. — direct navigation, no iframe)
        _contentView = new WebView2 { Dock = DockStyle.Fill, Visible = false };
        Controls.Add(_contentView);

        // Back button panel — floating at bottom center
        _backPanel = new Panel
        {
            Visible = false,
            Size = new Size(280, 56),
            BackColor = Color.FromArgb(26, 115, 232),
        };
        _backPanel.Paint += (_, e) =>
        {
            using var path = new System.Drawing.Drawing2D.GraphicsPath();
            var r = new Rectangle(0, 0, _backPanel.Width, _backPanel.Height);
            int radius = 28;
            path.AddArc(r.X, r.Y, radius * 2, radius * 2, 180, 90);
            path.AddArc(r.Right - radius * 2, r.Y, radius * 2, radius * 2, 270, 90);
            path.AddArc(r.Right - radius * 2, r.Bottom - radius * 2, radius * 2, radius * 2, 0, 90);
            path.AddArc(r.X, r.Bottom - radius * 2, radius * 2, radius * 2, 90, 90);
            path.CloseFigure();
            _backPanel.Region = new Region(path);
        };

        _backButton = new Button
        {
            Text = "\u2190  Zur\u00fcck zur \u00dcbersicht",
            Dock = DockStyle.Fill,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 12f, FontStyle.Bold),
            ForeColor = Color.White,
            BackColor = Color.FromArgb(26, 115, 232),
            Cursor = Cursors.Hand,
        };
        _backButton.FlatAppearance.BorderSize = 0;
        _backButton.Click += (_, _) => HideContent();
        _backPanel.Controls.Add(_backButton);
        Controls.Add(_backPanel);

        // Z-order: back panel on top
        _backPanel.BringToFront();

        Resize += (_, _) => PositionBackButton();
        Load += async (_, _) => await InitWebViews();
        KeyPreview = true;
        KeyDown += OnKeyDown;
    }

    private void PositionBackButton()
    {
        _backPanel.Location = new Point(
            (ClientSize.Width - _backPanel.Width) / 2,
            ClientSize.Height - _backPanel.Height - 24
        );
    }

    private async Task InitWebViews()
    {
        var env = await CoreWebView2Environment.CreateAsync(
            userDataFolder: Path.Combine(Path.GetTempPath(), "InformationScreenKiosk")
        );

        // Init kiosk view
        await _kioskView.EnsureCoreWebView2Async(env);
        ApplySettings(_kioskView.CoreWebView2.Settings);
        _kioskView.CoreWebView2.WebMessageReceived += OnKioskMessage;
        _kioskView.CoreWebView2.NewWindowRequested += (_, e) => { e.Handled = true; };
        _kioskView.CoreWebView2.Navigate(_startUrl);

        // Init content overlay view (shares same user data = same cookies/auth)
        await _contentView.EnsureCoreWebView2Async(env);
        ApplySettings(_contentView.CoreWebView2.Settings);
        _contentView.CoreWebView2.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            _contentView.CoreWebView2.Navigate(e.Uri);
        };
    }

    private static void ApplySettings(CoreWebView2Settings settings)
    {
        settings.AreDefaultContextMenusEnabled = false;
        settings.AreDevToolsEnabled = false;
        settings.IsStatusBarEnabled = false;
        settings.IsZoomControlEnabled = false;
        settings.AreBrowserAcceleratorKeysEnabled = false;
    }

    /// <summary>
    /// Receives messages from the React kiosk app.
    /// Expected format: { "action": "openContent", "url": "https://..." }
    /// </summary>
    private void OnKioskMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = e.WebMessageAsJson;
            // Simple JSON parsing without extra dependencies
            if (json.Contains("\"openContent\""))
            {
                var urlStart = json.IndexOf("\"url\"", StringComparison.Ordinal);
                if (urlStart < 0) return;
                var colonIdx = json.IndexOf(':', urlStart + 5);
                var valStart = json.IndexOf('"', colonIdx + 1) + 1;
                var valEnd = json.IndexOf('"', valStart);
                var url = json[valStart..valEnd]
                    .Replace("\\u0026", "&")
                    .Replace("\\/", "/");

                ShowContent(url);
            }
        }
        catch
        {
            // Ignore malformed messages
        }
    }

    private void ShowContent(string url)
    {
        _contentView.CoreWebView2.Navigate(url);
        _contentView.Visible = true;
        _contentView.BringToFront();
        _backPanel.Visible = true;
        _backPanel.BringToFront();
        PositionBackButton();
    }

    private void HideContent()
    {
        _contentView.Visible = false;
        _backPanel.Visible = false;
        _contentView.CoreWebView2.Navigate("about:blank");
    }

    private void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.KeyCode == Keys.F4 && e.Alt) { e.Handled = true; return; }
        if (e.KeyCode == Keys.Escape) { e.Handled = true; return; }
        if (e.Control && e.KeyCode == Keys.W) { e.Handled = true; return; }
        if (e.Control && e.KeyCode == Keys.L) { e.Handled = true; return; }
        if (e.Control && e.KeyCode == Keys.T) { e.Handled = true; return; }
        if (e.KeyCode == Keys.F11) { e.Handled = true; return; }
        if (e.KeyCode == Keys.LWin || e.KeyCode == Keys.RWin) { e.Handled = true; }
    }

    protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
    {
        if (keyData == (Keys.Alt | Keys.F4)) return true;
        if (keyData == (Keys.Alt | Keys.Tab)) return true;
        return base.ProcessCmdKey(ref msg, keyData);
    }
}
