/**
 * AST Parser using web-tree-sitter
 * Parses source code into AST and generates Intermediate Representation (IR)
 */

import Parser from "web-tree-sitter";
import { Language as LangType } from "@/components/LanguageSelector";

// Parser singleton
let parserInstance: Parser | null = null;
const languageCache = new Map<string, Parser.Language>();

// WASM file paths for tree-sitter languages (must match web-tree-sitter@0.20.8)
const LANGUAGE_WASM_URLS: Record<LangType, string> = {
  cpp: "https://unpkg.com/tree-sitter-cpp@0.20.0/tree-sitter-cpp.wasm",
  python: "https://unpkg.com/tree-sitter-python@0.20.4/tree-sitter-python.wasm",
  java: "https://unpkg.com/tree-sitter-java@0.20.2/tree-sitter-java.wasm",
  javascript: "https://unpkg.com/tree-sitter-javascript@0.20.1/tree-sitter-javascript.wasm",
};

// Debug logger
const DEBUG = true;
function debug(stage: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(`[AST-Parser][${stage}]`, ...args);
  }
}

/**
 * Initialize the tree-sitter parser
 */
export async function initParser(): Promise<Parser> {
  if (parserInstance) return parserInstance;

  debug("INIT", "Initializing tree-sitter WASM…");

  await Parser.init({
    locateFile: (scriptName: string) => {
      const url = `https://unpkg.com/web-tree-sitter@0.20.8/${scriptName}`;
      debug("INIT", `Locating file: ${scriptName} → ${url}`);
      return url;
    },
  });

  parserInstance = new Parser();
  debug("INIT", "Parser instance created ✓");
  return parserInstance;
}

/**
 * Load a language grammar
 */
async function loadLanguage(language: LangType): Promise<Parser.Language> {
  if (languageCache.has(language)) {
    debug("LANG", `Using cached grammar for ${language}`);
    return languageCache.get(language)!;
  }

  const wasmUrl = LANGUAGE_WASM_URLS[language];
  debug("LANG", `Loading grammar WASM for ${language}: ${wasmUrl}`);
  const lang = await Parser.Language.load(wasmUrl);
  languageCache.set(language, lang);
  debug("LANG", `Grammar loaded for ${language} ✓`);
  return lang;
}

/**
 * Parse source code into an AST
 */
export async function parseCode(
  sourceCode: string,
  language: LangType
): Promise<Parser.Tree> {
  debug("PARSE", `Parsing ${language} code (${sourceCode.length} chars)`);

  const parser = await initParser();
  const lang = await loadLanguage(language);
  parser.setLanguage(lang);

  const tree = parser.parse(sourceCode);
  if (!tree) {
    throw new Error("Failed to parse source code — parser returned null");
  }

  // Check for syntax errors
  const errors = collectErrors(tree.rootNode, sourceCode);
  if (errors.length > 0) {
    debug("PARSE", `⚠ Found ${errors.length} syntax error(s):`);
    errors.forEach((e) => debug("PARSE", `  → ${e}`));
  } else {
    debug("PARSE", "Parse completed with no errors ✓");
  }

  debug("PARSE", `Root node type: ${tree.rootNode.type}, children: ${tree.rootNode.childCount}`);
  return tree;
}

/**
 * Collect syntax errors from the AST
 */
