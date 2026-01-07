/**
 * AST Parser using web-tree-sitter
 * Parses source code into AST and generates Intermediate Representation (IR)
 */

import TreeSitter, { Parser, Language, Tree, Node } from "web-tree-sitter";
import { Language as LangType } from "@/components/LanguageSelector";

// Parser singleton
let parserInstance: Parser | null = null;
const languageCache = new Map<string, Language>();

// WASM file paths for tree-sitter languages
const LANGUAGE_WASM_URLS: Record<LangType, string> = {
  cpp: "https://unpkg.com/tree-sitter-cpp@0.20.0/tree-sitter-cpp.wasm",
  python: "https://unpkg.com/tree-sitter-python@0.20.4/tree-sitter-python.wasm",
  java: "https://unpkg.com/tree-sitter-java@0.20.2/tree-sitter-java.wasm",
  javascript: "https://unpkg.com/tree-sitter-javascript@0.20.1/tree-sitter-javascript.wasm",
};

/**
 * Initialize the tree-sitter parser
 */
export async function initParser(): Promise<Parser> {
  if (parserInstance) return parserInstance;

  await Parser.init({
    locateFile: (scriptName: string) => {
      return `https://unpkg.com/web-tree-sitter@0.20.8/${scriptName}`;
    },
  });

  parserInstance = new Parser();
  return parserInstance;
}

/**
 * Load a language grammar
 */
async function loadLanguage(language: LangType): Promise<Language> {
  if (languageCache.has(language)) {
    return languageCache.get(language)!;
  }

  const wasmUrl = LANGUAGE_WASM_URLS[language];
  const lang = await Language.load(wasmUrl);
  languageCache.set(language, lang);
  return lang;
}

/**
 * Parse source code into an AST
 */
export async function parseCode(
  sourceCode: string,
  language: LangType
): Promise<Tree> {
  const parser = await initParser();
  const lang = await loadLanguage(language);
  parser.setLanguage(lang);
  const tree = parser.parse(sourceCode);
  if (!tree) {
    throw new Error("Failed to parse source code");
  }
  return tree;
}

/**
 * Intermediate Representation (IR) node structure
 */
export interface IRNode {
  type: string;
  name?: string;
  value?: string;
  dataType?: string;
  children?: IRNode[];
  meta?: Record<string, unknown>;
}

/**
 * Full Intermediate Representation
 */
export interface IntermediateRepresentation {
  language: LangType;
  imports: string[];
  functions: IRFunction[];
  classes: IRClass[];
  globalVariables: IRVariable[];
  mainLogic: IRNode[];
}

export interface IRFunction {
  name: string;
  returnType: string;
  parameters: IRParameter[];
  body: IRNode[];
  isAsync?: boolean;
  visibility?: "public" | "private" | "protected";
}

export interface IRClass {
  name: string;
  extends?: string;
  implements?: string[];
  methods: IRFunction[];
  fields: IRVariable[];
  visibility?: "public" | "private" | "protected";
}

export interface IRVariable {
  name: string;
  type: string;
  value?: string;
  isConst?: boolean;
}

export interface IRParameter {
  name: string;
  type: string;
  defaultValue?: string;
}

/**
 * Convert AST to Intermediate Representation
 */
export function astToIR(
  tree: Tree,
  language: LangType,
  sourceCode: string
): IntermediateRepresentation {
  const root = tree.rootNode;
  const ir: IntermediateRepresentation = {
    language,
    imports: [],
    functions: [],
    classes: [],
    globalVariables: [],
    mainLogic: [],
  };

  // Extract nodes based on language
  traverseNode(root, ir, language, sourceCode);

  return ir;
}

/**
 * Traverse AST nodes and build IR
 */
function traverseNode(
  node: Node,
  ir: IntermediateRepresentation,
  language: LangType,
  sourceCode: string
): void {
  const nodeType = node.type;
  const nodeText = sourceCode.slice(node.startIndex, node.endIndex);

  // Handle imports/includes
  if (isImportNode(nodeType, language)) {
    ir.imports.push(nodeText);
    return;
  }

  // Handle function definitions
  if (isFunctionNode(nodeType, language)) {
    const func = extractFunction(node, language, sourceCode);
    if (func) {
      ir.functions.push(func);
      return;
    }
  }

  // Handle class definitions
  if (isClassNode(nodeType, language)) {
    const cls = extractClass(node, language, sourceCode);
    if (cls) {
      ir.classes.push(cls);
      return;
    }
  }

  // Handle global variables
  if (isVariableNode(nodeType, language) && node.parent?.type === "program" || 
      node.parent?.type === "translation_unit" || 
      node.parent?.type === "module") {
    const variable = extractVariable(node, language, sourceCode);
    if (variable) {
      ir.globalVariables.push(variable);
      return;
    }
  }

  // Recurse into children
  const childCount = node.childCount;
  for (let i = 0; i < childCount; i++) {
    const child = node.child(i);
    if (child) {
      traverseNode(child, ir, language, sourceCode);
    }
  }
}

