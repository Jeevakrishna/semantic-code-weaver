import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPPORTED_LANGUAGES = ["cpp", "python", "java", "javascript"];

const LANGUAGE_NAMES: Record<string, string> = {
  cpp: "C++",
  python: "Python",
  java: "Java",
  javascript: "JavaScript",
};

async function translateWithGemini(
  systemPrompt: string,
  userMessage: string,
  apiKey: string
): Promise<Response> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  // Transform Gemini SSE stream → OpenAI-compatible SSE stream
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

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const openAIChunk = {
                choices: [{ delta: { content: text } }],
              };
              await writer.write(
                encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`)
              );
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (err) {
      console.error("Stream transform error:", err);
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

async function translateWithLovableCloud(
  systemPrompt: string,
  userMessage: string,
  lovableApiKey: string
): Promise<Response> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      stream: true,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted");
    }
    const errText = await response.text();
    throw new Error(`Cloud AI error ${response.status}: ${errText}`);
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceCode, sourceLanguage, targetLanguage } = await req.json();

    if (!sourceCode || !sourceLanguage || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sourceCode, sourceLanguage, targetLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPPORTED_LANGUAGES.includes(sourceLanguage) || !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return new Response(
        JSON.stringify({ error: "Unsupported language. Supported: cpp, python, java, javascript" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceLangName = LANGUAGE_NAMES[sourceLanguage];
    const targetLangName = LANGUAGE_NAMES[targetLanguage];

    const systemPrompt = `You are an expert code translator specializing in converting code between programming languages while preserving semantic meaning and functionality.

Your task is to translate ${sourceLangName} code to ${targetLangName} code.

CRITICAL RULES:
1. Preserve the exact functionality and logic of the original code
2. Use idiomatic patterns and conventions of the target language
3. Handle library/import differences appropriately (use equivalent libraries in the target language)
4. Include necessary imports/includes at the top
5. Add brief inline comments ONLY when a translation choice needs explanation (e.g., library substitution)
6. Maintain the same variable naming style when possible
7. Ensure the output is syntactically correct and runnable

RESPONSE FORMAT:
Return ONLY the translated code. Do not include any explanations, markdown code blocks, or additional text before or after the code.`;

    const userMessage = `Translate the following ${sourceLangName} code to ${targetLangName}:\n\n${sourceCode}`;

    // PRIMARY: Try Gemini API key first
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (GEMINI_API_KEY) {
      try {
        console.log("Using Gemini API key as primary translation source");
        return await translateWithGemini(systemPrompt, userMessage, GEMINI_API_KEY);
      } catch (geminiError) {
        console.warn("Gemini API failed, falling back to cloud:", geminiError);
        // Fall through to cloud fallback
      }
    } else {
      console.log("GEMINI_API_KEY not configured, using cloud source");
    }

    // FALLBACK: Use Lovable Cloud AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "No AI service available. Gemini API key missing and cloud AI not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    try {
      console.log("Using Lovable Cloud AI as fallback");
      return await translateWithLovableCloud(systemPrompt, userMessage, LOVABLE_API_KEY);
    } catch (cloudError) {
      const msg = cloudError instanceof Error ? cloudError.message : "Translation failed";
      return new Response(
        JSON.stringify({ error: msg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
