import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Check, Loader2, RefreshCw, CheckCircle2, XCircle, Play, Terminal } from "lucide-react";
import { toast } from "sonner";
import CodeEditor from "./CodeEditor";
import LanguageSelector, { Language } from "./LanguageSelector";
import TranslationModeSelector from "./TranslationModeSelector";
import IRViewer from "./IRViewer";
import AttentionHeatmap from "./AttentionHeatmap";
import EmbeddingSimilarity from "./EmbeddingSimilarity";
import SemanticVerification from "./SemanticVerification";
import CodeExecutor, { ExecutionResult, ExecutionLanguage } from "./CodeExecutor";
import { useLocalTranslation } from "@/hooks/useLocalTranslation";
import { cn } from "@/lib/utils";

interface TranslationPanelProps {
  initialCode?: string;
  initialLanguage?: Language;
}

const RUNNABLE: Language[] = ["python", "cpp", "java"];

function isRunnable(lang: Language): lang is ExecutionLanguage {
  return RUNNABLE.includes(lang);
}

function runLabel(lang: Language) {
  if (lang === "cpp")  return "Compile & Run C++";
  if (lang === "java") return "Compile & Run Java";
  return "Run Python";
}

const TranslationPanel = ({ initialCode = "", initialLanguage = "python" }: TranslationPanelProps) => {
  const [sourceCode, setSourceCode]         = useState(initialCode);
  const [sourceLanguage, setSourceLanguage] = useState<Language>(initialLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(
    initialLanguage === "java" ? "python" : initialLanguage === "python" ? "cpp" : "python"
  );
  const [copied, setCopied] = useState(false);

  // Execution results for source and translated panels
  const [sourceResult, setSourceResult] = useState<ExecutionResult | null>(null);
  const [targetResult, setTargetResult] = useState<ExecutionResult | null>(null);

  // Reset results when source code changes
  useEffect(() => {
    setSourceResult(null);
    setTargetResult(null);
  }, [sourceCode]);

  // Reset target result when translation changes
  useEffect(() => { setTargetResult(null); }, []);

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
      setTargetLanguage(
        initialLanguage === "java" ? "python" : initialLanguage === "python" ? "cpp" : "python"
      );
    }
  }, [initialCode, initialLanguage]);

  useEffect(() => { setTargetResult(null); }, [translatedCode]);

  const handleTranslate = async () => {
    if (!sourceCode.trim()) { toast.error("Please enter some code to translate"); return; }

    // Gate: if source is C++, require a successful compile first
    if (sourceLanguage === "cpp") {
      if (!sourceResult)         { toast.error("Compile & Run C++ first before translating."); return; }
      if (sourceResult.hasError) { toast.error("Fix C++ errors before translating."); return; }
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
    const tmp = sourceLanguage;
    setSourceLanguage(targetLanguage);
    setTargetLanguage(tmp);
    setSourceCode(translatedCode);
    setSourceResult(null);
    setTargetResult(null);
  };

  const hasTranslation  = translatedCode.trim().length > 0;
  const cppErrorGate    = sourceLanguage === "cpp" && sourceResult?.hasError;
  const cppNotYetRun    = sourceLanguage === "cpp" && !sourceResult && sourceCode.trim().length > 0;

  // Output comparison (both panels ran successfully)
  const outputsMatch =
    sourceResult && targetResult && !sourceResult.hasError && !targetResult.hasError
      ? sourceResult.stdout.trim() === targetResult.stdout.trim()
      : null;

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

      {/* Language selectors + translate button */}
      <div className="flex flex-wrap items-end gap-4">
        <LanguageSelector
          value={sourceLanguage}
          onChange={setSourceLanguage}
          label="Source Language"
          excludeLanguage={targetLanguage}
        />
        <Button
          variant="outline" size="icon"
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
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          )}>
            {outputsMatch
              ? <><CheckCircle2 className="h-4 w-4" /> Outputs Match</>
              : <><XCircle       className="h-4 w-4" /> Outputs Differ</>}
          </div>
        )}

        <Button
          onClick={handleTranslate}
          disabled={isTranslating || isLoadingModel || !sourceCode.trim() || !!cppErrorGate || cppNotYetRun}
          className="gap-2"
          title={
            cppErrorGate  ? "Fix C++ errors before translating" :
            cppNotYetRun  ? "Run C++ first to verify it compiles" : undefined
          }
        >
          {isTranslating
            ? <><Loader2 className="h-4 w-4 animate-spin" />Translating…</>
            : <><ArrowRight className="h-4 w-4" />Translate</>}
        </Button>
      </div>

      {/* Gate hints */}
      {cppNotYetRun && (
        <p className="text-xs text-muted-foreground -mt-2">
          ⚠️ Compile &amp; Run the C++ source first — translation is blocked until it compiles successfully.
        </p>
      )}
      {cppErrorGate && (
        <p className="text-xs text-destructive -mt-2">
          ✗ C++ has errors. Fix them and re-run before translating.
        </p>
      )}

      {/* ── Side-by-side panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Source panel ── */}
        <div className="flex flex-col gap-0 rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Source Code</h3>
            <span className="text-xs text-muted-foreground">
              {sourceCode.split("\n").length} lines
            </span>
          </div>

          {/* Editor */}
          <CodeEditor
            value={sourceCode}
            onChange={setSourceCode}
            language={sourceLanguage}
            placeholder="Paste your code here…"
            className="min-h-[260px]"
          />

          {/* Run bar */}
          {sourceCode.trim() && isRunnable(sourceLanguage) && (
            <div className="border-t border-border">
              <CodeExecutor
                code={sourceCode}
                language={sourceLanguage}
                buttonLabel={runLabel(sourceLanguage)}
                onResult={setSourceResult}
                className="p-3"
              />
            </div>
          )}
        </div>

        {/* ── Translated panel ── */}
        <div className="flex flex-col gap-0 rounded-lg border border-border overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Translated Code</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {translatedCode.split("\n").filter(l => l.trim()).length} lines
              </span>
              {translatedCode && (
                <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5">
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> Copied</>
                    : <><Copy  className="h-3.5 w-3.5" /> Copy</>}
                </Button>
              )}
            </div>
          </div>

          {/* Editor */}
          <CodeEditor
            value={translatedCode}
            language={targetLanguage}
            readOnly
            placeholder="Translated code will appear here…"
            className={cn("min-h-[260px]", isTranslating && "opacity-60")}
          />

          {mode === "local" && <IRViewer ir={ir} />}

          {/* ── Run translated code + inline output ── */}
          {translatedCode.trim() && isRunnable(targetLanguage) && (
            <div className="border-t border-border">
              <CodeExecutor
                code={translatedCode}
                language={targetLanguage}
                buttonLabel={runLabel(targetLanguage)}
                onResult={setTargetResult}
                className="p-3"
              />
            </div>
          )}

          {/* Placeholder when no translation yet */}
          {!translatedCode.trim() && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground border-t border-border bg-muted/20">
              <Terminal className="h-6 w-6 opacity-40" />
              <p className="text-xs">Translate code to enable the runner</p>
            </div>
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
