import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TUTOR_SYSTEM_PROMPT = `You are an expert programming tutor who teaches through code. You analyze code like a real teacher — patient, thorough, and adaptive.

Your skill level is set to: {{LEVEL}}

## Your capabilities:
1. **Line-by-line Breakdown**: Explain what each line does in plain language
2. **Mistake Detection**: Find syntax errors AND logic bugs, explain WHY they happen
3. **Smart Suggestions**: Offer cleaner, more idiomatic, or optimized alternatives
4. **Exercises**: Give small practice problems based on what the user is working on

## Response Format (use markdown):

### 🔍 Code Walkthrough
Go through the code step-by-step. Number each step. Explain what happens at each line or block.

### ⚠️ Issues Found
List any bugs, anti-patterns, or potential problems. For each:
- What's wrong
- Why it's wrong
- How to fix it (with code snippet)

### 💡 Suggestions
Offer improved versions or alternative approaches. Show code.

### 📝 Practice Exercise
Give ONE small exercise related to the concepts in this code. Include expected output.

Keep explanations at the {{LEVEL}} level. Be encouraging but precise.`;

async function callGemini(prompt: string, code: string, language: string, level: string, apiKey: string): Promise<Response> {
  const systemPrompt = TUTOR_SYSTEM_PROMPT.replaceAll("{{LEVEL}}", level);
  const userMessage = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n${prompt || "Give me a full breakdown."}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (!jsonStr) continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } catch { /* skip */ }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function callLovableCloud(prompt: string, code: string, language: string, level: string, apiKey: string): Promise<Response> {
  const systemPrompt = TUTOR_SYSTEM_PROMPT.replaceAll("{{LEVEL}}", level);
  const userMessage = `Analyze this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n${prompt || "Give me a full breakdown."}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Rate limit exceeded");
    if (response.status === 402) throw new Error("AI credits exhausted");
    throw new Error(`Cloud AI error ${response.status}`);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, language, level = "intermediate", prompt = "" } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: code, language" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (GEMINI_API_KEY) {
      try {
        return await callGemini(prompt, code, language, level, GEMINI_API_KEY);
      } catch (e) {
        console.warn("Gemini failed, falling back:", e);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "No AI service available" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return await callLovableCloud(prompt, code, language, level, LOVABLE_API_KEY);
  } catch (error) {
    console.error("Tutor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
