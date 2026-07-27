# PolyTIA — User Manual

> **One prompt. Every PLC language.**
> Claude-powered engineering assistant for Siemens TIA Portal V20, built to the Schaeffler factory automation standard.

---

## 1. What PolyTIA Is

PolyTIA is a desktop assistant that generates and analyzes PLC program code for **TIA Portal V20** (S7-1500). It speaks the **Schaeffler standard** natively — station numbering, ProDiag rules, DB numbering, fault classes, naming conventions — so the code it produces is compliant out of the box.

Two ways to work:

| Mode | What it does | TIA running? |
|------|--------------|--------------|
| **Generator Mode** | Claude writes SCL / FBD-XML / GRAPH files → copy or import into TIA manually | No |
| **Live Mode** | Connects to a running TIA project via the TIA Bridge → read project tree, export blocks, analyze real code | Yes (Windows) |

It generates three PLC languages:
- **SCL** — Structured Control Language (source code, paste into TIA)
- **FBD** — Function Block Diagram as SimaticML XML (import into TIA)
- **GRAPH** — S7-Graph sequence descriptions (build manually from a step/transition plan)

---

## 2. Purpose

Cut the repetitive parts of Schaeffler TIA engineering:

- **Create whole stations** — all 8 blocks + 6 DBs, correctly numbered, in one prompt
- **Enforce the standard** — ProDiag FB# = station number, DbParameter DB# = 10000 + station, `stat`/`temp` prefixes, C1–C4 fault classes — applied automatically
- **Analyze existing code** — audit blocks/stations for standard violations with PASS/FAIL/WARNING + fixes
- **Import Eplan** — turn an Eplan I/O export into TIA structure and tag tables
- **Work live** — browse a running TIA project, pull real blocks, analyze them

Knowledge lives in editable **Skill files** (`.md`), so any engineer can extend what PolyTIA knows without touching code.

---

## 3. Screen Layout

```
┌────────────────────────────────────────────────────────────────┐
│  TOP BAR:  ⚙ PolyTIA V20 | GENERATOR MODE    [skills] [EPLAN]  │
│            [? BRIDGE] [⊞ TREE] [○ LIVE MODE] [● API KEY]        │
├──────────────┬─────────────────────────────┬───────────────────┤
│  SKILLS      │         CHAT                │   OUTPUT          │
│  PANEL       │   (language tabs +          │   (files +        │
│  (left)      │    conversation)            │    lang ref)      │
│              │                             │                   │
│  + Load      │   [quick actions]           │   [copy] [save]   │
│  ⬆ Draft     │   [message box]             │                   │
└──────────────┴─────────────────────────────┴───────────────────┘
```

Three panels: **Skills** (left), **Chat** (center), **Output** (right).

---

## 4. First-Time Setup

### 4.1 Set the API key (required)
1. Click **○ SET API KEY** (top right — red, pulsing until set).
2. Paste your Anthropic key (`sk-ant-api03-...`).
3. **Save** (or Enter).

Stored in browser `localStorage` only. Sent nowhere except Anthropic's API. Button turns green **● API KEY SET**.

> Key compromised? Create a new one in the Anthropic console, **revoke the old one**, then replace it here.

