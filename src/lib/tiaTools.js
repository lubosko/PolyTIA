import { getProjectTree, exportBlock } from './bridgeApi';

// Cap tool results — DB XML can be huge, protect token budget
const MAX_RESULT_CHARS = 60000;

/** Anthropic tool definitions for live TIA bridge access. */
export const TIA_TOOLS = [
  {
    name: 'get_project_tree',
    description:
      'List the live TIA Portal project structure: devices, PLCs, block folders and all blocks ' +
      'with name, number, type (FB/FC/OB/DB/UDT) and language. Use to find exact block names ' +
      'before exporting, or to answer questions about project structure.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'export_block',
    description:
      'Export one block from the live TIA Portal project as SimaticML XML. ' +
      'Use the exact block name, e.g. "0060DbKukaIOKuka" or "0010Main". ' +
      'Returns name, number, type, language and full XML content for analysis.',
    input_schema: {
      type: 'object',
      properties: {
        blockName: { type: 'string', description: 'Exact block name from the project tree' },
      },
      required: ['blockName'],
    },
  },
];

/** System prompt addition when bridge connected. */
export const TIA_TOOLS_PROMPT = `
## Live TIA Mode
A live TIA Portal V20 project is connected via bridge. You have tools:
- get_project_tree — list all blocks/folders in the project
- export_block — export a block as SimaticML XML

When the user mentions a block by name (e.g. "analyze 0060DbKukaIOKuka"), export it and analyze the real XML.
If the exact name is uncertain, list the tree first. Exports fail on uncompiled blocks — tell the user to compile if that happens.`;

/** Execute a TIA tool call against the bridge. */
export async function executeTiaTool(name, input) {
  if (name === 'get_project_tree') {
    return await getProjectTree();
  }
  if (name === 'export_block') {
    const dto = await exportBlock(input?.blockName);
    const xml = dto?.XmlContent ?? dto?.xmlContent ?? '';
    return {
      name: dto?.Name ?? dto?.name,
      number: dto?.Number ?? dto?.number,
      blockType: dto?.BlockType ?? dto?.blockType,
      language: dto?.Language ?? dto?.language,
      xmlContent: xml.length > MAX_RESULT_CHARS
        ? xml.slice(0, MAX_RESULT_CHARS) + '\n<!-- TRUNCATED: block XML exceeds size limit -->'
        : xml,
    };
  }
  return { error: `Unknown tool: ${name}` };
}
