---
skill_id: gen_fbd
skill_name: FBD SimaticML Generator
skill_version: 1.0
skill_category: generators
applies_to: [FB, FC]
tia_version: V20
author: TIA Copilot
last_updated: 2026-01-01
---

# FBD (Function Block Diagram) SimaticML Generator

## Purpose
Generate valid SimaticML XML for FBD networks in TIA Portal V20. Use when user requests FBD output or when active language is FBD.

## Rules
1. FBD uses FlgNet format inside CompileUnit with ProgrammingLanguage=FBD
2. Every element (Part, Access) needs a unique UId (integer, start at 1)
3. Wires connect NameCon (Part pin) to IdentCon (variable access) or NameCon to NameCon
4. Access elements declare the variables used — separate from Parts
5. Multi-input gates (And, Or) need a TemplateValue Card element
6. Always include the FlgNet namespace: `xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4"`

## Network Templates

### Template: Simple coil assignment (A := B)
```xml
<!-- FILE: simple_assignment_fbd.xml -->
<?xml version="1.0" encoding="utf-8"?>
<Document>
  <Engineering version="V20" />
  <SW.Blocks.FB ID="0">
    <AttributeList>
      <AutoNumber>false</AutoNumber>
      <Name>FB_Example</Name>
      <Number>100</Number>
      <ProgrammingLanguage>FBD</ProgrammingLanguage>
    </AttributeList>
    <ObjectList>
      <SW.Blocks.CompileUnit ID="1" CompositionName="CompileUnits">
        <AttributeList>
          <ProgrammingLanguage>FBD</ProgrammingLanguage>
          <NetworkNumber>1</NetworkNumber>
          <NetworkTitle>
            <MultilingualText><MultilingualTextItem><AttributeList>
              <Culture>en-US</Culture><Text>Running assignment</Text>
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
    </ObjectList>
  </SW.Blocks.FB>
</Document>
```

### Template: AND gate with coil
```xml
<!-- Wiring: (Enable AND NOT Fault) -> Running -->
<FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">
  <Parts>
    <Access Scope="LocalVariable" UId="1">
      <Symbol><Component Name="Enable" /></Symbol>
    </Access>
    <Access Scope="LocalVariable" UId="2">
      <Symbol><Component Name="Fault" /></Symbol>
    </Access>
    <Access Scope="LocalVariable" UId="3">
      <Symbol><Component Name="Running" /></Symbol>
    </Access>
    <Part Name="And" UId="20">
      <TemplateValue Name="Card" Type="Cardinality">2</TemplateValue>
    </Part>
    <Part Name="Not" UId="21" />
    <Part Name="Coil" UId="22" />
  </Parts>
  <Wires>
    <!-- Enable -> And.in1 -->
    <Wire UId="30">
      <IdentCon UId="1" />
      <NameCon UId="20" Name="in1" />
    </Wire>
    <!-- Fault -> Not.in -->
    <Wire UId="31">
      <IdentCon UId="2" />
      <NameCon UId="21" Name="in" />
    </Wire>
    <!-- Not.out -> And.in2 -->
    <Wire UId="32">
      <NameCon UId="21" Name="out" />
      <NameCon UId="20" Name="in2" />
    </Wire>
    <!-- And.out -> Coil.in -->
    <Wire UId="33">
      <NameCon UId="20" Name="out" />
      <NameCon UId="22" Name="in" />
    </Wire>
    <!-- Coil.operand -> Running -->
    <Wire UId="34">
      <NameCon UId="22" Name="operand" />
      <IdentCon UId="3" />
    </Wire>
  </Wires>
</FlgNet>
```

### Template: TON timer network
```xml
<!-- TON: Run timer, Q -> TimerDone -->
<FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">
  <Parts>
    <!-- IN signal -->
    <Access Scope="LocalVariable" UId="1">
      <Symbol><Component Name="Enable" /></Symbol>
    </Access>
    <!-- PT constant (5 seconds) -->
    <Access Scope="TypedConstant" UId="2">
      <Constant>
        <ConstantType>Time</ConstantType>
        <ConstantValue>T#5s</ConstantValue>
      </Constant>
    </Access>
    <!-- Timer instance (static var) -->
    <Access Scope="LocalVariable" UId="3">
      <Symbol><Component Name="statRunTimer" /></Symbol>
    </Access>
    <!-- Output: timer done -->
    <Access Scope="LocalVariable" UId="4">
      <Symbol><Component Name="TimerDone" /></Symbol>
    </Access>
    <!-- TON block -->
    <Part Name="TON" UId="20">
      <TemplateValue Name="TimerType" Type="Type">TON_TIME</TemplateValue>
    </Part>
    <Part Name="Coil" UId="21" />
  </Parts>
  <Wires>
    <!-- Enable -> TON.IN -->
    <Wire UId="30">
      <IdentCon UId="1" />
      <NameCon UId="20" Name="IN" />
    </Wire>
    <!-- T#5s -> TON.PT -->
    <Wire UId="31">
      <IdentCon UId="2" />
      <NameCon UId="20" Name="PT" />
    </Wire>
    <!-- Timer instance -> TON box -->
    <Wire UId="32">
      <NameCon UId="20" Name="TON" />
      <IdentCon UId="3" />
    </Wire>
    <!-- TON.Q -> Coil.in -->
    <Wire UId="33">
      <NameCon UId="20" Name="Q" />
      <NameCon UId="21" Name="in" />
    </Wire>
    <!-- Coil.operand -> TimerDone -->
    <Wire UId="34">
      <NameCon UId="21" Name="operand" />
      <IdentCon UId="4" />
    </Wire>
  </Wires>
</FlgNet>
```

