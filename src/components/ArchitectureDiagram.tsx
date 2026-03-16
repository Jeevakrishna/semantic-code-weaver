/**
 * System Architecture Diagram
 * 
 * Renders a clean SVG flow diagram showing the translation pipeline:
 * Input Code → Tokenization → Small Language Model → Translation Output
 * → Semantic Verifier → Visualization Layer
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STAGES = [
  {
    label: "INPUT CODE ",
    description: "Source language",
    icon: "",
  },
  {
    label: "TOKENIZATION",
    description: "AST → IR",
    icon: "",
  },
  {
    label: "SMALL LANGUAGE MODEL",
    description: "WebLLM / Cloud AI",
    icon: "",
  },
  {
    label: "TRANSLATION OUTPUT",
    description: "Target language",
    icon: "",
  },
  {
    label: "SEMANTIC VERIFIER",
    description: "Output validation",
    icon: "",
  },
  {
    label: "VISUALIZATION LAYER",
    description: "Heatmaps & metrics",
    icon: "",
  },
];

export default function ArchitectureDiagram({ className }: { className?: string }) {
  const boxWidth = 240;
  const boxHeight = 56;
  const gap = 24;
  const arrowLen = gap;
  const startX = 20;
  const centerY = 50;
  const totalWidth = startX * 2 + STAGES.length * boxWidth + (STAGES.length - 1) * gap;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          System Architecture
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          End-to-end pipeline: from source code input through SLM translation to
          semantic verification and visualization.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${totalWidth} ${centerY * 2 + boxHeight}`}
            width="100%"
            style={{ minWidth: 700, maxHeight: 120 }}
          >
            {/* Define arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 8 3, 0 6"
                  fill="hsl(0, 0%, 50%)"
                />
              </marker>
            </defs>

            {STAGES.map((stage, i) => {
              const x = startX + i * (boxWidth + gap);
              const y = centerY;

              return (
                <g key={i}>
                  {/* Box */}
                  <rect
                    x={x}
                    y={y}
                    width={boxWidth}
                    height={boxHeight}
                    rx={6}
                    fill="hsl(0, 0%, 98%)"
                    stroke="hsl(0, 0%, 80%)"
                    strokeWidth={1.2}
                  />
                  {/* Icon + Label */}
                  <text
                    x={x + boxWidth / 2}
                    y={y + 22}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={600}
                    fill="hsl(0, 0%, 20%)"
                  >
                    {stage.icon} {stage.label}
                  </text>
                  {/* Description */}
                  <text
                    x={x + boxWidth / 2}
                    y={y + 40}
                    textAnchor="middle"
                    fontSize={15}
                    fill="hsl(0, 0%, 55%)"
                  >
                    {stage.description}
                  </text>

                  {/* Arrow to next stage */}
                  {i < STAGES.length - 1 && (
                    <line
                      x1={x + boxWidth}
                      y1={y + boxHeight / 2}
                      x2={x + boxWidth + arrowLen}
                      y2={y + boxHeight / 2}
                      stroke="hsl(0, 0%, 50%)"
                      strokeWidth={1.5}
                      markerEnd="url(#arrowhead)"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}
