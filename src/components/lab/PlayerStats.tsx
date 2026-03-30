/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerStatsProps {
  stats: {
    vitality: number;  // 体魄
    wisdom: number;    // 悟性
    spirit: number;    // 心法
    craft: number;     // 剑术
    renown: number;    // 声望
    command: number;   // 统御
  };
  rank: { zh: string; en: string };
  avgStat: number;
  currentCity: { name: string; nameCN: string };
  travelDays: number;
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  cities: Array<{ id: string; name: string; nameCN: string; lat: number; lng: number }>;
  achievements: Array<{
    id: string; icon: string;
    nameZh: string; nameEn: string;
    descZh: string; descEn: string;
    unlocked: boolean;
    unlockedDate?: string;
    progress?: number; max?: number;
  }>;
  recentActivity: Array<{
    date: string; dateZh: string;
    icon: string; statZh: string; statEn: string; amount: number;
    descZh: string; descEn: string;
  }>;
}

// ─── Theme helper ─────────────────────────────────────────────────────────────

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") === "dark"
    || document.documentElement.classList.contains("dark");
}

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(isDarkMode());
    const obs = new MutationObserver(() => setDark(isDarkMode()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ─── PixelBar ─────────────────────────────────────────────────────────────────

function PixelBar({ value, dark }: { value: number; dark: boolean }) {
  const animated = useCountUp(value);
  const segments = 20;
  const filled = Math.round((animated / 100) * segments);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            width: 8, height: 10,
            background: i < filled
              ? (i < filled * 0.6 ? "#8953d1" : "#a175e8")
              : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
            imageRendering: "pixelated",
            transition: "background 0.05s",
          }}
        />
      ))}
      <span style={{ marginLeft: 6, fontFamily: "monospace", fontSize: 13, color: "#8953d1", fontWeight: 700 }}>
        {animated}
      </span>
    </div>
  );
}

// ─── Pixel Avatar (侠客像素头像) ──────────────────────────────────────────────

// ─── HeroCard ─────────────────────────────────────────────────────────────────

