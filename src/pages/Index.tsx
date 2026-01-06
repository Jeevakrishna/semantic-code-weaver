import { useState } from "react";
import Header from "@/components/Header";
import TranslationPanel from "@/components/TranslationPanel";
import ExampleSnippets from "@/components/ExampleSnippets";
import { Language } from "@/components/LanguageSelector";

const Index = () => {
  const [exampleKey, setExampleKey] = useState(0);
  const [initialCode, setInitialCode] = useState("");
  const [initialLanguage, setInitialLanguage] = useState<Language>("cpp");

  const handleExampleSelect = (code: string, language: Language) => {
    setInitialCode(code);
    setInitialLanguage(language);
    setExampleKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container px-4 py-6 flex flex-col">
        {/* Top bar with examples */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Code Translation</h2>
            <p className="text-sm text-muted-foreground">
              Paste your code and translate it to another programming language
            </p>
          </div>
          <ExampleSnippets onSelect={handleExampleSelect} />
        </div>

        {/* Translation panel */}
        <div className="flex-1 min-h-0">
          <TranslationPanel
            key={exampleKey}
            initialCode={initialCode}
            initialLanguage={initialLanguage}
          />
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>✓ C++, Python, Java, JavaScript</span>
            <span>✓ AI-powered semantic translation</span>
            <span>✓ In-browser Python execution</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
