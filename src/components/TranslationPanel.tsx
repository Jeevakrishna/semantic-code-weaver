import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import CodeEditor from "./CodeEditor";
import LanguageSelector, { Language } from "./LanguageSelector";
import PythonExecutor from "./PythonExecutor";
import TranslationModeSelector from "./TranslationModeSelector";
import IRViewer from "./IRViewer";
import { useLocalTranslation } from "@/hooks/useLocalTranslation";
import { cn } from "@/lib/utils";

interface TranslationPanelProps {
  initialCode?: string;
  initialLanguage?: Language;
}

const TranslationPanel = ({ initialCode = "", initialLanguage = "cpp" }: TranslationPanelProps) => {
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [sourceLanguage, setSourceLanguage] = useState<Language>(initialLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(initialLanguage === "python" ? "cpp" : "python");
  const [copied, setCopied] = useState(false);

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
    error,
  } = useLocalTranslation();

  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  useEffect(() => {
    if (initialCode) {
      setSourceCode(initialCode);
      setSourceLanguage(initialLanguage);
      setTargetLanguage(initialLanguage === "python" ? "cpp" : "python");
    }
  }, [initialCode, initialLanguage]);

  const handleTranslate = async () => {
    if (!sourceCode.trim()) {
      toast.error("Please enter some code to translate");
      return;
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

  const showPythonExecutor = targetLanguage === "python" && translatedCode.trim();

  return (
    <div className="flex flex-col h-full gap-4">
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

        <Button
          onClick={handleTranslate}
          disabled={isTranslating || isLoadingModel || !sourceCode.trim()}
          className="gap-2"
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Translating...
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4" />
              Translate
            </>
          )}
        </Button>
      </div>

      {/* Code editors */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* Source code panel */}
        <div className="flex flex-col gap-2 min-h-[300px] lg:min-h-0">
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
            placeholder="Paste your code here..."
            className="flex-1"
          />
        </div>

        {/* Translated code panel */}
        <div className="flex flex-col gap-2 min-h-[300px] lg:min-h-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Translated Code</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {translatedCode.split("\n").filter(l => l.trim()).length} lines
              </span>
              {translatedCode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
          <CodeEditor
            value={translatedCode}
            language={targetLanguage}
            readOnly
            placeholder="Translated code will appear here..."
            className={cn("flex-1", isTranslating && "opacity-70")}
          />
          
          {/* IR Viewer - shown when using local mode */}
          {mode === "local" && <IRViewer ir={ir} />}
          
          {/* Python executor */}
          {showPythonExecutor && <PythonExecutor code={translatedCode} />}
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;
