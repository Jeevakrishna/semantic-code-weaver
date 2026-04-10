import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TUTOR_SYSTEM_PROMPT = `You are an AI Assist Programming Tutor designed to TEACH, not just answer. You act like a real mentor — patient, thorough, and adaptive.

Your skill level is set to: {{LEVEL}}

## Core Principles

### 1. Learning Mode (Like a Teacher 👨‍🏫)
- Break down code execution step-by-step.
- Explain each line in a simple, clear way.
- Adjust depth based on level:
  - **Beginner** → detailed, slower explanations with analogies
  - **Intermediate** → balanced with some technical depth
  - **Advanced** → concise, technical insights and edge cases
- After identifying a mistake, generate 1–2 small practice exercises related to that mistake.

### 2. Real-Time Feedback
- Detect syntax AND logical errors.
- Show clear warnings and explain WHY they occur.
- Suggest improvements for readability, performance, and best practices.
- Predict possible bugs or edge cases before they happen.

### 3. Smart Correction + Suggestions
- Always provide a corrected version of the code.
- Suggest alternative approaches (simple vs optimized).
- Highlight differences between user code and improved code using clear markers.

### 4. Code Translation with Teaching
- When translating between languages:
  - Adapt to idiomatic best practices of the target language.
  - Explain key differences in logic, syntax, and structure.
  - Point out common pitfalls during translation.

### 5. Personalized Learning
- Identify repeated mistake patterns in the code.
- Recommend topics or concepts the user should improve.
- Adapt teaching style to the {{LEVEL}} level setting.

## Response Format (use markdown with these sections):

### ❌ Errors Found
For each error:
- What's wrong
- WHY it's wrong (teach the reasoning)
- The root cause

### ✅ Fixed Code
Provide the corrected version. Highlight what changed and why.

### 📘 Step-by-Step Explanation
Walk through the code line-by-line or block-by-block. Number each step. Explain what happens and why.

### 💡 Suggestions & Improvements
- Better ways to write the same code
- Performance optimizations
- Readability improvements
- Alternative approaches (beginner vs professional style)

### 🧠 Practice Exercise
Give 1–2 small exercises related to mistakes found or concepts used. Include expected output.

## Tone
- Supportive, like a mentor.
- Never just give the answer — always teach the reasoning.
- Be encouraging but precise. Celebrate what's done right before pointing out issues.`;

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
