# PolyTIA

**One prompt. Every PLC language.**

PolyTIA is a desktop assistant for **Siemens TIA Portal V20** (S7-1500). It generates and analyzes PLC code — **SCL**, **FBD** (SimaticML XML), and **S7-GRAPH** — and can connect to a running TIA Portal project through a local bridge. It is built around an editable, file-based **skill system** so engineers can extend what it knows without writing code.

> Multi-LLM: works with **Anthropic**, **OpenAI**, or a **local Ollama** model.

---

## Features

- **Code generation** — SCL / FBD / GRAPH, with per-language quick actions and a live language reference.
- **Skill system** — knowledge lives in `.md` files (core / standards / generators / analyzers / custom). Toggle skills on/off; the active ones are injected into the model prompt.
- **Project packs** — group project-specific `.md` skills, import them as a set, switch with one click, and auto-activate the pack that matches the connected TIA project.
- **Chat history** — named sessions, rename/delete, and automatic restore of your last chat (messages + output files) on startup.
- **Planning**
  - *Skill/Project `.md` author* — describe a device or standard, get a structured skill file, then save it or add it as a pack.
  - *Plan-first code generation* — review an implementation plan (blocks, DB numbers, ParentStation, steps) before any code is generated.
- **Cross-project memory** — a shareable `.md` file of lessons learned, injected into every prompt so corrections carry across projects.
- **Live TIA mode** — connect to a running TIA Portal V20 project via the C# bridge: browse the project tree, export blocks, and analyze real code. *(Autonomous block-reading tools require the Anthropic provider.)*
- **Eplan import** — turn an Eplan I/O export into TIA structure and tag tables.
- **Multi-provider settings** — manage keys and pick provider/model from an in-app Settings panel.

---

## Architecture

| Component | Stack | Role |
|-----------|-------|------|
| **App** | React + Vite, packaged with Electron | Chat UI, skill system, output panel, provider calls |
| **Bridge** (optional) | C# .NET Framework 4.8, `HttpListener` | REST gateway to TIA Portal V20 via the Openness API (`localhost:5001`) |

Two operating modes:

- **Generator mode** — produce SCL/XML/GRAPH files to copy or import manually (no TIA required).
- **Live mode** — the bridge connects to an open TIA Portal V20 project for reading/exporting blocks (Windows only).

---

## Getting started

### Web app (dev)
```bash
npm install
npm run dev        # http://localhost:5173
```

### Desktop build (Windows)
```powershell
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:win   # NSIS installer + portable .exe
```

On first run, open **⚙ Settings** and add an API key (Anthropic / OpenAI) or an Ollama endpoint, then pick a provider and model.

### TIA Bridge (optional, live mode)
Open `bridge/TiaBridge.sln` in Visual Studio 2022, add references to `Siemens.Engineering.dll` + `Siemens.Engineering.Hmi.dll` from the TIA Portal V20 PublicAPI folder, and build **Release / x64**. See [`bridge/README_BRIDGE.md`](bridge/README_BRIDGE.md) and [`docs/POLYTIA_MANUAL.md`](docs/POLYTIA_MANUAL.md) for the one-time setup and connection steps.

---

## Skill file format

Every skill `.md` starts with YAML frontmatter:

```markdown
---
skill_id: unique_snake_case_id
skill_name: Human Readable Name
skill_version: 1.0
skill_category: core|standards|generators|analyzers|custom
applies_to: [all]
tia_version: V20
---
```

Sections the model uses: `## Purpose`, `## Rules`, `## Templates`, `## Validation Checklist`, `## Examples`, `## Forbidden Actions`.

Built-in skills live in `src/skills/<category>/` and are picked up automatically at build time. Custom skills can be loaded at runtime via the Skills panel (**+ Load skill**, **+ ADD**, or **⊞ Import project pack**) and persist locally.

---

## Documentation

- [`docs/POLYTIA_MANUAL.md`](docs/POLYTIA_MANUAL.md) — full user manual (every screen and function).
- [`bridge/README_BRIDGE.md`](bridge/README_BRIDGE.md) — TIA bridge setup and endpoints.

---

## Notes

- Company/customer-restricted standards are **not** included in this repository. The app ships with a generic skill set; organisation-specific standards are loaded per machine by authorised users through the Skills panel.
- API keys are stored locally on your machine and sent only to the provider you select.

---

*PolyTIA is an independent engineering aid. Always review and compile generated code in TIA Portal before use.*
