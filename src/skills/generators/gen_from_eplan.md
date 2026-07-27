---
skill_id: gen_from_eplan
skill_name: Generate TIA Structure from Eplan Data
skill_version: 1.0
skill_category: generators
applies_to: [FB, FC, DB]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# Generate TIA Structure from Eplan XML Data

## Purpose
When Eplan I/O data is provided as context, generate a complete TIA project structure: PLC variable table, station folder structure, DbBasic, DbFaultMessages, and Functions block with mapped I/O — all following the Schaeffler standard.

## Rules
1. PLC variable names come from Eplan tag names — keep them as-is from circuit diagram
2. I/O addresses come from Eplan unchanged (already normalized to I/Q format)
3. Group DI/DO/AI/AO into separate sections in the variable table
4. I/O addresses may ONLY appear in the PLC variable table and OB-level calls — NEVER inside FB/FC blocks
5. Inside FBs, reference I/O via symbolic variable names from the tag table
6. Station numbers derive from Eplan station/CPU name if present, else ask user
7. One tag table per CPU/station
8. DbFaultMessages variable names use C1_/C2_ prefix — derive from Eplan tag descriptions where possible
9. If Eplan tags follow Schaeffler station numbering (0010, 0020...) — use those numbers directly

## Output Structure from Eplan Data

### 1. PLC Variable Table (SCL representation)
```scl
// FILE: PLC_VariableTable.scl
// ── Digital Inputs ──
// Tag                   Address    Type   Description
// PartSensor_B1         %I0.0      Bool   Part present sensor station 0010
// ClampConfirmed_B2     %I0.1      Bool   Clamp closed confirmation
// EmergencyStop_S1      %I0.2      Bool   Emergency stop button

// ── Digital Outputs ──
// ClampCylinder_Y1      %Q0.0      Bool   Clamp cylinder extend
// ProcessStart_K1       %Q0.1      Bool   Process relay

// (Generate actual TIA variable XML for import)
```

### 2. PLC Variable Table SimaticML XML
```xml
<!-- FILE: PLC_TagTable.xml -->
<?xml version="1.0" encoding="utf-8"?>
<Document>
  <Engineering version="V20" />
  <SW.Tags.PlcTagTable ID="0">
    <AttributeList>
      <Name>Eplan_IO_Table</Name>
    </AttributeList>
    <ObjectList>
      <SW.Tags.PlcTag ID="1" CompositionName="Tags">
        <AttributeList>
          <Name>PartSensor_B1</Name>
          <DataTypeName>Bool</DataTypeName>
          <LogicalAddress>%I0.0</LogicalAddress>
          <Comment>
            <MultilingualText><MultilingualTextItem><AttributeList>
              <Culture>en-US</Culture>
              <Text>Part present sensor station 0010</Text>
            </AttributeList></MultilingualTextItem></MultilingualText>
          </Comment>
        </AttributeList>
      </SW.Tags.PlcTag>
    </ObjectList>
  </SW.Tags.PlcTagTable>
</Document>
```

### 3. Station Functions Block (SCL) — maps I/O to DB variables
```scl
// FILE: 0010Functions.scl
FUNCTION "0010Functions" : Void
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable : Bool;
   END_VAR
   VAR_TEMP
      tempDummy : Bool;
   END_VAR

BEGIN
   // NW1 — Map Eplan I/O → station DB
   // Digital inputs → DbBasic
   "0010DbBasic".PartSensor     := "PartSensor_B1";
   "0010DbBasic".ClampConfirmed := "ClampConfirmed_B2";

   // Digital outputs ← DbBasic
   "ClampCylinder_Y1" := "0010DbBasic".ClampCmd AND #Enable;
   "ProcessStart_K1"  := "0010DbBasic".ProcessCmd AND #Enable;

END_FUNCTION
```

### 4. DbFaultMessages from Eplan safety/fault signals
```scl
// FILE: 0010DbFaultMessages.scl
DATA_BLOCK "0010DbFaultMessages"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR
      // Class 1 — machine stops immediately
      C1_EmergencyStop   : Bool;   // Derived from: EmergencyStop_S1 (I0.2)
      C1_FaultSummary    : Bool;   // OR of all C1 bits

      // Class 2 — automatic sequence terminates
      C2_PartMissing     : Bool;   // Derived from: PartSensor_B1 NOT active
      C2_ClampTimeout    : Bool;   // Clamp not confirmed in time

      // Class 4 — operator intervention
      C4_LowPressure     : Bool;   // Air pressure low warning
   END_VAR

BEGIN
END_DATA_BLOCK
```

## Eplan Reference Designation → TIA Naming

Eplan uses reference designations like `=Mach+Cabinet-I0.0`. Strip to the functional part:
- `=0010+CB-PartSensor_B1` → tag name `PartSensor_B1`, station hint `0010`
- `=MACH+CAB-ClampCylinder_Y1` → tag name `ClampCylinder_Y1`
- Remove `=`, `+`, `-` prefix parts; keep the component identifier after last `-`

Typical Eplan naming pattern for I/O:
- Sensors / initiators: `_B` suffix (B1, B2...) → DI
- Valves / actuators: `_Y` suffix (Y1, Y2...) → DO
- Drives / contactors: `_K` suffix → DO
- Analog sensors: `_S` or `_T` suffix → AI
- Speed references: `_N` suffix → AO

## Full Generation Workflow

When user says "generate TIA from Eplan data":
1. Parse all signals from the Eplan context block
2. Group by station number (if determinable) or by CPU name
3. Generate PLC variable table XML (one per CPU)
4. Generate station folder structure per station found
5. Generate Functions block that maps I/O addresses → DB variables
6. Generate DbFaultMessages with C1_ entries for E-stop / safety signals
7. Generate DbBasic with variables matching Eplan signal names (without addresses)
8. Report: X stations found, Y signals mapped, Z unrecognized tags

## Examples

**Input:** Eplan context with 24 DI, 16 DO for station 0010
**Output:**
- PLC_TagTable.xml with 40 tag entries, addresses mapped
- 0010Functions.scl mapping I→DbBasic, DbBasic→Q
- 0010DbBasic.scl with Bool fields matching sensor names
- 0010DbFaultMessages.scl with C1_/C2_ entries for fault-related signals

**Input:** Eplan context with signals for 3 stations (0010, 0020, 0030)
**Output:** One tag table per station + individual station folders for each

## Forbidden Actions
- Never use %I/%Q addresses inside FB or FC blocks — only in tag table and OB-level calls
- Never rename Eplan tag names — they come from circuit diagram and must stay consistent
- Never auto-assign station numbers — derive from Eplan data or ask the user
- Never generate analog I/O as Bool — AI/AO must be Int or Real depending on scaling
