# TIA Copilot — Architecture & Skill System Recommendation
> Target: TIA Portal V20 | Claude-powered | Schaeffler Standard compliant

---

## 1. Executive Summary

The app is a **Claude-powered web interface** that acts as an intelligent engineering assistant for TIA Portal V20. It generates, analyzes, and manipulates program blocks (FB, FC, OB, DB, UDT) following the Schaeffler TIA Standard. Knowledge is delivered through a layered **Skill System** — a structured set of `.md` files that Claude reads as context, making the assistant extensible by any engineer without coding.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER (React SPA)                      │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   CHAT PANEL    │  │ PROJECT TREE │  │  OUTPUT PANEL  │  │
│  │  (Claude UI)    │  │  (structure  │  │  SCL / XML /   │  │
│  │                 │  │   viewer)    │  │  Analysis      │  │
│  └────────┬────────┘  └──────────────┘  └────────────────┘  │
│           │                                                  │
│  ┌────────▼────────────────────────────────────────────────┐ │
│  │              SKILL MANAGER (in-app)                     │ │
│  │  Loads .md skill files → injects into Claude context   │ │
│  └────────┬────────────────────────────────────────────────┘ │
└───────────┼──────────────────────────────────────────────────┘
            │ Anthropic API (claude-sonnet-4)
            ▼
    ┌───────────────────────────────────┐
    │      CLAUDE SONNET 4              │
    │                                   │
    │  System prompt =                  │
    │   Core TIA V20 knowledge +        │
    │   Active skills (injected .md)    │
    └───────────────┬───────────────────┘
                    │ generates
          ┌─────────┴──────────┐
          ▼                    ▼
    SCL source code      SimaticML XML
    (copy to TIA)        (import to TIA)
          │                    │
          └────────┬───────────┘
                   ▼
         ┌──────────────────┐
         │  TIA Bridge      │  ← optional C# relay
         │  (localhost:5001)│    for live TIA V20
         │  .NET 4.8        │    direct manipulation
         └──────────────────┘
```

### Two Operating Modes

| Mode | Description | TIA Running? |
|------|-------------|-------------|
| **Generator** | Claude produces SCL + XML files for manual import | No |
| **Live** | C# Bridge connects to running TIA V20 via Openness API | Yes (Windows only) |

Start with Generator mode. Bridge is Phase 2.

---

## 3. The Skill System

This is the most important design decision. Skills are **`.md` files** that Claude reads as structured context. Each skill teaches Claude a specific domain of knowledge — standard rules, code templates, naming conventions, analysis checklists.

### 3.1 Skill File Format

Every skill `.md` file follows this template:

```markdown
---
skill_id: schaeffler_station_naming
skill_name: Station Naming & Numbering Rules
skill_version: 1.0
skill_category: standard_rules
applies_to: [station, transport, basic]
tia_version: V20
author: YourName
last_updated: 2026-01-01
---

# [Skill Name]

## Purpose
One sentence: what Claude can do with this skill active.

## Rules
Numbered, unambiguous rules Claude must follow.

## Templates
Code or XML snippets Claude uses as starting points.

## Validation Checklist
Items Claude checks when analyzing blocks.

## Examples
Input → Expected output pairs.

## Forbidden Actions
What Claude must never do when this skill is active.
```

### 3.2 Skill Categories

```
skills/
├── core/                    ← always loaded, can't be disabled
│   ├── tia_v20_openness.md  ← Openness API facts, SimaticML format
│   ├── scl_syntax.md        ← SCL language rules for S7-1500
│   └── simatic_data_types.md
│
├── standards/               ← company/project standards
│   ├── schaeffler_v17.md    ← loaded from your PDF (already known)
│   ├── naming_conventions.md
│   └── fault_message_rules.md
│
├── generators/              ← code generation templates
│   ├── gen_station.md       ← how to build a complete station
│   ├── gen_transport.md
│   ├── gen_basic.md
│   ├── gen_db_fault_messages.md
│   └── gen_scl_functions.md
│
├── analyzers/               ← analysis & compliance rules
│   ├── analyze_block_structure.md
│   ├── analyze_naming_compliance.md
│   ├── analyze_proDiag_assignment.md
│   └── analyze_db_numbering.md
│
└── custom/                  ← user-created skills (uploaded .md files)
    ├── my_motor_fb.md
    ├── project_xyz_rules.md
    └── ...
```

### 3.3 Skill Loading Logic

```
On each Claude API call:
  1. Always inject: all /core/ skills
  2. Inject based on intent detected:
     - "create" / "generate" → load matching /generators/ skill
     - "analyze" / "check" / "verify" → load matching /analyzers/ skill
     - "standard" / "rule" → load matching /standards/ skill
  3. Always inject: all currently active /custom/ skills
  4. User can manually pin/unpin any skill
