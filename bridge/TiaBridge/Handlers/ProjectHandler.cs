using System.Net;
using Newtonsoft.Json;

namespace TiaBridge.Handlers
{
    public static class ProjectHandler
    {
        /// GET /status
        public static void HandleStatus(HttpListenerResponse response)
        {
            var payload = new
            {
                connected = TiaService.Instance.IsConnected,
                projectName = TiaService.Instance.ProjectName,
                projectPath = TiaService.Instance.ProjectPath,
                version = "TiaBridge 1.0 / TIA V20",
            };
            Routes.WriteJson(response, payload);
        }

        /// POST /connect
        public static void HandleConnect(HttpListenerResponse response)
        {
            try
            {
                TiaService.Instance.Connect();
                var payload = new
                {
                    connected = true,
                    projectName = TiaService.Instance.ProjectName,
                };
                Routes.WriteJson(response, payload);
            }
            catch (System.Exception ex)
            {
                Routes.WriteError(response, ex.Message, HttpStatusCode.ServiceUnavailable);
            }
        }

        /// GET /project/tree
        public static void HandleProjectTree(HttpListenerResponse response)
        {
            try
            {
                if (!TiaService.Instance.IsConnected)
                    TiaService.Instance.Connect();

                var tree = TiaService.Instance.GetProjectTree();
                Routes.WriteJson(response, tree);
            }
            catch (System.Exception ex)
            {
                Routes.WriteError(response, ex.Message, HttpStatusCode.InternalServerError);
            }
        }
    }
}
