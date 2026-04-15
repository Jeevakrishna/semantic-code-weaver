import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a programming quiz generator. Given source code and its translation, generate conceptual multiple-choice questions that test the student's understanding of the translation and both languages.

## Response Format (JSON):
{
  "questions": [
    {
      "question": "The question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctIndex": 0,
      "explanation": "Why the correct answer is right and others are wrong"
    }
  ]
}

Generate exactly 5 questions. Mix question types:
- Language equivalence (e.g., "What is the Python equivalent of C++ vector?")
- Syntax differences
- Semantic understanding
- Edge cases and pitfalls
- Best practices

Make questions educational, not trivial.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sourceCode, translatedCode, sourceLanguage, targetLanguage } = await req.json();

    if (!sourceCode || !translatedCode) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const userMessage = `Source (${sourceLanguage}):\n\`\`\`${sourceLanguage}\n${sourceCode}\n\`\`\`\n\nTranslated (${targetLanguage}):\n\`\`\`${targetLanguage}\n${translatedCode}\n\`\`\`\n\nGenerate 5 quiz questions about this translation.`;

    let responseText = "";

    if (GEMINI_API_KEY) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    }

    if (!responseText && LOVABLE_API_KEY) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        responseText = data?.choices?.[0]?.message?.content || "";
      } else if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!responseText) {
      return new Response(JSON.stringify({ error: "No AI service available" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { questions: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-quiz error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
