/**
 * WebLLM Engine for in-browser code translation
 * Uses Qwen2.5-Coder for offline SLM inference
 */

import * as webllm from "@mlc-ai/web-llm";
import { Language } from "@/components/LanguageSelector";

// Engine singleton
let engine: webllm.MLCEngine | null = null;
let isInitializing = false;
let initPromise: Promise<webllm.MLCEngine> | null = null;

// Model configuration
// Using Qwen2.5-Coder as it's available and optimized for code tasks
const MODEL_ID = "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC";

export interface InitProgress {
  progress: number;
  text: string;
  timeElapsed?: number;
}

export type ProgressCallback = (progress: InitProgress) => void;

/**
 * Get available model info
 */
export function getModelInfo() {
  return {
    id: MODEL_ID,
    name: "Qwen2.5 Coder 1.5B",
    description: "Optimized for code generation and translation tasks",
    size: "~1.2GB download",
  };
}

/**
 * Check if WebGPU is supported
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter = await (navigator as any).gpu?.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

/**
 * Initialize the WebLLM engine
 */
export async function initEngine(
  onProgress?: ProgressCallback
): Promise<webllm.MLCEngine> {
  // Return existing engine if ready
  if (engine) return engine;

  // Return existing initialization promise if in progress
  if (initPromise) return initPromise;

  // Check WebGPU support
  const hasWebGPU = await checkWebGPUSupport();
  if (!hasWebGPU) {
    throw new Error(
      "WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+."
    );
  }

  isInitializing = true;

  initPromise = (async () => {
    try {
      const newEngine = await webllm.CreateMLCEngine(MODEL_ID, {
        initProgressCallback: (report) => {
          onProgress?.({
            progress: report.progress,
            text: report.text,
            timeElapsed: report.timeElapsed,
          });
        },
      });

      engine = newEngine;
      isInitializing = false;
      return engine;
    } catch (error) {
      isInitializing = false;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if engine is ready
 */
export function isEngineReady(): boolean {
  return engine !== null;
}

/**
 * Check if engine is currently initializing
 */
export function isEngineInitializing(): boolean {
  return isInitializing;
}

/**
 * Translate code using the local SLM
 */
export async function translateWithSLM(
  irPrompt: string,
  onToken?: (token: string) => void
): Promise<string> {
  if (!engine) {
    throw new Error("Engine not initialized. Call initEngine() first.");
  }

  const systemPrompt = `You are an expert code translator. You receive code in an Intermediate Representation (IR) format and must translate it to the specified target language.

CRITICAL RULES:
1. Output ONLY the translated code - no explanations, no markdown
2. Preserve exact functionality and semantics
3. Use idiomatic patterns of the target language
4. Include necessary imports/includes
5. Handle type conversions appropriately
6. The code must be syntactically correct and runnable`;

  let result = "";

  const completion = await engine.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: irPrompt },
    ],
    temperature: 0.1, // Low temperature for more deterministic code output
    max_tokens: 2048,
    stream: true,
  });

  for await (const chunk of completion) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      result += token;
      onToken?.(token);
    }
  }

  return cleanCodeOutput(result);
}

/**
 * Clean the model output to extract just the code
 */
function cleanCodeOutput(output: string): string {
  let cleaned = output.trim();

  // Remove markdown code blocks if present
  const codeBlockMatch = cleaned.match(/```[\w]*\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Remove any leading/trailing explanation text
  const lines = cleaned.split("\n");
  const codeStartPatterns = [
    /^#include/,
    /^import/,
    /^from\s+\w+\s+import/,
    /^package/,
    /^public\s+class/,
    /^class\s+/,
    /^def\s+/,
    /^function\s+/,
    /^const\s+/,
    /^let\s+/,
    /^var\s+/,
    /^\/\//,
    /^\/\*/,
    /^#/,
  ];

  let startIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (codeStartPatterns.some((pattern) => pattern.test(lines[i].trim()))) {
      startIndex = i;
      break;
    }
  }

  return lines.slice(startIndex).join("\n").trim();
}

/**
 * Get engine statistics
 */
export async function getEngineStats(): Promise<{
  tokensPerSecond: number;
  memoryUsage?: number;
} | null> {
  if (!engine) return null;

  try {
    const stats = await engine.runtimeStatsText();
    const tpsMatch = stats.match(/(\d+\.?\d*)\s*tok\/s/);
    return {
      tokensPerSecond: tpsMatch ? parseFloat(tpsMatch[1]) : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Unload the engine to free memory
 */
export async function unloadEngine(): Promise<void> {
  if (engine) {
    await engine.unload();
    engine = null;
    initPromise = null;
  }
}
