using System.IO;
using System.Net;
using Newtonsoft.Json;

namespace TiaBridge.Handlers
{
    public static class CompileHandler
    {
        /// POST /blocks/compile
        public static void HandleCompile(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                string deviceName = null;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    var body = reader.ReadToEnd();
                    if (!string.IsNullOrWhiteSpace(body))
                    {
                        dynamic json = JsonConvert.DeserializeObject(body);
                        deviceName = json?.device;
                    }
                }

                var result = TiaService.Instance.CompileDevice(deviceName);
                Routes.WriteJson(response, result,
                    result.Success ? HttpStatusCode.OK : (HttpStatusCode)422);
            }
            catch (System.Exception ex)
            {
                Routes.WriteError(response, ex.Message, HttpStatusCode.InternalServerError);
            }
        }
    }
}
