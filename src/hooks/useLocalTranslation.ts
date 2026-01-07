/**
 * Hook for local SLM-based code translation
 * Integrates AST parsing, IR generation, and WebLLM inference
 */

import { useState, useCallback, useRef } from "react";
import { Language } from "@/components/LanguageSelector";
import {
  parseCode,
  astToIR,
  createIRPrompt,
  IntermediateRepresentation,
} from "@/lib/ast-parser";
import {
  initEngine,
  translateWithSLM,
  isEngineReady,
  isEngineInitializing,
  getModelInfo,
  checkWebGPUSupport,
} from "@/lib/webllm-engine";
import type { InitProgress } from "@/lib/webllm-engine";

export type TranslationMode = "local" | "cloud";

export interface TranslationState {
  isTranslating: boolean;
  isLoadingModel: boolean;
  modelProgress: InitProgress | null;
  translatedCode: string;
  error: string | null;
  ir: IntermediateRepresentation | null;
  mode: TranslationMode;
  webGPUSupported: boolean | null;
}

export interface UseLocalTranslationReturn extends TranslationState {
  translate: (
    sourceCode: string,
    sourceLanguage: Language,
    targetLanguage: Language
  ) => Promise<string>;
  initializeModel: () => Promise<void>;
  setMode: (mode: TranslationMode) => void;
  isModelReady: boolean;
  modelInfo: ReturnType<typeof getModelInfo>;
  checkSupport: () => Promise<boolean>;
}

export function useLocalTranslation(): UseLocalTranslationReturn {
  const [state, setState] = useState<TranslationState>({
    isTranslating: false,
    isLoadingModel: false,
    modelProgress: null,
    translatedCode: "",
    error: null,
    ir: null,
    mode: "cloud", // Default to cloud for reliability
    webGPUSupported: null,
  });

  const translatedCodeRef = useRef("");

  const checkSupport = useCallback(async (): Promise<boolean> => {
    const supported = await checkWebGPUSupport();
    setState((prev) => ({ ...prev, webGPUSupported: supported }));
    return supported;
  }, []);

  const initializeModel = useCallback(async (): Promise<void> => {
    if (isEngineReady() || isEngineInitializing()) return;

    setState((prev) => ({
      ...prev,
      isLoadingModel: true,
      error: null,
      modelProgress: { progress: 0, text: "Checking WebGPU support..." },
    }));

    try {
      const supported = await checkWebGPUSupport();
      if (!supported) {
        throw new Error(
          "WebGPU is not supported. Please use Chrome 113+ or Edge 113+."
        );
      }

      await initEngine((progress) => {
        setState((prev) => ({
          ...prev,
          modelProgress: progress,
        }));
      });

      setState((prev) => ({
        ...prev,
        isLoadingModel: false,
        modelProgress: null,
        mode: "local",
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoadingModel: false,
        modelProgress: null,
        error: error instanceof Error ? error.message : "Failed to load model",
      }));
      throw error;
    }
  }, []);

  const setMode = useCallback((mode: TranslationMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const translateLocal = useCallback(
    async (
      sourceCode: string,
      sourceLanguage: Language,
      targetLanguage: Language,
      onToken: (code: string) => void
    ): Promise<string> => {
      // Step 1: Parse source code to AST
      const tree = await parseCode(sourceCode, sourceLanguage);

      // Step 2: Convert AST to IR
      const ir = astToIR(tree, sourceLanguage, sourceCode);
      setState((prev) => ({ ...prev, ir }));

      // Step 3: Create structured prompt from IR
      const irPrompt = createIRPrompt(ir, targetLanguage);

      // Step 4: Translate using local SLM
      translatedCodeRef.current = "";
      const result = await translateWithSLM(irPrompt, (token) => {
        translatedCodeRef.current += token;
        onToken(translatedCodeRef.current);
      });

      return result;
    },
    []
  );

  const translateCloud = useCallback(
    async (
      sourceCode: string,
      sourceLanguage: Language,
      targetLanguage: Language,
      onToken: (code: string) => void
    ): Promise<string> => {
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
              onToken(result);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      return result;
    },
    []
  );

  const translate = useCallback(
    async (
      sourceCode: string,
      sourceLanguage: Language,
      targetLanguage: Language
    ): Promise<string> => {
      setState((prev) => ({
        ...prev,
        isTranslating: true,
        error: null,
        translatedCode: "",
        ir: null,
      }));

      try {
        const onToken = (code: string) => {
          setState((prev) => ({ ...prev, translatedCode: code }));
        };

        let result: string;

        if (state.mode === "local" && isEngineReady()) {
          result = await translateLocal(
            sourceCode,
            sourceLanguage,
            targetLanguage,
            onToken
          );
        } else {
          result = await translateCloud(
            sourceCode,
            sourceLanguage,
            targetLanguage,
            onToken
          );
        }

        setState((prev) => ({
          ...prev,
          isTranslating: false,
          translatedCode: result,
        }));

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Translation failed";
        setState((prev) => ({
          ...prev,
          isTranslating: false,
          error: errorMessage,
        }));
        throw error;
      }
    },
    [state.mode, translateLocal, translateCloud]
  );

  return {
    ...state,
    translate,
    initializeModel,
    setMode,
    isModelReady: isEngineReady(),
    modelInfo: getModelInfo(),
    checkSupport,
  };
}
