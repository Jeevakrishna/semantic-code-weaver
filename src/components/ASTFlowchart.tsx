import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronRight, ChevronDown, FileCode, Braces, Variable, FunctionSquare, Box } from "lucide-react";
import { parseCode, astToIR, IntermediateRepresentation } from "@/lib/ast-parser";
import { Language } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, GitBranch } from "lucide-react";

interface Props {
  sourceCode: string;
  sourceLanguage: Language;
}

interface TreeNodeData {
  type: string;
  text: string;
  children: TreeNodeData[];
  startRow: number;
  startCol: number;
}

const NODE_ICONS: Record<string, typeof FileCode> = {
  function_definition: FunctionSquare,
  function_declaration: FunctionSquare,
  method_declaration: FunctionSquare,
  class_definition: Box,
  class_declaration: Box,
  class_specifier: Box,
  identifier: Variable,
  variable_declaration: Variable,
  declaration: Variable,
};

const TreeNode = ({ node, depth = 0 }: { node: TreeNodeData; depth?: number }) => {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const Icon = NODE_ICONS[node.type] || Braces;
  const isLeaf = !hasChildren;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 py-0.5 px-1 hover:bg-muted/50 cursor-pointer rounded-sm font-mono text-xs",
          depth === 0 && "font-bold"
        )}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-foreground/80">{node.type}</span>
        {isLeaf && node.text.length < 40 && (
          <span className="text-muted-foreground ml-1 truncate max-w-[200px]">
            = {node.text}
          </span>
        )}
        <span className="ml-auto text-muted-foreground/50 text-[10px]">
          {node.startRow + 1}:{node.startCol}
        </span>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={`${child.type}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const IRSummary = ({ ir }: { ir: IntermediateRepresentation }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
    {[
      { label: "Imports", value: ir.imports.length },
      { label: "Functions", value: ir.functions.length },
      { label: "Classes", value: ir.classes.length },
      { label: "Globals", value: ir.globalVariables.length },
    ].map((s) => (
      <div key={s.label} className="border-2 border-border p-2">
        <div className="text-lg font-black">{s.value}</div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{s.label}</div>
      </div>
    ))}
  </div>
);

const ASTFlowchart = ({ sourceCode, sourceLanguage }: Props) => {
  const [tree, setTree] = useState<TreeNodeData | null>(null);
  const [ir, setIr] = useState<IntermediateRepresentation | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"ast" | "ir">("ast");

  const buildTree = useCallback(async () => {
    if (!sourceCode.trim()) return;
    setLoading(true);
    try {
      const parsed = await parseCode(sourceCode, sourceLanguage);
      const irData = astToIR(parsed, sourceLanguage, sourceCode);
      setIr(irData);

      const convert = (node: any): TreeNodeData => ({
        type: node.type,
        text: sourceCode.slice(node.startIndex, node.endIndex),
        startRow: node.startPosition.row,
        startCol: node.startPosition.column,
        children: Array.from({ length: node.childCount }, (_, i) => node.child(i))
          .filter(Boolean)
          .filter((c: any) => c.type !== "comment")
          .map(convert),
      });

      setTree(convert(parsed.rootNode));
    } catch (err) {
      console.error("AST parse error:", err);
    } finally {
      setLoading(false);
    }
  }, [sourceCode, sourceLanguage]);

  useEffect(() => {
    setTree(null);
    setIr(null);
  }, [sourceCode, sourceLanguage]);

  if (!tree && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <GitBranch className="h-6 w-6 text-muted-foreground opacity-50" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Parse source code into AST & IR</p>
        <Button onClick={buildTree} variant="outline" className="gap-2 border-2 border-border font-mono uppercase text-xs tracking-widest">
          <GitBranch className="h-4 w-4" /> Parse AST
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Parsing…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-0">
        {(["ast", "ir"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-1.5 text-xs font-bold font-mono uppercase tracking-widest border-2 border-border transition-colors",
              tab === t ? "bg-primary text-primary-foreground border-b-primary" : "bg-muted text-muted-foreground hover:bg-muted/80",
              t === "ir" && "border-l-0"
            )}
          >
            {t === "ast" ? "AST Tree" : "IR Summary"}
          </button>
        ))}
      </div>

      {tab === "ast" && tree && (
        <div className="border-2 border-border max-h-[400px] overflow-auto p-2 bg-background font-mono text-xs">
          <TreeNode node={tree} />
        </div>
      )}

      {tab === "ir" && ir && <IRSummary ir={ir} />}
    </div>
  );
};

export default ASTFlowchart;
