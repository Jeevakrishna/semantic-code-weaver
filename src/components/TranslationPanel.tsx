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
      <div className="flex flex-wrap items-end gap-3">
        <LanguageSelector
          value={sourceLanguage}
          onChange={setSourceLanguage}
          label="Source Language"
          excludeLanguage={targetLanguage}
        />
        <Button
          variant="outline" size="icon"
          onClick={handleSwapLanguages}
          className="mb-0.5 border-2 border-border"
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
            "flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-widest px-3 py-2 border-2",
            outputsMatch
              ? "border-border bg-accent text-accent-foreground"
              : "border-border bg-destructive text-destructive-foreground"
          )}>
            {outputsMatch
              ? <><CheckCircle2 className="h-4 w-4" /> OUTPUTS MATCH</>
              : <><XCircle       className="h-4 w-4" /> OUTPUTS DIFFER</>}
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
            ? <><Loader2 className="h-4 w-4 animate-spin" />TRANSLATING…</>
            : <><ArrowRight className="h-4 w-4" />TRANSLATE</>}
        </Button>
      </div>

      {/* Gate hints */}
      {cppNotYetRun && (
        <p className="text-xs font-mono text-muted-foreground border-l-4 border-border pl-3 -mt-1">
          ⚠ COMPILE &amp; RUN C++ SOURCE FIRST — TRANSLATION BLOCKED UNTIL SUCCESSFUL.
        </p>
      )}
      {cppErrorGate && (
        <p className="text-xs font-mono text-destructive border-l-4 border-destructive pl-3 -mt-1">
          ✗ C++ HAS ERRORS. FIX &amp; RE-RUN BEFORE TRANSLATING.
        </p>
      )}

      {/* ── Side-by-side panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Source panel ── */}
        <div className="flex flex-col gap-0 border-2 border-border overflow-hidden"
          style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground border-b-2 border-border">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest">SOURCE CODE</h3>
            <span className="text-xs font-mono opacity-70">
              {sourceCode.split("\n").length} LINES
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
            <div className="border-t-2 border-border">
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
        <div className="flex flex-col gap-0 border-2 border-border overflow-hidden"
          style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground border-b-2 border-border">
            <h3 className="text-xs font-bold font-mono uppercase tracking-widest">TRANSLATED CODE</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono opacity-70">
                {translatedCode.split("\n").filter(l => l.trim()).length} LINES
              </span>
              {translatedCode && (
                <Button variant="ghost" size="sm" onClick={handleCopy}
                  className="h-7 gap-1.5 text-primary-foreground hover:bg-primary-foreground/10 border-0 text-xs font-mono uppercase">
                  {copied
                    ? <><Check className="h-3.5 w-3.5" /> COPIED</>
                    : <><Copy  className="h-3.5 w-3.5" /> COPY</>}
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
            <div className="border-t-2 border-border">
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
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground border-t-2 border-border bg-muted/30">
              <Terminal className="h-6 w-6 opacity-40" />
              <p className="text-xs font-mono uppercase tracking-widest">TRANSLATE CODE TO ENABLE RUNNER</p>
            </div>
          )}
        </div>
      </div>

      {/* Analysis sections */}
      {hasTranslation && (
        <>
          <div className="border-t-2 border-border pt-4">
            <div className="inline-block border-2 border-border border-b-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold font-mono uppercase tracking-widest mb-0">
              § 02 — SEMANTIC ANALYSIS
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AttentionHeatmap sourceCode={sourceCode} translatedCode={translatedCode} />
            <EmbeddingSimilarity sourceCode={sourceCode} translatedCode={translatedCode} />
          </div>
          <div className="border-t-2 border-border pt-4">
            <div className="inline-block border-2 border-border border-b-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold font-mono uppercase tracking-widest mb-0">
              § 03 — SEMANTIC VERIFICATION
            </div>
          </div>
          <SemanticVerification sourceCode={sourceCode} translatedCode={translatedCode} />
        </>
      )}
    </div>
  );
};

export default TranslationPanel;
