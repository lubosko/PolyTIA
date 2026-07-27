using System;
using System.Configuration;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;

namespace TiaBridge
{
    /// <summary>
    /// TIA Copilot Bridge — REST gateway to TIA Portal V20 Openness API.
    ///
    /// PREREQUISITES:
    ///   1. Run on Windows with TIA Portal V20 installed
    ///   2. Your user account must be in the "Siemens TIA Openness" Windows group
    ///      (add via: lusrmgr.msc → Groups → Siemens TIA Openness → Add Member)
    ///   3. Add Siemens.Engineering.dll reference in Visual Studio
    ///      (Project → Add Reference → Browse →
    ///       C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20\)
    ///   4. TIA Portal V20 must be open with a project loaded
    ///
    /// USAGE:
    ///   Start TIA Portal V20 + open project
    ///   Double-click TiaBridge.exe  (or run from Release folder)
    ///   Bridge listens on http://localhost:5001/
    ///   Start TIA Copilot React app and enable Live Mode
    /// </summary>
    internal class Program
    {
        // Fallback resolver: if CLR can't find Siemens DLLs via GAC,
        // load them directly from TIA Portal V20 PublicAPI folder.
        static readonly string TiaApiPath =
            Environment.GetEnvironmentVariable("SIEMENS_TIA_PATH")
            ?? ConfigurationManager.AppSettings["TiaApiPath"]
            ?? @"C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20";

        static Program()
        {
            AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
            {
                var name = new AssemblyName(args.Name).Name;
                if (!name.StartsWith("Siemens.Engineering")) return null;
                var path = Path.Combine(TiaApiPath, name + ".dll");
                return File.Exists(path) ? Assembly.LoadFrom(path) : null;
            };
        }

        static void Main(string[] args)
        {
            int port = int.Parse(ConfigurationManager.AppSettings["Port"] ?? "5001");
            string prefix = $"http://localhost:{port}/";

            Console.Title = "TIA Copilot Bridge";
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╔══════════════════════════════════════════╗");
            Console.WriteLine("║       TIA COPILOT BRIDGE  v1.0           ║");
            Console.WriteLine("║       TIA Portal V20 Openness Gateway    ║");
            Console.WriteLine("╚══════════════════════════════════════════╝");
            Console.ResetColor();
            Console.WriteLine();

            // Try to auto-connect on startup (non-fatal if TIA not open yet)
            try
            {
                TiaService.Instance.Connect();
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[OK] Connected to project: {TiaService.Instance.ProjectName}");
                Console.ResetColor();
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[WARN] Auto-connect failed: {ex.Message}");
                Console.WriteLine("       Start TIA Portal + open a project, then call POST /connect");
                Console.ResetColor();
            }

            // Start HTTP listener
            var listener = new HttpListener();
            listener.Prefixes.Add(prefix);

            try
            {
                listener.Start();
            }
            catch (HttpListenerException ex) when (ex.ErrorCode == 5)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[ERROR] Access denied on {prefix}");
                Console.WriteLine("        Run once as Admin to register URL:");
                Console.WriteLine($"        netsh http add urlacl url={prefix} user=Everyone");
                Console.ResetColor();
                Console.ReadKey();
                return;
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[OK] Bridge listening on {prefix}");
            Console.ResetColor();
            Console.WriteLine();
            Console.WriteLine("Endpoints:");
            Console.WriteLine("  GET  /status              TIA connection status");
            Console.WriteLine("  POST /connect             Connect to running TIA instance");
            Console.WriteLine("  GET  /project/tree        Full block tree");
            Console.WriteLine("  GET  /blocks/export/{n}   Export block as SimaticML XML");
            Console.WriteLine("  POST /blocks/import       Import XML block");
            Console.WriteLine("  POST /blocks/compile      Compile PLC");
            Console.WriteLine();
            Console.WriteLine("Press Ctrl+C to stop.");
            Console.WriteLine();

            // Request loop
            while (true)
            {
                HttpListenerContext ctx;
                try
                {
                    ctx = listener.GetContext();
                }
                catch (HttpListenerException)
                {
                    break; // listener stopped
                }

                // Handle each request on a thread pool thread
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    try { Routes.Dispatch(ctx); }
                    catch (Exception ex)
                    {
                        Console.Error.WriteLine($"[ERROR] Request dispatch: {ex.Message}");
                    }
                });
            }

            listener.Stop();
            TiaService.Instance.Disconnect();
        }
    }
}
