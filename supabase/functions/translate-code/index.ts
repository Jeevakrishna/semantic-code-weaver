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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Translate the following ${sourceLangName} code to ${targetLangName}:\n\n${sourceCode}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Translation service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
