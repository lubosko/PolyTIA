---
skill_id: simatic_data_types
skill_name: Simatic S7 Data Types Reference
skill_version: 1.0
skill_category: core
applies_to: [all]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# Simatic S7 Data Types

## Purpose
Reference for all S7-1500 data types, UDT usage, and Schaeffler-specific type constraints.

## System UDTs (Schaeffler Standard — READ ONLY)
These types are defined in LIB_SmbGlobal and must NEVER be modified:

### typeStation
Used in every station's DbBasic (`0010DbBasic.Station`):
```
typeStation contains:
  StationNumber     : Int        — must match station folder number (e.g. 10 for 0010)
  ParentStation     : typeParent — reference to parent transport or basic DB
  StationPanelNumber : Int       — HMI panel number
  StationScreenNumber : Int      — HMI screen number
  StationName       : String     — matches text list entry
  ProDiag_FB        : Int        — ProDiag FB number (= station number)
  [+ internal fields — never access directly]
```

### typeTransport
Used in transport DBs (`0000DbBasic.Transport`):
```
typeTransport contains:
  TransportNumber   : Int
  [station references]
  [+ internal fields]
```

### typeParent
Used for ParentStation reference — points to parent DB's transport or station structure.

## Schaeffler DB Naming and Type Mapping
| DB Name            | Key Type Used       | Notes                              |
|--------------------|---------------------|------------------------------------|
| XXXXDbBasic        | typeStation         | Station.StationNumber must be set  |
| XXXXDbAutomatic    | ARRAY of steps      | GRAPH sequence data                |
| XXXXDbHmi          | typeHmi             | HMI screen/panel numbers           |
| XXXXDbFaultMessages| fault message array | C1/C2/C3/C4 classes                |
| XXXXDbParameter    | custom params       | DB number = 10000 + station number |
| XXXXDbGeneral      | general data        | Project-specific                   |

## Fault Message Types
```
C1_ prefix: Class 1 — Faults (machine stops)
C2_ prefix: Class 2 — Warnings (machine continues, operator attention needed)
C3_ prefix: Class 3 — Information messages
C4_ prefix: Class 4 — Operator messages / prompts
```

Fault message bit arrays in DbFaultMessages:
```scl
// Example structure in DbFaultMessages:
VAR
   C1_faults : ARRAY[1..16] OF Bool;   // Class 1 fault bits
   C2_warnings : ARRAY[1..16] OF Bool; // Class 2 warning bits
END_VAR
// Individual bits named: C1_EmergencyStop, C2_LowPressure, etc.
```

## Standard Timer Types (V20 preferred)
| SCL Type    | IEC Equivalent | Notes                        |
|-------------|----------------|------------------------------|
| TON_TIME    | TON            | On-delay, TIME base          |
| TOF_TIME    | TOF            | Off-delay, TIME base         |
| TP_TIME     | TP             | Pulse, TIME base             |
| TONR_TIME   | TONR           | Retentive on-delay           |
| TON_LTIME   | TON            | On-delay, LTIME base         |

## Standard Counter Types (V20 preferred)
| SCL Type    | Notes                    |
|-------------|--------------------------|
| CTU_INT     | Count up, Int CV         |
| CTU_DINT    | Count up, DInt CV        |
| CTD_INT     | Count down, Int CV       |
| CTUD_INT    | Count up/down, Int CV    |
| CTUD_DINT   | Count up/down, DInt CV   |

## ARRAY Syntax
```scl
// Fixed array
statBuffer : ARRAY[0..99] OF Int;

// Access
#statBuffer[0] := 42;
tempVal := #statBuffer[#index];

// Multi-dimension
statMatrix : ARRAY[0..3, 0..3] OF Real;
#statMatrix[0, 1] := 1.5;
```

## STRING Operations
```scl
// Declaration
statMsg : String[80];   // max 80 chars

// Assignment
#statMsg := 'Station fault detected';

// Concatenation (use CONCAT function)
#statMsg := CONCAT(IN1 := 'Fault: ', IN2 := #faultName);

// Length
tempLen := LEN(IN := #statMsg);
```

## Conversion Functions
```scl
// Int to Real
realVal := INT_TO_REAL(intVal);

// Real to Int (truncates)
intVal := REAL_TO_INT(realVal);

// DInt to Int
intVal := DINT_TO_INT(dIntVal);

// Bool to Int
intVal := BOOL_TO_INT(boolVal);  // FALSE=0, TRUE=1

// Time operations
#duration := T#5s;
#remaining := #statTimer.PT - #statTimer.ET;
```

## Forbidden Type Actions
- Never add fields to typeStation, typeTransport, typeParent — they are library types
- Never change the data type of existing interface variables in standard blocks (Main, Basic, etc.)
- Never use VARIANT type unless explicitly requested by user
- Never use REF_TO or pointers in standard Schaeffler blocks
