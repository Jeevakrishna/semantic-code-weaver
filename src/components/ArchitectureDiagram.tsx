/**
 * Advanced Compiler-AI Pipeline Node Graph
 * 
 * A detailed node-map visualization showing the full AI code translation pipeline
 * with branching token trees, clustered processing stages, and neural-network-style connections.
 * Canvas-based with animated data flow pulses.
 */

import { useEffect, useRef, useCallback } from "react";

// ── Node / Edge definitions ──────────────────────────────────────────

interface GNode {
  id: string;
  label: string;
  subtitle?: string;
  x: number;
  y: number;
  r: number; // radius
  color: string; // main accent color (css)
  glow: string;  // glow color
  cluster?: string;
  mini?: "heatmap" | "bars" | "graph";
}

interface GEdge {
  from: string;
  to: string;
  color?: string;
}

const CYAN = "rgba(56,189,248,";
const PURPLE = "rgba(139,92,246,";
const TEAL = "rgba(45,212,191,";
const PINK = "rgba(244,114,182,";
const AMBER = "rgba(251,191,36,";

// Positions are in a 1200×700 virtual canvas — we'll scale to fit.
const NODES: GNode[] = [
  // ── Root ──
  { id: "input", label: "INPUT CODE", subtitle: "Source Language", x: 80, y: 350, r: 32, color: CYAN, glow: CYAN, cluster: "root" },

  // ── Tokenization cluster ──
  { id: "lexer", label: "Lexer", x: 220, y: 240, r: 22, color: CYAN, glow: CYAN, cluster: "token" },
  { id: "splitter", label: "Token Splitter", x: 220, y: 350, r: 20, color: CYAN, glow: CYAN, cluster: "token" },
  { id: "syntok", label: "Syntax Tokens", x: 220, y: 460, r: 20, color: CYAN, glow: CYAN, cluster: "token" },
  { id: "ident", label: "Identifiers", x: 340, y: 170, r: 16, color: TEAL, glow: TEAL, cluster: "token" },
  { id: "keywords", label: "Keywords", x: 340, y: 240, r: 16, color: TEAL, glow: TEAL, cluster: "token" },
  { id: "operators", label: "Operators", x: 340, y: 310, r: 16, color: TEAL, glow: TEAL, cluster: "token" },
  { id: "literals", label: "Literals", x: 340, y: 380, r: 16, color: TEAL, glow: TEAL, cluster: "token" },

  // ── Parser cluster ──
  { id: "parser", label: "Parser", x: 480, y: 260, r: 22, color: PURPLE, glow: PURPLE, cluster: "parser" },
  { id: "astgen", label: "AST Generator", x: 480, y: 360, r: 20, color: PURPLE, glow: PURPLE, cluster: "parser" },
  { id: "syntree", label: "Syntax Tree", x: 480, y: 450, r: 18, color: PURPLE, glow: PURPLE, cluster: "parser" },

  // ── IR cluster ──
  { id: "ir", label: "IR", subtitle: "Intermediate Rep.", x: 620, y: 300, r: 24, color: CYAN, glow: CYAN, cluster: "ir" },
  { id: "semmap", label: "Semantic Map", x: 620, y: 400, r: 17, color: CYAN, glow: CYAN, cluster: "ir" },
  { id: "depgraph", label: "Dep. Graph", x: 620, y: 480, r: 16, color: CYAN, glow: CYAN, cluster: "ir" },

  // ── AI Model cluster ──
  { id: "slm", label: "SLM ENGINE", subtitle: "WebLLM", x: 770, y: 300, r: 30, color: PURPLE, glow: PURPLE, cluster: "model" },
  { id: "ctxenc", label: "Context Encoder", x: 770, y: 200, r: 17, color: PINK, glow: PINK, cluster: "model" },
  { id: "transeng", label: "Translation Eng.", x: 770, y: 400, r: 17, color: PINK, glow: PINK, cluster: "model" },
  { id: "targpred", label: "Syntax Predictor", x: 770, y: 480, r: 16, color: PINK, glow: PINK, cluster: "model" },

  // ── Output ──
  { id: "output", label: "TRANSLATION", subtitle: "Target Language", x: 930, y: 300, r: 28, color: TEAL, glow: TEAL, cluster: "output" },

  // ── Semantic Verifier cluster ──
  { id: "typechk", label: "Type Checker", x: 1020, y: 170, r: 16, color: AMBER, glow: AMBER, cluster: "verify", mini: "heatmap" },
  { id: "logicval", label: "Logic Validator", x: 1020, y: 240, r: 16, color: AMBER, glow: AMBER, cluster: "verify" },
  { id: "outval", label: "Validation Eng.", x: 1020, y: 310, r: 17, color: AMBER, glow: AMBER, cluster: "verify", mini: "bars" },

  // ── Visualization cluster ──
  { id: "heatmaps", label: "Heatmaps", x: 1020, y: 420, r: 16, color: CYAN, glow: CYAN, cluster: "viz", mini: "heatmap" },
  { id: "tokmet", label: "Token Metrics", x: 1020, y: 490, r: 15, color: CYAN, glow: CYAN, cluster: "viz", mini: "bars" },
  { id: "errdensity", label: "Error Density", x: 1120, y: 450, r: 15, color: PINK, glow: PINK, cluster: "viz", mini: "graph" },
  { id: "perfmap", label: "Perf. Analytics", x: 1120, y: 520, r: 15, color: TEAL, glow: TEAL, cluster: "viz", mini: "bars" },
];

