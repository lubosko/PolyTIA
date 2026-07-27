---
skill_id: gen_station
skill_name: Station Generation Templates
skill_version: 1.0
skill_category: generators
applies_to: [FB, FC, DB]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# Station Generation Templates

## Purpose
Generate a complete Schaeffler-compliant station folder with all required blocks and DBs. Use when user asks to create a station, add a station, or generate station code.

## Rules
1. Always generate ALL required blocks for a station: Main, Basic, Functions, Automatic, Sequence, Faults-Messages, Hmi, ProDiag
2. Always generate ALL required DBs: DbBasic, DbAutomatic, DbHmi, DbFaultMessages, DbParameter, DbGeneral
3. ProDiag FB number = station number as integer (0030 → 30)
4. DbParameter DB number = 10000 + station number as integer (0030 → 10030)
5. DbBasic.Station.StationNumber = station number as integer
6. ParentStation reference must be set — ask user which parent (transport number or basic)
7. All static variables use "stat" prefix
8. All temp variables use "temp" prefix

## Complete Station Generation (example: station 0030, parent transport 0000)

### File 1 — 0030Main (FB30)
```scl
// FILE: 0030Main.scl
FUNCTION_BLOCK "0030Main"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable       : Bool;
      Reset        : Bool;
   END_VAR

   VAR_OUTPUT
      Running      : Bool;
      Fault        : Bool;
   END_VAR

   VAR
      statBasic    : "0030Basic";
      statAutomatic : "0030Automatic";
      statHmi      : "0030Hmi";
      statFaultMsg : "0030Faults-Messages";
   END_VAR

BEGIN
   // NW1 — Basic call
   #statBasic(
      Enable := #Enable,
      Reset  := #Reset
   );

   // NW2 — Automatic call
   #statAutomatic(
      Enable := #Enable AND "0030DbBasic".Station.Ready,
      Reset  := #Reset
   );

   // NW3 — Fault messages call
   #statFaultMsg(
      Enable := #Enable,
      Reset  := #Reset
   );

   // NW4 — HMI call
   #statHmi(Enable := #Enable);

   // NW5 — Propagate outputs
   #Running := "0030DbBasic".Station.Running;
   #Fault   := "0030DbBasic".Station.Fault;

END_FUNCTION_BLOCK
```

### File 2 — 0030Basic (FB)
```scl
// FILE: 0030Basic.scl
FUNCTION_BLOCK "0030Basic"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
      Reset  : Bool;
   END_VAR
   VAR_OUTPUT
      Ready  : Bool;
      Fault  : Bool;
   END_VAR
   VAR
      statFaultTimer : TON_TIME;
   END_VAR
   VAR_TEMP
      tempFaultActive : Bool;
   END_VAR

BEGIN
   // NW1 — Station number initialization
   "0030DbBasic".Station.StationNumber := 30;

   // NW2 — Fault reset
   IF #Reset THEN
      "0030DbBasic".Station.Fault := FALSE;
   END_IF;

   // NW3 — Fault evaluation
   #tempFaultActive := "0030DbFaultMessages".C1_FaultSummary;
   "0030DbBasic".Station.Fault := #tempFaultActive;
   #Fault := #tempFaultActive;

   // NW4 — Ready output
   #Ready := #Enable AND NOT #Fault;
   "0030DbBasic".Station.Running := #Ready;
   #Ready := #Ready;

   // NW5 — Parent station assignment
   "0030DbBasic".Station.ParentStation := "0000DbBasic".Transport[1];

END_FUNCTION_BLOCK
```

### File 3 — 0030Functions (FC)
```scl
// FILE: 0030Functions.scl
FUNCTION "0030Functions" : Void
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
   END_VAR
   VAR_TEMP
      tempDummy : Bool;
   END_VAR

BEGIN
   // NW1 — Parameter section
   // Station 0030 function routines

   // NW2 — Movements
   // Add axis movement functions here

   // NW3 — Servo / Drive calls
   // Add drive control calls here

END_FUNCTION
```

### File 4 — 0030Automatic (FB)
```scl
// FILE: 0030Automatic.scl
FUNCTION_BLOCK "0030Automatic"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
      Reset  : Bool;
   END_VAR
   VAR_OUTPUT
      Running : Bool;
   END_VAR
   VAR
      statSequence : "0030Sequence";
   END_VAR

BEGIN
   // NW1 — Enable check
   IF NOT #Enable THEN
      "0030DbAutomatic".GRAPH_SQ_OFF := TRUE;
      #Running := FALSE;
      RETURN;
   END_IF;

   // NW2 — Functions call
   "0030Functions"(Enable := #Enable);

   // NW3 — Parent station reference
   "0030DbAutomatic".Sequence[1].ParentStation := "0000DbBasic".Transport[1];

   // NW4 — Sequence (GRAPH) call
   #statSequence(
      OFF_SQ  := "0030DbAutomatic".GRAPH_SQ_OFF,
      INIT_SQ := "0030DbAutomatic".GRAPH_SQ_INIT
   );

   #Running := NOT "0030DbAutomatic".GRAPH_SQ_OFF;

END_FUNCTION_BLOCK
```

