import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Terminal, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PythonExecutorProps {
  code: string;
  className?: string;
}

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
}

declare global {
  interface Window {
    loadPyodide?: () => Promise<PyodideInterface>;
    pyodide?: PyodideInterface;
  }
}

const PythonExecutor = ({ code, className }: PythonExecutorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPyodideLoading, setIsPyodideLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showConsole, setShowConsole] = useState(false);
  const pyodideRef = useRef<PyodideInterface | null>(null);

  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;

    setIsPyodideLoading(true);
    try {
      // Load Pyodide script if not already loaded
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Pyodide"));
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide!();
      pyodideRef.current = pyodide;
      return pyodide;
    } finally {
      setIsPyodideLoading(false);
    }
  }, []);

  const runCode = async () => {
    if (!code.trim()) {
      setError("No code to execute");
      setShowConsole(true);
      return;
    }

    setIsLoading(true);
    setOutput("");
    setError("");
    setShowConsole(true);

    try {
      const pyodide = await loadPyodide();
      
      let stdout = "";
      let stderr = "";

      pyodide.setStdout({
        batched: (text: string) => {
          stdout += text + "\n";
        },
      });

      pyodide.setStderr({
        batched: (text: string) => {
          stderr += text + "\n";
        },
      });

      const result = await pyodide.runPythonAsync(code);
      
      let finalOutput = stdout;
      if (result !== undefined && result !== null) {
        finalOutput += String(result);
      }
      
      setOutput(finalOutput.trim() || "Code executed successfully (no output)");
      if (stderr) {
        setError(stderr.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <Button
          onClick={runCode}
          disabled={isLoading || isPyodideLoading || !code.trim()}
          size="sm"
          className="gap-2"
        >
          {isLoading || isPyodideLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isPyodideLoading ? "Loading Python..." : "Running..."}
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Python
            </>
          )}
        </Button>
        {showConsole && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConsole(false)}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Hide Console
          </Button>
        )}
      </div>

      {showConsole && (
        <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Output</span>
          </div>
          <div className="p-3 min-h-[100px] max-h-[200px] overflow-auto">
            {output && (
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                {output}
              </pre>
            )}
            {error && (
              <pre className="text-sm font-mono text-destructive whitespace-pre-wrap">
                {error}
              </pre>
            )}
            {!output && !error && !isLoading && (
              <span className="text-sm text-muted-foreground">
                Click "Run Python" to execute the code
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PythonExecutor;
