import { useState } from "react";
import Header from "@/components/Header";
import TranslationPanel from "@/components/TranslationPanel";
import ExampleSnippets from "@/components/ExampleSnippets";
import SemanticDriftAnalysis from "@/components/SemanticDriftAnalysis";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import { Language } from "@/components/LanguageSelector";
import { Separator } from "@/components/ui/separator";

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

      <main className="flex-1 container px-4 py-8 space-y-8 max-w-6xl mx-auto">
        {/* Page title */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Hybrid Compiler–AI Code Translation
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            A Small Language Model translates structured Intermediate
            Representations derived from source code ASTs, ensuring semantic
            fidelity with offline operability.
          </p>
        </div>

        {/* Section 6: System Architecture */}
        <ArchitectureDiagram />

        <Separator />

        {/* Section 1: Code Translation Interface */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">1. Code Translation</h3>
              <p className="text-xs text-muted-foreground">
                Enter source code and translate to the target language
              </p>
            </div>
            <ExampleSnippets onSelect={handleExampleSelect} />
          </div>

          <TranslationPanel
            key={exampleKey}
            initialCode={initialCode}
            initialLanguage={initialLanguage}
          />
        </section>

        <Separator />

        {/* Section 4: Error Analysis */}
        <section>
          <h3 className="text-lg font-semibold mb-1">4. Error Analysis</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Known semantic drift failure cases in code translation
          </p>
          <SemanticDriftAnalysis />
        </section>

        {/* Footer */}
        <div className="pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Hybrid Compiler–AI Code Translation System • University Project
            Demo
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
