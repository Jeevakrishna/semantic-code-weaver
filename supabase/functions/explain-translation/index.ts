import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert programming educator. Given source code and its translation to another language, generate educational notes explaining the key syntax and semantic changes.

## Response Format (JSON):
Return a JSON object with this structure:
{
  "notes": [
    {
      "title": "Short title of the change",
      "sourceConstruct": "The original syntax/construct",
      "targetConstruct": "The translated syntax/construct",
      "explanation": "Why this change was made — explain the language difference",
      "category": "syntax|types|control-flow|data-structures|idiom|io"
    }
  ],
  "summary": "A 1-2 sentence overall summary of the translation"
}

Be specific, educational, and practical. Focus on the most important differences. Include 4-8 notes.`;

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

    const userMessage = `Source (${sourceLanguage}):\n\`\`\`${sourceLanguage}\n${sourceCode}\n\`\`\`\n\nTranslated (${targetLanguage}):\n\`\`\`${targetLanguage}\n${translatedCode}\n\`\`\`\n\nExplain all the key syntax and semantic changes in the translation.`;

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
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
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
      } else if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!responseText) {
      return new Response(JSON.stringify({ error: "No AI service available" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { notes: [], summary: responseText };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("explain-translation error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
