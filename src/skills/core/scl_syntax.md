---
skill_id: scl_syntax
skill_name: SCL Syntax for S7-1500
skill_version: 1.0
skill_category: core
applies_to: [FB, FC, OB, DB]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# SCL Syntax for S7-1500

## Purpose
Complete SCL reference for generating valid, compilable code for S7-1500 in TIA Portal V20.

## Block Skeletons

### Function Block (FB):
```scl
FUNCTION_BLOCK "FB_Name"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      Enable   : Bool;   // Enable signal
      Reset    : Bool;   // Fault reset
   END_VAR

   VAR_OUTPUT
      Running  : Bool;   // Active output
      Fault    : Bool;   // Fault present
      FaultCode : Int;   // Fault code
   END_VAR

   VAR_IN_OUT
   END_VAR

   VAR
      statRunTimer  : TON_TIME;
      statFaultCode : Int;
   END_VAR

   VAR_TEMP
      tempResult : Bool;
   END_VAR

BEGIN
   // Reset fault on rising edge of Reset
   IF #Reset AND #Fault THEN
      #Fault := FALSE;
      #FaultCode := 0;
      #statFaultCode := 0;
   END_IF;

   // Run timer
   #statRunTimer(IN := #Enable AND NOT #Fault, PT := T#5s);
   #Running := #statRunTimer.Q;

END_FUNCTION_BLOCK
```

### Function (FC):
```scl
FUNCTION "FC_Name" : Void
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR_INPUT
      InputVar : Bool;
   END_VAR
   VAR_OUTPUT
      OutputVar : Bool;
   END_VAR
   VAR_TEMP
      tempCalc : Int;
   END_VAR

BEGIN
   #OutputVar := #InputVar;
END_FUNCTION
```

### Global Data Block (DB):
```scl
DATA_BLOCK "0010DbBasic"
{ S7_Optimized_Access := 'TRUE' }
VERSION : 0.1

   VAR
      Station : "typeStation";
   END_VAR

BEGIN
END_DATA_BLOCK
```

## Data Types

### Elementary:
| Type   | Description            | Range / Notes           |
|--------|------------------------|-------------------------|
| Bool   | Boolean                | TRUE / FALSE            |
| Byte   | 8-bit unsigned         | 0..255                  |
| Word   | 16-bit unsigned        | 0..65535                |
| DWord  | 32-bit unsigned        |                         |
| Int    | 16-bit signed          | -32768..32767           |
| DInt   | 32-bit signed          |                         |
| UInt   | 16-bit unsigned int    |                         |
| UDInt  | 32-bit unsigned int    |                         |
| Real   | 32-bit float           |                         |
| LReal  | 64-bit float           |                         |
| Time   | Duration (ms res.)     | T#5s, T#1m30s500ms      |
| String | Variable string        | STRING[254] default      |
| Char   | Single character       |                         |
| Date   | Date                   | D#2026-01-01            |
| TOD    | Time of day            | TOD#12:00:00            |

### Complex:
```scl
// Array
VAR
   statValues : ARRAY[0..9] OF Int;
END_VAR

// Inline struct
VAR
   statPos : STRUCT
      X : Real;
      Y : Real;
      Valid : Bool;
   END_STRUCT;
END_VAR

// UDT reference (always in double quotes)
VAR
   statStation : "typeStation";
END_VAR
```

### Timer / Counter (TIA V20 new style):
```scl
VAR
   statTon  : TON_TIME;    // On-delay timer
   statTof  : TOF_TIME;    // Off-delay timer
   statTp   : TP_TIME;     // Pulse timer
   statCtu  : CTU_INT;     // Count up (Int)
   statCtuD : CTUD_DINT;   // Count up/down (DInt)
END_VAR

// Timer call:
#statTon(IN := #condition, PT := T#5s);
running := #statTon.Q;
elapsed := #statTon.ET;

// Counter call:
#statCtu(CU := #pulseSig, R := #reset, PV := 10);
done := #statCtu.Q;
count := #statCtu.CV;
```

## Control Structures
```scl
// IF
IF condition THEN
   ;
ELSIF condition2 THEN
   ;
ELSE
   ;
END_IF;

// CASE
CASE #step OF
   0: #statTimer(IN := TRUE, PT := T#1s);
   1: #Running := TRUE;
   2: #Running := FALSE; #step := 0;
   ELSE: #step := 0;
END_CASE;

// FOR
FOR i := 0 TO 9 DO
   #arr[i] := 0;
END_FOR;

// WHILE
WHILE #condition DO
   ;
END_WHILE;

// REPEAT
REPEAT
   ;
UNTIL NOT #condition
END_REPEAT;
```

## Calling Blocks
```scl
// FB call — static instance in VAR section
VAR
   statMotor : "FB_Motor";
END_VAR

#statMotor(Enable := #Enable, Reset := #Reset);
#Running := #statMotor.Running;
#Fault   := #statMotor.Fault;

// FC call
"FC_Calculate"(InputVal := #speed, Result => #result);

// Accessing DB directly
"0010DbBasic".Station.StationNumber := 10;
```

## Variable Naming Convention (Schaeffler)
| Scope   | Prefix   | Example            |
|---------|----------|--------------------|
| Input   | none     | `Enable`, `Reset`  |
| Output  | none     | `Running`, `Fault` |
| Static  | `stat`   | `statRunTimer`     |
| Temp    | `temp`   | `tempIndex`        |
| InOut   | none or descriptive | `RefDB` |

- Names: lowerCamelCase for vars, PascalCase for interface vars
- UDT refs: always in double quotes → `"typeStation"`
- Block refs: always in double quotes → `"FB_Motor"`

## Forbidden in SCL
- No absolute addresses inside FB/FC: `%I0.0`, `%Q0.0`, `%M0.0` — only in OB or HW config
- No `#` prefix on global DB references: use `"DBName".var` not `#DBName`
- No GOTO statements
- No reuse of MB area except MB0 (Always1) and MB1 (Always0) per Schaeffler standard
