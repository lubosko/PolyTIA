---
skill_id: tia_v20_core
skill_name: TIA Portal V20 Core Knowledge
skill_version: 1.0
skill_category: core
applies_to: [all]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# TIA Portal V20 Core Knowledge

## Purpose
Essential TIA Portal V20 facts, block types, and SimaticML XML format. Always active — never disable.

## TIA V20 Facts
- TIA Portal V20 uses `Siemens.Engineering.dll` version 20.x — NOT backward compatible with V17/V18/V19
- Target PLC family: S7-1500 (1511, 1512, 1513, 1515, 1516, 1517, 1518)
- Programming languages supported: SCL, LAD, FBD, STL, GRAPH (S7-Graph)
- Block types: FB, FC, OB, DB (Global/Instance), UDT

## Block Number Ranges (S7-1500)
- FB: 1 – 65535
- FC: 1 – 65535
- OB: fixed numbers (OB1=main, OB35=cyclic interrupt, etc.)
- DB: 1 – 65535
- UDT: 1 – 65535

## SimaticML XML — Block Wrapper Structure

### FB wrapper:
```xml
<?xml version="1.0" encoding="utf-8"?>
<Document>
  <Engineering version="V20" />
  <SW.Blocks.FB ID="0">
    <AttributeList>
      <AutoNumber>false</AutoNumber>
      <Name>0010Main</Name>
      <Number>10</Number>
      <ProgrammingLanguage>SCL</ProgrammingLanguage>
    </AttributeList>
    <ObjectList>
      <SW.Blocks.CompileUnit ID="1" CompositionName="CompileUnits">
        <AttributeList>
          <ProgrammingLanguage>SCL</ProgrammingLanguage>
        </AttributeList>
        <ObjectList>
          <SW.Blocks.Section CompositionName="Interface">
            <Section Name="Input">
              <Member Name="Enable" Datatype="Bool" />
            </Section>
            <Section Name="Output">
              <Member Name="Running" Datatype="Bool" />
            </Section>
            <Section Name="Static">
              <Member Name="statTimer" Datatype="TON_TIME" />
            </Section>
          </SW.Blocks.Section>
          <SW.Blocks.SubCompileUnit ID="2" CompositionName="ProgramAnnotations">
            <AttributeList>
              <NetworkNumber>1</NetworkNumber>
              <ProgrammingLanguage>SCL</ProgrammingLanguage>
            </AttributeList>
          </SW.Blocks.SubCompileUnit>
        </ObjectList>
      </SW.Blocks.CompileUnit>
    </ObjectList>
  </SW.Blocks.FB>
</Document>
```

### FC wrapper — change `SW.Blocks.FB` → `SW.Blocks.FC`, no Static section
### Global DB wrapper — use `SW.Blocks.GlobalDB`, interface has only `Static` section
### UDT wrapper — use `SW.Types.PlcStruct`

## SimaticML Interface Section — Member Types
```xml
<Member Name="VarName" Datatype="Bool" />
<Member Name="VarName" Datatype="Int" />
<Member Name="VarName" Datatype="Real" />
<Member Name="VarName" Datatype="Time" />
<Member Name="VarName" Datatype="String" />
<Member Name="VarName" Datatype='"typeStation"' />
<Member Name="VarName" Datatype="Array[0..9] of Bool" />
<Member Name="VarName" Datatype="TON_TIME" />
<Member Name="VarName" Datatype="CTU_INT" />
```

## FBD — FlgNet XML Format

FBD networks use `ProgrammingLanguage>FBD` and a `FlgNet` element:

```xml
<SW.Blocks.CompileUnit ID="10" CompositionName="CompileUnits">
  <AttributeList>
    <ProgrammingLanguage>FBD</ProgrammingLanguage>
    <NetworkNumber>1</NetworkNumber>
    <NetworkTitle>
      <MultilingualText><MultilingualTextItem><AttributeList>
        <Culture>en-US</Culture><Text>Network title</Text>
      </AttributeList></MultilingualTextItem></MultilingualText>
    </NetworkTitle>
  </AttributeList>
  <ObjectList>
    <FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">
      <Parts>
        <Access Scope="LocalVariable" UId="1">
          <Symbol><Component Name="Enable" /></Symbol>
        </Access>
        <Access Scope="LocalVariable" UId="2">
          <Symbol><Component Name="Running" /></Symbol>
        </Access>
        <Part Name="Coil" UId="20" />
      </Parts>
      <Wires>
        <Wire UId="30">
          <IdentCon UId="1" />
          <NameCon UId="20" Name="in" />
        </Wire>
        <Wire UId="31">
          <NameCon UId="20" Name="operand" />
          <IdentCon UId="2" />
        </Wire>
      </Wires>
    </FlgNet>
  </ObjectList>
</SW.Blocks.CompileUnit>
```

### Common FBD Part names and their pin names:
| Part      | Input pins          | Output pins |
|-----------|---------------------|-------------|
| And       | in1, in2, ...inN    | out         |
| Or        | in1, in2, ...inN    | out         |
| Not       | in                  | out         |
| Coil      | in, operand         | —           |
| SCoil     | in, operand         | —           |
| RCoil     | in, operand         | —           |
| Contact   | in, operand         | out         |
| NContact  | in, operand         | out         |
| TON       | IN, PT              | Q, ET       |
| TOF       | IN, PT              | Q, ET       |
| TP        | IN, PT              | Q, ET       |
| CTU       | CU, R, PV           | Q, CV       |
| Move      | in                  | out1        |
| Call      | EN + FB inputs      | ENO + FB outputs |

For multi-input gates (And, Or), set `Card` template: `<TemplateValue Name="Card" Type="Cardinality">3</TemplateValue>`

### Access Scope values:
- `LocalVariable` — FB/FC interface variable (use `<Component Name="varName" />`)
- `GlobalVariable` — global DB or tag (`<Component Name="DBName" /><Component Name="VarName" />`)
- `LiteralConstant` — literal value (`<Constant><ConstantValue>TRUE</ConstantValue></Constant>`)
- `TypedConstant` — typed literal

## GRAPH (S7-Graph) Constraints
- S7-Graph FBs cannot be created from scratch via SimaticML import
- Correct workflow: copy template FB from LIB_CopyTemplate, rename, manually add steps
- TIA Copilot generates a structured GRAPH description for manual implementation
- GRAPH description format: steps, transitions, actions, GraphInterface connections

## Forbidden Actions
- Never use Siemens.Engineering.dll V17/V18/V19 DLL for V20 projects
- Never auto-assign block numbers — always use numbers from Schaeffler standard rules
- Never use `<AutoNumber>true</AutoNumber>` in generated XML
