/**
 * Futuristic System Architecture Diagram
 * 
 * A high-tech, cinematic AI dashboard-style flow diagram showing the translation pipeline.
 * Dark background with neon blue/cyan/violet accents, glowing connections, and holographic elements.
 */

import { useEffect, useRef } from "react";

const STAGES = [
  { label: "INPUT CODE", subtitle: "Source language", icon: "⟨/⟩" },
  { label: "TOKENIZATION", subtitle: "AST → IR", icon: "⧉" },
  { label: "SLM ENGINE", subtitle: "WebLLM / Cloud AI", icon: "◈" },
  { label: "TRANSLATION", subtitle: "Target language", icon: "⟿" },
  { label: "SEMANTIC VERIFIER", subtitle: "Output validation", icon: "✓" },
  { label: "VISUALIZATION", subtitle: "Heatmaps & metrics", icon: "◰" },
];

function useAnimationFrame(cb: (t: number) => void) {
  const ref = useRef<number>(0);
  useEffect(() => {
    let active = true;
    const loop = (t: number) => {
      if (!active) return;
      cb(t);
      ref.current = requestAnimationFrame(loop);
    };
    ref.current = requestAnimationFrame(loop);
    return () => { active = false; cancelAnimationFrame(ref.current); };
  }, [cb]);
}

