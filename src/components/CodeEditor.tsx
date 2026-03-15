import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

const CodeEditor = ({
  value,
  onChange,
  language,
  readOnly = false,
  placeholder = "Paste your code here...",
  className,
}: CodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lineCount = value.split("\n").length;
  const lines = Array.from({ length: Math.max(lineCount, 20) }, (_, i) => i + 1);

  useEffect(() => {
    const textarea = textareaRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (!textarea || !lineNumbers) return;

    const syncScroll = () => {
      lineNumbers.scrollTop = textarea.scrollTop;
    };

    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange?.(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={cn("relative flex h-full border-0 bg-card overflow-hidden", className)}>
      {/* Language badge — top left strip */}
      <div className="absolute top-0 right-0 z-10">
        <span className="text-xs font-bold font-mono px-3 py-1 bg-primary text-primary-foreground border-b-2 border-l-2 border-border uppercase tracking-widest">
          {language}
        </span>
      </div>

      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 w-12 bg-muted border-r-2 border-border overflow-hidden select-none"
      >
        <div className="py-3 px-2 text-right pt-8">
          {lines.map((num) => (
            <div
              key={num}
              className="text-xs text-muted-foreground leading-6 font-mono"
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Code area */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
        className={cn(
          "flex-1 resize-none bg-transparent py-3 px-4 text-sm font-mono leading-6 pt-8",
          "focus:outline-none focus:ring-0",
          "placeholder:text-muted-foreground/50",
          readOnly && "cursor-default"
        )}
        style={{ tabSize: 2 }}
      />
    </div>
  );
};

export default CodeEditor;
