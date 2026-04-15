import { useState, useEffect } from "react";
import { Loader2, HelpCircle, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Props {
  sourceCode: string;
  translatedCode: string;
  sourceLanguage: string;
  targetLanguage: string;
}

const TranslationQuiz = ({ sourceCode, translatedCode, sourceLanguage, targetLanguage }: Props) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const fetchQuiz = async () => {
    setLoading(true);
    setQuestions([]);
    setCurrent(0);
    setScore(0);
    setAnswered(0);
    setSelected(null);
    setRevealed(false);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ sourceCode, translatedCode, sourceLanguage, targetLanguage }),
        }
      );
      if (!resp.ok) throw new Error("Failed to generate quiz");
      const json = await resp.json();
      setQuestions(json.questions || []);
    } catch (err) {
      toast.error("Failed to generate quiz");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setQuestions([]);
  }, [sourceCode, translatedCode]);

  const handleAnswer = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
  };

  const handleReveal = () => {
    if (selected === null) return;
    setRevealed(true);
    setAnswered((a) => a + 1);
    if (selected === questions[current].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    setCurrent((c) => c + 1);
    setSelected(null);
    setRevealed(false);
  };

  const isFinished = answered === questions.length && questions.length > 0;

  if (!questions.length && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <HelpCircle className="h-6 w-6 text-muted-foreground opacity-50" />
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Test your understanding of the translation
        </p>
        <Button onClick={fetchQuiz} variant="outline" className="gap-2 border-2 border-border font-mono uppercase text-xs tracking-widest">
          <HelpCircle className="h-4 w-4" /> Generate Quiz
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Generating quiz…</span>
      </div>
    );
  }

  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-4xl font-black">{pct}%</div>
        <p className="text-sm font-mono text-muted-foreground">
          {score}/{questions.length} correct
        </p>
        <div className={cn(
          "text-xs font-mono uppercase tracking-widest px-3 py-1 border-2",
          pct >= 80 ? "border-primary bg-primary/10 text-primary" :
          pct >= 50 ? "border-border bg-accent text-accent-foreground" :
          "border-destructive bg-destructive/10 text-destructive"
        )}>
          {pct >= 80 ? "EXCELLENT" : pct >= 50 ? "GOOD EFFORT" : "KEEP LEARNING"}
        </div>
        <Button onClick={fetchQuiz} variant="outline" className="gap-2 border-2 border-border font-mono uppercase text-xs tracking-widest mt-2">
          <RotateCcw className="h-4 w-4" /> Retry Quiz
        </Button>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-widest">
        <span>Question {current + 1}/{questions.length}</span>
        <span>Score: {score}/{answered}</span>
      </div>

      {/* Question */}
      <div className="border-2 border-border p-4" style={{ boxShadow: "3px 3px 0px 0px hsl(var(--border))" }}>
        <p className="text-sm font-bold mb-4">{q.question}</p>

        <div className="grid gap-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selected;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={cn(
                  "text-left px-3 py-2 border-2 text-sm font-mono transition-colors",
                  revealed && isCorrect && "border-primary bg-primary/10 text-primary",
                  revealed && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                  !revealed && isSelected && "border-primary bg-primary/5",
                  !revealed && !isSelected && "border-border hover:border-primary/50",
                  revealed && !isSelected && !isCorrect && "opacity-50"
                )}
              >
                <div className="flex items-center gap-2">
                  {revealed && isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="h-4 w-4 shrink-0" />}
                  <span>{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-3 p-3 border-2 border-border bg-muted/30 text-sm">
            <span className="font-bold text-xs font-mono uppercase tracking-widest text-primary">📘 Explanation: </span>
            {q.explanation}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {!revealed ? (
          <Button onClick={handleReveal} disabled={selected === null} className="font-mono uppercase text-xs tracking-widest">
            Check Answer
          </Button>
        ) : current < questions.length - 1 ? (
          <Button onClick={handleNext} className="font-mono uppercase text-xs tracking-widest">
            Next Question →
          </Button>
        ) : (
          <Button onClick={handleNext} className="font-mono uppercase text-xs tracking-widest">
            See Results
          </Button>
        )}
      </div>
    </div>
  );
};

export default TranslationQuiz;
