/**
 * IR Viewer Component
 * Displays the Intermediate Representation derived from source AST
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Code2, FileCode } from "lucide-react";
import { IntermediateRepresentation } from "@/lib/ast-parser";
import { cn } from "@/lib/utils";

interface IRViewerProps {
  ir: IntermediateRepresentation | null;
  className?: string;
}

export default function IRViewer({ ir, className }: IRViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!ir) return null;

  const hasImports = ir.imports.length > 0;
  const hasFunctions = ir.functions.length > 0;
  const hasClasses = ir.classes.length > 0;
  const hasGlobals = ir.globalVariables.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between h-8 px-2 text-xs"
        >
          <span className="flex items-center gap-1.5">
            <FileCode className="h-3.5 w-3.5" />
            Intermediate Representation (IR)
          </span>
          <span className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {ir.functions.length} functions
            </Badge>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-3 rounded-lg border border-border bg-muted/30 text-xs font-mono space-y-3 max-h-60 overflow-auto">
          {/* Language */}
          <div>
            <span className="text-muted-foreground">source_language: </span>
            <span className="text-primary">{ir.language}</span>
          </div>

          {/* Imports */}
          {hasImports && (
            <IRSection title="imports" count={ir.imports.length}>
              {ir.imports.map((imp, i) => (
                <div key={i} className="text-muted-foreground truncate">
                  {imp}
                </div>
              ))}
            </IRSection>
          )}

          {/* Functions */}
          {hasFunctions && (
            <IRSection title="functions" count={ir.functions.length}>
              {ir.functions.map((fn, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Code2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-primary">{fn.name}</span>
                  <span className="text-muted-foreground">
                    ({fn.parameters.length} params) → {fn.returnType}
                  </span>
                </div>
              ))}
            </IRSection>
          )}

          {/* Classes */}
          {hasClasses && (
            <IRSection title="classes" count={ir.classes.length}>
              {ir.classes.map((cls, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-primary">{cls.name}</span>
                  {cls.extends && (
                    <span className="text-muted-foreground">
                      extends {cls.extends}
                    </span>
                  )}
                </div>
              ))}
            </IRSection>
          )}

          {/* Global Variables */}
          {hasGlobals && (
            <IRSection title="globalVariables" count={ir.globalVariables.length}>
              {ir.globalVariables.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-primary">{v.name}</span>
                  <span className="text-muted-foreground">: {v.type}</span>
                </div>
              ))}
            </IRSection>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface IRSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function IRSection({ title, count, children }: IRSectionProps) {
  return (
    <div>
      <div className="text-muted-foreground mb-1">
        {title}: [{count}]
      </div>
      <div className="pl-3 border-l border-border space-y-0.5">{children}</div>
    </div>
  );
}
