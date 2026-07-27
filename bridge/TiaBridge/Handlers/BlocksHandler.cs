using System.IO;
using System.Net;
using Newtonsoft.Json;
using TiaBridge.Models;

namespace TiaBridge.Handlers
{
    public static class BlocksHandler
    {
        /// GET /blocks/export/{name}
        public static void HandleExport(HttpListenerResponse response, string blockName)
        {
            try
            {
                var block = TiaService.Instance.ExportBlock(blockName);
                Routes.WriteJson(response, block);
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                Routes.WriteError(response, ex.Message, HttpStatusCode.NotFound);
            }
            catch (System.Exception ex)
            {
                Routes.WriteError(response, ex.Message, HttpStatusCode.InternalServerError);
            }
        }

        /// POST /blocks/import
        public static void HandleImport(HttpListenerRequest request, HttpListenerResponse response)
        {
            try
            {
                string body;
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                    body = reader.ReadToEnd();

                var importReq = JsonConvert.DeserializeObject<ImportRequestDto>(body);
                if (importReq == null || string.IsNullOrWhiteSpace(importReq.XmlContent))
                {
                    Routes.WriteError(response, "Body must contain 'xmlContent'.", HttpStatusCode.BadRequest);
                    return;
                }

                var result = TiaService.Instance.ImportBlock(importReq);
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