```

This keeps the context window lean — you don't send all skills every time, only what's relevant.

---

## 4. Skill Authoring Guide

This is what engineers need to know to write their own skills.

### 4.1 A Good Skill Is:

- **Specific** — one topic, one responsibility. "Motor FB template" not "all FBs".
- **Imperative** — written as rules and instructions, not descriptions.
- **Example-rich** — at least 2 input/output examples.
- **Self-contained** — Claude should be able to follow it without needing other files.

### 4.2 A Complete Custom Skill Example

```markdown
---
skill_id: motor_fb_template
skill_name: Standard Motor Function Block
skill_version: 1.2
skill_category: generators
applies_to: [FB]
tia_version: V20
author: J.Novak
last_updated: 2026-03-15
---

# Standard Motor FB Template

## Purpose
Generate a compliant SCL Function Block for motor control following
the Schaeffler standard with enable, fault, and status interface.

## Rules
1. Block name must follow pattern: FB_Motor_[descriptor]
2. Input interface must include: Enable (Bool), Reset (Bool)
3. Output interface must include: Running (Bool), Fault (Bool), FaultCode (Int)
4. Static must include: statFaultCode (Int), statRunTimer (TON)
5. Block number must be specified by user — never auto-assigned
6. Author tag must be populated in block properties
7. All variables must use lowerCamelCase with stat/temp/in/out prefix

## Templates
### Interface Section
```scl
VAR_INPUT
    Enable      : Bool;   // Enable motor control
    Reset       : Bool;   // Reset fault
    SpeedSetpoint : Real; // Speed reference [rpm]
END_VAR

VAR_OUTPUT
    Running     : Bool;   // Motor is running
    Fault       : Bool;   // Fault active
    FaultCode   : Int;    // Fault code (see DB_FaultCodes)
END_VAR

VAR
    statRunTimer    : TON;
    statFaultLatch  : Bool;
    statFaultCode   : Int;
END_VAR
```

## Validation Checklist
- [ ] Block number is not 0
- [ ] Author field is not empty
- [ ] Enable input present
- [ ] Fault output present
- [ ] No use of global flags (M area)
- [ ] No hardcoded I/O addresses inside block

## Examples
**Input:** "Create a motor FB for conveyor belt"
**Output:** FB_Motor_Conveyor with full interface and basic run/fault logic

## Forbidden Actions
- Never use absolute I/O addresses (%I, %Q) inside the FB
- Never create instance DBs manually — TIA handles this
```
```

### 4.3 Skill for Analysis

```markdown
---
skill_id: station_compliance_check
skill_name: Station Block Compliance Analyzer
skill_category: analyzers
---

# Station Compliance Check

## Purpose
Analyze a station folder and report compliance with Schaeffler V17 standard.

## Validation Rules
1. Folder name format: [4-digit-number]Station (e.g. 0010Station)
2. Required blocks: Main, Basic, Functions, Automatic, Sequence,
   Faults-Messages, Hmi, ProDiag
3. ProDiag FB number must equal station number (0010 → FB10)
4. DbParameter DB number must equal station number × 10 + 10000
   (e.g. station 0020 → DB10020)
5. StationNumber in DbBasic.Station.StationNumber must match text list index
6. ParentStation assignment: check NW5 of [XX]Basic block

## Output Format
Return a structured report:
- ✅ PASS / ❌ FAIL / ⚠️ WARNING for each rule
- Specific fix instruction for each failure
- Summary score: X/Y rules passed
```

---

## 5. Knowledge Ingestion Pipeline (PDF / MD Upload)

When a user uploads a PDF or MD document, the app runs it through this pipeline:

```
Upload PDF/MD
      │
      ▼
┌─────────────────────────────────────────┐
│         INGESTION PROCESSOR             │
│                                         │
│  1. Extract text (PDF → text)           │
│  2. Claude analysis pass:               │
│     "What rules, templates, naming      │
│      conventions does this contain?"   │
│  3. Structure into skill sections       │
│  4. Generate skill .md draft            │
│  5. Show user for review/edit           │
│  6. Save to custom/ skills library      │
└─────────────────────────────────────────┘
      │
      ▼
  skill saved → active in all future chats
```

This means your Schaeffler PDF was already "ingested" as knowledge — the app just formalizes it into a reusable skill file any engineer can see, edit, and extend.

---

