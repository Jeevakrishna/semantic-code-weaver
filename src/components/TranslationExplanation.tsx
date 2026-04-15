import { useState, useEffect } from "react";
import { Loader2, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ExplanationNote {
  title: string;
  sourceConstruct: string;
  targetConstruct: string;
  explanation: string;
  category: string;
}

interface ExplanationData {
  notes: ExplanationNote[];
  summary: string;
}

interface Props {
  sourceCode: string;
  translatedCode: string;
  sourceLanguage: string;
  targetLanguage: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  syntax: "bg-primary/10 text-primary border-primary/30",
  types: "bg-accent/60 text-accent-foreground border-accent",
  "control-flow": "bg-secondary text-secondary-foreground border-border",
  "data-structures": "bg-muted text-muted-foreground border-border",
  idiom: "bg-primary/20 text-primary border-primary/40",
  io: "bg-accent/40 text-accent-foreground border-accent/60",
};

const TranslationExplanation = ({ sourceCode, translatedCode, sourceLanguage, targetLanguage }: Props) => {
  const [data, setData] = useState<ExplanationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchExplanation = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-translation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sourceCode, translatedCode, sourceLanguage, targetLanguage }),
        }
      );
      if (!resp.ok) throw new Error("Failed to fetch explanation");
      const json = await resp.json();
      setData(json);
    } catch (err) {
      toast.error("Failed to generate explanation");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setData(null);
  }, [sourceCode, translatedCode]);

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <BookOpen className="h-6 w-6 text-muted-foreground opacity-50" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          AI-powered syntax change notes
        </p>
        <Button onClick={fetchExplanation} variant="outline" className="gap-2 border-2 border-border font-mono uppercase text-xs tracking-widest">
          <BookOpen className="h-4 w-4" /> Generate Explanation
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Analyzing translation…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data?.summary && (
        <p className="text-sm font-mono text-muted-foreground border-l-4 border-primary pl-3">
          {data.summary}
        </p>
      )}

      <div className="grid gap-2">
        {data?.notes.map((note, i) => (
          <div
            key={i}
            className="border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="flex items-center gap-3 px-3 py-2">
              <span className={cn("text-[10px] font-bold font-mono uppercase px-1.5 py-0.5 border rounded-sm", CATEGORY_COLORS[note.category] || CATEGORY_COLORS.syntax)}>
                {note.category}
              </span>
              <span className="text-sm font-bold flex-1">{note.title}</span>
              <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                <code className="bg-muted px-1 py-0.5 rounded-sm text-[11px]">{note.sourceConstruct}</code>
                <ArrowRight className="h-3 w-3" />
                <code className="bg-muted px-1 py-0.5 rounded-sm text-[11px]">{note.targetConstruct}</code>
              </div>
            </div>
            {expanded === i && (
              <div className="px-3 pb-3 pt-1 border-t border-border bg-muted/30">
                <p className="text-sm text-foreground/80 leading-relaxed">{note.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranslationExplanation;
