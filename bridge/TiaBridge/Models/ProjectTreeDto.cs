using System.Collections.Generic;

namespace TiaBridge.Models
{
    public class ProjectTreeDto
    {
        public string ProjectName { get; set; }
        public string ProjectPath { get; set; }
        public List<DeviceDto> Devices { get; set; } = new List<DeviceDto>();
    }

    public class DeviceDto
    {
        public string Name { get; set; }
        public string TypeIdentifier { get; set; }
        public List<PlcDto> PlcList { get; set; } = new List<PlcDto>();
    }

    public class PlcDto
    {
        public string Name { get; set; }
        public List<BlockGroupDto> Groups { get; set; } = new List<BlockGroupDto>();
    }

    public class BlockGroupDto
    {
        public string Name { get; set; }
        public List<BlockInfoDto> Blocks { get; set; } = new List<BlockInfoDto>();
        public List<BlockGroupDto> SubGroups { get; set; } = new List<BlockGroupDto>();
    }

    public class BlockInfoDto
    {
        public string Name { get; set; }
        public int Number { get; set; }
        public string BlockType { get; set; }   // FB, FC, OB, DB, UDT
        public string Language { get; set; }    // SCL, FBD, LAD, GRAPH
        public bool IsConsistent { get; set; }
    }
}