## 6. App UI Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🏭 TIA Copilot  [V20]           [⚙ Skills]  [📤 Upload]      │
├──────────────┬─────────────────────────────┬───────────────────┤
│  SKILLS      │       CHAT                  │   OUTPUT          │
│  PANEL       │                             │                   │
│              │  You: Create station 0030   │  📄 0030Main.scl  │
│  ✅ Core (3) │       under transport 0000  │  📄 0030Basic.scl │
│  ✅ Schaef.. │                             │  📄 0030DbBasic.. │
│  ✅ Gen_Sta  │  🤖 Creating station 0030:  │  📦 0030Station   │
│  ✅ Motor_FB │  • 8 blocks generated       │     _package.zip  │
│              │  • ProDiag FB# = 30         │                   │
│  + Custom    │  • DbParam DB# = 10030      │  [📥 Download]    │
│    my_rules  │  • ParentStation:           │  [📋 Copy SCL]    │
│              │    0000DbBasic.Station      │  [✔ Validate]     │
│  [+ Add Sk.] │  Ready to import.           │                   │
├──────────────┴─────────────────────────────┴───────────────────┤
│  💬  Ask me anything about TIA V20, block creation, analysis.. │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Skill File — Technical Constraints

| Property | Recommendation |
|----------|----------------|
| Max file size | 50 KB per skill |
| Max loaded skills per request | 8 (token budget) |
| Format | UTF-8 Markdown, YAML frontmatter |
| Code blocks | Use triple-backtick with language tag (```scl, ```xml) |
| Section headers | H2 only (##) — parser relies on this |
| Forbidden content | No binary, no images, no HTML |
| Versioning | Increment `skill_version` on every change |

---

## 8. Technology Stack

### Frontend
- **React** (single `.jsx` artifact to start, later standalone app)
- **Tailwind CSS** for styling
- **Monaco Editor** (VSCode engine) for SCL/XML output display
- Local storage for skill files (Phase 1), later file system access API

### AI
- **Claude Sonnet 4** via Anthropic API (`claude-sonnet-4-20250514`)
- Streaming responses for long code generation
- Structured JSON output for analysis reports

### Bridge (Phase 2 — Windows only)
- **C# .NET 4.8** console app / REST server
- `Siemens.Engineering.dll` V20 (must match TIA version exactly)
- Minimal REST endpoints:
  - `GET /project/tree` — get block structure
  - `POST /blocks/import` — import XML
  - `POST /blocks/compile` — trigger compile
  - `GET /blocks/export/{name}` — export block as XML

---

## 9. Build Phases

### Phase 1 — Generator Mode (build now)
- React app with chat UI + output panel
- Anthropic API integration
- Core skill system (load from text, inject into prompt)
- Schaeffler standard skill pre-loaded
- Generate SCL + SimaticML XML for download
- Skills panel: view active skills, upload custom .md

### Phase 2 — Live TIA Mode
- C# TIA Bridge application
- Connect app to bridge via REST
- Real-time project tree read
- Direct XML import into TIA
- Block compilation trigger

### Phase 3 — Skill Marketplace
- Skill sharing between team members
- Skill validation (lint the .md format)
- Skill versioning and rollback
- Auto-generate skills from existing TIA project export

---

## 10. Key Recommendations Summary

1. **Skill files are the product's core value.** Invest in a clean, consistent format from day one — changing the format later breaks all existing skills.

2. **Separate skill categories strictly.** Core / Standards / Generators / Analyzers / Custom. Never mix rules and templates in one skill.

3. **One skill = one responsibility.** A "create station" skill should not also contain "analyze station" logic. Split them.

4. **Always include Forbidden Actions.** This is the most important section — it tells Claude what NOT to do, preventing hallucinated variable names or wrong DB numbers.

5. **PDF ingestion should produce a draft skill, not direct context.** The user reviews and approves the generated `.md` before it becomes active. This prevents bad knowledge from entering the system silently.

6. **Keep the token budget in mind.** Each skill adds tokens to the system prompt. 8 skills × 3 KB average = ~24 KB of context. With a 200K context window this is fine, but watch for runaway skill accumulation.

7. **Version your skills.** Use semantic versioning in the YAML frontmatter. When the Schaeffler standard is updated (V17 → V20 migration), bump the version and note what changed.

8. **Start with 5 core skills, not 50.** It's better to have 5 excellent, battle-tested skills than 50 mediocre ones. Quality over quantity.

9. **Build the skill editor into the app.** Engineers should be able to edit, test, and save skills directly in the UI — not just upload pre-written files.

10. **TIA V20 note:** The `Siemens.Engineering.dll` must be version 20.x. It is NOT backward compatible. If users have V17 projects, they need to migrate or keep a separate V17 app instance. This is a hard constraint.