### File 5 — 0030Faults-Messages (FB)
```scl
// FILE: 0030FaultsMessages.scl
FUNCTION_BLOCK "0030Faults-Messages"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
      Reset  : Bool;
   END_VAR
   VAR_TEMP
      tempAnyC1Fault : Bool;
   END_VAR

BEGIN
   // NW1 — Class 1 faults
   // "0030DbFaultMessages".C1_EmergencyStop := inEmergency; // add actual signals

   // NW2 — Class 2 warnings
   // "0030DbFaultMessages".C2_LowPressure := inLowPressure;

   // NW3 — Fault summary
   #tempAnyC1Fault := "0030DbFaultMessages".C1_EmergencyStop
                      (* OR other C1 faults *);
   "0030DbFaultMessages".C1_FaultSummary := #tempAnyC1Fault;

   // NW4 — Reset on request
   IF #Reset THEN
      "0030DbFaultMessages".C1_FaultSummary := FALSE;
   END_IF;

END_FUNCTION_BLOCK
```

### File 6 — 0030Hmi (FB)
```scl
// FILE: 0030Hmi.scl
FUNCTION_BLOCK "0030Hmi"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
   END_VAR
   VAR_TEMP
      tempDummy : Bool;
   END_VAR

BEGIN
   // NW1 — HMI screen numbers
   "0030DbHmi".StationScreenNumber := 10030;
   "0030DbHmi".StationPanelNumber  := 1;

   // NW2 — ProDiag alarm station (ProDiag FB number = 30)
   "LastAlarmStation"(StationNumber := 30,
                      DBHmi := "0030DbHmi");

END_FUNCTION_BLOCK
```

### File 7 — 0030DbBasic (DB)
```scl
// FILE: 0030DbBasic.scl
DATA_BLOCK "0030DbBasic"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR
      Station : "typeStation";
   END_VAR

BEGIN
   Station.StationNumber := 30;
END_DATA_BLOCK
```

### File 8 — 0030DbFaultMessages (DB)
```scl
// FILE: 0030DbFaultMessages.scl
DATA_BLOCK "0030DbFaultMessages"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR
      C1_EmergencyStop  : Bool;
      C1_FaultSummary   : Bool;
      C2_LowPressure    : Bool;
      C2_WarningTemp    : Bool;
   END_VAR

BEGIN
END_DATA_BLOCK
```

### File 9 — 0030DbParameter (DB10030)
```scl
// FILE: 0030DbParameter.scl
DATA_BLOCK "0030DbParameter"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1
// DB number must be set to 10030 manually in TIA Portal

   VAR
      Param_CycleTime   : Time := T#1s;
      Param_MaxRetries  : Int  := 3;
   END_VAR

BEGIN
END_DATA_BLOCK
```

## SimaticML XML Package (for TIA import)

When user requests XML output, wrap each block in proper SimaticML envelope. Generate one XML file per block, or a package XML with multiple blocks.

### Package XML structure:
```xml
<!-- FILE: 0030Station_package.xml -->
<?xml version="1.0" encoding="utf-8"?>
<Document>
  <Engineering version="V20" />
  <!-- Include one SW.Blocks.FB element per FB block -->
  <!-- Include one SW.Blocks.FC element per FC block -->
  <!-- Include one SW.Blocks.GlobalDB element per DB -->
</Document>
```

## Examples

**Input:** "Create station 0030 under transport 0000"
**Output:** Generate all 9 files above (6 FBs/FCs + 3 DBs shown, user gets complete set)

**Input:** "Add station 0050, parent is basic 0900 (no transport)"
**Output:** Same structure but ParentStation references `"0900DbBasic".Basic` in Basic NW5 and Automatic NW3

**Input:** "Create only the DbBasic and DbFaultMessages for station 0020"
**Output:** Only those two DB files

## Forbidden Actions
- Never generate ProDiag as an FC — it must be an FB with the correct number
- Never set DbParameter DB number to anything other than 10000 + station integer
- Never leave StationNumber at 0
- Never omit the ParentStation assignment
- Never name DBs without the XXXX prefix matching the station number