### 4.2 (Optional) Live Mode — connect to TIA
Requires the **TIA Bridge** (separate C# app) running against an open TIA V20 project. See §8. Click **? BRIDGE** in the top bar for the 7-step in-app setup guide.

---

## 5. Top Bar — Every Control

| Control | Function |
|---------|----------|
| **⚙ PolyTIA / V20 / GENERATOR MODE** | Product label + mode indicator |
| **N/M skills** | Active skills / total skills count |
| **⬆ IMPORT EPLAN** | Load an Eplan `.xml` I/O export as context (turns to ⚡ EPLAN LOADED) |
| **? BRIDGE** | Opens the TIA Bridge setup guide (7 steps) |
| **⊞ TREE** | *(appears only in Live Mode)* Opens the live TIA project tree browser |
| **○ LIVE MODE** | Toggle connection to the TIA Bridge. States: `○ LIVE MODE` (off) → `⟳ CONNECTING` → `● LIVE: <project>` (connected) / `✕ BRIDGE ERROR` |
| **● API KEY** | Set / change the Anthropic API key |

---

## 6. Chat Panel (center) — Core Workflow

### 6.1 Language tabs
Top of the chat: **SCL · FBD · GRAPH**. The active tab:
- Sets the target output language for generation
- Changes the **quick action** buttons
- Selects which **Language Reference** shows in the Output panel

### 6.2 Sending prompts
Type in the box → **Enter** to send (**Shift+Enter** = newline). Status shows `ready` or `⟳ generating...`. Responses **stream** live.

### 6.3 Quick actions
One-click starter prompts, per language:

- **SCL** — Create station 0030 · Motor FB template · Add C1 fault message · Analyze station
- **FBD** — AND-enable coil · TON timer 5s · SR flip-flop · FB call
- **GRAPH** — 3-step sequence · fault-branch sequence · assembly station

When Eplan data is loaded, extra **⚡ Eplan** actions appear (generate TIA structure, PLC tag table, I/O mapping, DbFaultMessages).

### 6.4 Code in replies
Fenced code blocks render with a language badge, optional `// FILE: name` label, and a **copy** button. Blocks tagged `scl`, `xml`, `fbd`, `graph`, `json` are also captured into the **Output panel** automatically.

### 6.5 Example prompts
- *"Create station 0030 under transport 0000"* → full 9-file station set
- *"Write SCL for 0010Functions with movement routines"*
- *"Analyze this station for standard violations"* + pasted code
- *"Generate TIA structure from this Eplan data"* (after Eplan import)
- *"Analyze 0060DbKukaIOKuka"* (Live Mode — exports and audits the real block)

---

## 7. Skills Panel (left) — the Knowledge System

Skills are `.md` files that teach Claude a domain (standard rules, code templates, analysis checklists). Active skills are injected into the system prompt on every request.

### 7.1 Categories
| Category | Colour | Behaviour |
|----------|--------|-----------|
| **Core (always active)** | blue | Always on, cannot toggle — TIA V20 facts, SCL syntax, data types |
| **Standards** | yellow | Toggleable — the Schaeffler standard rules |
| **Generators** | green | Toggleable — station / FBD / GRAPH / Eplan templates |
| **Analyzers** | purple | Toggleable — compliance audit rules |
| **Custom** | grey | Your uploads |

### 7.2 Toggling
Each skill has a switch. Green switch = active. Core skills show a locked dot (always on). More active skills = more context and tokens per request — keep only what you need on.

### 7.3 Adding skills — three ways
1. **+ Load skill (.md)** (bottom) — add a pre-written skill file directly.
2. **⬆ Draft from doc (.txt)** (bottom) — Claude reads a `.txt`/`.md` and drafts a skill; you preview and confirm before it's added.
3. **+ ADD** (on the *Standards* header) — add a standard from `.md`, `.pdf`, or `.txt`. `.md` loads directly; `.pdf`/`.txt` are text-extracted, drafted into a skill by Claude, previewed, then added. *(PDF/TXT drafting needs the API key set.)*

Custom skills **persist** in `localStorage` and can be removed with the **×** on hover.

### 7.4 Skill file format
```
---
skill_id: unique_snake_case_id
skill_name: Human Readable Name
skill_version: 1.0
skill_category: core|standards|generators|analyzers|custom
applies_to: [all]
tia_version: V20
---
## Purpose · ## Rules · ## Templates · ## Validation Checklist · ## Examples · ## Forbidden Actions
```

---

## 8. Live Mode & the TIA Bridge

Live Mode connects PolyTIA to a **running TIA Portal V20** through the TIA Bridge (a local REST service on `http://localhost:5001`).

### 8.1 One-time bridge prerequisites
```
net localgroup "Siemens TIA Openness" %USERNAME% /add      (then log out / in)
netsh http add urlacl url=http://localhost:5001/ user=Everyone   (admin; "Error 183" = already done)
```

### 8.2 Connect
1. Open your project in **TIA Portal V20**.
2. Run **`TiaBridge.exe`**.
3. TIA shows **"Allow external application access?"** — the popup appears in the **TIA Portal window** (may be behind others). Click **Yes to all** to whitelist the bridge permanently.
4. In PolyTIA, click **○ LIVE MODE**. On success it reads `● LIVE: <project>` and polls status every 10 s.

> Rebuilding the bridge changes its fingerprint → TIA asks for approval again once.

### 8.3 Chat with live project access
While connected, Claude gets two tools it calls on its own:
- **get_project_tree** — list devices, PLCs, folders, and all blocks
- **export_block** — pull one block as SimaticML XML

So you can just ask *"Analyze 0060DbKukaIOKuka"* — Claude finds it, exports it, and analyzes the real XML. When it reaches for the project you'll see `⚙ reading TIA project — …` in the reply.

### 8.4 Project Tree browser (⊞ TREE)
Opens a modal listing the live project:
- Devices → PLCs → block folders (expandable) → blocks
- Each block shows **type** (FB/FC/OB/DB/UDT, colour-coded), **number**, **language**; a **⚠** marks uncompiled blocks (export may fail)
- Per block, on hover:
  - **export** → pulls XML into the Output panel
  - **analyze** → exports **and** sends it to chat for a Schaeffler compliance audit
- **⟳ refresh** reloads the tree · **✕ close** exits

> Blocks must be **compiled** in TIA before export — Openness refuses inconsistent blocks.

---

## 9. Eplan Import

Turn an Eplan I/O export into TIA context.

1. Click **⬆ IMPORT EPLAN** → pick the Eplan `.xml`.
2. The parser reads the signal list (tries 4 Eplan schema variants, normalizes German **E/A** addresses to **I/Q**, groups by DI/DO/AI/AO), posts a summary in chat, and auto-activates the **Eplan generator** skill.
3. Button shows **⚡ EPLAN LOADED**. The signal list is now appended as context to every prompt.
4. Use the **⚡ Eplan quick actions** or ask e.g. *"Build station 0010 structure using these I/O signals"*.

Bad/empty file → an inline `⚠` error appears; fix the XML and reload.

---

## 10. Output Panel (right)

Two tabs.

### 10.1 Output Files
Collects every generated file (from chat code blocks and from Live Mode exports).
- File list with language badge + filename
- Viewer for the selected file
- **copy** — to clipboard · **↓ save** — download the file
- File naming: from a `// FILE: name.scl` / `<!-- FILE: name.xml -->` first line, else auto-named `output_N.ext`
- Empty until something is generated

### 10.2 Lang Ref
A quick reference cheat-sheet that follows the active language tab (SCL / FBD / GRAPH) — block skeletons, timer/FB call syntax, FBD FlgNet structure, GRAPH step numbering, and the key Schaeffler rules.

---

## 11. Schaeffler Rules PolyTIA Enforces

Baked into the skills, applied to all generation and analysis:

- **Station folders:** `XXXXStation` (4-digit, e.g. `0010Station`)
- **ProDiag FB number = station integer** (0010 → FB10) — never auto-assigned
- **DbParameter DB number = 10000 + station integer** (0010 → DB10010)
- `typeStation` / `typeTransport` UDTs are library-locked — never modified
- Static vars `stat` prefix; temp vars `temp` prefix
- No `%I` / `%Q` / `%M` inside an FB/FC (only OB / HW config); M-area only MB0/MB1
- Fault classes **C1** (machine stop) … **C4** (operator prompt)
- ParentStation assignment required (Basic NW5 + Automatic NW3)

---

## 12. Typical Workflows

**Generate a new station**
1. SCL tab → *"Create station 0030 under transport 0000"*
2. Review the streamed blocks → Output panel collects each file
3. **↓ save** each, or **copy** into TIA Portal

**Audit existing code**
1. SCL tab → Analyze quick action, paste block list/code → send
2. Read the PASS/FAIL/WARNING report + priority fixes

**Analyze a live block**
1. Live Mode on → **⊞ TREE** → find block → **analyze** (or just ask by name in chat)
2. Compliance report returns; XML also lands in Output for **save**

**Eplan → TIA**
1. **⬆ IMPORT EPLAN** → pick file → **⚡ Generate TIA from Eplan**
2. Save the tag table XML / station files from Output

---

## 13. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Empty screen on launch | Old build — run the current `PolyTIA.exe` in `D:\PolyTIA\win-unpacked\`, or reinstall |
| `401 invalid x-api-key` | Wrong/blank/compromised key — set a fresh key via **● API KEY**; verify it's active in the Anthropic console |
| `404 model: ...` | Running an outdated build — reinstall the current PolyTIA |
| **✕ BRIDGE ERROR** | `TiaBridge.exe` not running, or TIA approval not granted — start bridge, click **Yes to all** in TIA |
| `Block 'xxxx' not found` | Wrong name/case, or block not present — use **⊞ TREE** to get the exact name |
| Export returns empty / fails | Block not compiled — compile it in TIA (⚠ marker means inconsistent) |
| No files in Output | Reply had no `scl`/`xml`/`fbd`/`graph`/`json` code blocks |
| Eplan `⚠ No signals` | Unsupported/!malformed Eplan schema — check the XML export |

---

## 14. Where Things Live

- **App build:** `D:\PolyTIA\` (`win-unpacked\PolyTIA.exe`, `PolyTIA Setup 0.1.0.exe`, `PolyTIA-portable-0.1.0.exe`)
- **Bridge:** `bridge\TiaBridge\bin\Debug\TiaBridge.exe`
- **Skills:** `src\skills\<category>\*.md`
- **API key & custom skills:** browser `localStorage` (`tia_api_key`, `tia_custom_skills`)

---

*PolyTIA V20 · Schaeffler Technologies AG & Co. KG*
