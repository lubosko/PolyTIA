# TIA Copilot V20 — Run Manual

## Option A: Run as Web App (Development)

### Prerequisites
- Node.js ≥ 18 installed
- Anthropic API key (`sk-ant-...`)

### Steps

**1. Open terminal in project folder**
```
cd D:\MyApps\SchaefflerProject1
```

**2. Install dependencies (first time only)**
```
npm install
```

**3. Start dev server**
```
npm run dev
```
Expected output:
```
VITE v5.x  ready in 800ms
➜  Local: http://localhost:5173/
```

**4. Open browser**
```
http://localhost:5173
```

**5. Set API key**
- Click **○ SET API KEY** (top right, red/blinking)
- Paste `sk-ant-api03-...`
- Press Enter or click Save
- Button turns green → **● API KEY SET**

---

## Option B: Run as Standalone App (Portable)

No Node.js required on target machine.

**1. Enable Windows Developer Mode (one-time, needed for build)**
- Settings → Update & Security → For Developers → Developer Mode → ON

**2. Build portable app**
```powershell
cd D:\MyApps\SchaefflerProject1
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist:win
```
Output folder: `D:\TiaCopilotDist\win-unpacked\`

**3. Run**
- Double-click: `D:\TiaCopilotDist\win-unpacked\TIA Copilot V20.exe`
- Set API key on first launch

---

## Enable Live TIA Mode (Phase 2 — requires TIA Portal V20)

### One-time setup

**1. Add user to Siemens TIA Openness group (run as Admin)**
```
net localgroup "Siemens TIA Openness" korco /add
```
Log out and back in after.

**2. Register HTTP port (run as Admin, once)**
```
netsh http add urlacl url=http://localhost:5001/ user=Everyone
```

**3. Enable Openness in TIA Portal**
- TIA Portal → Options → Settings → General → Openness API → Enable

### Every session

**1. Start TIA Portal V20** + open your project

**2. Start TIA Bridge**
```
D:\MyApps\SchaefflerProject1\bridge\TiaBridge\bin\Debug\TiaBridge.exe
```
Console shows:
```
● Connected to project: YourProjectName
● Bridge listening on http://localhost:5001/
```

**3. Confirm Openness dialog in TIA Portal**
- TIA Portal shows popup: "Allow external access?"
- Click **Allow**

**4. In TIA Copilot app**
- Click **○ LIVE MODE** (top bar)
- Turns green → **● LIVE: YourProjectName**

### Test bridge
```powershell
Invoke-WebRequest -Uri "http://localhost:5001/status" | Select -Expand Content
```
Expected:
```json
{"connected":true,"projectName":"WP710_V20",...}
```

---

## Skills Panel

| Category | Description | Toggle |
|----------|-------------|--------|
| Core | TIA V20 API, SCL syntax, data types | Always ON |
| Standards | Schaeffler standard, style guide | Toggle ON/OFF |
| Generators | Station, FBD, GRAPH, Eplan templates | Toggle ON/OFF |
| Analyzers | Compliance checker | Toggle ON/OFF |
| Custom | Your own .md skills | Toggle ON/OFF |

**Add custom standard:**
- Standards → **+ ADD** → pick `.md`, `.pdf`, or `.txt`
- PDF/TXT: Claude drafts skill automatically (API key needed)

---

## Import Eplan XML

1. Click **⬆ IMPORT EPLAN** (top bar)
2. Pick `.xml` export from Eplan P8
3. Yellow badge appears with signal count
4. Use `⚡ Generate TIA from Eplan` button in chat

---

## Output Files

Right panel shows all generated files:
- Click file → view content
- **copy** → clipboard
- **↓ save** → download to PC
- Import `.xml` into TIA Portal: right-click folder → **Import**

---

## Language Modes

| Button | Output type |
|--------|-------------|
| SCL | Structured text code (.scl) |
| FBD | SimaticML XML for FBD networks |
| GRAPH | S7-Graph step/transition description |

---

## Quick Actions (chat area)

| Button | What it does |
|--------|-------------|
| Station 0030 (SCL) | Generate complete station with all blocks/DBs |
| Motor FB template | Standard motor FB following Schaeffler naming |
| Add C1 fault message | Add fault bit to FaultMessages block |
| Analyze station | Compliance report with PASS/FAIL/WARNING |

---

## Troubleshoot

| Problem | Fix |
|---------|-----|
| Port 5173 in use | `npm run dev -- --port 3000` |
| API error "invalid key" | Key must start with `sk-ant-`, no spaces |
| Blank page | DevTools (F12) → Console → paste error |
| LIVE MODE won't connect | Check TiaBridge.exe running, click Allow in TIA Portal |
| Bridge "Access denied on 5001" | Run `netsh http add urlacl` command as Admin |
| Bridge symlink error on build | Enable Windows Developer Mode in Settings |
| TIA Portal dialog never appears | Options → Settings → Openness API → Enable |
| Skills not updating | Hard refresh: Ctrl+Shift+R |

---

## Stop

**Dev server:**
```
Ctrl + C  (in terminal)
```

**TIA Bridge:**
```
Ctrl + C  (in TiaBridge console)
```
