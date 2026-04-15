import { useState } from "react";
import { Download, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  sourceCode: string;
  translatedCode: string;
  sourceLanguage: string;
  targetLanguage: string;
}

function generateHTMLReport(
  sourceCode: string,
  translatedCode: string,
  sourceLanguage: string,
  targetLanguage: string
): string {
  const now = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Code Translation Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #1a1a1a; padding-bottom: 4px; margin: 32px 0 16px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 32px; font-family: monospace; }
  .code-block { background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 16px; font-family: 'Fira Code', 'Consolas', monospace; font-size: 13px; white-space: pre-wrap; overflow-x: auto; margin-bottom: 24px; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #666; font-family: monospace; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .section { margin-bottom: 24px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; }
  @media print { body { padding: 20px; } .grid { grid-template-columns: 1fr; } }
  @page { margin: 1.5cm; }
</style>
</head>
<body>
  <h1>Code Translation Report</h1>
  <div class="meta">${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()} &nbsp;|&nbsp; ${now}</div>

  <h2>Source Code (${sourceLanguage})</h2>
  <div class="code-block">${escapeHtml(sourceCode)}</div>

  <h2>Translated Code (${targetLanguage})</h2>
  <div class="code-block">${escapeHtml(translatedCode)}</div>

  <h2>Translation Summary</h2>
  <div class="grid">
    <div class="section">
      <div class="label">Source</div>
      <p>${sourceCode.split("\n").length} lines &middot; ${sourceLanguage}</p>
    </div>
    <div class="section">
      <div class="label">Target</div>
      <p>${translatedCode.split("\n").filter(l => l.trim()).length} lines &middot; ${targetLanguage}</p>
    </div>
  </div>

  <div class="footer">
    Semantic Preserving Code Translation Using Small Language Model &middot; Generated Report
  </div>
</body>
</html>`;
}

const ExportReport = ({ sourceCode, translatedCode, sourceLanguage, targetLanguage }: Props) => {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const html = generateHTMLReport(sourceCode, translatedCode, sourceLanguage, targetLanguage);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `translation-report-${sourceLanguage}-to-${targetLanguage}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded! Open in browser and print to PDF.");
    } catch (err) {
      toast.error("Failed to generate report");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <FileText className="h-6 w-6 text-muted-foreground opacity-50" />
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        Download a clean report with code, notes & analysis
      </p>
      <Button
        onClick={handleExport}
        disabled={generating}
        variant="outline"
        className="gap-2 border-2 border-border font-mono uppercase text-xs tracking-widest"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Export Report (HTML → PDF)
      </Button>
    </div>
  );
};

export default ExportReport;
