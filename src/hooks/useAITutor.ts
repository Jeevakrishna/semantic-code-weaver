import { useState, useCallback } from "react";

type TutorLevel = "beginner" | "intermediate" | "advanced";

interface UseTutorOptions {
  code: string;
  language: string;
  level: TutorLevel;
}

export function useAITutor() {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const analyze = useCallback(async ({ code, language, level }: UseTutorOptions, prompt = "") => {
    if (!code.trim()) return;
    setIsLoading(true);
    setResponse("");

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ code, language, level, prompt }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setResponse(accumulated);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      setResponse(`**Error:** ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResponse("");
  }, []);

  return { response, isLoading, analyze, clear };
}