function collectErrors(node: Parser.SyntaxNode, sourceCode: string): string[] {
  const errors: string[] = [];

  function walk(n: Parser.SyntaxNode) {
    if (n.type === "ERROR" || n.isMissing()) {
      const row = n.startPosition.row + 1;
      const col = n.startPosition.column;
      const snippet = sourceCode.slice(n.startIndex, Math.min(n.endIndex, n.startIndex + 30));
      if (n.type === "ERROR") {
        errors.push(`Syntax error at line ${row}:${col} near "${snippet.trim()}"`);
      } else {
        errors.push(`Missing token at line ${row}:${col} (expected: ${n.type})`);
      }
    }
    for (let i = 0; i < n.childCount; i++) {
      const child = n.child(i);
      if (child) walk(child);
    }
  }

  walk(node);
  return errors;
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

export interface IntermediateRepresentation {
  language: LangType;
  imports: string[];
  functions: IRFunction[];
  classes: IRClass[];
  globalVariables: IRVariable[];
  mainLogic: IRNode[];
  errors: string[];
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
  tree: Parser.Tree,
  language: LangType,
  sourceCode: string
): IntermediateRepresentation {
  const root = tree.rootNode;
  const errors = collectErrors(root, sourceCode);
  const ir: IntermediateRepresentation = {
    language,
    imports: [],
    functions: [],
    classes: [],
    globalVariables: [],
    mainLogic: [],
    errors,
  };

  debug("IR", `Building IR from ${language} AST (root children: ${root.childCount})`);
  traverseNode(root, ir, language, sourceCode);

  debug("IR", `IR Summary — imports: ${ir.imports.length}, functions: ${ir.functions.length}, classes: ${ir.classes.length}, globals: ${ir.globalVariables.length}, errors: ${ir.errors.length}`);
  return ir;
}

/**
 * Traverse AST nodes and build IR
 */
function traverseNode(
  node: Parser.SyntaxNode,
  ir: IntermediateRepresentation,
  language: LangType,
  sourceCode: string
): void {
  const nodeType = node.type;
  const nodeText = sourceCode.slice(node.startIndex, node.endIndex);

  // Handle imports/includes
  if (isImportNode(nodeType, language)) {
    debug("IR", `  + Import: ${nodeText.trim().slice(0, 60)}`);
    ir.imports.push(nodeText);
    return;
  }

  // Handle function definitions
  if (isFunctionNode(nodeType, language)) {
    const func = extractFunction(node, language, sourceCode);
    if (func) {
      debug("IR", `  + Function: ${func.name}(${func.parameters.map(p => p.name).join(", ")}) → ${func.returnType}`);
      ir.functions.push(func);
      return;
    }
  }

  // Handle class definitions
  if (isClassNode(nodeType, language)) {
    const cls = extractClass(node, language, sourceCode);
    if (cls) {
      debug("IR", `  + Class: ${cls.name}`);
      ir.classes.push(cls);
      return;
    }
  }

  // Handle global variables (fix: parentheses around OR condition)
  if (isVariableNode(nodeType, language) && 
      (node.parent?.type === "program" || 
       node.parent?.type === "translation_unit" || 
       node.parent?.type === "module")) {
    const variable = extractVariable(node, language, sourceCode);
    if (variable) {
      debug("IR", `  + Global var: ${variable.name} : ${variable.type}`);
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
    cpp: ["function_definition"],
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
  node: Parser.SyntaxNode,
  language: LangType,
  sourceCode: string
): IRFunction | null {
  let nameNode = findChildByType(node, ["function_declarator"]);
  if (nameNode) {
    // For C++, function_declarator contains the identifier
    const ident = findChildByType(nameNode, ["identifier"]);
    if (ident) nameNode = ident;
  }
  if (!nameNode) {
    nameNode = findChildByType(node, ["identifier", "property_identifier"]);
  }

  const body = sourceCode.slice(node.startIndex, node.endIndex);

  return {
    name: nameNode ? sourceCode.slice(nameNode.startIndex, nameNode.endIndex) : "anonymous",
    returnType: inferReturnType(node, language, sourceCode),
    parameters: extractParameters(node, language, sourceCode),
    body: [{ type: "raw_code", value: body }],
  };
}

function extractClass(
  node: Parser.SyntaxNode,
  language: LangType,
  sourceCode: string
): IRClass | null {
  const name = findChildByType(node, ["identifier", "type_identifier", "name"]);

  return {
    name: name ? sourceCode.slice(name.startIndex, name.endIndex) : "AnonymousClass",
    methods: [],
    fields: [],
  };
}

function extractVariable(
  node: Parser.SyntaxNode,
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
  node: Parser.SyntaxNode,
  language: LangType,
  sourceCode: string
): IRParameter[] {
  const params: IRParameter[] = [];
  const paramList = findChildByType(node, ["parameter_list", "parameters", "formal_parameters"]);

  if (paramList) {
    const childCount = paramList.childCount;
    for (let i = 0; i < childCount; i++) {
      const child = paramList.child(i);
      if (child && (
        child.type === "parameter_declaration" ||
        child.type === "parameter" ||
        child.type === "identifier" ||
        child.type === "formal_parameter" ||
        child.type === "optional_parameter" ||
        child.type === "typed_parameter" ||
        child.type === "typed_default_parameter"
      )) {
        const nameNode = findChildByType(child, ["identifier"]);
        const typeNode = findChildByType(child, ["type_identifier", "primitive_type"]);
        params.push({
          name: nameNode
            ? sourceCode.slice(nameNode.startIndex, nameNode.endIndex)
            : sourceCode.slice(child.startIndex, child.endIndex).trim(),
          type: typeNode
            ? sourceCode.slice(typeNode.startIndex, typeNode.endIndex)
            : "auto",
        });
      }
    }
  }

  return params;
}

function inferReturnType(
  node: Parser.SyntaxNode,
  language: LangType,
  sourceCode: string
): string {
  // For C++, the return type is a direct child (primitive_type or type_identifier) before the function_declarator
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (!child) continue;
    if (child.type === "function_declarator" || child.type === "identifier") break;
    if (child.type === "primitive_type" || child.type === "type_identifier") {
      return sourceCode.slice(child.startIndex, child.endIndex);
    }
  }
  return "void";
}

function findChildByType(
  node: Parser.SyntaxNode,
  types: string[]
): Parser.SyntaxNode | null {
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