function isImportNode(nodeType: string, language: LangType): boolean {
  const importTypes: Record<LangType, string[]> = {
    cpp: ["preproc_include", "using_declaration"],
    python: ["import_statement", "import_from_statement"],
    java: ["import_declaration", "package_declaration"],
    javascript: ["import_statement", "import_declaration"],
  };
  return importTypes[language]?.includes(nodeType) ?? false;
}

function isFunctionNode(nodeType: string, language: LangType): boolean {
  const functionTypes: Record<LangType, string[]> = {
    cpp: ["function_definition", "function_declarator"],
    python: ["function_definition"],
    java: ["method_declaration", "constructor_declaration"],
    javascript: ["function_declaration", "arrow_function", "function", "method_definition"],
  };
  return functionTypes[language]?.includes(nodeType) ?? false;
}

function isClassNode(nodeType: string, language: LangType): boolean {
  const classTypes: Record<LangType, string[]> = {
    cpp: ["class_specifier", "struct_specifier"],
    python: ["class_definition"],
    java: ["class_declaration", "interface_declaration"],
    javascript: ["class_declaration", "class"],
  };
  return classTypes[language]?.includes(nodeType) ?? false;
}

function isVariableNode(nodeType: string, language: LangType): boolean {
  const variableTypes: Record<LangType, string[]> = {
    cpp: ["declaration", "init_declarator"],
    python: ["assignment", "expression_statement"],
    java: ["field_declaration", "local_variable_declaration"],
    javascript: ["variable_declaration", "lexical_declaration"],
  };
  return variableTypes[language]?.includes(nodeType) ?? false;
}

function extractFunction(
  node: Node,
  language: LangType,
  sourceCode: string
): IRFunction | null {
  const name = findChildByType(node, ["identifier", "property_identifier", "function_declarator"]);
  const body = sourceCode.slice(node.startIndex, node.endIndex);
  
  return {
    name: name ? sourceCode.slice(name.startIndex, name.endIndex) : "anonymous",
    returnType: inferReturnType(node, language, sourceCode),
    parameters: extractParameters(node, language, sourceCode),
    body: [{ type: "raw_code", value: body }],
  };
}

function extractClass(
  node: Node,
  language: LangType,
  sourceCode: string
): IRClass | null {
  const name = findChildByType(node, ["identifier", "type_identifier"]);
  
  return {
    name: name ? sourceCode.slice(name.startIndex, name.endIndex) : "AnonymousClass",
    methods: [],
    fields: [],
  };
}

function extractVariable(
  node: Node,
  language: LangType,
  sourceCode: string
): IRVariable | null {
  const name = findChildByType(node, ["identifier", "variable_declarator"]);
  
  return {
    name: name ? sourceCode.slice(name.startIndex, name.endIndex) : "unknown",
    type: "auto",
    value: sourceCode.slice(node.startIndex, node.endIndex),
  };
}

function extractParameters(
  node: Node,
  language: LangType,
  sourceCode: string
): IRParameter[] {
  const params: IRParameter[] = [];
  const paramList = findChildByType(node, ["parameter_list", "parameters", "formal_parameters"]);
  
  if (paramList) {
    const childCount = paramList.childCount;
    for (let i = 0; i < childCount; i++) {
      const child = paramList.child(i);
      if (child && (child.type === "parameter" || child.type === "identifier" || child.type === "formal_parameter")) {
        params.push({
          name: sourceCode.slice(child.startIndex, child.endIndex),
          type: "auto",
        });
      }
    }
  }
  
  return params;
}

function inferReturnType(
  node: Node,
  language: LangType,
  sourceCode: string
): string {
  const typeNode = findChildByType(node, ["type_identifier", "primitive_type", "type_annotation"]);
  if (typeNode) {
    return sourceCode.slice(typeNode.startIndex, typeNode.endIndex);
  }
  return "void";
}

function findChildByType(
  node: Node,
  types: string[]
): Node | null {
  const childCount = node.childCount;
  for (let i = 0; i < childCount; i++) {
    const child = node.child(i);
    if (child) {
      if (types.includes(child.type)) {
        return child;
      }
      const found = findChildByType(child, types);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Serialize IR to a structured string for the SLM
 */
export function serializeIR(ir: IntermediateRepresentation): string {
  return JSON.stringify(ir, null, 2);
}

/**
 * Create a structured prompt from IR for the SLM
 */
export function createIRPrompt(
  ir: IntermediateRepresentation,
  targetLanguage: LangType
): string {
  const targetLangNames: Record<LangType, string> = {
    cpp: "C++",
    python: "Python",
    java: "Java",
    javascript: "JavaScript",
  };

  return `<TRANSLATION_TASK>
SOURCE_LANGUAGE: ${targetLangNames[ir.language]}
TARGET_LANGUAGE: ${targetLangNames[targetLanguage]}

<IR_STRUCTURE>
${serializeIR(ir)}
</IR_STRUCTURE>

<CONSTRAINTS>
1. Preserve semantic equivalence
2. Use idiomatic ${targetLangNames[targetLanguage]} patterns
3. Handle type conversions appropriately
4. Maintain function signatures and class structures
5. Output only valid ${targetLangNames[targetLanguage]} code
</CONSTRAINTS>

Generate the translated ${targetLangNames[targetLanguage]} code:`;
}
