/**
 * CodeExecutor — runs code via the Piston public API
 * Supports C++ (compiled) and Python (interpreted).
 * Returns execution output so parent components can compare results.
 */
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Terminal, X, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExecutionLanguage = "cpp" | "python";

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  hasError: boolean;
}

interface CodeExecutorProps {
  code: string;
  language: ExecutionLanguage;
  className?: string;
  /** Called after execution completes so parent can react */
  onResult?: (result: ExecutionResult) => void;
  /** If true, run automatically when code changes and this is first mount */
  autoRun?: boolean;
  /** Label shown on the run button */
  buttonLabel?: string;
}

const PISTON_API = "https://emkc.org/api/v2/piston/execute";

const LANGUAGE_CONFIG: Record<ExecutionLanguage, { language: string; version: string; displayName: string }> = {
  cpp: { language: "cpp", version: "10.2.0", displayName: "C++" },
  python: { language: "python", version: "3.10.0", displayName: "Python" },
};

const CodeExecutor = ({
  code,
  language,
  className,
  onResult,
  buttonLabel,
}: CodeExecutorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showConsole, setShowConsole] = useState(false);

  const config = LANGUAGE_CONFIG[language];

  const runCode = useCallback(async () => {
    if (!code.trim()) return;

    setIsRunning(true);
    setShowConsole(true);
    setResult(null);

    try {
      const response = await fetch(PISTON_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: config.language,
          version: config.version,
          files: [{ name: language === "cpp" ? "main.cpp" : "main.py", content: code }],
          stdin: "",
          args: [],
          compile_timeout: 10000,
          run_timeout: 5000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Piston API error: ${response.status}`);
      }

      const data = await response.json();

      // Piston returns { compile, run } for compiled languages, just { run } for interpreted
      const compileStderr = data.compile?.stderr ?? "";
      const compileStdout = data.compile?.stdout ?? "";
      const runStdout = data.run?.stdout ?? "";
      const runStderr = data.run?.stderr ?? "";
      const exitCode = data.run?.code ?? 0;

      // Treat compile errors OR non-zero exit as errors
      const stderr = compileStderr || runStderr;
      const stdout = compileStdout || runStdout;
      const hasError = !!compileStderr || exitCode !== 0;

      const execResult: ExecutionResult = { stdout, stderr, exitCode, hasError };
      setResult(execResult);
      onResult?.(execResult);
    } catch (err) {
      const execResult: ExecutionResult = {
        stdout: "",
        stderr: err instanceof Error ? err.message : "Failed to reach execution service",
        exitCode: 1,
        hasError: true,
      };
      setResult(execResult);
      onResult?.(execResult);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, config, onResult]);

  const label = buttonLabel ?? `Run ${config.displayName}`;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          onClick={runCode}
          disabled={isRunning || !code.trim()}
          size="sm"
          variant={result?.hasError ? "destructive" : "default"}
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              {label}
            </>
          )}
        </Button>

        {result && !result.hasError && (
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Executed successfully
          </span>
        )}
        {result?.hasError && (
          <span className="flex items-center gap-1 text-xs text-destructive font-medium">
            <XCircle className="h-3.5 w-3.5" />
            Execution error
          </span>
        )}

        {showConsole && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(false)}
            className="gap-1 ml-auto"
          >
            <X className="h-4 w-4" />
            Hide
          </Button>
        )}
      </div>

      {showConsole && (
        <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {config.displayName} Output
            </span>
            {result && (
              <span className={cn(
                "ml-auto text-xs font-mono px-1.5 py-0.5 rounded",
                result.hasError
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}>
                exit {result.exitCode}
              </span>
            )}
          </div>
          <div className="p-3 min-h-[80px] max-h-[220px] overflow-auto font-mono text-sm">
            {isRunning && (
              <span className="text-muted-foreground animate-pulse">Running…</span>
            )}
            {!isRunning && result && (
              <>
                {result.stdout && (
                  <pre className="text-foreground whitespace-pre-wrap">{result.stdout}</pre>
                )}
                {result.stderr && (
                  <pre className="text-destructive whitespace-pre-wrap">{result.stderr}</pre>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-muted-foreground">(no output)</span>
                )}
              </>
            )}
            {!isRunning && !result && (
              <span className="text-muted-foreground">
                Click &quot;{label}&quot; to execute
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeExecutor;
