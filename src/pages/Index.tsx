import { useState } from "react";
import Header from "@/components/Header";
import TranslationPanel from "@/components/TranslationPanel";
import ExampleSnippets from "@/components/ExampleSnippets";
import SemanticDriftAnalysis from "@/components/SemanticDriftAnalysis";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import { Language } from "@/components/LanguageSelector";

const Index = () => {
  const [exampleKey, setExampleKey] = useState(0);
  const [initialCode, setInitialCode] = useState("");
  const [initialLanguage, setInitialLanguage] = useState<Language>("python");

  const handleExampleSelect = (code: string, language: Language) => {
    setInitialCode(code);
    setInitialLanguage(language);
    setExampleKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container px-4 py-8 space-y-0 max-w-6xl mx-auto">

        {/* Hero strip */}
        <div className="border-2 border-border bg-accent text-accent-foreground p-6 mb-8"
          style={{ boxShadow: "6px 6px 0px 0px hsl(var(--border))" }}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="inline-block border-2 border-accent-foreground bg-accent-foreground text-accent text-xs font-bold font-mono uppercase tracking-widest px-2 py-0.5 mb-2">
                v1.0 — BETA
              </div>
              <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-1">
                Hybrid Compiler–AI<br />Code Translation
              </h2>
              <p className="text-sm font-mono opacity-80 max-w-xl">
                SLM translates Intermediate Representation (IR) from an Abstract Syntax Tree (AST). Semantic fidelity guaranteed. Offline-capable.
              </p>
            </div>
            <ExampleSnippets onSelect={handleExampleSelect} />
          </div>
        </div>

        {/* Section: Architecture */}
        <div className="mb-8">
          <div className="border-2 border-border border-b-0 bg-primary text-primary-foreground px-4 py-2 inline-block font-bold font-mono uppercase text-xs tracking-widest">
            § SYSTEM ARCHITECTURE
          </div>
          <div className="border-2 border-border" style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>
            <ArchitectureDiagram />
          </div>
        </div>

        {/* Section: Translation */}
        <div className="mb-8">
          <div className="border-2 border-border border-b-0 bg-primary text-primary-foreground px-4 py-2 inline-block font-bold font-mono uppercase text-xs tracking-widest">
            § 01 — CODE TRANSLATION
          </div>
          <div className="border-2 border-border p-4" style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>
            <TranslationPanel
              key={exampleKey}
              initialCode={initialCode}
              initialLanguage={initialLanguage}
            />
          </div>
        </div>

        {/* Section: Error Analysis */}
        <div className="mb-8">
          <div className="border-2 border-border border-b-0 bg-primary text-primary-foreground px-4 py-2 inline-block font-bold font-mono uppercase text-xs tracking-widest">
            § 04 — ERROR ANALYSIS
          </div>
          <div className="border-2 border-border p-4" style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-widest">
              Known semantic drift failure cases in code translation
            </p>
            <SemanticDriftAnalysis />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-border pt-4 pb-8">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest text-center">
            SEMANTIC PRESERVING CODE TRANSLATION USING SMALL LANGUAGE MODEL

          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
