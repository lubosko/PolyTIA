# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TIA Copilot V20 — a Claude-powered engineering assistant for Siemens TIA Portal V20. Generates and analyzes PLC code (SCL, FBD, S7-GRAPH) following the Schaeffler factory automation standard. Two components: a React web app and a C# REST bridge to TIA Portal.

## Commands

### React App (Vite + React)
```bash
npm install          # first time
npm run dev          # dev server → http://localhost:5173
npm run build        # production build → dist/
```

### Standalone Electron Build (Windows only)
```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:win     # produces D:\TiaCopilotDist\win-unpacked\ + NSIS installer
```
Requires Windows Developer Mode ON (Settings → For Developers).

### C# TIA Bridge
Open `bridge/TiaBridge.sln` in Visual Studio 2022. Build → Release → x64.
Prerequisites before first build: add `Siemens.Engineering.dll` + `Siemens.Engineering.Hmi.dll` via Project → Add Reference → Assembly Reference → Browse → `C:\Program Files\Siemens\Automation\Portal V20\PublicAPI\V20\`.

Run bridge (one-time admin setup):
```
net localgroup "Siemens TIA Openness" %USERNAME% /add   # then log out/in
netsh http add urlacl url=http://localhost:5001/ user=Everyone
```

## Architecture

### React App (`src/`)

**State lives in `App.jsx`**: `messages[]`, `skills[]`, `outputFiles[]`, `activeLanguage`, `eplanData`, `bridgeConnected`. All child components receive state via props.

**Three-panel layout**: `SkillsPanel` (left) | `ChatPanel` (center) | `OutputPanel` (right).

**Skill System** — the core concept. Skills are `.md` files in `src/skills/` loaded at build time via Vite's `import.meta.glob(..., { query: '?raw', eager: true })`. Each skill has YAML frontmatter (`skill_id`, `skill_category`, etc.) parsed by `skillManager.js`. Active skills are concatenated into the Claude system prompt on every API call via `buildSystemPrompt()`.

Skill categories and behaviour:
- `core/` — always injected, cannot toggle
- `standards/`, `generators/`, `analyzers/` — user-toggleable; custom `.md`/`.pdf`/`.txt` uploads go here
- `custom/` — user uploads, persisted to `localStorage`

**Adding a new built-in skill**: create a `.md` file in the appropriate `src/skills/<category>/` folder with YAML frontmatter. Vite glob picks it up automatically on next build.

**Claude output → files**: `outputParser.js::parseOutputFiles()` scans Claude's response for fenced code blocks with language tags `scl`, `xml`, `fbd`, `graph`. The first line of each block must be `// FILE: filename.ext` or `<!-- FILE: filename.xml -->` — this becomes the file name shown in OutputPanel.

**Streaming**: `claudeApi.js` uses Anthropic SDK `.stream()` with `dangerouslyAllowBrowser: true`. Deltas update `messages` state via `streamAccumRef` (ref used to accumulate without stale closure issues).

**Eplan import flow**: `eplanParser.js::parseEplanXml()` tries 4 Eplan XML schema variants, normalises German E/A addresses to I/Q, groups by DI/DO/AI/AO. Parsed context is appended to every subsequent user message sent to Claude.

**TIA Bridge connection**: `bridgeApi.js` fetches `http://localhost:5001`. `TopBar.jsx` manages Live Mode toggle + 10s polling. `BridgeSetupModal.jsx` shows 7-step setup guide.

### C# Bridge (`bridge/TiaBridge/`)

Single-threaded `HttpListener` loop in `Program.cs`. All requests dispatched by `Routes.cs` to static handler classes. `TiaService.cs` is a singleton wrapping `Siemens.Engineering` — connects once per process lifetime, blocks on `TiaPortal.GetProcesses()[0].Attach()` until user clicks Allow in TIA Portal's security dialog.

**Adding a new endpoint**: add a method to an existing handler or create a new handler in `Handlers/`, add DTO in `Models/`, add route match in `Routes.Dispatch()`.

Bridge DLLs (`Siemens.Engineering.dll`) are referenced with `<Private>true</Private>` so they copy to output — required because they are not in the GAC. `Program` static constructor also registers `AssemblyResolve` fallback pointing to `PublicAPI\V20\`.

### Electron (`electron/`)

`electron/package.json` sets `"type": "commonjs"` so `require()` works while root package is ESM. `main.js` loads `dist/index.html` in production or proxies `http://localhost:5173` in dev. IPC handler `bridge:check` pings `localhost:5001/status` from the main process (avoids CORS in packaged app).

## Skill File Format

Every skill `.md` must start with:
```
---
skill_id: unique_snake_case_id
skill_name: Human Readable Name
skill_version: 1.0
skill_category: core|standards|generators|analyzers|custom
applies_to: [all]
tia_version: V20
---
```
Sections Claude uses: `## Purpose`, `## Rules` (numbered), `## Templates` (code blocks), `## Validation Checklist`, `## Examples`, `## Forbidden Actions`.

## Key Domain Rules (Schaeffler Standard)

These rules are encoded in skills but critical to understand when modifying generation logic:
- Station folders: `XXXXStation` (4-digit prefix, e.g. `0010Station`)
- **ProDiag FB number = station number as integer** (0010 → FB10) — never auto-assign
- **DbParameter DB number = 10000 + station integer** (0010 → DB10010)
- `typeStation` / `typeTransport` UDTs are library-locked — never modify structure
- Static vars: `stat` prefix; temp vars: `temp` prefix; no `%I/%Q/%M` inside FB/FC
- Fault classes: Class1 (stops outputs) through Class6 (popup only)

## Output Directory

Standalone build output: `D:\TiaCopilotDist\`
Bridge debug build: `bridge\TiaBridge\bin\Debug\TiaBridge.exe`