export default function ArchitectureDiagram({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Particle system for background
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }>>([]);
  const pulseRef = useRef<Array<{ progress: number; pathIndex: number; speed: number }>>([]);

  useEffect(() => {
    // Init particles
    const particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.3 + 0.05,
      });
    }
    particlesRef.current = particles;

    // Init pulse dots on connections
    const pulses = [];
    for (let i = 0; i < STAGES.length - 1; i++) {
      pulses.push({ progress: Math.random(), pathIndex: i, speed: 0.003 + Math.random() * 0.004 });
      pulses.push({ progress: Math.random(), pathIndex: i, speed: 0.002 + Math.random() * 0.003 });
    }
    pulseRef.current = pulses;
  }, []);

  const draw = (t: number) => {
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

    // Background
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
    ctx.lineWidth = 0.5;
    const gridSize = 30;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Background particles (floating network nodes)
    const particles = particlesRef.current;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > 1) p.vx *= -1;
      if (p.y < 0 || p.y > 1) p.vy *= -1;

      const px = p.x * W;
      const py = p.y * H;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.fill();
    }

    // Draw connections between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = (particles[i].x - particles[j].x) * W;
        const dy = (particles[i].y - particles[j].y) * H;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x * W, particles[i].y * H);
          ctx.lineTo(particles[j].x * W, particles[j].y * H);
          ctx.strokeStyle = `rgba(56, 189, 248, ${0.06 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Pipeline layout
    const padX = 40;
    const padY = 50;
    const nodeW = Math.min(140, (W - padX * 2 - (STAGES.length - 1) * 20) / STAGES.length);
    const nodeH = 70;
    const gapX = (W - padX * 2 - STAGES.length * nodeW) / (STAGES.length - 1);
    const centerY = H / 2;

    const nodePositions: Array<{ x: number; y: number; cx: number; cy: number }> = [];

    for (let i = 0; i < STAGES.length; i++) {
      const x = padX + i * (nodeW + gapX);
      const y = centerY - nodeH / 2;
      nodePositions.push({ x, y, cx: x + nodeW / 2, cy: centerY });
    }

    // Draw glowing connections
    for (let i = 0; i < nodePositions.length - 1; i++) {
      const from = nodePositions[i];
      const to = nodePositions[i + 1];
      const x1 = from.x + nodeW;
      const x2 = to.x;
      const y = centerY;

      // Glow
      const grad = ctx.createLinearGradient(x1, y, x2, y);
      grad.addColorStop(0, "rgba(56, 189, 248, 0.6)");
      grad.addColorStop(0.5, "rgba(139, 92, 246, 0.5)");
      grad.addColorStop(1, "rgba(56, 189, 248, 0.6)");

      ctx.beginPath();
      ctx.moveTo(x1 + 2, y);
      ctx.lineTo(x2 - 2, y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer glow
      ctx.beginPath();
      ctx.moveTo(x1 + 2, y);
      ctx.lineTo(x2 - 2, y);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Arrow head
      const arrowSize = 6;
      ctx.beginPath();
      ctx.moveTo(x2 - 2, y);
      ctx.lineTo(x2 - arrowSize - 2, y - arrowSize / 2);
      ctx.lineTo(x2 - arrowSize - 2, y + arrowSize / 2);
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.8)";
      ctx.fill();
    }

    // Animated pulse dots on connections
    for (const pulse of pulseRef.current) {
      pulse.progress += pulse.speed;
      if (pulse.progress > 1) pulse.progress = 0;

      const from = nodePositions[pulse.pathIndex];
      const to = nodePositions[pulse.pathIndex + 1];
      const x1 = from.x + nodeW + 2;
      const x2 = to.x - 2;
      const px = x1 + (x2 - x1) * pulse.progress;
      const py = centerY;

      const glowRadius = 4 + Math.sin(t * 0.005 + pulse.pathIndex) * 2;

      // Glow around dot
      const rGrad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius * 3);
      rGrad.addColorStop(0, "rgba(56, 189, 248, 0.5)");
      rGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
      ctx.beginPath();
      ctx.arc(px, py, glowRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = rGrad;
      ctx.fill();

      // Dot
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
    }

    // Draw nodes
    for (let i = 0; i < STAGES.length; i++) {
      const stage = STAGES[i];
      const { x, y } = nodePositions[i];

      // Node glow
      const nGrad = ctx.createRadialGradient(x + nodeW / 2, y + nodeH / 2, 0, x + nodeW / 2, y + nodeH / 2, nodeW * 0.8);
      nGrad.addColorStop(0, "rgba(139, 92, 246, 0.08)");
      nGrad.addColorStop(1, "rgba(139, 92, 246, 0)");
      ctx.beginPath();
      ctx.arc(x + nodeW / 2, y + nodeH / 2, nodeW * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = nGrad;
      ctx.fill();

      // Node background
      ctx.beginPath();
      roundRect(ctx, x, y, nodeW, nodeH, 6);
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fill();

      // Node border with glow
      ctx.beginPath();
      roundRect(ctx, x, y, nodeW, nodeH, 6);
      const borderPulse = 0.4 + Math.sin(t * 0.002 + i * 0.8) * 0.2;
      ctx.strokeStyle = `rgba(56, 189, 248, ${borderPulse})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Corner accents
      const cornerLen = 8;
      ctx.strokeStyle = "rgba(139, 92, 246, 0.7)";
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
      // Top-right
      ctx.beginPath(); ctx.moveTo(x + nodeW - cornerLen, y); ctx.lineTo(x + nodeW, y); ctx.lineTo(x + nodeW, y + cornerLen); ctx.stroke();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(x, y + nodeH - cornerLen); ctx.lineTo(x, y + nodeH); ctx.lineTo(x + cornerLen, y + nodeH); ctx.stroke();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(x + nodeW - cornerLen, y + nodeH); ctx.lineTo(x + nodeW, y + nodeH); ctx.lineTo(x + nodeW, y + nodeH - cornerLen); ctx.stroke();

      // Icon
      ctx.font = `${Math.min(16, nodeW * 0.12)}px monospace`;
      ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
      ctx.textAlign = "center";
      ctx.fillText(stage.icon, x + nodeW / 2, y + 22);

      // Label
      ctx.font = `bold ${Math.min(10, nodeW * 0.075)}px 'Space Grotesk', sans-serif`;
      ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
      ctx.textAlign = "center";
      ctx.fillText(stage.label, x + nodeW / 2, y + 40);

      // Subtitle
      ctx.font = `${Math.min(9, nodeW * 0.065)}px 'Space Mono', monospace`;
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.fillText(stage.subtitle, x + nodeW / 2, y + 55);
    }

    // Side analytics panels (right side decorative elements)
    const panelX = W - 120;
    const panelW = 100;

    // Mini heatmap
    drawMiniHeatmap(ctx, panelX, 20, panelW, 40, t);

    // Mini bar chart
    drawMiniBarChart(ctx, panelX, 70, panelW, 35, t);

    // Mini metrics
    drawMiniMetrics(ctx, panelX, 115, panelW, 30, t);

    // Left side decorative panel
    drawMiniNetwork(ctx, 10, 15, 90, 55, t);

    // Bottom status bar
    drawStatusBar(ctx, W, H, t);
  };

  useAnimationFrame(draw);

  return (
    <div ref={containerRef} className={className} style={{ position: "relative", width: "100%", height: 220, background: "#0a0e1a", borderRadius: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0 }} />
      {/* Title overlay */}
      <div style={{
        position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
        color: "rgba(148, 163, 184, 0.6)", fontSize: 10, fontFamily: "'Space Mono', monospace",
        letterSpacing: "0.2em", textTransform: "uppercase", pointerEvents: "none",
      }}>
        SYSTEM ARCHITECTURE — AI CODE TRANSLATION PIPELINE
      </div>
    </div>
  );
}

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

