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
          <h2 className="exp-title">
            <span className="lang-en">Sine Wave Studio</span>
            <span className="lang-zh">正弦波工作室</span>
          </h2>
          <p className="exp-subtitle">
            <span className="lang-en">Market Cycles Are Predictable. Your Reaction to Them Is Not.</span>
            <span className="lang-zh">市场周期可预测。你对它的反应，不行。</span>
          </p>
        </div>
        <span className="exp-tag">crypto</span>
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
          <h2 className="exp-title">
            <span className="lang-en">Neural Pulse</span>
            <span className="lang-zh">神经脉冲</span>
          </h2>
          <p className="exp-subtitle">
            <span className="lang-en">Intelligence Is Connection, Not Computation.</span>
            <span className="lang-zh">智能是连接，不是计算力。</span>
          </p>
        </div>
        <span className="exp-tag">ai</span>
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
          <h2 className="exp-title">
            <span className="lang-en">Compound Growth</span>
            <span className="lang-zh">复利增长</span>
          </h2>
          <p className="exp-subtitle">
            <span className="lang-en">The 8th Wonder of the World, Visualized.</span>
            <span className="lang-zh">世界第八大奇迹，可视化。</span>
          </p>
        </div>
        <span className="exp-tag">investment</span>
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
          <h2 className="exp-title">
            <span className="lang-en">Bezier Journey</span>
            <span className="lang-zh">贝塞尔旅程</span>
          </h2>
          <p className="exp-subtitle">
            <span className="lang-en">Life Is Not a Straight Line. It's Pulled by Invisible Control Points.</span>
            <span className="lang-zh">人生不是直线。它被无形的控制点所牵引。</span>
          </p>
        </div>
        <span className="exp-tag">travel</span>
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
// Main export
// ============================================================
export default function VisualExperiments() {
  return (
    <div className="visual-experiments">
      <SineWaveStudio />
      <NeuralPulse />
      <CompoundGrowth />
      <BezierJourney />
    </div>
  );
}
