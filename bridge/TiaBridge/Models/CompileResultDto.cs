using System.Collections.Generic;

namespace TiaBridge.Models
{
    public class CompileResultDto
    {
        public bool Success { get; set; }
        public int ErrorCount { get; set; }
        public int WarningCount { get; set; }
        public List<CompileMessageDto> Messages { get; set; } = new List<CompileMessageDto>();
    }

    public class CompileMessageDto
    {
        public string Severity { get; set; }   // "Error", "Warning", "Info"
        public string Path { get; set; }        // block/network path
        public string Message { get; set; }
        public int Line { get; set; }
    }
}
