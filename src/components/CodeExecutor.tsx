/**
 * CodeExecutor — runs code without external paid APIs
 *  • C++    → Wandbox public API (free, no auth)
 *  • Python → Pyodide (in-browser WASM, no network call)
 */
import { useState, useCallback, useRef } from "react";
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
  onResult?: (result: ExecutionResult) => void;
  buttonLabel?: string;
}

// ─── Wandbox (C++) ────────────────────────────────────────────────────────────
const WANDBOX_URL = "https://wandbox.org/api/compile.json";

async function runCpp(code: string): Promise<ExecutionResult> {
  const res = await fetch(WANDBOX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compiler: "gcc-head",
      code,
      options: "warning,c++17",
      stdin: "",
    }),
  });

  if (!res.ok) {
    throw new Error(`Wandbox error: ${res.status} — ${await res.text()}`);
  }

  const data = await res.json();
  const stdout: string = data.program_output ?? "";
  const compilerError: string = data.compiler_error ?? "";
  const programError: string = data.program_error ?? "";
  const stderr = compilerError || programError;
  const exitCode: number = parseInt(data.status ?? "0", 10);
  const hasError = !!compilerError || exitCode !== 0;

  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode, hasError };
}

// ─── Pyodide (Python in-browser) ─────────────────────────────────────────────
interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (opts: { batched: (t: string) => void }) => void;
  setStderr: (opts: { batched: (t: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: () => Promise<PyodideInterface>;
    pyodide?: PyodideInterface;
  }
}

let pyodideInstance: PyodideInterface | null = null;

async function ensurePyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;

  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load Pyodide"));
      document.head.appendChild(s);
    });
  }

  pyodideInstance = await window.loadPyodide!();
  return pyodideInstance;
}

async function runPython(code: string): Promise<ExecutionResult> {
  const pyodide = await ensurePyodide();

  let stdout = "";
  let stderr = "";

  pyodide.setStdout({ batched: (t) => { stdout += t + "\n"; } });
  pyodide.setStderr({ batched: (t) => { stderr += t + "\n"; } });

  try {
    const result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null) stdout += String(result);
    return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0, hasError: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { stdout: stdout.trim(), stderr: msg, exitCode: 1, hasError: true };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
const DISPLAY: Record<ExecutionLanguage, string> = {
  cpp: "C++",
  python: "Python",
};

const CodeExecutor = ({ code, language, className, onResult, buttonLabel }: CodeExecutorProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  const label = buttonLabel ?? `Run ${DISPLAY[language]}`;

  const runCode = useCallback(async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setShowConsole(true);
    setResult(null);
    setLoadingMsg(language === "python" ? "Loading Python runtime…" : "Compiling…");

    try {
      const execResult = language === "cpp" ? await runCpp(code) : await runPython(code);
      setResult(execResult);
      onResult?.(execResult);
    } catch (err) {
      const execResult: ExecutionResult = {
        stdout: "",
        stderr: err instanceof Error ? err.message : "Execution failed",
        exitCode: 1,
        hasError: true,
      };
      setResult(execResult);
      onResult?.(execResult);
    } finally {
      setIsRunning(false);
      setLoadingMsg("");
    }
  }, [code, language, onResult]);

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
              {loadingMsg || "Running…"}
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
            Success
          </span>
        )}
        {result?.hasError && (
          <span className="flex items-center gap-1 text-xs text-destructive font-medium">
            <XCircle className="h-3.5 w-3.5" />
            Error
          </span>
        )}

        {showConsole && (
          <Button variant="ghost" size="sm" onClick={() => setShowConsole(false)} className="gap-1 ml-auto">
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
              {DISPLAY[language]} Output
            </span>
            {result && (
              <span className={cn(
                "ml-auto text-xs font-mono px-1.5 py-0.5 rounded",
                result.hasError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
              )}>
                exit {result.exitCode}
              </span>
            )}
          </div>
          <div className="p-3 min-h-[80px] max-h-[220px] overflow-auto font-mono text-sm">
            {isRunning && (
              <span className="text-muted-foreground animate-pulse">{loadingMsg || "Running…"}</span>
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
              <span className="text-muted-foreground">Click &quot;{label}&quot; to execute</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeExecutor;
