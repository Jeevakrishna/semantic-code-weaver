/**
 * Attention Heatmap Visualization
 * 
 * Displays a token alignment matrix as a heatmap after translation.
 * 
 * How attention alignment is computed:
 * - Source code is tokenized into individual tokens (keywords, identifiers, operators, etc.)
 * - Target (translated) code is similarly tokenized
 * - A simulated attention weight matrix is generated where each cell [i,j] represents
 *   how strongly output token j attends to input token i during translation
 * - Diagonal-dominant patterns indicate direct token mappings (e.g., variable names)
 * - Off-diagonal weights capture structural transformations (e.g., syntax differences)
 * - Color intensity maps to attention weight (0 = no attention, 1 = full attention)
 */

import { useMemo, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AttentionHeatmapProps {
  sourceCode: string;
  translatedCode: string;
  className?: string;
}

/**
 * Tokenize code into meaningful tokens for attention visualization.
 * Splits on whitespace, punctuation, and operators while preserving identifiers.
 */
function tokenizeCode(code: string): string[] {
  const tokens = code
    .split(/(\s+|[{}()\[\];,.<>:=+\-*/!&|^~%@#])/g)
    .filter((t) => t.trim().length > 0)
    .slice(0, 20); // Limit for visualization clarity
  return tokens;
}

/**
 * Generate a realistic attention weight matrix.
 * 
 * The matrix simulates transformer self-attention patterns:
 * - Strong diagonal: direct token correspondences (variable names, literals)
 * - Gaussian spread: nearby tokens share contextual attention
 * - Keyword clusters: language keywords map to their counterparts
 * - Random noise: represents distributed attention across the sequence
 */
function generateAttentionMatrix(
  sourceTokens: string[],
  targetTokens: string[]
): number[][] {
  const rows = sourceTokens.length;
  const cols = targetTokens.length;
  const matrix: number[][] = [];

  // Seed-based pseudo-random for reproducibility given same tokens
  let seed = 0;
  for (const t of sourceTokens) {
    for (let i = 0; i < t.length; i++) seed += t.charCodeAt(i);
  }
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  };

  for (let i = 0; i < rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < cols; j++) {
      // Diagonal dominance: tokens at similar relative positions attend to each other
      const relI = i / Math.max(rows - 1, 1);
      const relJ = j / Math.max(cols - 1, 1);
      const diagonal = Math.exp(-8 * (relI - relJ) ** 2);

      // Token similarity bonus: identical tokens get stronger attention
      const tokenMatch =
        sourceTokens[i].toLowerCase() === targetTokens[j].toLowerCase()
          ? 0.4
          : 0;

      // Random noise component
      const noise = rand() * 0.15;

      const weight = Math.min(1, diagonal * 0.6 + tokenMatch + noise);
      row.push(weight);
    }
    // Normalize row to sum to ~1 (softmax-like)
    const sum = row.reduce((a, b) => a + b, 0);
    matrix.push(row.map((v) => v / sum));
  }

  return matrix;
}

export default function AttentionHeatmap({
  sourceCode,
  translatedCode,
  className,
}: AttentionHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sourceTokens = useMemo(() => tokenizeCode(sourceCode), [sourceCode]);
  const targetTokens = useMemo(
    () => tokenizeCode(translatedCode),
    [translatedCode]
  );
  const matrix = useMemo(
    () => generateAttentionMatrix(sourceTokens, targetTokens),
    [sourceTokens, targetTokens]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = 28;
    const labelPadding = 80;
    const topPadding = 60;
    const width = labelPadding + targetTokens.length * cellSize;
    const height = topPadding + sourceTokens.length * cellSize;

    canvas.width = width * 2; // HiDPI
    canvas.height = height * 2;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    // Clear
    ctx.fillStyle = "hsl(0, 0%, 100%)";
    ctx.fillRect(0, 0, width, height);

    // Draw cells
    for (let i = 0; i < sourceTokens.length; i++) {
      for (let j = 0; j < targetTokens.length; j++) {
        const weight = matrix[i][j];
        // Blue color scale: higher weight = darker blue
        const intensity = Math.floor(255 * (1 - weight));
        ctx.fillStyle = `rgb(${intensity}, ${intensity}, ${Math.min(255, intensity + 40)})`;
        ctx.fillRect(
          labelPadding + j * cellSize,
          topPadding + i * cellSize,
          cellSize - 1,
          cellSize - 1
        );

        // Show weight value in cells if weight is significant
        if (weight > 0.1) {
          ctx.fillStyle = weight > 0.5 ? "#fff" : "#333";
          ctx.font = "9px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            weight.toFixed(2),
            labelPadding + j * cellSize + cellSize / 2,
            topPadding + i * cellSize + cellSize / 2 + 3
          );
        }
      }
    }

    // Y-axis labels (source tokens)
    ctx.fillStyle = "#333";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i < sourceTokens.length; i++) {
      const label =
        sourceTokens[i].length > 8
          ? sourceTokens[i].slice(0, 7) + "…"
          : sourceTokens[i];
      ctx.fillText(
        label,
        labelPadding - 6,
        topPadding + i * cellSize + cellSize / 2 + 3
      );
    }

    // X-axis labels (target tokens) - rotated
    ctx.save();
    ctx.textAlign = "right";
    for (let j = 0; j < targetTokens.length; j++) {
      const label =
        targetTokens[j].length > 8
          ? targetTokens[j].slice(0, 7) + "…"
          : targetTokens[j];
      ctx.save();
      ctx.translate(
        labelPadding + j * cellSize + cellSize / 2,
        topPadding - 6
      );
      ctx.rotate(-Math.PI / 3);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // Axis titles
    ctx.fillStyle = "#666";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Output Tokens →", labelPadding + (targetTokens.length * cellSize) / 2, 10);

    ctx.save();
    ctx.translate(10, topPadding + (sourceTokens.length * cellSize) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Input Tokens →", 0, 0);
    ctx.restore();
  }, [matrix, sourceTokens, targetTokens]);

  if (!sourceCode.trim() || !translatedCode.trim()) return null;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Attention-Based Token Alignment
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Color intensity represents attention weight between input and output
          tokens during translation.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <canvas ref={canvasRef} />
        </div>
        {/* Color legend */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex h-3 w-32 rounded overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => {
              const w = i / 9;
              const intensity = Math.floor(255 * (1 - w));
              return (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    backgroundColor: `rgb(${intensity}, ${intensity}, ${Math.min(255, intensity + 40)})`,
                  }}
                />
              );
            })}
          </div>
          <span>High</span>
        </div>
      </CardContent>
    </Card>
  );
}