function drawMiniHeatmap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  // Panel bg
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  // Label
  ctx.font = "7px 'Space Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
  ctx.textAlign = "left";
  ctx.fillText("TOKEN ALIGNMENT", x + 4, y + 9);

  // Heatmap cells
  const cols = 10;
  const rows = 3;
  const cellW = (w - 8) / cols;
  const cellH = (h - 16) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const val = (Math.sin(t * 0.001 + r * 2 + c * 0.7) + 1) / 2;
      const blue = Math.floor(100 + val * 155);
      const alpha = 0.3 + val * 0.5;
      ctx.fillStyle = `rgba(56, ${blue}, 248, ${alpha})`;
      ctx.fillRect(x + 4 + c * cellW, y + 14 + r * cellH, cellW - 1, cellH - 1);
    }
  }
}

function drawMiniBarChart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(139, 92, 246, 0.2)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  ctx.font = "7px 'Space Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
  ctx.textAlign = "left";
  ctx.fillText("SIMILARITY", x + 4, y + 9);

  const bars = 8;
  const barW = (w - 12) / bars;
  for (let i = 0; i < bars; i++) {
    const val = 0.3 + (Math.sin(t * 0.0015 + i * 1.2) + 1) / 2 * 0.6;
    const barH = (h - 16) * val;
    const grad = ctx.createLinearGradient(0, y + h - 2 - barH, 0, y + h - 2);
    grad.addColorStop(0, "rgba(139, 92, 246, 0.8)");
    grad.addColorStop(1, "rgba(56, 189, 248, 0.4)");
    ctx.fillStyle = grad;
    ctx.fillRect(x + 6 + i * barW, y + h - 2 - barH, barW - 2, barH);
  }
}

function drawMiniMetrics(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  ctx.fillStyle = "rgba(15, 23, 42, 0.6)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  const metrics = [
    { label: "BLEU", val: (0.85 + Math.sin(t * 0.001) * 0.05).toFixed(2) },
    { label: "SIM", val: (0.92 + Math.sin(t * 0.0012 + 1) * 0.03).toFixed(2) },
  ];

  ctx.font = "7px 'Space Mono', monospace";
  ctx.textAlign = "left";
  metrics.forEach((m, i) => {
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.fillText(m.label, x + 4, y + 12 + i * 12);
    ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
    ctx.fillText(m.val, x + 40, y + 12 + i * 12);
  });
}

function drawMiniNetwork(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number) {
  ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(139, 92, 246, 0.15)";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(x, y, w, h);

  ctx.font = "7px 'Space Mono', monospace";
  ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
  ctx.textAlign = "left";
  ctx.fillText("NODE GRAPH", x + 4, y + 9);

  // Draw small network nodes
  const nodes = [
    { nx: 0.25, ny: 0.4 }, { nx: 0.5, ny: 0.25 }, { nx: 0.75, ny: 0.5 },
    { nx: 0.4, ny: 0.7 }, { nx: 0.65, ny: 0.75 }, { nx: 0.2, ny: 0.65 },
  ];

  // Edges
  const edges = [[0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [0, 5], [5, 3]];
  ctx.strokeStyle = "rgba(139, 92, 246, 0.25)";
  ctx.lineWidth = 0.5;
  for (const [a, b] of edges) {
    ctx.beginPath();
    ctx.moveTo(x + nodes[a].nx * w, y + 12 + nodes[a].ny * (h - 16));
    ctx.lineTo(x + nodes[b].nx * w, y + 12 + nodes[b].ny * (h - 16));
    ctx.stroke();
  }

  // Nodes
  nodes.forEach((n, i) => {
    const px = x + n.nx * w;
    const py = y + 12 + n.ny * (h - 16);
    const pulse = 2 + Math.sin(t * 0.003 + i) * 0.8;
    ctx.beginPath();
    ctx.arc(px, py, pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.5 + Math.sin(t * 0.002 + i) * 0.2})`;
    ctx.fill();
  });
}

function drawStatusBar(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const barH = 16;
  const y = H - barH;

  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(0, y, W, barH);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

  ctx.font = "7px 'Space Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
  ctx.fillText("● PIPELINE ACTIVE", 10, y + 11);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
  ctx.fillText("SEMANTIC PRESERVING CODE TRANSLATION — SLM ENGINE v1.0", W / 2, y + 11);

  ctx.textAlign = "right";
  const latency = (12 + Math.sin(t * 0.001) * 3).toFixed(0);
  ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
  ctx.fillText(`LATENCY: ${latency}ms`, W - 10, y + 11);
}