### Template: SR (Set-Reset) flip-flop
```xml
<FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">
  <Parts>
    <Access Scope="LocalVariable" UId="1">
      <Symbol><Component Name="SetCondition" /></Symbol>
    </Access>
    <Access Scope="LocalVariable" UId="2">
      <Symbol><Component Name="ResetCondition" /></Symbol>
    </Access>
    <Access Scope="LocalVariable" UId="3">
      <Symbol><Component Name="statOutput" /></Symbol>
    </Access>
    <Part Name="SCoil" UId="20" />
    <Part Name="RCoil" UId="21" />
  </Parts>
  <Wires>
    <Wire UId="30"><IdentCon UId="1" /><NameCon UId="20" Name="in" /></Wire>
    <Wire UId="31"><NameCon UId="20" Name="operand" /><IdentCon UId="3" /></Wire>
    <Wire UId="32"><IdentCon UId="2" /><NameCon UId="21" Name="in" /></Wire>
    <Wire UId="33"><NameCon UId="21" Name="operand" /><IdentCon UId="3" /></Wire>
  </Wires>
</FlgNet>
```

### Template: FB call in FBD
```xml
<!-- Call FB_Motor instance statMotor -->
<FlgNet xmlns="http://www.siemens.com/automation/Openness/SW/NetworkSource/FlgNet/v4">
  <Parts>
    <!-- EN signal -->
    <Access Scope="LocalVariable" UId="1">
      <Symbol><Component Name="Enable" /></Symbol>
    </Access>
    <Access Scope="LocalVariable" UId="2">
      <Symbol><Component Name="Reset" /></Symbol>
    </Access>
    <!-- FB instance -->
    <Access Scope="LocalVariable" UId="3">
      <Symbol><Component Name="statMotor" /></Symbol>
    </Access>
    <!-- Outputs -->
    <Access Scope="LocalVariable" UId="4">
      <Symbol><Component Name="Running" /></Symbol>
    </Access>
    <Part Name="Call" UId="20">
      <TemplateValue Name="BlockName" Type="Block">"FB_Motor"</TemplateValue>
    </Part>
    <Part Name="Coil" UId="21" />
  </Parts>
  <Wires>
    <!-- Enable -> EN -->
    <Wire UId="30"><IdentCon UId="1" /><NameCon UId="20" Name="EN" /></Wire>
    <!-- Reset -> Reset input -->
    <Wire UId="31"><IdentCon UId="2" /><NameCon UId="20" Name="Reset" /></Wire>
    <!-- Instance DB -->
    <Wire UId="32"><NameCon UId="20" Name="CALL" /><IdentCon UId="3" /></Wire>
    <!-- Running output -> Coil -->
    <Wire UId="33"><NameCon UId="20" Name="Running" /><NameCon UId="21" Name="in" /></Wire>
    <Wire UId="34"><NameCon UId="21" Name="operand" /><IdentCon UId="4" /></Wire>
  </Wires>
</FlgNet>
```

## Global Variable Access (DB variables in FBD)
```xml
<!-- Access "0010DbBasic".Station.Running -->
<Access Scope="GlobalVariable" UId="10">
  <Symbol>
    <Component Name="0010DbBasic" />
    <Component Name="Station" />
    <Component Name="Running" />
  </Symbol>
</Access>
```

## UId Assignment Rules
- Variable Access elements: UId 1–99
- Part elements: UId 100+ (or 20+ in small networks)
- Wire elements: UId 200+ (or 30+ in small networks)
- Keep UIds unique within one FlgNet element

## Examples

**Input:** "Create FBD network: Enable AND Reset drives Running coil"
**Output:** XML with And gate (Card=2), inputs Enable/Reset, output Running via Coil

**Input:** "FBD network for 5-second on-delay timer"
**Output:** TON template with IN=Enable, PT=T#5s, Q→TimerDone coil

## Forbidden Actions
- Never use duplicate UId values within one FlgNet
- Never connect wire from Part output to Access (IdentCon) directly for output — use Coil for boolean writes
- Never omit the FlgNet namespace declaration
- Never mix FBD and SCL in the same CompileUnit
