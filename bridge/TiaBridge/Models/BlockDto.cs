namespace TiaBridge.Models
{
    public class BlockDto
    {
        public string Name { get; set; }
        public int Number { get; set; }
        public string BlockType { get; set; }
        public string Language { get; set; }
        public string XmlContent { get; set; }   // SimaticML XML
    }

    public class ImportRequestDto
    {
        /// <summary>Target folder path, e.g. "0030Station" or "0000Transport\0030Station"</summary>
        public string FolderPath { get; set; }
        /// <summary>SimaticML XML content of the block to import</summary>
        public string XmlContent { get; set; }
        /// <summary>Override existing block if name matches</summary>
        public bool Override { get; set; } = true;
    }

    public class ImportResultDto
    {
        public bool Success { get; set; }
        public string BlockName { get; set; }
        public string Error { get; set; }
    }
}
