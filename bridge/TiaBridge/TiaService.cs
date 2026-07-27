using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using TiaBridge.Models;

// Siemens.Engineering references — requires TIA Portal V20 installed
// DLL path: C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20\
// V20 ships only: Siemens.Engineering.dll + Siemens.Engineering.Hmi.dll
// Compiler and ExportImport are included in main assembly.
using Siemens.Engineering;
using Siemens.Engineering.HW;
using Siemens.Engineering.HW.Features;
using Siemens.Engineering.SW;
using Siemens.Engineering.SW.Blocks;
using Siemens.Engineering.Compiler;

namespace TiaBridge
{
    /// <summary>
    /// Singleton wrapper around TIA Portal Openness API.
    /// Connects to the first running TIA Portal V20 instance.
    /// </summary>
    public class TiaService
    {
        private static TiaService _instance;
        private static readonly object _lock = new object();

        private TiaPortal _tiaPortal;
        private Project _project;

        private TiaService() { }

        public static TiaService Instance
        {
            get
            {
                if (_instance == null)
                    lock (_lock)
                        if (_instance == null)
                            _instance = new TiaService();
                return _instance;
            }
        }

        public bool IsConnected => _tiaPortal != null && _project != null;
        public string ProjectName => _project?.Name ?? "";
        public string ProjectPath => _project?.Path.ToString() ?? "";

        // ── Connection ────────────────────────────────────────────────────

        public void Connect()
        {
            // Attach to running TIA Portal instance (no UI mode)
            var processes = TiaPortal.GetProcesses();
            if (processes.Count == 0)
                throw new InvalidOperationException("No TIA Portal V20 instance running. Start TIA Portal and open a project.");

            _tiaPortal = processes[0].Attach();

            if (_tiaPortal.Projects.Count == 0)
                throw new InvalidOperationException("TIA Portal is running but no project is open.");

            _project = _tiaPortal.Projects[0];
            Console.WriteLine($"[TiaBridge] Connected to project: {_project.Name}");
        }

        public void Disconnect()
        {
            _tiaPortal?.Dispose();
            _tiaPortal = null;
            _project = null;
        }

        // ── Project Tree ──────────────────────────────────────────────────

        public ProjectTreeDto GetProjectTree()
        {
            EnsureConnected();
            var dto = new ProjectTreeDto
            {
                ProjectName = _project.Name,
                ProjectPath = _project.Path.ToString(),
            };

            foreach (Device device in _project.Devices)
            {
                var devDto = new DeviceDto
                {
                    Name = device.Name,
                    TypeIdentifier = device.TypeIdentifier ?? "",
                };

                foreach (DeviceItem item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw == null) continue;

                    var plcDto = new PlcDto { Name = item.Name };
                    plcDto.Groups.Add(ReadBlockGroup(sw.BlockGroup));
                    devDto.PlcList.Add(plcDto);
                }

                dto.Devices.Add(devDto);
            }

            return dto;
        }

        private BlockGroupDto ReadBlockGroup(PlcBlockGroup group)
        {
            var dto = new BlockGroupDto { Name = group.Name };

            foreach (PlcBlock block in group.Blocks)
            {
                dto.Blocks.Add(new BlockInfoDto
                {
                    Name = block.Name,
                    Number = block.Number,
                    BlockType = block.GetType().Name.Replace("Plc", ""),
                    Language = block.ProgrammingLanguage.ToString(),
                    IsConsistent = block.IsConsistent,
                });
            }

            foreach (PlcBlockUserGroup sub in group.Groups)
                dto.SubGroups.Add(ReadBlockGroup(sub));

            return dto;
        }

        // ── Block Export ──────────────────────────────────────────────────

        public BlockDto ExportBlock(string blockName)
        {
            EnsureConnected();

            var block = FindBlock(blockName)
                ?? throw new KeyNotFoundException($"Block '{blockName}' not found in project.");

            var tempFile = Path.Combine(Path.GetTempPath(), $"TiaBridge_{blockName}_{Guid.NewGuid():N}.xml");
            try
            {
                block.Export(new FileInfo(tempFile), ExportOptions.WithDefaults);
                return new BlockDto
                {
                    Name = block.Name,
                    Number = block.Number,
                    BlockType = block.GetType().Name.Replace("Plc", ""),
                    Language = block.ProgrammingLanguage.ToString(),
                    XmlContent = File.ReadAllText(tempFile),
                };
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
            }
        }

