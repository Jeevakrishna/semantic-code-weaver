import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Copy, Check, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import CodeEditor from "./CodeEditor";
import LanguageSelector, { Language } from "./LanguageSelector";
import PythonExecutor from "./PythonExecutor";
import { cn } from "@/lib/utils";

interface TranslationPanelProps {
  initialCode?: string;
  initialLanguage?: Language;
}

const TranslationPanel = ({ initialCode = "", initialLanguage = "cpp" }: TranslationPanelProps) => {
  const [sourceCode, setSourceCode] = useState(initialCode);
  const [translatedCode, setTranslatedCode] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState<Language>(initialLanguage);
  const [targetLanguage, setTargetLanguage] = useState<Language>(initialLanguage === "python" ? "cpp" : "python");

  useEffect(() => {
    if (initialCode) {
      setSourceCode(initialCode);
      setSourceLanguage(initialLanguage);
      setTargetLanguage(initialLanguage === "python" ? "cpp" : "python");
      setTranslatedCode("");
    }
  }, [initialCode, initialLanguage]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTranslate = async () => {
    if (!sourceCode.trim()) {
      toast.error("Please enter some code to translate");
      return;
    }

    setIsTranslating(true);
    setTranslatedCode("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            sourceCode,
            sourceLanguage,
            targetLanguage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Translation failed");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setTranslatedCode(result);
            }
          } catch {
            // Incomplete JSON, wait for more data
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (!result.trim()) {
        throw new Error("No translation received");
      }

      toast.success("Translation complete!");
    } catch (error) {
      console.error("Translation error:", error);
      toast.error(error instanceof Error ? error.message : "Translation failed");
    } finally {
      setIsTranslating(false);
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
    setTranslatedCode(sourceCode);
  };

  const showPythonExecutor = targetLanguage === "python" && translatedCode.trim();

  return (
    <div className="flex flex-col h-full gap-4">
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
          disabled={isTranslating || !sourceCode.trim()}
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
          
          {/* Python executor */}
          {showPythonExecutor && (
            <PythonExecutor code={translatedCode} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationPanel;
