# TIA Copilot Bridge

REST gateway connecting TIA Copilot (React app) to live TIA Portal V20 via Openness API.

## Prerequisites

### 1. TIA Portal V20 installed
DLLs expected at:
```
C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20\
  Siemens.Engineering.dll
  Siemens.Engineering.Compiler.dll
  Siemens.Engineering.ExportImport.dll
```
Set env var `SIEMENS_TIA_PATH` to this folder, or edit the HintPath in `.csproj`.

### 2. Add DLL references in Visual Studio
1. Open `TiaBridge.sln` in Visual Studio 2022
2. Right-click `TiaBridge` project → **Add Reference** → **Browse**
3. Navigate to `C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20\`
4. Select `Siemens.Engineering.dll`, `Siemens.Engineering.Compiler.dll`, `Siemens.Engineering.ExportImport.dll`
5. Click Add

### 3. Add user to "Siemens TIA Openness" Windows group (one-time, admin required)
```
lusrmgr.msc → Groups → Siemens TIA Openness → Add your Windows username
```
Or via command line (admin):
```
net localgroup "Siemens TIA Openness" %USERNAME% /add
```
Log out and back in for group membership to take effect.

### 4. Register URL for HTTP listener (one-time, admin required)
```
netsh http add urlacl url=http://localhost:5001/ user=Everyone
```

## Build

```
# In Visual Studio:
Build → Build Solution (Release | x64)

# Output:
bridge\TiaBridge\bin\Release\TiaBridge.exe
```

## Run

1. Start TIA Portal V20 and open your project
2. Double-click `TiaBridge.exe`
3. Bridge auto-connects and prints project name
4. Start TIA Copilot React app → enable **LIVE MODE**

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/status` | Connection status + project name |
| POST | `/connect` | Connect to running TIA instance |
| GET | `/project/tree` | Full block/device tree as JSON |
| GET | `/blocks/export/{name}` | Export named block as SimaticML XML |
| POST | `/blocks/import` | Import XML block into folder |
| POST | `/blocks/compile` | Compile PLC, return errors/warnings |

## Test (with TIA open)

```bash
curl http://localhost:5001/status
curl http://localhost:5001/project/tree
curl http://localhost:5001/blocks/export/0010Main
curl -X POST http://localhost:5001/blocks/compile -H "Content-Type: application/json" -d "{}"
```

## Troubleshoot

| Problem | Fix |
|---------|-----|
| "Access denied on http://localhost:5001/" | Run `netsh http add urlacl` command above |
| "No TIA Portal instance running" | Start TIA Portal V20 first |
| "No project is open" | Open a project in TIA Portal |
| DLL not found | Check References in Visual Studio, verify HintPath |
| "Not in Siemens TIA Openness group" | Add user to group, log out/in |