const EDGES: GEdge[] = [
  // Root → tokenization
  { from: "input", to: "lexer" },
  { from: "input", to: "splitter" },
  { from: "input", to: "syntok" },
  // Token tree
  { from: "lexer", to: "ident" },
  { from: "lexer", to: "keywords" },
  { from: "lexer", to: "operators" },
  { from: "splitter", to: "literals" },
  { from: "splitter", to: "operators" },
  { from: "syntok", to: "literals" },
  // Token → parser
  { from: "ident", to: "parser" },
  { from: "keywords", to: "parser" },
  { from: "operators", to: "astgen" },
  { from: "literals", to: "astgen" },
  { from: "parser", to: "astgen" },
  { from: "astgen", to: "syntree" },
  // Parser → IR
  { from: "parser", to: "ir" },
  { from: "astgen", to: "ir" },
  { from: "syntree", to: "semmap" },
  { from: "ir", to: "semmap" },
  { from: "semmap", to: "depgraph" },
  // IR → Model
  { from: "ir", to: "slm" },
  { from: "semmap", to: "ctxenc" },
  { from: "slm", to: "ctxenc" },
  { from: "slm", to: "transeng" },
  { from: "transeng", to: "targpred" },
  // Model → Output
  { from: "slm", to: "output" },
  { from: "transeng", to: "output" },
  // Output → Verifier
  { from: "output", to: "typechk" },
  { from: "output", to: "logicval" },
  { from: "output", to: "outval" },
  // Output → Viz
  { from: "output", to: "heatmaps" },
  { from: "output", to: "tokmet" },
  { from: "heatmaps", to: "errdensity" },
  { from: "tokmet", to: "perfmap" },
  { from: "outval", to: "errdensity" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function nodeMap(): Map<string, GNode> {
  const m = new Map<string, GNode>();
  NODES.forEach((n) => m.set(n.id, n));
  return m;
}

// ── Component ────────────────────────────────────────────────────────

export default function ArchitectureDiagram({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const nMap = useRef(nodeMap());

  // Pulse objects that travel along edges
  const pulsesRef = useRef<Array<{ edgeIdx: number; progress: number; speed: number }>>([]);

  useEffect(() => {
    const pulses: typeof pulsesRef.current = [];
    EDGES.forEach((_, i) => {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let c = 0; c < count; c++) {
        pulses.push({ edgeIdx: i, progress: Math.random(), speed: 0.002 + Math.random() * 0.004 });
      }
    });
    pulsesRef.current = pulses;
  }, []);

  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Virtual canvas is 1200×620 — compute scale
    const VW = 1200;
    const VH = 620;
    const scale = Math.min(W / VW, H / VH);
    const offX = (W - VW * scale) / 2;
    const offY = (H - VH * scale) / 2;

    const tx = (x: number) => offX + x * scale;
    const ty = (y: number) => offY + y * scale;
    const ts = (s: number) => s * scale;

    // ── Background ──
    ctx.fillStyle = "#060a14";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(56,189,248,0.03)";
    ctx.lineWidth = 0.5;
    const gridStep = 25 * scale;
    for (let gx = offX % gridStep; gx < W; gx += gridStep) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = offY % gridStep; gy < H; gy += gridStep) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    // ── Background particles ──
    for (let i = 0; i < 40; i++) {
      const px = ((Math.sin(t * 0.0002 + i * 7.3) + 1) / 2) * W;
      const py = ((Math.cos(t * 0.00015 + i * 4.1) + 1) / 2) * H;
      ctx.beginPath();
      ctx.arc(px, py, 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56,189,248,${0.06 + Math.sin(t * 0.001 + i) * 0.03})`;
      ctx.fill();
    }

    // ── Cluster backgrounds ──
    const clusters: Record<string, { nodes: GNode[]; color: string }> = {};
    NODES.forEach((n) => {
      if (!n.cluster) return;
      if (!clusters[n.cluster]) clusters[n.cluster] = { nodes: [], color: n.glow };
      clusters[n.cluster].nodes.push(n);
    });

    Object.values(clusters).forEach(({ nodes: cns, color }) => {
      if (cns.length < 2) return;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cns.forEach((n) => {
        minX = Math.min(minX, n.x - n.r - 20);
        minY = Math.min(minY, n.y - n.r - 20);
        maxX = Math.max(maxX, n.x + n.r + 20);
        maxY = Math.max(maxY, n.y + n.r + 20);
      });
      ctx.fillStyle = color + "0.03)";
      ctx.strokeStyle = color + "0.08)";
      ctx.lineWidth = 1;
      const rx = tx(minX), ry = ty(minY), rw = ts(maxX - minX), rh = ts(maxY - minY);
      ctx.beginPath();
      roundRect(ctx, rx, ry, rw, rh, 8);
      ctx.fill();
      ctx.stroke();
    });

    // ── Draw edges ──
    const map = nMap.current;
    EDGES.forEach((e) => {
      const from = map.get(e.from);
      const to = map.get(e.to);
      if (!from || !to) return;

      const x1 = tx(from.x), y1 = ty(from.y);
      const x2 = tx(to.x), y2 = ty(to.y);

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = (from.glow || CYAN) + "0.06)";
      ctx.lineWidth = ts(5);
      ctx.stroke();

      // Main line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = (from.glow || CYAN) + "0.18)";
      ctx.lineWidth = ts(1.2);
      ctx.stroke();

      // Arrow tip
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const toR = ts(to.r);
      const tipX = x2 - Math.cos(angle) * toR;
      const tipY = y2 - Math.sin(angle) * toR;
      const aSize = ts(5);
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(tipX - Math.cos(angle - 0.4) * aSize, tipY - Math.sin(angle - 0.4) * aSize);
      ctx.lineTo(tipX - Math.cos(angle + 0.4) * aSize, tipY - Math.sin(angle + 0.4) * aSize);
      ctx.closePath();
      ctx.fillStyle = (from.glow || CYAN) + "0.5)";
      ctx.fill();
    });

    // ── Animated pulses ──
    pulsesRef.current.forEach((p) => {
      p.progress += p.speed;
      if (p.progress > 1) p.progress = 0;

      const e = EDGES[p.edgeIdx];
      const from = map.get(e.from);
      const to = map.get(e.to);
      if (!from || !to) return;

      const px = tx(from.x + (to.x - from.x) * p.progress);
      const py = ty(from.y + (to.y - from.y) * p.progress);

      const rGrad = ctx.createRadialGradient(px, py, 0, px, py, ts(8));
      rGrad.addColorStop(0, (from.glow || CYAN) + "0.6)");
      rGrad.addColorStop(1, (from.glow || CYAN) + "0)");
      ctx.beginPath();
      ctx.arc(px, py, ts(8), 0, Math.PI * 2);
      ctx.fillStyle = rGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, ts(1.8), 0, Math.PI * 2);
      ctx.fillStyle = (from.glow || CYAN) + "0.9)";
      ctx.fill();
    });

    // ── Draw nodes ──
    NODES.forEach((n) => {
      const cx = tx(n.x), cy = ty(n.y), r = ts(n.r);
      const pulse = 1 + Math.sin(t * 0.002 + n.x * 0.01) * 0.12;

      // Outer glow
      const oGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.5 * pulse);
      oGrad.addColorStop(0, n.glow + "0.12)");
      oGrad.addColorStop(1, n.glow + "0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2.5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = oGrad;
      ctx.fill();

      // Node circle fill
      const nGrad = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
      nGrad.addColorStop(0, "rgba(20,30,55,0.95)");
      nGrad.addColorStop(1, "rgba(10,15,30,0.9)");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = nGrad;
      ctx.fill();

      // Border
      const borderAlpha = 0.4 + Math.sin(t * 0.003 + n.y * 0.02) * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = n.color + `${borderAlpha})`;
      ctx.lineWidth = ts(1.5);
      ctx.stroke();

      // Inner ring accent
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.75, -Math.PI * 0.3 + t * 0.0005, Math.PI * 0.5 + t * 0.0005);
      ctx.strokeStyle = n.color + "0.15)";
      ctx.lineWidth = ts(0.8);
      ctx.stroke();

      // Label
      const fontSize = Math.max(7, Math.min(10, r * 0.42));
      ctx.font = `bold ${ts(fontSize)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = "rgba(226,232,240,0.92)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (n.subtitle) {
        ctx.fillText(n.label, cx, cy - ts(4));
        ctx.font = `${ts(Math.max(6, fontSize * 0.7))}px 'Space Mono', monospace`;
        ctx.fillStyle = "rgba(148,163,184,0.65)";
        ctx.fillText(n.subtitle, cx, cy + ts(7));
      } else {
        ctx.fillText(n.label, cx, cy);
      }

      // Mini embedded visualizations
      if (n.mini) {
        drawMiniViz(ctx, n.mini, cx + r * 0.6, cy - r * 0.8, ts(20), ts(12), t, n.color);
      }
    });

    // ── Title ──
    ctx.font = `${ts(8)}px 'Space Mono', monospace`;
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("AI CODE TRANSLATION PIPELINE — COMPILER INTELLIGENCE GRAPH", W / 2, ty(8));

    // ── Status bar ──
    const barH = ts(14);
    const barY = H - barH;
    ctx.fillStyle = "rgba(10,15,30,0.85)";
    ctx.fillRect(0, barY, W, barH);
    ctx.strokeStyle = "rgba(56,189,248,0.12)";
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(W, barY); ctx.stroke();

    ctx.font = `${ts(7)}px 'Space Mono', monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(56,189,248,0.5)";
    ctx.fillText("● PIPELINE ACTIVE", ts(8), barY + barH / 2);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(148,163,184,0.35)";
    ctx.fillText(`${NODES.length} NODES · ${EDGES.length} EDGES · SEMANTIC PRESERVING`, W / 2, barY + barH / 2);

    ctx.textAlign = "right";
    const lat = (14 + Math.sin(t * 0.001) * 4).toFixed(0);
    ctx.fillStyle = "rgba(56,189,248,0.45)";
    ctx.fillText(`LATENCY ${lat}ms`, W - ts(8), barY + barH / 2);
  }, []);

  useEffect(() => {
    let active = true;
    const loop = (t: number) => {
      if (!active) return;
      draw(t);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: 380,
        background: "#060a14",
        overflow: "hidden",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}

// ── Utility ──────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

function drawMiniViz(
  ctx: CanvasRenderingContext2D,
  type: "heatmap" | "bars" | "graph",
  x: number, y: number, w: number, h: number, t: number, color: string
) {
  ctx.fillStyle = "rgba(10,15,30,0.7)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color + "0.25)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  if (type === "heatmap") {
    const cols = 5, rows = 2;
    const cw = (w - 2) / cols, ch = (h - 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = (Math.sin(t * 0.002 + r * 3 + c * 1.1) + 1) / 2;
        ctx.fillStyle = color + `${0.2 + v * 0.6})`;
        ctx.fillRect(x + 1 + c * cw, y + 1 + r * ch, cw - 0.5, ch - 0.5);
      }
    }
  } else if (type === "bars") {
    const bars = 5;
    const bw = (w - 2) / bars;
    for (let i = 0; i < bars; i++) {
      const v = 0.3 + (Math.sin(t * 0.002 + i * 1.5) + 1) / 2 * 0.6;
      const bh = (h - 2) * v;
      ctx.fillStyle = color + "0.6)";
      ctx.fillRect(x + 1 + i * bw, y + h - 1 - bh, bw - 1, bh);
    }
  } else {
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
      const px = x + 1 + (i / 5) * (w - 2);
      const py = y + h / 2 + Math.sin(t * 0.003 + i * 1.2) * (h * 0.3);
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.strokeStyle = color + "0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
