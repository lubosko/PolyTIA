using System;
using System.Net;
using System.Text;
using Newtonsoft.Json;
using TiaBridge.Handlers;

namespace TiaBridge
{
    public static class Routes
    {
        private static readonly string CorsOrigin =
            System.Configuration.ConfigurationManager.AppSettings["CorsOrigin"] ?? "*";

        public static void Dispatch(HttpListenerContext ctx)
        {
            var req = ctx.Request;
            var res = ctx.Response;
            var method = req.HttpMethod.ToUpperInvariant();
            var path = req.Url.AbsolutePath.TrimEnd('/').ToLowerInvariant();

            // CORS preflight
            res.AddHeader("Access-Control-Allow-Origin", CorsOrigin);
            res.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            res.AddHeader("Access-Control-Allow-Headers", "Content-Type");
            if (method == "OPTIONS") { res.StatusCode = 204; res.Close(); return; }

            Console.WriteLine($"[TiaBridge] {method} {path}");

            try
            {
                if (method == "GET" && path == "/status")
                { ProjectHandler.HandleStatus(res); return; }

                if (method == "POST" && path == "/connect")
                { ProjectHandler.HandleConnect(res); return; }

                if (method == "GET" && path == "/project/tree")
                { ProjectHandler.HandleProjectTree(res); return; }

                if (method == "GET" && path.StartsWith("/blocks/export/"))
                {
                    // Use original path — block names are case-sensitive in TIA
                    var originalPath = req.Url.AbsolutePath.TrimEnd('/');
                    var blockName = Uri.UnescapeDataString(
                        originalPath.Substring("/blocks/export/".Length));
                    BlocksHandler.HandleExport(res, blockName);
                    return;
                }

                if (method == "POST" && path == "/blocks/import")
                { BlocksHandler.HandleImport(req, res); return; }

                if (method == "POST" && path == "/blocks/compile")
                { CompileHandler.HandleCompile(req, res); return; }

                // 404
                WriteError(res, $"Unknown route: {method} {path}", HttpStatusCode.NotFound);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[TiaBridge] Unhandled: {ex}");
                WriteError(res, "Internal server error: " + ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        public static void WriteJson(HttpListenerResponse res, object data,
            HttpStatusCode status = HttpStatusCode.OK)
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented);
            var bytes = Encoding.UTF8.GetBytes(json);
            res.StatusCode = (int)status;
            res.ContentType = "application/json; charset=utf-8";
            res.ContentLength64 = bytes.Length;
            res.OutputStream.Write(bytes, 0, bytes.Length);
            res.Close();
        }

        public static void WriteError(HttpListenerResponse res, string message,
            HttpStatusCode status = HttpStatusCode.InternalServerError)
        {
            WriteJson(res, new { error = message }, status);
        }
    }
}