        // ── Block Import ──────────────────────────────────────────────────

        public ImportResultDto ImportBlock(ImportRequestDto request)
        {
            EnsureConnected();

            var tempFile = Path.Combine(Path.GetTempPath(), $"TiaBridge_import_{Guid.NewGuid():N}.xml");
            try
            {
                File.WriteAllText(tempFile, request.XmlContent);

                var group = FindOrCreateGroup(request.FolderPath);
                var opts = request.Override ? ImportOptions.Override : ImportOptions.None;
                var imported = group.Blocks.Import(new FileInfo(tempFile), opts);

                var blockName = imported?.FirstOrDefault()?.Name ?? "unknown";
                Console.WriteLine($"[TiaBridge] Imported block '{blockName}' into '{request.FolderPath}'");

                return new ImportResultDto { Success = true, BlockName = blockName };
            }
            catch (Exception ex)
            {
                return new ImportResultDto { Success = false, Error = ex.Message };
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
            }
        }

        // ── Compile ───────────────────────────────────────────────────────

        public CompileResultDto CompileDevice(string deviceName = null)
        {
            EnsureConnected();

            var result = new CompileResultDto();

            foreach (Device device in _project.Devices)
            {
                if (deviceName != null && device.Name != deviceName) continue;

                foreach (DeviceItem item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw == null) continue;

                    var compiler = sw.GetService<ICompilable>();
                    if (compiler == null) continue;

                    var compileResult = compiler.Compile();

                    foreach (var msg in compileResult.Messages)
                    {
                        var severity = msg.State.ToString();
                        result.Messages.Add(new CompileMessageDto
                        {
                            Severity = severity,
                            Path = msg.Path ?? "",
                            Message = msg.Description ?? "",
                            Line = 0,
                        });

                        if (severity == "Error")   result.ErrorCount++;
                        if (severity == "Warning") result.WarningCount++;
                    }
                }
            }

            result.Success = result.ErrorCount == 0;
            return result;
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private void EnsureConnected()
        {
            if (!IsConnected)
                throw new InvalidOperationException("Not connected to TIA Portal. Call /status first.");
        }

        private PlcBlock FindBlock(string name)
        {
            foreach (Device device in _project.Devices)
                foreach (DeviceItem item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw == null) continue;
                    var block = FindBlockInGroup(sw.BlockGroup, name);
                    if (block != null) return block;
                }
            return null;
        }

        private PlcBlock FindBlockInGroup(PlcBlockGroup group, string name)
        {
            var block = group.Blocks.FirstOrDefault(b =>
                string.Equals(b.Name, name, System.StringComparison.OrdinalIgnoreCase));
            if (block != null) return block;
            foreach (PlcBlockUserGroup sub in group.Groups)
            {
                var found = FindBlockInGroup(sub, name);
                if (found != null) return found;
            }
            return null;
        }

        private PlcBlockGroup FindOrCreateGroup(string folderPath)
        {
            // Get first PLC software
            foreach (Device device in _project.Devices)
                foreach (DeviceItem item in device.DeviceItems)
                {
                    var sw = item.GetService<SoftwareContainer>()?.Software as PlcSoftware;
                    if (sw == null) continue;

                    if (string.IsNullOrWhiteSpace(folderPath))
                        return sw.BlockGroup;

                    // Navigate / create folder chain
                    PlcBlockGroup current = sw.BlockGroup;
                    foreach (var part in folderPath.Split('\\', '/'))
                    {
                        var sub = current.Groups.FirstOrDefault(g => g.Name == part)
                                  ?? current.Groups.Create(part);
                        current = sub;
                    }
                    return current;
                }

            throw new InvalidOperationException("No PLC software found in project.");
        }
    }
}