function HeroCard({ rank, currentCity, travelDays, dark }: {
  rank: { zh: string; en: string };
  currentCity: { name: string; nameCN: string };
  travelDays: number;
  dark: boolean;
}) {
  const bg = dark ? "#1a1a24" : "#f8f4ff";
  const border = dark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.2)";
  const textPrimary = dark ? "#ffffff" : "#111111";
  const textSecondary = dark ? "#aaaaaa" : "#666666";

  return (
    <div style={{
      border: `1px solid ${border}`,
      borderRadius: 12,
      background: bg,
      padding: "1.5rem",
      display: "flex",
      gap: "1.5rem",
      alignItems: "flex-start",
      flexWrap: "wrap",
    }}>
      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 112, height: 112,
          background: "#8953d1",
          borderRadius: 8,
          border: `2px solid rgba(137,83,209,0.6)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
          imageRendering: "pixelated",
        }}>
          <span style={{
            fontFamily: "monospace",
            fontSize: 24,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: 3,
            textShadow: "2px 2px 0 #5a20a0",
            userSelect: "none",
          }}>REX</span>
        </div>
        {/* Breathing glow */}
        <div style={{
          position: "absolute", inset: -4, borderRadius: 12,
          background: "radial-gradient(circle, rgba(137,83,209,0.2) 0%, transparent 70%)",
          animation: "breathe 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 200 }}>
        <h2 style={{ margin: 0, fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: "1.5rem", fontWeight: 700, color: textPrimary }}>
          Rex Liu
        </h2>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <InfoTag icon="⚔️" zh={`境界：${rank.zh}`} en={`Realm: ${rank.en}`} color="#8953d1" />
          <InfoTag icon="🏔️" zh="门派：逍遥派" en="School: Sovereign Individual" color="#a175e8" />
          <InfoTag icon="📍" zh={`当前：${currentCity.nameCN}`} en={`Now: ${currentCity.name}`} color="#7040b0" />
          <InfoTag icon="🗓️" zh={`游历第 ${travelDays} 天`} en={`Day ${travelDays} on the road`} color="#9060c8" />
        </div>
        <p style={{ margin: "0.75rem 0 0", fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: "0.85rem", color: textSecondary, fontStyle: "italic" }}>
          <span className="lang-en">Every walk adds Vitality +1. Every insight adds Wisdom +1. Every action cultivates mastery.</span>
          <span className="lang-zh">散步体魄+1，洞察悟性+1，每次行动都在积累修为。</span>
        </p>
      </div>
    </div>
  );
}

function InfoTag({ icon, zh, en, color }: { icon: string; zh: string; en: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      border: `1px solid ${color}40`,
      background: `${color}12`,
      fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: "0.78rem", color,
    }}>
      <span>{icon}</span>
      <span className="lang-zh">{zh}</span>
      <span className="lang-en">{en}</span>
    </span>
  );
}

// ─── RadarChart ───────────────────────────────────────────────────────────────

function RadarChart({ stats, dark }: { stats: PlayerStatsProps["stats"]; dark: boolean }) {
  const [animated, setAnimated] = useState({ vitality: 0, wisdom: 0, spirit: 0, craft: 0, renown: 0, command: 0 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setAnimated({
        vitality: stats.vitality * ease,
        wisdom: stats.wisdom * ease,
        spirit: stats.spirit * ease,
        craft: stats.craft * ease,
        renown: stats.renown * ease,
        command: stats.command * ease,
      });
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [stats]);

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100;

  const axes = [
    { key: "vitality",  zh: "体魄", en: "Vitality", angle: -90 },
    { key: "wisdom",    zh: "悟性", en: "Wisdom",   angle: -30 },
    { key: "craft",     zh: "剑术", en: "Craft",    angle:  30 },
    { key: "command",   zh: "统御", en: "Command",  angle:  90 },
    { key: "renown",    zh: "声望", en: "Renown",   angle: 150 },
    { key: "spirit",    zh: "心法", en: "Spirit",   angle: 210 },
  ];

  function polar(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Grid hexagons
  const gridLevels = [20, 40, 60, 80, 100];
  const gridColor = dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.15)";
  const axisColor = dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.25)";
  const textColor = dark ? "#aaaaaa" : "#777777";

  function hexPath(r: number) {
    return axes.map(a => {
      const p = polar(a.angle, (r / 100) * maxR);
      return p;
    }).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  // Animated stats polygon
  function statsPath() {
    return axes.map(a => {
      const v = animated[a.key as keyof typeof animated];
      const p = polar(a.angle, (v / 100) * maxR);
      return p;
    }).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  const statDetails: Record<string, { formula: string; zh: string; en: string }> = {
    vitality: { formula: "cities×3 + travel_days×0.5", zh: "旅行城市 × 3 + 旅居天数 × 0.5", en: "cities × 3 + travel days × 0.5" },
    wisdom:   { formula: "posts×2 + library×0.5 + notes×0.01", zh: "文章 × 2 + 书影 × 0.5 + 笔记 × 0.01", en: "posts × 2 + library × 0.5 + notes × 0.01" },
    spirit:   { formula: "digests×1.5 + framework×2 + decisions×1", zh: "精读 × 1.5 + 框架 × 2 + 决策 × 1", en: "digests × 1.5 + framework × 2 + decisions × 1" },
    craft:    { formula: "projects×5 + builder_logs×1 + experiments×5", zh: "项目 × 5 + 造物日志 × 1 + 实验 × 5", en: "projects × 5 + builder logs × 1 + experiments × 5" },
    renown:   { formula: "followers÷1000 + weekly_eng×0.1", zh: "关注数 ÷ 1000 + 周均互动 × 0.1", en: "followers ÷ 1000 + weekly engagement × 0.1" },
    command:  { formula: "agents×5 + proposals×0.3 + crons×0.5", zh: "Agent × 5 + 提案 × 0.3 + 定时 × 0.5", en: "agents × 5 + proposals × 0.3 + crons × 0.5" },
  };

  const labelPrimary = dark ? "#ffffff" : "#111111";

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
        {/* SVG Radar */}
        <div style={{ flex: "0 0 auto" }}>
          <svg width={size} height={size} style={{ overflow: "visible" }}>
            {/* Grid rings */}
            {gridLevels.map(lvl => (
              <path key={lvl} d={hexPath(lvl)} fill="none" stroke={gridColor} strokeWidth={1} />
            ))}
            {/* Axes */}
            {axes.map(a => {
              const end = polar(a.angle, maxR);
              return <line key={a.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={axisColor} strokeWidth={1} />;
            })}
            {/* Stats fill */}
            <path d={statsPath()} fill="rgba(137,83,209,0.2)" stroke="#8953d1" strokeWidth={2} />
            {/* Stat dots */}
            {axes.map(a => {
              const v = animated[a.key as keyof typeof animated];
              const p = polar(a.angle, (v / 100) * maxR);
              const isSelected = selected === a.key;
              return (
                <circle
                  key={a.key} cx={p.x} cy={p.y} r={isSelected ? 7 : 5}
                  fill={isSelected ? "#a175e8" : "#8953d1"}
                  stroke={dark ? "#1a1a24" : "#f8f4ff"} strokeWidth={2}
                  style={{ cursor: "pointer", transition: "r 0.15s" }}
                  onClick={() => setSelected(selected === a.key ? null : a.key)}
                />
              );
            })}
            {/* Labels */}
            {axes.map(a => {
              const p = polar(a.angle, maxR + 22);
              const isSelected = selected === a.key;
              return (
                <g key={a.key} style={{ cursor: "pointer" }} onClick={() => setSelected(selected === a.key ? null : a.key)}>
                  <text
                    x={p.x} y={p.y - 4}
                    textAnchor="middle" dominantBaseline="auto"
                    fontFamily="Georgia, Cambria, serif" fontSize={11}
                    fill={isSelected ? "#8953d1" : textColor}
                    fontWeight={isSelected ? 700 : 400}
                  >
                    {a.zh}
                  </text>
                  <text
                    x={p.x} y={p.y + 9}
                    textAnchor="middle" dominantBaseline="auto"
                    fontFamily="monospace" fontSize={10}
                    fill={isSelected ? "#a175e8" : dark ? "#555" : "#ccc"}
                  >
                    {Math.round(animated[a.key as keyof typeof animated])}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Stat bars */}
        <div style={{ flex: 1, minWidth: 220 }}>
          {axes.map(a => {
            const v = stats[a.key as keyof typeof stats];
            const isSelected = selected === a.key;
            return (
              <div
                key={a.key}
                onClick={() => setSelected(selected === a.key ? null : a.key)}
                style={{
                  marginBottom: 12, cursor: "pointer", padding: "6px 10px", borderRadius: 8,
                  background: isSelected ? `rgba(137,83,209,0.08)` : "transparent",
                  border: `1px solid ${isSelected ? "rgba(137,83,209,0.3)" : "transparent"}`,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 13, color: isSelected ? "#8953d1" : labelPrimary, fontWeight: isSelected ? 700 : 400 }}>
                    {a.zh} <span style={{ fontSize: 11, color: textColor }}>/ {a.en}</span>
                  </span>
                </div>
                <PixelBar value={v} dark={dark} />
                {isSelected && statDetails[a.key] && (
                  <div style={{ marginTop: 6, padding: "4px 0", borderTop: "1px solid rgba(137,83,209,0.15)" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a175e8" }}>{statDetails[a.key]?.formula}</div>
                    <div className="lang-zh" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 11, color: textColor, marginTop: 2 }}>{statDetails[a.key]?.zh}</div>
                    <div className="lang-en" style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 11, color: textColor, marginTop: 2 }}>{statDetails[a.key]?.en}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SkillTree (horizontal left-to-right layout) ──────────────────────────────

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: {
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  dark: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function getLevel(count: number): "locked" | "novice" | "master" {
    if (count === 0) return "locked";
    if (count < 4) return "novice";
    return "master";
  }

  function nodeColor(level: string) {
    if (level === "master") return { fill: "#8953d1", stroke: "#a175e8", text: "#fff", glow: true };
    if (level === "novice") return { fill: dark ? "#3a2060" : "#d4b8f0", stroke: "#8953d1", text: dark ? "#e0d0ff" : "#5a20c0", glow: false };
    return { fill: dark ? "#2a2a3a" : "#e8e4f0", stroke: dark ? "#444" : "#ccc", text: dark ? "#666" : "#aaa", glow: false };
  }

  // Node box: horizontal rect with label
  function NodeBox({ x, y, w, h, label, labelEn, count, url, dark: isDark }: {
    x: number; y: number; w: number; h: number;
    label: string; labelEn: string; count: number; url?: string; dark: boolean;
  }) {
    const level = getLevel(count);
    const nc = nodeColor(level);
    const cx = x + w / 2;
    const cy = y + h / 2;

    function handleClick() {
      if (url && level !== "locked") window.location.href = url;
    }

    function handleHover() {
      const msg = level === "locked" ? "未点亮 · Locked" : `${count} 篇 · ${count} posts`;
      setTooltip({ text: msg, x: cx, y: y - 8 });
    }

    return (
      <g
        style={{ cursor: level !== "locked" && url ? "pointer" : "default" }}
        onClick={handleClick}
        onMouseEnter={handleHover}
        onMouseLeave={() => setTooltip(null)}
      >
        {nc.glow && (
          <rect x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx={8}
            fill="rgba(137,83,209,0.12)"
            style={{ animation: "breathe 3s ease-in-out infinite" }} />
        )}
        <rect x={x} y={y} width={w} height={h} rx={5} fill={nc.fill} stroke={nc.stroke} strokeWidth={1.5} />
        <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle"
          fontFamily="Georgia, Cambria, serif" fontSize={11} fontWeight={700} fill={nc.text}>
          {label}
        </text>
        <text x={cx} y={cy + 9} textAnchor="middle" dominantBaseline="middle"
          fontFamily="monospace" fontSize={9} fill={isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.35)"}>
          {labelEn}
        </text>
      </g>
    );
  }

  // Root label box (bigger, distinct)
  function RootBox({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
    const rootFill = dark ? "#1a0a3a" : "#ede8ff";
    const rootText = dark ? "#c0a0f0" : "#5a20c0";
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={7} fill={rootFill} stroke="#8953d1" strokeWidth={2} />
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle"
          fontFamily="Georgia, Cambria, serif" fontSize={13} fontWeight={800} fill={rootText}>
          {label}
        </text>
      </g>
    );
  }

  function HLine({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
    const stroke = dark ? "rgba(137,83,209,0.35)" : "rgba(137,83,209,0.3)";
    // Horizontal connector with right-angle bend
    const midX = (x1 + x2) / 2;
    return <path d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`}
      fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />;
  }

  /*
    Layout (left-to-right, 4 columns):
    Col 0 (x=20):  Root [内功] / [外功]
    Col 1 (x=160): Branches (周期心法, 价值心法, 风控心法) / (剑法·写作, 掌法·编程, 轻功·探索)
    Col 2 (x=320): Mid leaves
    Col 3 (x=500): Far leaves (for nodes with 2 children)

    Node box: w=110, h=36
    Row spacing: 56px between branches, 44px between leaves
  */
  const nW = 110, nH = 36;
  const rW = 80, rH = 44;

  // ── Inner Arts ──
  // Root centered on rows 0-2 (y=60..172), so cy=116
  const iRx = 20, iRy = 94; // root box y

  // Branches
  const b1y = 28;  // 周期心法
  const b2y = 100; // 价值心法
  const b3y = 172; // 风控心法
  const bX = 150;

  // Leaves for Inner Arts (col 2 x=310)
  const lX = 310;
  const l1y = 10;  // 盈亏同源
  const l2y = 58;  // 买预期卖事实
  const l3y = 82;  // 复利之道
  const l4y = 130; // 长期主义
  const l5y = 154; // 对手盘
  const l6y = 202; // 去中心化

  // ── Outer Arts ── (offset by 440 vertically from inner)
  const yOff = 260;
  const oRx = 20, oRy = 94 + yOff;
  const ob1y = 28 + yOff;
  const ob2y = 100 + yOff;
  const ob3y = 172 + yOff;
  const obX = 150;

  // Leaves for Outer Arts (col 2)
  const olX = 310;
  const ol1y = 10 + yOff;   // 推文
  const ol2y = 58 + yOff;   // 长文
  const ol3y = 82 + yOff;   // OG Witness
  const ol4y = 112 + yOff;  // Vibe Coding
  const ol5y = 154 + yOff;  // Agent 系统
  const ol6y = 178 + yOff;  // 旅居
  const ol7y = 222 + yOff;  // 数字游牧

  const svgH = 560;
  const svgW = 500;

  // Connection helper: connect right edge of node to left edge of target
  function rightOf(x: number, y: number, w: number, h: number) { return { x: x + w, y: y + h / 2 }; }
  function leftOf(x: number, y: number, h: number) { return { x, y: y + h / 2 }; }

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg ref={svgRef} width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible", minWidth: svgW }}>

        {/* ── Inner Arts ── */}
        <RootBox x={iRx} y={iRy} w={rW} h={rH} label="内功" />

        {/* Root → Branches */}
        {[b1y, b2y, b3y].map(by => {
          const r = rightOf(iRx, iRy, rW, rH);
          const l = leftOf(bX, by, nH);
          return <HLine key={by} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}

        {/* Branch 1: 周期心法 → 盈亏同源, 买预期卖事实 */}
        <NodeBox x={bX} y={b1y} w={nW} h={nH} label="周期心法" labelEn="Cycle Arts" count={tagCounts["crypto"] || 0} url="/tags/crypto/" dark={dark} />
        {[l1y, l2y].map(ly => {
          const r = rightOf(bX, b1y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l1y} w={nW} h={nH} label="盈亏同源" labelEn="P&L Unity" count={tagCounts["trading"] || 0} url="/tags/trading/" dark={dark} />
        <NodeBox x={lX} y={l2y} w={nW} h={nH} label="买预期卖事实" labelEn="Buy Signal" count={tagCounts["alpha"] || 0} dark={dark} />

        {/* Branch 2: 价值心法 → 复利之道, 长期主义 */}
        <NodeBox x={bX} y={b2y} w={nW} h={nH} label="价值心法" labelEn="Value Arts" count={tagCounts["investment"] || 0} url="/tags/investment/" dark={dark} />
        {[l3y, l4y].map(ly => {
          const r = rightOf(bX, b2y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l3y} w={nW} h={nH} label="复利之道" labelEn="Compounding" count={tagCounts["evergreen"] || 0} url="/tags/evergreen/" dark={dark} />
        <NodeBox x={lX} y={l4y} w={nW} h={nH} label="长期主义" labelEn="Long-term" count={(tagCounts["investment"] || 0) + (tagCounts["wealth"] || 0)} dark={dark} />

        {/* Branch 3: 风控心法 → 对手盘, 去中心化 */}
        <NodeBox x={bX} y={b3y} w={nW} h={nH} label="风控心法" labelEn="Risk Arts" count={tagCounts["wealth"] || 0} url="/tags/wealth/" dark={dark} />
        {[l5y, l6y].map(ly => {
          const r = rightOf(bX, b3y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l5y} w={nW} h={nH} label="对手盘" labelEn="Counter-play" count={tagCounts["macro"] || 0} dark={dark} />
        <NodeBox x={lX} y={l6y} w={nW} h={nH} label="去中心化" labelEn="Decentralize" count={tagCounts["crypto"] || 0} url="/tags/crypto/" dark={dark} />

        {/* ── Outer Arts ── */}
        <RootBox x={oRx} y={oRy} w={rW} h={rH} label="外功" />

        {/* Root → Branches */}
        {[ob1y, ob2y, ob3y].map(by => {
          const r = rightOf(oRx, oRy, rW, rH);
          const l = leftOf(obX, by, nH);
          return <HLine key={by + 1000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}

        {/* Branch 1: 剑法·写作 → 推文, 长文, OG Witness */}
        <NodeBox x={obX} y={ob1y} w={nW} h={nH} label="剑法·写作" labelEn="Sword·Write" count={postCount} url="/posts/" dark={dark} />
        {[ol1y, ol2y, ol3y].map(ly => {
          const r = rightOf(obX, ob1y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 2000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol1y} w={nW} h={nH} label="推文" labelEn="Tweet" count={postCount} dark={dark} />
        <NodeBox x={olX} y={ol2y} w={nW} h={nH} label="长文" labelEn="Long-form" count={Math.floor(postCount * 0.6)} dark={dark} />
        <NodeBox x={olX} y={ol3y} w={nW} h={nH} label="OG Witness" labelEn="OG Witness" count={tagCounts["og-witness"] || 0} dark={dark} />

        {/* Branch 2: 掌法·编程 → Vibe Coding, Agent 系统 */}
        <NodeBox x={obX} y={ob2y} w={nW} h={nH} label="掌法·编程" labelEn="Palm·Code" count={tagCounts["ai"] || 0} url="/tags/ai/" dark={dark} />
        {[ol4y, ol5y].map(ly => {
          const r = rightOf(obX, ob2y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 3000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol4y} w={nW} h={nH} label="Vibe Coding" labelEn="Vibe Code" count={tagCounts["vibe-coding"] || (tagCounts["ai"] || 0)} url="/tags/ai/" dark={dark} />
        <NodeBox x={olX} y={ol5y} w={nW} h={nH} label="Agent 系统" labelEn="Agent Sys" count={builderLogCount} dark={dark} />

        {/* Branch 3: 轻功·探索 → 旅居, 数字游牧 */}
        <NodeBox x={obX} y={ob3y} w={nW} h={nH} label="轻功·探索" labelEn="Swift·Explore" count={tagCounts["travel"] || 0} url="/tags/travel/" dark={dark} />
        {[ol6y, ol7y].map(ly => {
          const r = rightOf(obX, ob3y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 4000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol6y} w={nW} h={nH} label="旅居" labelEn="Nomad Stay" count={tagCounts["travel"] || 0} url="/tags/travel/" dark={dark} />
        <NodeBox x={olX} y={ol7y} w={nW} h={nH} label="数字游牧" labelEn="Digital Nomad" count={tagCounts["travel"] || 0} dark={dark} />

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 50} y={tooltip.y - 22} width={100} height={20} rx={4}
              fill={dark ? "#2a2a3a" : "#fff"} stroke="rgba(137,83,209,0.3)" strokeWidth={1} />
            <text x={tooltip.x} y={tooltip.y - 8} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#a175e8">
              {tooltip.text}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
        {[
          { fill: "#8953d1", stroke: "#a175e8", label: "精通 Master (4+)" },
          { fill: dark ? "#3a2060" : "#d4b8f0", stroke: "#8953d1", label: "入门 Novice (1-3)" },
          { fill: dark ? "#2a2a3a" : "#e8e4f0", stroke: dark ? "#444" : "#ccc", label: "未点亮 Locked" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={14} height={14}><rect x={1} y={1} width={12} height={12} rx={3} fill={l.fill} stroke={l.stroke} strokeWidth={1.5} /></svg>
            <span style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 11, color: dark ? "#888" : "#999" }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ExploreMap ───────────────────────────────────────────────────────────────

// ─── AchievementBadges ────────────────────────────────────────────────────────

function AchievementBadges({ achievements, dark }: { achievements: PlayerStatsProps["achievements"]; dark: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const textSecondary = dark ? "#888" : "#999";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
      {achievements.map(a => {
        const isSelected = selected === a.id;
        const borderColor = a.unlocked
          ? (isSelected ? "#a175e8" : "rgba(137,83,209,0.3)")
          : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)");
        const bg = a.unlocked
          ? (dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.06)")
          : (dark ? "#111118" : "#f5f5f5");

        return (
          <div
            key={a.id}
            onClick={() => setSelected(isSelected ? null : a.id)}
            style={{
              border: `1px solid ${borderColor}`,
              borderRadius: 10, background: bg, padding: "12px 14px",
              cursor: "pointer", transition: "all 0.15s",
              opacity: a.unlocked ? 1 : 0.6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22, filter: a.unlocked ? "none" : "grayscale(100%)" }}>{a.icon}</span>
              <div>
                <div style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 12, fontWeight: 700, color: a.unlocked ? "#8953d1" : textSecondary }}>
                  <span className="lang-zh">{a.nameZh}</span>
                  <span className="lang-en">{a.nameEn}</span>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 11, color: textSecondary, lineHeight: 1.4 }}>
              <span className="lang-zh">{a.descZh}</span>
              <span className="lang-en">{a.descEn}</span>
            </p>

            {a.unlocked && a.unlockedDate && (
              <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 10, color: "#8953d1" }}>
                ✓ {a.unlockedDate}
              </div>
            )}

            {!a.unlocked && a.progress !== undefined && a.max !== undefined && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: textSecondary }}>
                    {a.progress}/{a.max}
                  </span>
                  <span style={{ fontFamily: "monospace", fontSize: 10, color: "#8953d1" }}>
                    {Math.round((a.progress / a.max) * 100)}%
                  </span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(100, (a.progress / a.max) * 100)}%`,
                    background: "linear-gradient(to right, #8953d1, #a175e8)",
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── EXP per activity (based on stat amount) ─────────────────────────────────

function getExp(amount: number): number {
  return amount * 15;
}

// ─── ActivityLog ──────────────────────────────────────────────────────────────

function ActivityLog({ recentActivity, totalExp, dark }: {
  recentActivity: PlayerStatsProps["recentActivity"];
  totalExp: number;
  dark: boolean;
}) {
  const bg = dark ? "#0d0d18" : "#f8f4ff";
  const border = dark ? "rgba(137,83,209,0.15)" : "rgba(137,83,209,0.12)";
  const textPrimary = dark ? "#e0e0e0" : "#333";
  const textSecondary = dark ? "#777" : "#aaa";

  // Next realm threshold
  const nextRealmExp = 2000;
  const nextRealmName = "一方宗师";
  const expProgress = Math.min(100, Math.round((totalExp / nextRealmExp) * 100));

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recentActivity.map((act, i) => {
          const expGain = getExp(act.amount);
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "10px 14px", borderRadius: 8,
              background: bg, border: `1px solid ${border}`,
            }}>
              {/* Date */}
              <div style={{ flexShrink: 0, width: 60, textAlign: "center" }}>
                <div style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 11, color: textSecondary }}>
                  <span className="lang-zh">{act.dateZh}</span>
                  <span className="lang-en">{act.date}</span>
                </div>
              </div>

              {/* Icon */}
              <span style={{ fontSize: 18, flexShrink: 0 }}>{act.icon}</span>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: "monospace", fontSize: 11,
                    color: "#8953d1", fontWeight: 700,
                    background: "rgba(137,83,209,0.1)", padding: "1px 6px", borderRadius: 4,
                  }}>
                    <span className="lang-zh">{act.statZh}</span>
                    <span className="lang-en">{act.statEn}</span>
                    <span style={{ color: "#a175e8" }}> +{act.amount}</span>
                  </span>
                  {/* EXP tag */}
                  <span style={{
                    fontFamily: "monospace", fontSize: 11,
                    color: "#22c55e", fontWeight: 700,
                    background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 4,
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}>
                    +{expGain} EXP
                  </span>
                </div>
                <p style={{ margin: "3px 0 0", fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 12, color: textPrimary, lineHeight: 1.4 }}>
                  <span className="lang-zh">{act.descZh}</span>
                  <span className="lang-en">{act.descEn}</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* EXP progress bar */}
      <div style={{
        marginTop: 16, padding: "12px 16px", borderRadius: 8,
        background: dark ? "#0d0d18" : "#f8f4ff",
        border: `1px solid ${dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.15)"}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: 12, color: dark ? "#aaa" : "#666" }}>
            <span className="lang-zh">修为</span>
            <span className="lang-en">Cultivation</span>
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#8953d1", fontWeight: 700 }}>
            {totalExp.toLocaleString()} / {nextRealmExp.toLocaleString()} EXP
            <span style={{ color: dark ? "#aaa" : "#666", fontWeight: 400 }}>
              <span className="lang-zh"> → 下一境界: {nextRealmName}</span>
              <span className="lang-en"> → Next: {nextRealmName}</span>
            </span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${expProgress}%`,
            background: "linear-gradient(to right, #8953d1, #22c55e)",
            borderRadius: 4,
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return (
    <h2 style={{
      margin: "0 0 1.25rem",
      fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: "1.1rem", fontWeight: 700,
      color: dark ? "#ffffff" : "#111111",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <span>{icon}</span>
      <span className="lang-zh">{zh}</span>
      <span className="lang-en">{en}</span>
      <span style={{ flex: 1, height: 1, background: dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.15)", marginLeft: 8 }} />
    </h2>
  );
}

// ─── Main PlayerStats ─────────────────────────────────────────────────────────

export default function PlayerStats(props: PlayerStatsProps) {
  const dark = useTheme();
  const { stats, rank, currentCity, travelDays, tagCounts, postCount, builderLogCount, cities, achievements, recentActivity } = props;

  const sectionBg = dark ? "#161620" : "#f9f6ff";
  const sectionBorder = dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.12)";

  // Total EXP = sum of all stat values × 10
  const totalExp = (stats.vitality + stats.wisdom + stats.spirit + stats.craft + stats.renown + stats.command) * 10;

  return (
    <div style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", maxWidth: 900 }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; r: 28; }
          50% { opacity: 0.8; r: 32; }
        }
        .player-section {
          border: 1px solid ${sectionBorder};
          border-radius: 12px;
          padding: 1.5rem;
          background: ${sectionBg};
          margin-bottom: 1.5rem;
        }
      `}</style>

      {/* Hero Card */}
      <div className="player-section">
        <HeroCard rank={rank} currentCity={currentCity} travelDays={travelDays} dark={dark} />
      </div>

      {/* Radar Chart */}
      <div className="player-section">
        <SectionHeader icon="📊" zh="六维属性" en="Six Attributes" dark={dark} />
        <RadarChart stats={stats} dark={dark} />
      </div>

      {/* Skill Tree */}
      <div className="player-section" style={{ overflowX: "auto" }}>
        <SectionHeader icon="🌳" zh="技能树" en="Skill Tree" dark={dark} />
        <SkillTree tagCounts={tagCounts} postCount={postCount} builderLogCount={builderLogCount} dark={dark} />
      </div>

      {/* Explore Summary (compact, links to /travel/) */}
      <a href="/travel/" style={{
        display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center",
        padding: "1rem 1.5rem", borderRadius: 12,
        border: `1px solid ${dark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.2)"}`,
        background: dark ? "#1a1a24" : "#f8f4ff",
        textDecoration: "none", cursor: "pointer",
        transition: "border-color 0.2s",
      }}>
        <span style={{ fontSize: 28 }}>🗺️</span>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#8953d1" }}>
            {cities.length} <span style={{ fontSize: 14, fontWeight: 400, color: dark ? "#aaa" : "#666" }}>
              <span className="lang-en">cities explored</span>
              <span className="lang-zh">座城市已游历</span>
            </span>
          </div>
          <div style={{ fontSize: 12, color: dark ? "#666" : "#999", fontFamily: "Georgia, serif" }}>
            <span className="lang-en">→ Open full travel map</span>
            <span className="lang-zh">→ 查看完整旅居地图</span>
          </div>
        </div>
      </a>

      {/* Achievements */}
      <div className="player-section">
        <SectionHeader icon="🏆" zh="功勋录" en="Achievements" dark={dark} />
        <AchievementBadges achievements={achievements} dark={dark} />
      </div>

      {/* Activity Log */}
      <div className="player-section">
        <SectionHeader icon="📜" zh="修行日志" en="Cultivation Log" dark={dark} />
        <ActivityLog recentActivity={recentActivity} totalExp={totalExp} dark={dark} />
      </div>
    </div>
  );
}
