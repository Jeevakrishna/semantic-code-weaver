import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2, X, Send, Trash2 } from "lucide-react";
import { useAITutor } from "@/hooks/useAITutor";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

type TutorLevel = "beginner" | "intermediate" | "advanced";

interface AITutorPanelProps {
  code: string;
  language: string;
  isOpen: boolean;
  onClose: () => void;
}

const LEVELS: { value: TutorLevel; label: string }[] = [
  { value: "beginner", label: "BEGINNER" },
  { value: "intermediate", label: "INTERMEDIATE" },
  { value: "advanced", label: "ADVANCED" },
];

const QUICK_PROMPTS = [
  "Explain this code step by step",
  "Find errors and fix them",
  "Suggest improvements & optimizations",
  "Predict possible bugs",
  "Give me a practice exercise",
];

const AITutorPanel = ({ code, language, isOpen, onClose }: AITutorPanelProps) => {
  const [level, setLevel] = useState<TutorLevel>("intermediate");
  const [customPrompt, setCustomPrompt] = useState("");
  const { response, isLoading, analyze, clear } = useAITutor();

  if (!isOpen) return null;

  const handleAnalyze = (prompt = "") => {
    if (!code.trim()) return;
    analyze({ code, language, level }, prompt);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPrompt.trim()) {
      handleAnalyze(customPrompt.trim());
      setCustomPrompt("");
    }
  };

  return (
    <div className="border-2 border-border bg-card flex flex-col h-full overflow-hidden"
      style={{ boxShadow: "4px 4px 0px 0px hsl(var(--border))" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground border-b-2 border-border shrink-0">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <h3 className="text-xs font-bold font-mono uppercase tracking-widest">AI TUTOR</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}
          className="h-6 w-6 p-0 text-primary-foreground hover:bg-primary-foreground/10">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Level selector */}
      <div className="flex gap-0 border-b-2 border-border shrink-0">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => setLevel(l.value)}
            className={cn(
              "flex-1 py-2 text-xs font-bold font-mono uppercase tracking-widest transition-colors border-r-2 border-border last:border-r-0",
              level === l.value
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Quick prompts */}
      <div className="p-3 border-b-2 border-border space-y-2 shrink-0">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">QUICK ACTIONS</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              onClick={() => handleAnalyze(prompt)}
              disabled={isLoading || !code.trim()}
              className="text-xs font-mono h-7 border-2 border-border"
            >
              {prompt}
            </Button>
          ))}
        </div>
      </div>

      {/* Response area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading && !response && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-widest">ANALYZING CODE…</p>
          </div>
        )}

        {response && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="absolute top-0 right-0 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Clear"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <div className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-widest prose-headings:text-sm
              prose-h3:text-xs prose-h3:border-b-2 prose-h3:border-border prose-h3:pb-1 prose-h3:mb-3
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-none prose-code:border prose-code:border-border
              prose-pre:bg-muted prose-pre:border-2 prose-pre:border-border prose-pre:rounded-none
              prose-p:text-sm prose-li:text-sm
              prose-strong:text-foreground">
              <ReactMarkdown>{response}</ReactMarkdown>
              {isLoading && <span className="inline-block w-2 h-4 bg-foreground animate-pulse ml-0.5" />}
            </div>
          </div>
        )}

        {!response && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
            <GraduationCap className="h-8 w-8 opacity-40" />
            <p className="text-xs font-mono uppercase tracking-widest text-center">
              PASTE CODE & SELECT AN ACTION<br />OR ASK A QUESTION BELOW
            </p>
          </div>
        )}
      </div>

      {/* Custom prompt input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-0 border-t-2 border-border shrink-0">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Ask the tutor anything…"
          disabled={isLoading || !code.trim()}
          className="flex-1 px-3 py-2.5 text-sm font-mono bg-transparent focus:outline-none placeholder:text-muted-foreground/50"
        />
        <Button
          type="submit"
          disabled={isLoading || !customPrompt.trim() || !code.trim()}
          className="rounded-none border-l-2 border-border h-auto px-3"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
};

export default AITutorPanel;
