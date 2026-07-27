---
skill_id: gen_graph
skill_name: S7-GRAPH Sequence Generator
skill_version: 1.0
skill_category: generators
applies_to: [FB]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# S7-GRAPH Sequence Generator

## Purpose
Generate S7-Graph step/transition sequences for Schaeffler station Sequence blocks. Use when user requests GRAPH output or sequence programming.

## Rules
1. GRAPH FBs cannot be created from scratch via XML import — engineer must copy template from LIB_CopyTemplate
2. Output is a structured description the engineer follows to build the GRAPH manually in TIA Portal
3. Step numbers increment by 10: S000 (init), S010, S020, S030...
4. Transition names: T_SXXX_SYYY (from step → to step)
5. Interlock conditions use message category 2 (blocking)
6. Warning conditions use message category 5 (non-blocking)
7. GraphInterface must connect to DbAutomatic.Sequence[1]
8. Always provide OFF_SQ and INIT_SQ connection details
9. Schaeffler: sequence variable in DbAutomatic, accessed as `"XXXXDbAutomatic".Sequence[1]`

## GRAPH Description Output Format

```graph
// FILE: 0030Sequence_graph.md
# GRAPH FB: 0030Sequence
# Station: 0030 | Parent: 0000Transport
# Copy FB_GRAPH_TEMPLATE from LIB_CopyTemplate, rename to "0030Sequence"

## GraphInterface Connections (set in 0030Automatic, NW4):
  GRAPH call:  "0030Sequence"(
                 OFF_SQ  := "0030DbAutomatic".GRAPH_SQ_OFF,
                 INIT_SQ := "0030DbAutomatic".GRAPH_SQ_INIT
               )
  Sequence[1] reference: "0030DbAutomatic".Sequence[1]

## Steps and Transitions:

### STEP S000 — Initialization
  Permanent actions (always execute):
    - None (initialization only)
  Entry actions (execute once on step entry):
    - Reset all outputs to safe state
    - Clear cycle counters
  Exit conditions: Go to S010 via T_S000_S010

### TRANSITION T_S000_S010
  Condition: Enable = TRUE AND NOT Fault
  (No interlocks, no warnings)

### STEP S010 — Wait for Part
  Permanent actions:
    - PartPresent_LED := TRUE   // signal lamp
  Entry actions:
    - statCycleTimer(IN := FALSE)   // reset timer
  Interlocks (category 2 — must be TRUE to proceed):
    - [none in this step]
  Warnings (category 5 — displayed only):
    - [none in this step]

### TRANSITION T_S010_S020
  Condition: "0030DbBasic".PartSensor = TRUE
  Interlock: Enable = TRUE

### STEP S020 — Clamp Part
  Entry actions:
    - ClampCylinder_Y1 := TRUE      // extend clamp
    - statClampTimer(IN := TRUE, PT := T#2s)
  Permanent actions:
    - [none]
  Interlocks (category 2):
    - PartSensor = TRUE    // part must stay present

### TRANSITION T_S020_S030
  Condition: ClampSensor_B1 = TRUE AND statClampTimer.Q
  // Both clamp confirmed AND timer elapsed

### STEP S030 — Process
  Entry actions:
    - ProcessStart := TRUE
    - statProcessTimer(IN := TRUE, PT := T#5s)
  Warnings (category 5):
    - statProcessTimer.ET > T#4s   // long cycle warning

### TRANSITION T_S030_S040
  Condition: ProcessDone = TRUE OR statProcessTimer.Q
  Interlock: Enable = TRUE

### STEP S040 — Release Part
  Entry actions:
    - ClampCylinder_Y1 := FALSE     // retract clamp
    - ProcessStart := FALSE
    - statCycleCounter(CU := TRUE, R := FALSE, PV := 9999)

### TRANSITION T_S040_S010
  Condition: ClampSensor_B2 = TRUE   // retracted confirmed
  // Returns to S010 for next cycle

## Static Variables Required in 0030Sequence FB:
  statClampTimer   : TON_TIME
  statProcessTimer : TON_TIME
  statCycleCounter : CTU_INT

## Signals to Connect (from/to 0030DbBasic or hardware):
  Inputs:  PartSensor, ClampSensor_B1, ClampSensor_B2, ProcessDone, Enable, Fault
  Outputs: ClampCylinder_Y1, ProcessStart, PartPresent_LED
```

## Complete GRAPH Description Template

### Template: Linear sequence (3 process steps)
```graph
// FILE: XXXXSequence_graph.md
# GRAPH FB: XXXXSequence
# Copy FB_GRAPH_TEMPLATE from LIB_CopyTemplate, rename to "XXXXSequence"

## GraphInterface Connections:
  "XXXXSequence"(
    OFF_SQ  := "XXXXDbAutomatic".GRAPH_SQ_OFF,
    INIT_SQ := "XXXXDbAutomatic".GRAPH_SQ_INIT
  )

## Steps:

STEP S000 — Init
  Entry: [reset outputs]
  → T_S000_S010: condition = Enable AND NOT Fault

STEP S010 — [First process step]
  Entry: [set outputs for step 1]
  Interlocks: [safety conditions]
  → T_S010_S020: condition = [done signal or timer]

STEP S020 — [Second process step]
  Entry: [set outputs for step 2]
  → T_S020_S030: condition = [done signal]

STEP S030 — [Third process step / end]
  Entry: [set outputs, increment counter]
  → T_S030_S010: condition = [reset to beginning]
```

### Template: GRAPH with fault handling
```graph
// Fault branch — add alternate path on C1 fault:

STEP S010 → T_S010_S020 (normal path)
          → T_S010_S900 (fault path): condition = C1_FaultSummary = TRUE

STEP S900 — Fault handling
  Entry: [disable all outputs, set fault indicators]
  → T_S900_S000: condition = Reset = TRUE AND NOT C1_FaultSummary
```

## Schaeffler GRAPH Message Categories
| TIA Category | Schaeffler Use         | Behavior              |
|--------------|------------------------|-----------------------|
| 2            | Interlock conditions   | Step held, no advance |
| 5            | Warning conditions     | Displayed, no hold    |

## GRAPH to SCL Variables Mapping
In 0030Automatic block, expose GRAPH state:
```scl
// Read current GRAPH step number:
currentStep := "0030DbAutomatic".Sequence[1].Step_Number;

// Force GRAPH to initialization:
"0030DbAutomatic".GRAPH_SQ_INIT := TRUE;

// Stop GRAPH:
"0030DbAutomatic".GRAPH_SQ_OFF := TRUE;
```

## Examples

**Input:** "Create GRAPH sequence for station 0030 with clamp and process steps"
**Output:** Full GRAPH description as above with S000/S010/S020/S030/S040 and clamp/process logic

**Input:** "Generate GRAPH for a 3-step assembly station"
**Output:** Template filled with 3 process steps, timers, sensor-based transitions

**Input:** "Add fault branch to station 0010 GRAPH"
**Output:** S900 fault step with T_SXXX_S900 and T_S900_S000 transitions

## Forbidden Actions
- Never attempt to generate SimaticML XML for GRAPH FBs — it cannot be imported
- Never use step numbers that aren't multiples of 10 (except S000)
- Never skip the GraphInterface connection documentation
- Never use message category other than 2 (interlock) or 5 (warning) in Schaeffler projects
