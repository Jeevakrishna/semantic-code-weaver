import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Check, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import CodeEditor from "./CodeEditor";
import LanguageSelector, { Language } from "./LanguageSelector";
import TranslationModeSelector from "./TranslationModeSelector";
import IRViewer from "./IRViewer";
import AttentionHeatmap from "./AttentionHeatmap";
import EmbeddingSimilarity from "./EmbeddingSimilarity";
import SemanticVerification from "./SemanticVerification";
import CodeExecutor, { ExecutionResult } from "./CodeExecutor";
import { useLocalTranslation } from "@/hooks/useLocalTranslation";
import { cn } from "@/lib/utils";

interface TranslationPanelProps {
  initialCode?: string;
  initialLanguage?: Language;
}

const TranslationPanel = ({ initialCode = "", initialLanguage = "python" }: TranslationPanelProps) => {
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [sourceLanguage, setSourceLanguage] = useState<Language>(initialLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(initialLanguage === "java" ? "python" : "java");
  const [copied, setCopied] = useState(false);

  // Track C++ execution result — used to gate translation
  const [cppResult, setCppResult] = useState<ExecutionResult | null>(null);
  // Track Python (translated) execution result — used to compare outputs
  const [pyResult, setPyResult] = useState<ExecutionResult | null>(null);

  // Reset execution results whenever source code changes
  useEffect(() => {
    setCppResult(null);
    setPyResult(null);
  }, [sourceCode]);

  const {
    translate,
    translatedCode,
    isTranslating,
    isLoadingModel,
    modelProgress,
    initializeModel,
    mode,
    setMode,
    isModelReady,
    modelInfo,
    webGPUSupported,
    checkSupport,
    ir,
  } = useLocalTranslation();

  useEffect(() => { checkSupport(); }, [checkSupport]);

  useEffect(() => {
    if (initialCode) {
      setSourceCode(initialCode);
      setSourceLanguage(initialLanguage);
      setTargetLanguage(initialLanguage === "java" ? "python" : "java");
    }
  }, [initialCode, initialLanguage]);

  // Reset Python result when translated code changes
  useEffect(() => { setPyResult(null); }, [translatedCode]);

  const handleTranslate = async () => {
    if (!sourceCode.trim()) { toast.error("Please enter some code to translate"); return; }

    // If source is C++, require a successful run before translating
    if (sourceLanguage === "cpp") {
      if (!cppResult) {
        toast.error("Run the C++ code first to check for errors before translating.");
        return;
      }
      if (cppResult.hasError) {
        toast.error("Fix C++ errors before translating.");
        return;
      }
    }

    try {
      await translate(sourceCode, sourceLanguage, targetLanguage);
      toast.success("Translation complete!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Translation failed");
    }
  };

  const handleCopy = async () => {
    if (!translatedCode) return;
    await navigator.clipboard.writeText(translatedCode);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSwapLanguages = () => {
    const tempLang = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(tempLang);
    setSourceCode(translatedCode);
  };

  const hasTranslation = translatedCode.trim().length > 0;

  // Determine output match between C++ run and Python run
  const outputsMatch =
    cppResult && pyResult && !cppResult.hasError && !pyResult.hasError
      ? cppResult.stdout.trim() === pyResult.stdout.trim()
      : null;

  // Whether translate button should be disabled due to C++ error gate
  const cppErrorGate = sourceLanguage === "cpp" && cppResult?.hasError;
  const cppNotYetRun = sourceLanguage === "cpp" && !cppResult && sourceCode.trim().length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Mode selector */}
      <TranslationModeSelector
        mode={mode}
        onModeChange={setMode}
        isModelReady={isModelReady}
        isLoadingModel={isLoadingModel}
        modelProgress={modelProgress}
        onInitializeModel={initializeModel}
        webGPUSupported={webGPUSupported}
        modelInfo={modelInfo}
      />

      {/* Language selectors and controls */}
      <div className="flex flex-wrap items-end gap-4">
        <LanguageSelector
          value={sourceLanguage}
          onChange={setSourceLanguage}
          label="Source Language"
          excludeLanguage={targetLanguage}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwapLanguages}
          className="mb-0.5"
          title="Swap languages"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <LanguageSelector
          value={targetLanguage}
          onChange={setTargetLanguage}
          label="Target Language"
          excludeLanguage={sourceLanguage}
        />
        <div className="flex-1" />

        {/* Output match badge */}
        {outputsMatch !== null && (
          <div className={cn(
            "flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border",
            outputsMatch
              ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          )}>
            {outputsMatch
              ? <><CheckCircle2 className="h-4 w-4" /> Outputs Match</>
              : <><XCircle className="h-4 w-4" /> Outputs Differ</>}
          </div>
        )}

        <Button
          onClick={handleTranslate}
          disabled={isTranslating || isLoadingModel || !sourceCode.trim() || !!cppErrorGate || cppNotYetRun}
          className="gap-2"
          title={
            cppErrorGate ? "Fix C++ errors before translating" :
            cppNotYetRun ? "Run C++ first to verify it compiles" : undefined
          }
        >
          {isTranslating ? (
            <><Loader2 className="h-4 w-4 animate-spin" />Translating…</>
          ) : (
            <><ArrowRight className="h-4 w-4" />Translate</>
          )}
        </Button>
      </div>

      {/* Hint when C++ hasn't been run yet */}
      {cppNotYetRun && (
        <p className="text-xs text-muted-foreground -mt-2">
          ⚠️ Run the C++ code first — translation is blocked until it compiles successfully.
        </p>
      )}
      {cppErrorGate && (
        <p className="text-xs text-destructive -mt-2">
          ✗ C++ has errors. Fix them and re-run before translating.
        </p>
      )}

      {/* Code editors side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source */}
        <div className="flex flex-col gap-2 min-h-[300px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Source Code</h3>
            <span className="text-xs text-muted-foreground">
              {sourceCode.split("\n").length} lines
            </span>
          </div>
          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            language={sourceLanguage}
            placeholder="Paste your code here…"
            className="flex-1"
          />

          {/* Run source code — C++ uses Piston API, Python uses Piston too */}
          {sourceCode.trim() && (sourceLanguage === "cpp" || sourceLanguage === "python") && (
            <CodeExecutor
              code={sourceCode}
              language={sourceLanguage === "cpp" ? "cpp" : "python"}
              buttonLabel={sourceLanguage === "cpp" ? "Compile & Run C++" : "Run Python"}
              onResult={setCppResult}
            />
          )}
        </div>

        {/* Translated */}
        <div className="flex flex-col gap-2 min-h-[300px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Translated Code</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {translatedCode.split("\n").filter(l => l.trim()).length} lines
              </span>
              {translatedCode && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5">
                  {copied ? (
                    <><Check className="h-3.5 w-3.5" /> Copied</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copy</>
                  )}
                </Button>
              )}
            </div>
          </div>
          <CodeEditor
            value={translatedCode}
            language={targetLanguage}
            readOnly
            placeholder="Translated code will appear here…"
            className={cn("flex-1", isTranslating && "opacity-70")}
          />
          {mode === "local" && <IRViewer ir={ir} />}

          {/* Run translated Python */}
          {translatedCode.trim() && targetLanguage === "python" && (
            <CodeExecutor
              code={translatedCode}
              language="python"
              buttonLabel="Run Translated Python"
              onResult={setPyResult}
            />
          )}
        </div>
      </div>

      {/* Analysis sections */}
      {hasTranslation && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AttentionHeatmap sourceCode={sourceCode} translatedCode={translatedCode} />
          <EmbeddingSimilarity sourceCode={sourceCode} translatedCode={translatedCode} />
        </div>
      )}
      {hasTranslation && (
        <SemanticVerification sourceCode={sourceCode} translatedCode={translatedCode} />
      )}
    </div>
  );
};

export default TranslationPanel;
