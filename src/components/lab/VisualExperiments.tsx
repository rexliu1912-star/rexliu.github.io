/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useState, useEffect, useRef, useCallback } from "react";

const PURPLE = "#8953d1";
const PURPLE_LIGHT = "#a175e8";

function getCanvasBg(): string {
  if (typeof document === "undefined") return "#0d0d14";
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    || document.documentElement.classList.contains("dark");
  return isDark ? "#0d0d14" : "#f5f0ff";
}

function getGridColor(): string {
  if (typeof document === "undefined") return "rgba(137,83,209,0.08)";
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    || document.documentElement.classList.contains("dark");
  return isDark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.12)";
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") === "dark"
    || document.documentElement.classList.contains("dark");
}

function useThemeColors() {
  const [dark, setDark] = useState(isDarkMode);
  useEffect(() => {
    setDark(isDarkMode());
    const observer = new MutationObserver(() => setDark(isDarkMode()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => observer.disconnect();
  }, []);
  return {
    title: dark ? "#ffffff" : "#111111",
    subtitle: dark ? "#aaaaaa" : "#777777",
  };
}

// ============================================================
// Experiment 1: Sine Wave Studio
// ============================================================
function SineWaveStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [amplitude, setAmplitude] = useState(30);
  const [frequency, setFrequency] = useState(3);
  const [phase, setPhase] = useState(0);
  const [waveCount, setWaveCount] = useState(1);
  const tc = useThemeColors();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const t = Date.now() / 1000;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = getGridColor();
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    const colorList = [PURPLE, PURPLE_LIGHT, "#c9a3ff"] as const;

    for (let w = 0; w < waveCount; w++) {
      const A = amplitude * (w === 0 ? 1 : 0.6);
      const omega = frequency * (w + 1);
      const phi = phase + w * (Math.PI / 3);
      const color = colorList[w] ?? PURPLE;

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, `${color}00`);
      grad.addColorStop(0.3, color);
      grad.addColorStop(1, `${color}66`);

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = w === 0 ? 2.5 : 1.5;
      ctx.shadowBlur = w === 0 ? 8 : 4;
      ctx.shadowColor = color;

      for (let x = 0; x < W; x++) {
        const y = H / 2 + A * Math.sin((omega * x) / W * Math.PI * 2 + phi + t);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      const dotX = ((t * 80) % W + W) % W;
      const dotY = H / 2 + A * Math.sin((omega * dotX) / W * Math.PI * 2 + phi + t);
      ctx.beginPath();
      ctx.arc(dotX, dotY, w === 0 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    animRef.current = requestAnimationFrame(draw);
  }, [amplitude, frequency, phase, waveCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">01</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Sine Wave Studio</span>
            <span className="lang-zh">正弦波工作室</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">Market Cycles Are Predictable. Your Reaction to Them Is Not.</span>
            <span className="lang-zh">市场周期可预测。你对它的反应，不行。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "220px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Amplitude A</span>
            <span className="lang-zh">振幅 A</span>
            <span className="control-val">{amplitude}</span>
          </label>
          <input type="range" min={5} max={80} value={amplitude} onChange={(e) => setAmplitude(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Frequency ω</span>
            <span className="lang-zh">频率 ω</span>
            <span className="control-val">{frequency}</span>
          </label>
          <input type="range" min={1} max={8} value={frequency} onChange={(e) => setFrequency(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Phase φ</span>
            <span className="lang-zh">相位 φ</span>
            <span className="control-val">{phase.toFixed(1)}</span>
          </label>
          <input type="range" min={0} max={6.28} step={0.1} value={phase} onChange={(e) => setPhase(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Waves</span>
            <span className="lang-zh">波数</span>
            <span className="control-val">{waveCount}</span>
          </label>
          <input type="range" min={1} max={3} value={waveCount} onChange={(e) => setWaveCount(Number(e.target.value))} />
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`y = A · sin(ωx + φ)\n\nA = ${amplitude}  振幅 — 波动幅度，对应市场波动烈度\nω = ${frequency}  频率 — 周期快慢，对应牛熊切换节奏\nφ = ${phase.toFixed(1)}  相位 — 起始偏移，对应你的入场时机`}</pre>
      </div>
      <div className="exp-explain">
        <p className="lang-en">Markets are not random — they follow cycles. The sine wave is the simplest model of any recurring phenomenon. By adjusting A (amplitude) and ω (frequency), you can visualize how volatile and how frequent market swings are. The phase φ represents your entry point — the same wave, but you enter at different moments.</p>
        <p className="lang-zh">市场不是随机的，它遵循周期。正弦函数是描述任何周期性现象最简洁的模型。调整振幅 A 和频率 ω，你可以直观感受市场波动的激烈程度与快慢节奏。相位 φ 代表你的入场时机——同一条波，但你在不同时刻进入，结果截然不同。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"Buy the rumor, sell the news. Market moves on expectations, not facts." — Rex Liu</span>
          <span className="lang-zh">「买预期，卖事实。行情是预期的总和，不是对事实做反应。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 2: Neural Pulse
// ============================================================
interface GraphNode {
  x: number;
  y: number;
  r: number;
  connections: number[];
  pulse: number;
}

function NeuralPulse() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const graphRef = useRef<GraphNode[]>([]);
  const [nodeCount, setNodeCount] = useState(11);
  const [speed, setSpeed] = useState(1);
  const [density, setDensity] = useState(2);
  const tc = useThemeColors();

  const canvasSize = useRef({ W: 600, H: 220 });

  const buildGraph = useCallback((count: number, dens: number, W: number, H: number): GraphNode[] => {
    const nodes: GraphNode[] = [];
    const probMap = [0.2, 0.38, 0.58] as const;
    const prob = probMap[dens - 1] ?? 0.38;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = Math.min(W, H) * 0.35;
      const cx = W / 2 + r * Math.cos(angle) * (0.6 + Math.random() * 0.4);
      const cy = H / 2 + r * Math.sin(angle) * (0.6 + Math.random() * 0.4);
      nodes.push({ x: cx, y: cy, r: 0, connections: [], pulse: 0 });
    }
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        if (Math.random() < prob) {
          nodes[i]!.connections.push(j);
          nodes[j]!.connections.push(i);
        }
      }
    }
    for (let i = 0; i < count - 1; i++) {
      if (!nodes[i]!.connections.includes(i + 1)) {
        nodes[i]!.connections.push(i + 1);
        nodes[i + 1]!.connections.push(i);
      }
    }
    for (const n of nodes) {
      n.r = 4 + n.connections.length * 1.5;
    }
    return nodes;
  }, []);

  const pulseStateRef = useRef({ source: 0, visited: new Set<number>([0]), queue: [0], timer: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const W = canvas.offsetWidth || 600;
    const H = canvas.offsetHeight || 220;
    canvasSize.current = { W, H };
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    graphRef.current = buildGraph(nodeCount, density, W, H);
    const first = graphRef.current[0];
    if (first) first.pulse = 1;
    pulseStateRef.current = { source: 0, visited: new Set([0]), queue: [0], timer: 0 };
  }, [nodeCount, density, buildGraph]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { W, H } = canvasSize.current;
    const nodes = graphRef.current;
    const ps = pulseStateRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    ps.timer += 0.016 * speed;
    if (ps.timer > 1.2) {
      ps.timer = 0;
      const nextQueue: number[] = [];
      for (const ni of ps.queue) {
        const n = nodes[ni];
        if (!n) continue;
        for (const c of n.connections) {
          if (!ps.visited.has(c)) {
            ps.visited.add(c);
            const cn = nodes[c];
            if (cn) cn.pulse = 1;
            nextQueue.push(c);
          }
        }
      }
      if (nextQueue.length === 0) {
        for (const n of nodes) n.pulse = 0;
        const src = Math.floor(Math.random() * nodes.length);
        ps.source = src;
        ps.visited = new Set([src]);
        ps.queue = [src];
        const srcNode = nodes[src];
        if (srcNode) srcNode.pulse = 1;
      } else {
        ps.queue = nextQueue;
      }
    }

    for (const n of nodes) {
      if (n.pulse > 0) n.pulse = Math.max(0, n.pulse - 0.016 * speed * 0.8);
    }

    for (let i = 0; i < nodes.length; i++) {
      const ni = nodes[i]!;
      for (const j of ni.connections) {
        if (j <= i) continue;
        const nj = nodes[j]!;
        const glow = Math.max(ni.pulse, nj.pulse);
        ctx.beginPath();
        ctx.moveTo(ni.x, ni.y);
        ctx.lineTo(nj.x, nj.y);
        ctx.strokeStyle = glow > 0.1 ? `rgba(137,83,209,${0.1 + glow * 0.6})` : "rgba(137,83,209,0.08)";
        ctx.lineWidth = glow > 0.1 ? 1.5 : 0.8;
        ctx.stroke();
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      if (n.pulse > 0.05) {
        ctx.fillStyle = `rgba(161,117,232,${0.3 + n.pulse * 0.7})`;
        ctx.shadowBlur = 15 * n.pulse;
        ctx.shadowColor = PURPLE_LIGHT;
      } else {
        ctx.fillStyle = "rgba(137,83,209,0.25)";
        ctx.shadowBlur = 0;
      }
      ctx.fill();
      ctx.strokeStyle = n.pulse > 0.05 ? `rgba(161,117,232,${0.6 + n.pulse * 0.4})` : "rgba(137,83,209,0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (n.pulse > 0.3) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6 * n.pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(161,117,232,${n.pulse * 0.4})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, [speed]);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const densityLabels = ["sparse", "medium", "dense"] as const;

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">02</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Neural Pulse</span>
            <span className="lang-zh">神经脉冲</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">Intelligence Is Connection, Not Computation.</span>
            <span className="lang-zh">智能是连接，不是计算力。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "220px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Nodes</span>
            <span className="lang-zh">节点数</span>
            <span className="control-val">{nodeCount}</span>
          </label>
          <input type="range" min={5} max={25} value={nodeCount} onChange={(e) => setNodeCount(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Speed</span>
            <span className="lang-zh">速度</span>
            <span className="control-val">{speed}x</span>
          </label>
          <input type="range" min={0.5} max={3} step={0.5} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Density</span>
            <span className="lang-zh">连接密度</span>
            <span className="control-val">{densityLabels[density - 1] ?? "medium"}</span>
          </label>
          <input type="range" min={1} max={3} value={density} onChange={(e) => setDensity(Number(e.target.value))} />
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`G = (V, E)\nV = 节点 nodes — 个体、工具、想法\nE = 边 edges — 信息的流动路径\n\nPageRank 核心洞见：\n重要性 ≠ 自身能力\n重要性 = 被高价值节点连接的次数`}</pre>
      </div>
      <div className="exp-explain">
        <p className="lang-en">Graph theory models intelligence as a network, not a single point. A node's importance is determined not by itself, but by who connects to it. This is how ideas spread, how influence compounds, and why being well-connected matters more than being smart in isolation. Watch how a pulse travels through the network — that's how information really moves.</p>
        <p className="lang-zh">图论把智能建模为网络，而非孤立的点。一个节点的重要性不由自身决定，而由连接它的高价值节点数量决定。这就是为什么人脉比个人能力更能放大影响力，也是为什么想法能病毒式传播。看脉冲如何沿网络传播——这就是信息在现实中真正的流动方式。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"AI won't replace you. Someone using AI will. The key is becoming a highly connected node." — Rex Liu</span>
          <span className="lang-zh">「AI 不会取代你，用 AI 的人会取代你。关键是成为高度连接的节点。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 3: Compound Growth
// ============================================================
function CompoundGrowth() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pv, setPv] = useState(100);
  const [rate, setRate] = useState(8);
  const [years, setYears] = useState(20);
  const animRef = useRef<number>(0);
  const progressRef = useRef(0);
  const tc = useThemeColors();

  const buildData = useCallback(() => {
    const compound: number[] = [];
    const linear: number[] = [];
    for (let n = 0; n <= years; n++) {
      compound.push(pv * Math.pow(1 + rate / 100, n));
      linear.push(pv * (1 + (rate / 100) * n));
    }
    return { compound, linear };
  }, [pv, rate, years]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    const { compound, linear } = buildData();
    const maxVal = Math.max(...compound);
    const padL = 50, padR = 20, padT = 20, padB = 30;
    const drawW = W - padL - padR;
    const drawH = H - padT - padB;

    const toX = (i: number) => padL + (i / years) * drawW;
    const toY = (v: number) => padT + drawH - (v / maxVal) * drawH;

    ctx.strokeStyle = "rgba(137,83,209,0.07)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (drawH / 4) * i;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const y = padT + (drawH / 4) * i;
      const val = maxVal * (1 - i / 4);
      ctx.fillText(`${val.toFixed(0)}`, padL - 4, y + 3);
    }

    const prog = Math.min(progressRef.current, 1);
    const endIdx = Math.floor(prog * years);

    const drawLine = (data: number[], color: string, lw: number, glow: boolean) => {
      if (endIdx < 1) return;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(data[0]!));
      for (let i = 1; i <= endIdx; i++) {
        ctx.lineTo(toX(i), toY(data[i]!));
      }
      if (endIdx < years) {
        const frac = prog * years - endIdx;
        const x = toX(endIdx) + frac * (toX(endIdx + 1) - toX(endIdx));
        const y = toY(data[endIdx]!) + frac * (toY(data[endIdx + 1]!) - toY(data[endIdx]!));
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      if (glow) { ctx.shadowBlur = 10; ctx.shadowColor = color; }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    ctx.setLineDash([5, 5]);
    drawLine(linear, "rgba(100,120,160,0.7)", 1.5, false);
    ctx.setLineDash([]);

    if (endIdx >= 1) {
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(compound[0]!));
      for (let i = 1; i <= endIdx; i++) ctx.lineTo(toX(i), toY(compound[i]!));
      ctx.lineTo(toX(endIdx), H - padB);
      ctx.lineTo(toX(0), H - padB);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padT, 0, H - padB);
      grad.addColorStop(0, "rgba(137,83,209,0.25)");
      grad.addColorStop(1, "rgba(137,83,209,0)");
      ctx.fillStyle = grad;
      ctx.fill();
    }

    drawLine(compound, PURPLE, 2.5, true);

    if (prog > 0.99) {
      const cx = toX(years);
      const cy = toY(compound[years]!);
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.shadowBlur = 12; ctx.shadowColor = PURPLE_LIGHT;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(toX(years), toY(linear[years]!), 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(100,120,160,0.8)";
      ctx.fill();
    }

    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    const step = Math.max(1, Math.ceil(years / 5));
    for (let i = 0; i <= years; i += step) {
      ctx.fillText(`${i}y`, toX(i), H - padB + 14);
    }

    progressRef.current += 0.008;
    if (progressRef.current < 1) {
      animRef.current = requestAnimationFrame(draw);
    } else {
      // pause 1.5s then restart
      setTimeout(() => {
        progressRef.current = 0;
        animRef.current = requestAnimationFrame(draw);
      }, 1500);
    }
  }, [buildData, years]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
  }, []);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    progressRef.current = 0;
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const fvCompound = pv * Math.pow(1 + rate / 100, years);
  const fvLinear = pv * (1 + (rate / 100) * years);
  const diff = fvCompound - fvLinear;
  const diffPct = ((diff / fvLinear) * 100).toFixed(0);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">03</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Compound Growth</span>
            <span className="lang-zh">复利增长</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">The 8th Wonder of the World, Visualized.</span>
            <span className="lang-zh">世界第八大奇迹，可视化。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "220px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Principal PV</span>
            <span className="lang-zh">初始金额 PV</span>
            <span className="control-val">¥{pv}万</span>
          </label>
          <input type="range" min={1} max={1000} value={pv} onChange={(e) => setPv(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Annual Return r</span>
            <span className="lang-zh">年化收益 r</span>
            <span className="control-val">{rate}%</span>
          </label>
          <input type="range" min={1} max={30} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Years n</span>
            <span className="lang-zh">年数 n</span>
            <span className="control-val">{years}y</span>
          </label>
          <input type="range" min={1} max={40} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </div>
      </div>

      <div className="exp-result">
        <div className="result-row">
          <span className="result-label lang-en">{years}y Linear</span>
          <span className="result-label lang-zh">{years}年线性</span>
          <span className="result-val" style={{ color: "rgba(100,120,200,0.9)" }}>¥{fvLinear.toFixed(0)}万</span>
        </div>
        <div className="result-row">
          <span className="result-label lang-en">{years}y Compound</span>
          <span className="result-label lang-zh">{years}年复利</span>
          <span className="result-val" style={{ color: PURPLE_LIGHT }}>¥{fvCompound.toFixed(0)}万</span>
        </div>
        <div className="result-row result-diff">
          <span className="result-label lang-en">Difference</span>
          <span className="result-label lang-zh">差距</span>
          <span className="result-val">+¥{diff.toFixed(0)}万 (+{diffPct}%)</span>
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`FV = PV · (1 + r)ⁿ    复利 Compound\nFV = PV · (1 + r·n)   线性 Linear\n\n差距 Gap = (1+r)ⁿ − (1+r·n)\n              ↑ 时间越长，差距越大`}</pre>
      </div>
      <div className="exp-explain">
        <p className="lang-en">The difference between linear and exponential growth seems small early on, but the gap accelerates over time. This is why "staying in the game" matters more than timing — every year you exit, you lose one compounding period, and the cost is not linear. Move the sliders and watch the gap widen.</p>
        <p className="lang-zh">线性增长和指数增长的差距在早期看起来很小，但随时间加速扩大。这就是为什么「坚持在场」比择时更重要——每退出一年，你失去的不是一份固定收益，而是一个复利周期。拖动滑块，感受差距如何随时间翻倍。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"Stay Invested in the Game. Time is the best leverage." — Rex Liu</span>
          <span className="lang-zh">「Stay Invested in the Game. 时间是最好的杠杆。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 4: Bezier Journey
// ============================================================
interface Pt { x: number; y: number }

function bezierPoint(t: number, P0: Pt, P1: Pt, P2: Pt, P3: Pt): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * P0.x + 3 * mt * mt * t * P1.x + 3 * mt * t * t * P2.x + t * t * t * P3.x,
    y: mt * mt * mt * P0.y + 3 * mt * mt * t * P1.y + 3 * mt * t * t * P2.y + t * t * t * P3.y,
  };
}

function bezierTangent(t: number, P0: Pt, P1: Pt, P2: Pt, P3: Pt): Pt {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (P1.x - P0.x) + 6 * mt * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x),
    y: 3 * mt * mt * (P1.y - P0.y) + 6 * mt * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y),
  };
}

function BezierJourney() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tc = useThemeColors();
  const isDragging = useRef<null | "p1" | "p2">(null);
  const [p1, setP1] = useState<Pt>({ x: 0.25, y: 0.2 });
  const [p2, setP2] = useState<Pt>({ x: 0.75, y: 0.8 });
  const tRef = useRef(0);
  const trailRef = useRef<Pt[]>([]);

  const hitTest = useCallback((mx: number, my: number, W: number, H: number): "p1" | "p2" | null => {
    const R = 14;
    if (Math.hypot(mx - p1.x * W, my - p1.y * H) < R) return "p1";
    if (Math.hypot(mx - p2.x * W, my - p2.y * H) < R) return "p2";
    return null;
  }, [p1, p2]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    const P0: Pt = { x: 60, y: H * 0.75 };
    const P3: Pt = { x: W - 60, y: H * 0.25 };
    const P1: Pt = { x: p1.x * W, y: p1.y * H };
    const P2: Pt = { x: p2.x * W, y: p2.y * H };

    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = "rgba(137,83,209,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(P0.x, P0.y); ctx.lineTo(P1.x, P1.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(P3.x, P3.y); ctx.lineTo(P2.x, P2.y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    ctx.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
    ctx.strokeStyle = "rgba(137,83,209,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();

    tRef.current += 0.004;
    if (tRef.current > 1) {
      tRef.current = 0;
      trailRef.current = [];
    }

    const pos = bezierPoint(tRef.current, P0, P1, P2, P3);
    trailRef.current.push({ x: pos.x, y: pos.y });
    if (trailRef.current.length > 120) trailRef.current.shift();

    const trail = trailRef.current;
    for (let i = 1; i < trail.length; i++) {
      ctx.beginPath();
      ctx.moveTo(trail[i - 1]!.x, trail[i - 1]!.y);
      ctx.lineTo(trail[i]!.x, trail[i]!.y);
      ctx.strokeStyle = `rgba(161,117,232,${(i / trail.length) * 0.7})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = PURPLE_LIGHT;
    ctx.shadowBlur = 16; ctx.shadowColor = PURPLE_LIGHT;
    ctx.fill();
    ctx.shadowBlur = 0;

    const tang = bezierTangent(tRef.current, P0, P1, P2, P3);
    const len = Math.sqrt(tang.x * tang.x + tang.y * tang.y) || 1;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + (tang.x / len) * 24, pos.y + (tang.y / len) * 24);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const drawEndpoint = (px: number, py: number, label: string) => {
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(137,83,209,0.3)";
      ctx.strokeStyle = PURPLE;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, px, py - 14);
    };
    drawEndpoint(P0.x, P0.y, "P₀ start");
    drawEndpoint(P3.x, P3.y, "P₃ end");

    const drawHandle = (px: number, py: number, label: string) => {
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(161,117,232,0.2)";
      ctx.strokeStyle = PURPLE_LIGHT;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, px, py + 22);
    };
    drawHandle(P1.x, P1.y, "P₁ drag");
    drawHandle(P2.x, P2.y, "P₂ drag");

    animRef.current = requestAnimationFrame(draw);
  }, [p1, p2]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const my = ((e.clientY - rect.top) / rect.height) * H;
    isDragging.current = hitTest(mx, my, W, H);
  }, [hitTest]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDragging.current) return;
    const rect = canvas.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    if (isDragging.current === "p1") setP1({ x: fx, y: fy });
    if (isDragging.current === "p2") setP2({ x: fx, y: fy });
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = null; }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const mx = ((touch.clientX - rect.left) / rect.width) * W;
    const my = ((touch.clientY - rect.top) / rect.height) * H;
    isDragging.current = hitTest(mx, my, W, H);
  }, [hitTest]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const fy = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height));
    if (isDragging.current === "p1") setP1({ x: fx, y: fy });
    if (isDragging.current === "p2") setP2({ x: fx, y: fy });
  }, []);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">04</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Bezier Journey</span>
            <span className="lang-zh">贝塞尔旅程</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">Life Is Not a Straight Line. It's Pulled by Invisible Control Points.</span>
            <span className="lang-zh">人生不是直线。它被无形的控制点所牵引。</span>
          </p>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="exp-canvas"
        style={{ width: "100%", height: "260px", cursor: "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { isDragging.current = null; }}
      />

      <p className="exp-hint">
        <span className="lang-en">🖱️ Drag P₁ and P₂ to reshape the path</span>
        <span className="lang-zh">🖱️ 拖动 P₁ 和 P₂ 改变路径</span>
      </p>

      <div className="exp-formula">
        <pre>{`B(t) = (1−t)³P₀ + 3(1−t)²t·P₁ + 3(1−t)t²·P₂ + t³P₃\nt ∈ [0, 1]\n\nP₀ = 起点 start（当下处境）\nP₃ = 终点 destination（长远目标）\nP₁, P₂ = 控制点 control points（选择/机遇/牵引力）`}</pre>
      </div>
      <div className="exp-explain">
        <p className="lang-en">A Bezier curve is defined by control points that never lie on the curve itself — they pull and bend the path without being destinations. Life works the same way: your choices (P₁, P₂) don't determine where you end up, but they completely change how you get there. Drag the control points to feel this firsthand.</p>
        <p className="lang-zh">贝塞尔曲线由控制点定义，但控制点本身不在曲线上——它们拉弯路径，而不是终点。人生也是如此：你的选择（P₁、P₂）不决定你的最终目标，但完全改变了你到达的方式。拖动控制点，亲身感受这条数学定律。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"We don't choose the destination. We choose the control points." — Rex Liu</span>
          <span className="lang-zh">「我们选择的不是终点，是控制点。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 5: Law of Large Numbers
// ============================================================
function LawOfLargeNumbers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const doneRef = useRef(false);
  const samplesRef = useRef<number[]>([]);
  const runningMeanRef = useRef<number[]>([]);

  const [n, setN] = useState(200);
  const [p, setP] = useState(0.5);
  const [sigma, setSigma] = useState(1); // 1=low, 2=med, 3=high
  const tc = useThemeColors();

  const sigmaMap: Record<number, number> = { 1: 0.05, 2: 0.15, 3: 0.3 };
  const sigmaLabels: Record<number, string> = { 1: "low", 2: "medium", 3: "high" };

  const resetAnimation = useCallback(() => {
    samplesRef.current = [];
    runningMeanRef.current = [];
    doneRef.current = false;
  }, []);

  useEffect(() => {
    resetAnimation();
  }, [n, p, sigma, resetAnimation]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const sigVal = sigmaMap[sigma] ?? 0.15;

    // Add batch samples per frame
    if (!doneRef.current) {
      const batchSize = Math.max(1, Math.floor(n / 80));
      for (let i = 0; i < batchSize; i++) {
        if (samplesRef.current.length >= n) { doneRef.current = true; break; }
        // Bernoulli with noise
        const sample = (Math.random() < p ? 1 : 0) + (Math.random() - 0.5) * sigVal * 2;
        samplesRef.current.push(sample);
        const prev = runningMeanRef.current.length > 0 ? runningMeanRef.current[runningMeanRef.current.length - 1]! : sample;
        const k = samplesRef.current.length;
        runningMeanRef.current.push(prev + (sample - prev) / k);
      }
    }

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = getGridColor();
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    const padL = 40, padR = 20, padT = 20, padB = 30;
    const drawW = W - padL - padR;
    const drawH = H - padT - padB;

    // Map value [0,1] range to canvas Y
    const toY = (v: number) => padT + drawH - (Math.max(0, Math.min(1, v)) * drawH);
    const toX = (i: number, total: number) => padL + (i / Math.max(1, total - 1)) * drawW;

    // Y-axis labels
    const dark = isDarkMode();
    ctx.fillStyle = dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText("1.0", padL - 4, padT + 4);
    ctx.fillText("0.5", padL - 4, padT + drawH / 2 + 4);
    ctx.fillText("0.0", padL - 4, padT + drawH + 4);

    // True mean reference line (dashed)
    const refY = toY(p);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padL, refY);
    ctx.lineTo(W - padR, refY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label for true mean
    ctx.fillStyle = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`μ=${p.toFixed(2)}`, W - padR - 52, refY - 4);

    // Scatter dots (recent batch only — last 60)
    const dots = samplesRef.current;
    const visibleDots = dots.slice(-60);
    const startIdx = Math.max(0, dots.length - 60);
    for (let i = 0; i < visibleDots.length; i++) {
      const realI = startIdx + i;
      const x = toX(realI, n);
      const y = toY(visibleDots[i]!);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(161,117,232,${0.25 + (i / visibleDots.length) * 0.35})`;
      ctx.fill();
    }

    // Running mean convergence line
    const means = runningMeanRef.current;
    if (means.length > 1) {
      ctx.beginPath();
      ctx.moveTo(toX(0, n), toY(means[0]!));
      for (let i = 1; i < means.length; i++) {
        ctx.lineTo(toX(i, n), toY(means[i]!));
      }
      const grad = ctx.createLinearGradient(padL, 0, padL + drawW, 0);
      grad.addColorStop(0, `${PURPLE}99`);
      grad.addColorStop(1, PURPLE_LIGHT);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = PURPLE;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Endpoint dot
      const lastX = toX(means.length - 1, n);
      const lastY = toY(means[means.length - 1]!);
      ctx.beginPath();
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.shadowBlur = 12;
      ctx.shadowColor = PURPLE_LIGHT;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Current mean label
      ctx.fillStyle = PURPLE_LIGHT;
      ctx.font = "bold 10px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`X̄=${(means[means.length - 1]!).toFixed(3)}`, Math.min(lastX + 8, W - 80), lastY - 4);
    }

    // n progress label
    ctx.fillStyle = dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(`n = ${dots.length}`, padL + drawW / 2, H - 4);

    if (!doneRef.current) {
      animRef.current = requestAnimationFrame(draw);
    }
  }, [n, p, sigma]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">05</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Law of Large Numbers</span>
            <span className="lang-zh">大数定律</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">In the short run, luck. In the long run, distribution.</span>
            <span className="lang-zh">短期看运气，长期看分布。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "240px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Samples n</span>
            <span className="lang-zh">样本数 n</span>
            <span className="control-val">{n}</span>
          </label>
          <input type="range" min={10} max={1000} step={10} value={n} onChange={(e) => setN(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Win rate p</span>
            <span className="lang-zh">胜率 p</span>
            <span className="control-val">{p.toFixed(2)}</span>
          </label>
          <input type="range" min={0.1} max={0.9} step={0.05} value={p} onChange={(e) => setP(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Noise σ</span>
            <span className="lang-zh">波动 σ</span>
            <span className="control-val">{sigmaLabels[sigma]}</span>
          </label>
          <input type="range" min={1} max={3} value={sigma} onChange={(e) => setSigma(Number(e.target.value))} />
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`X̄ₙ → μ  (n → ∞)\n\nX̄ₙ = (1/n) Σ Xᵢ    sample mean 样本均值\nμ   = p             true mean  真实均值\n\n当 n 足够大，X̄ₙ 必然收敛到 μ`}</pre>
      </div>

      <div className="exp-explain">
        <p className="lang-en">A single outcome proves almost nothing. In ten trials, fluctuation feels like fate; in a thousand, structure begins to emerge. The law of large numbers reminds us that the world does not reward correctness immediately — it reveals patterns only after enough repetition. Investing, writing, relationships: all of them bow to distribution in the end.</p>
        <p className="lang-zh">单次结果几乎说明不了什么。十次实验，波动像命运；一千次实验，结构开始浮现。大数定律提醒我们：世界不是立刻奖励正确，而是在足够多次重复后显露规律。投资如此，写作如此，关系经营也是如此。短期里你会怀疑自己，长期里分布会替你说话。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"One win or loss tells you almost nothing. Edge only reveals itself through repetition." — Rex Liu</span>
          <span className="lang-zh">「一次输赢不说明你对了还是错了。重复足够多次，优势才会显形。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 6: Fractal Echo
// ============================================================
function FractalEcho() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const windRef = useRef(0);
  const windTargetRef = useRef(0);
  const windTimerRef = useRef(0);
  const lastRenderRef = useRef(0);

  const [depth, setDepth] = useState(7);
  const [angle, setAngle] = useState(25);
  const [scale, setScale] = useState(0.68);
  const [jitter, setJitter] = useState(0.3);
  const tc = useThemeColors();

  // Seeded pseudo-random for stable jitter
  const seededRand = (seed: number): number => {
    const x = Math.sin(seed + 1) * 43758.5453;
    return x - Math.floor(x);
  };

  const drawBranch = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      length: number,
      ang: number,
      d: number,
      seed: number,
      maxDepth: number,
      dark: boolean,
    ) => {
      if (d === 0 || length < 1) return;

      const depthFrac = d / maxDepth; // 1 = root, near 0 = tip

      // Color interpolation: root = deep purple, tip = light purple/lavender
      const r1 = 89, g1 = 53, b1 = 209; // PURPLE root #8953d1
      const r2 = dark ? 210 : 180;
      const g2 = dark ? 180 : 155;
      const b2 = dark ? 255 : 240; // tip lavender
      const t = 1 - depthFrac;
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      const alpha = dark ? 0.55 + depthFrac * 0.45 : 0.45 + depthFrac * 0.55;
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = Math.max(0.5, depthFrac * 3);

      const nx = x + Math.cos(ang) * length;
      const ny = y + Math.sin(ang) * length;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      const jitterAmt = jitter * (seededRand(seed) - 0.5) * 0.6;
      const angRad = ((angle + windRef.current) * Math.PI) / 180;

      drawBranch(ctx, nx, ny, length * scale, ang - angRad + jitterAmt, d - 1, seed * 1.618, maxDepth, dark);
      drawBranch(ctx, nx, ny, length * scale, ang + angRad + jitterAmt * 0.8, d - 1, seed * 2.718, maxDepth, dark);
    },
    [angle, scale, jitter],
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const dark = isDarkMode();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = getGridColor();
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    const startX = W / 2;
    const startY = H * 0.92;
    const trunkLength = H * 0.22;

    drawBranch(ctx, startX, startY, trunkLength, -Math.PI / 2, depth, 42, depth, dark);
  }, [depth, drawBranch]);

  // Wind effect: gentle angle oscillation
  useEffect(() => {
    const tick = (now: number) => {
      windTimerRef.current += 1;
      if (windTimerRef.current > 180) {
        windTimerRef.current = 0;
        windTargetRef.current = (Math.random() - 0.5) * 4;
      }
      windRef.current += (windTargetRef.current - windRef.current) * 0.008;

      const elapsed = now - lastRenderRef.current;
      if (elapsed > 100) { // ~10fps for wind updates
        lastRenderRef.current = now;
        render();
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [render]);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">06</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Fractal Echo</span>
            <span className="lang-zh">分形回声</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">The whole hides inside the part.</span>
            <span className="lang-zh">局部里藏着整体。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "280px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Depth</span>
            <span className="lang-zh">迭代层数</span>
            <span className="control-val">{depth}</span>
          </label>
          <input type="range" min={3} max={9} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Angle</span>
            <span className="lang-zh">分支角度</span>
            <span className="control-val">{angle}°</span>
          </label>
          <input type="range" min={10} max={50} value={angle} onChange={(e) => setAngle(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Scale</span>
            <span className="lang-zh">缩放比例</span>
            <span className="control-val">{scale.toFixed(2)}</span>
          </label>
          <input type="range" min={0.55} max={0.8} step={0.01} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Jitter</span>
            <span className="lang-zh">扰动</span>
            <span className="control-val">{jitter.toFixed(1)}</span>
          </label>
          <input type="range" min={0} max={1} step={0.1} value={jitter} onChange={(e) => setJitter(Number(e.target.value))} />
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`Self-similarity across scale\n\nN = r^(-D)\nN = 自相似副本数  number of self-similar copies\nr = 缩放比例      scale factor\nD = 分形维度      fractal dimension`}</pre>
      </div>

      <div className="exp-explain">
        <p className="lang-en">Many complex systems are not chaotic at all — they repeat the same structure across scales. Markets do this. Habits do this. Even life's recurring dilemmas do this. What feels like a new problem is often just an old pattern enlarged. The beauty of fractals lies not in complexity itself, but in the strange familiarity hidden inside it.</p>
        <p className="lang-zh">很多复杂系统并不是杂乱无章，而是在不同尺度重复同一种模式。市场像这样，人的习惯像这样，人生的困境也常常像这样。你以为自己换了一个新问题，放大看，往往只是旧结构的再现。分形之美，不在复杂，而在复杂背后那种令人惊讶的熟悉感。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"Are you facing a new problem — or just an enlarged version of an old pattern?" — Rex Liu</span>
          <span className="lang-zh">「你看到的是新问题，还是旧模式的放大版？」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Experiment 7: Fourier Decomposition
// ============================================================
function FourierDecomposition() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const tRef = useRef(0);

  const [base, setBase] = useState(2);
  const [harmonics, setHarmonics] = useState(4);
  const [decay, setDecay] = useState(0.6);
  const [showComponents, setShowComponents] = useState(true);
  const tc = useThemeColors();

  const COMPONENT_COLORS = ["#c9a3ff", "#a175e8", "#8953d1", "#7040b8", "#5c30a0", "#4a2288", "#3a1870"] as const;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    const dark = isDarkMode();

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = getCanvasBg();
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = getGridColor();
    ctx.lineWidth = 1;
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let x = 0; x <= W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    const padT = 20, padB = 20;
    const cy = H / 2;
    const amp = (H - padT - padB) * 0.38;
    const t = tRef.current;

    // Draw component waves (underneath)
    if (showComponents) {
      for (let h = 1; h <= harmonics; h++) {
        const freq = h * base;
        const amplitude = amp / Math.pow(h, decay);
        const color = COMPONENT_COLORS[h - 1] ?? "#8953d1";

        ctx.beginPath();
        for (let x = 0; x < W; x++) {
          const phase = (x / W) * Math.PI * 2 * freq - t * base * 0.8;
          const y = cy + amplitude * Math.sin(phase);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = color + (dark ? "55" : "44");
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // Composite wave (main signal)
    ctx.beginPath();
    for (let x = 0; x < W; x++) {
      let y = 0;
      for (let h = 1; h <= harmonics; h++) {
        const freq = h * base;
        const amplitude = amp / Math.pow(h, decay);
        const phase = (x / W) * Math.PI * 2 * freq - t * base * 0.8;
        y += amplitude * Math.sin(phase);
      }
      if (x === 0) ctx.moveTo(x, cy + y);
      else ctx.lineTo(x, cy + y);
    }
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, `${PURPLE}aa`);
    grad.addColorStop(0.5, PURPLE_LIGHT);
    grad.addColorStop(1, `${PURPLE}aa`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = PURPLE;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center baseline
    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Harmonics label
    ctx.fillStyle = dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "right";
    ctx.fillText(`n=${harmonics} harmonics · base=${base}`, W - 12, padT + 12);

    tRef.current += 0.025;
    animRef.current = requestAnimationFrame(draw);
  }, [base, harmonics, decay, showComponents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio;
    const resize = () => {
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <div className="experiment-card">
      <div className="exp-header">
        <span className="exp-num">07</span>
        <div>
          <h2 className="exp-title" style={{color: tc.title}}>
            <span className="lang-en">Fourier Decomposition</span>
            <span className="lang-zh">傅里叶分解</span>
          </h2>
          <p className="exp-subtitle" style={{color: tc.subtitle}}>
            <span className="lang-en">Complexity is often the sum of simple patterns.</span>
            <span className="lang-zh">复杂，往往只是多个简单模式的叠加。</span>
          </p>
        </div>
      </div>

      <canvas ref={canvasRef} className="exp-canvas" style={{ width: "100%", height: "220px" }} />

      <div className="exp-controls">
        <div className="control-group">
          <label>
            <span className="lang-en">Base freq</span>
            <span className="lang-zh">基频 base</span>
            <span className="control-val">{base}</span>
          </label>
          <input type="range" min={1} max={5} value={base} onChange={(e) => setBase(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Harmonics</span>
            <span className="lang-zh">谐波数量</span>
            <span className="control-val">{harmonics}</span>
          </label>
          <input type="range" min={1} max={7} value={harmonics} onChange={(e) => setHarmonics(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Decay</span>
            <span className="lang-zh">衰减</span>
            <span className="control-val">{decay.toFixed(1)}</span>
          </label>
          <input type="range" min={0.2} max={1.0} step={0.1} value={decay} onChange={(e) => setDecay(Number(e.target.value))} />
        </div>
        <div className="control-group">
          <label>
            <span className="lang-en">Show components</span>
            <span className="lang-zh">显示分量</span>
            <span className="control-val" style={{color: showComponents ? "#8953d1" : "#999"}}>{showComponents ? "on" : "off"}</span>
          </label>
          <input type="range" min={0} max={1} step={1} value={showComponents ? 1 : 0} onChange={(e) => setShowComponents(Number(e.target.value) === 1)} />
        </div>
      </div>

      <div className="exp-formula">
        <pre>{`f(x) = Σ [sin(n·base·x) / nᵈᵉᶜᵃʸ]\n       n=1 to harmonics\n\n复杂信号 = 多个简单波形的叠加\nComplex signal = sum of simple sinusoids`}</pre>
      </div>

      <div className="exp-explain">
        <p className="lang-en">What appears complex is often just many simple rules happening at once. Noise, cycles, trends, emotion — layered together, they become the market. Impulse, habit, environment, purpose — layered together, they become a life. The beauty of Fourier decomposition is this: complexity is not beyond understanding, if you are willing to break it apart.</p>
        <p className="lang-zh">表面上的复杂，很多时候只是多个简单规律同时发生。噪音、周期、趋势、情绪，叠在一起，就像市场；冲动、习惯、环境、目标，叠在一起，就像人生。傅里叶分解的美，在于它提醒我们：复杂不一定不可理解，只要你愿意拆开看。</p>
      </div>

      <div className="exp-quote">
        <blockquote>
          <span className="lang-en">"Complexity is not beyond understanding. You just haven't broken it apart yet." — Rex Liu</span>
          <span className="lang-zh">「复杂不是无法理解，只是你还没拆开它。」— Rex Liu</span>
        </blockquote>
      </div>
    </div>
  );
}

// ============================================================
// Main export
// ============================================================
export default function VisualExperiments() {
  return (
    <div className="visual-experiments">
      <SineWaveStudio />
      <NeuralPulse />
      <CompoundGrowth />
      <BezierJourney />
      <LawOfLargeNumbers />
      <FractalEcho />
      <FourierDecomposition />
    </div>
  );
}
