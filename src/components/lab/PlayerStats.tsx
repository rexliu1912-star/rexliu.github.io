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
          background: dark ? "#0d0d1a" : "#ede8f5",
          borderRadius: 8,
          border: `2px solid rgba(137,83,209,0.4)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          <img src="/avatar.png" alt="Rex Liu" style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "auto" }} />
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
        <h2 style={{ margin: 0, fontFamily: "serif", fontSize: "1.5rem", fontWeight: 700, color: textPrimary }}>
          Rex Liu
        </h2>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <InfoTag icon="⚔️" zh={`境界：${rank.zh}`} en={`Realm: ${rank.en}`} color="#8953d1" />
          <InfoTag icon="🏔️" zh="门派：逍遥派" en="School: Sovereign Individual" color="#a175e8" />
          <InfoTag icon="📍" zh={`当前：${currentCity.nameCN}`} en={`Now: ${currentCity.name}`} color="#7040b0" />
          <InfoTag icon="🗓️" zh={`游历第 ${travelDays} 天`} en={`Day ${travelDays} on the road`} color="#9060c8" />
        </div>
        <p style={{ margin: "0.75rem 0 0", fontFamily: "serif", fontSize: "0.85rem", color: textSecondary, fontStyle: "italic" }}>
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
      fontFamily: "serif", fontSize: "0.78rem", color,
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
                    fontFamily="serif" fontSize={11}
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
                  <span style={{ fontFamily: "serif", fontSize: 13, color: isSelected ? "#8953d1" : labelPrimary, fontWeight: isSelected ? 700 : 400 }}>
                    {a.zh} <span style={{ fontSize: 11, color: textColor }}>/ {a.en}</span>
                  </span>
                </div>
                <PixelBar value={v} dark={dark} />
                {isSelected && statDetails[a.key] && (
                  <div style={{ marginTop: 6, padding: "4px 0", borderTop: "1px solid rgba(137,83,209,0.15)" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a175e8" }}>{statDetails[a.key]?.formula}</div>
                    <div className="lang-zh" style={{ fontFamily: "serif", fontSize: 11, color: textColor, marginTop: 2 }}>{statDetails[a.key]?.zh}</div>
                    <div className="lang-en" style={{ fontFamily: "serif", fontSize: 11, color: textColor, marginTop: 2 }}>{statDetails[a.key]?.en}</div>
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

// ─── SkillTree ────────────────────────────────────────────────────────────────

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: {
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  dark: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const textSecondary = dark ? "#888" : "#888";

  function getLevel(count: number): "locked" | "novice" | "master" {
    if (count === 0) return "locked";
    if (count < 4) return "novice";
    return "master";
  }

  function nodeColor(level: string, dark: boolean) {
    if (level === "master") return { fill: "#8953d1", stroke: "#a175e8", glow: true };
    if (level === "novice") return { fill: dark ? "#3a2060" : "#d4b8f0", stroke: "#8953d1", glow: false };
    return { fill: dark ? "#2a2a3a" : "#e0d8f0", stroke: dark ? "#444" : "#ccc", glow: false };
  }

  function NodeCircle({ x, y, label, labelEn, count, url, dark: isDark }: {
    x: number; y: number; label: string; labelEn: string; count: number; url?: string; dark: boolean;
  }) {
    const level = getLevel(count);
    const nc = nodeColor(level, isDark);
    const r = 22;

    function handleClick() {
      if (url && level !== "locked") window.location.href = url;
    }

    function handleHover(_e: React.MouseEvent) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const msg = level === "locked" ? "未点亮 · Locked" : `${count} 篇 · ${count} posts`;
      setTooltip({ text: msg, x: x, y: y - r - 8 });
    }

    return (
      <g
        style={{ cursor: level !== "locked" && url ? "pointer" : "default" }}
        onClick={handleClick}
        onMouseEnter={handleHover}
        onMouseLeave={() => setTooltip(null)}
      >
        {nc.glow && (
          <circle cx={x} cy={y} r={r + 6} fill="rgba(137,83,209,0.15)" style={{ animation: "pulse 2s ease-in-out infinite" }} />
        )}
        <circle cx={x} cy={y} r={r} fill={nc.fill} stroke={nc.stroke} strokeWidth={2} />
        <text x={x} y={y - 5} textAnchor="middle" fontFamily="serif" fontSize={11} fill={isDark ? "#fff" : (level === "locked" ? "#999" : "#fff")} fontWeight={700}>
          {label}
        </text>
        <text x={x} y={y + 8} textAnchor="middle" fontFamily="monospace" fontSize={9} fill={isDark ? "rgba(255,255,255,0.6)" : (level === "locked" ? "#bbb" : "rgba(255,255,255,0.8)")}>
          {level === "locked" ? "🔒" : level === "master" ? "✦" : "◈"}
        </text>
        <text x={x} y={y + r + 12} textAnchor="middle" fontFamily="sans-serif" fontSize={9} fill={textSecondary}>
          {labelEn}
        </text>
      </g>
    );
  }

  function Line({ x1, y1, x2, y2, dark: isDark }: { x1: number; y1: number; x2: number; y2: number; dark: boolean }) {
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isDark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.25)"} strokeWidth={1.5} strokeDasharray="4 3" />;
  }

  // --- Inner Arts tree (left side) ---
  // Root at (120, 40), three branches, six leaves
  const iRx = 120, iRy = 40;
  // Branch 1: 周期心法 at (50, 110)
  const b1x = 50, b1y = 110;
  // Branch 2: 价值心法 at (120, 110)
  const b2x = 120, b2y = 110;
  // Branch 3: 风控心法 at (190, 110)
  const b3x = 190, b3y = 110;
  // Leaves
  const l1x = 30, l1y = 190; // 盈亏同源
  const l2x = 80, l2y = 190; // 买预期
  const l3x = 100, l3y = 190; // 复利
  const l4x = 150, l4y = 190; // 长期主义
  const l5x = 170, l5y = 190; // 对手盘
  const l6x = 210, l6y = 190; // 去中心化

  // --- Outer Arts tree (right side, offset by 270) ---
  const ox = 270;
  const oRx = ox + 120, oRy = 40;
  const ob1x = ox + 50, ob1y = 110;
  const ob2x = ox + 120, ob2y = 110;
  const ob3x = ox + 190, ob3y = 110;
  const ol1x = ox + 30, ol1y = 190;
  const ol2x = ox + 80, ol2y = 190;
  const ol3x = ox + 110, ol3y = 190;
  const ol4x = ox + 150, ol4y = 190;
  const ol5x = ox + 175, ol5y = 190;
  const ol6x = ox + 210, ol6y = 190;

  const svgW = 560;
  const svgH = 240;
  const rootFill = dark ? "#1a0a3a" : "#f0e8ff";
  const rootText = dark ? "#a175e8" : "#5a20c0";
  const rootStroke = "#8953d1";

  return (
    <div style={{ position: "relative" }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible" }}>
        {/* Root nodes */}
        <rect x={iRx - 48} y={iRy - 14} width={96} height={28} rx={6} fill={rootFill} stroke={rootStroke} strokeWidth={1.5} />
        <text x={iRx} y={iRy - 2} textAnchor="middle" fontFamily="serif" fontSize={12} fontWeight={700} fill={rootText}>内功 · Inner Arts</text>

        <rect x={oRx - 48} y={oRy - 14} width={96} height={28} rx={6} fill={rootFill} stroke={rootStroke} strokeWidth={1.5} />
        <text x={oRx} y={oRy - 2} textAnchor="middle" fontFamily="serif" fontSize={12} fontWeight={700} fill={rootText}>外功 · Outer Arts</text>

        {/* Inner Arts connections */}
        <Line x1={iRx} y1={iRy+14} x2={b1x} y2={b1y-22} dark={dark} />
        <Line x1={iRx} y1={iRy+14} x2={b2x} y2={b2y-22} dark={dark} />
        <Line x1={iRx} y1={iRy+14} x2={b3x} y2={b3y-22} dark={dark} />
        <Line x1={b1x} y1={b1y+22} x2={l1x} y2={l1y-22} dark={dark} />
        <Line x1={b1x} y1={b1y+22} x2={l2x} y2={l2y-22} dark={dark} />
        <Line x1={b2x} y1={b2y+22} x2={l3x} y2={l3y-22} dark={dark} />
        <Line x1={b2x} y1={b2y+22} x2={l4x} y2={l4y-22} dark={dark} />
        <Line x1={b3x} y1={b3y+22} x2={l5x} y2={l5y-22} dark={dark} />
        <Line x1={b3x} y1={b3y+22} x2={l6x} y2={l6y-22} dark={dark} />

        {/* Outer Arts connections */}
        <Line x1={oRx} y1={oRy+14} x2={ob1x} y2={ob1y-22} dark={dark} />
        <Line x1={oRx} y1={oRy+14} x2={ob2x} y2={ob2y-22} dark={dark} />
        <Line x1={oRx} y1={oRy+14} x2={ob3x} y2={ob3y-22} dark={dark} />
        <Line x1={ob1x} y1={ob1y+22} x2={ol1x} y2={ol1y-22} dark={dark} />
        <Line x1={ob1x} y1={ob1y+22} x2={ol2x} y2={ol2y-22} dark={dark} />
        <Line x1={ob2x} y1={ob2y+22} x2={ol3x} y2={ol3y-22} dark={dark} />
        <Line x1={ob2x} y1={ob2y+22} x2={ol4x} y2={ol4y-22} dark={dark} />
        <Line x1={ob3x} y1={ob3y+22} x2={ol5x} y2={ol5y-22} dark={dark} />
        <Line x1={ob3x} y1={ob3y+22} x2={ol6x} y2={ol6y-22} dark={dark} />

        {/* Inner Arts Branches */}
        <NodeCircle x={b1x} y={b1y} label="周期心法" labelEn="Cycle Arts" count={tagCounts["crypto"] || 0} url="/tags/crypto/" dark={dark} />
        <NodeCircle x={b2x} y={b2y} label="价值心法" labelEn="Value Arts" count={tagCounts["investment"] || 0} url="/tags/investment/" dark={dark} />
        <NodeCircle x={b3x} y={b3y} label="风控心法" labelEn="Risk Arts" count={tagCounts["wealth"] || 0} url="/tags/wealth/" dark={dark} />

        {/* Inner Arts Leaves */}
        <NodeCircle x={l1x} y={l1y} label="盈亏同源" labelEn="P&L Unity" count={tagCounts["trading"] || 0} url="/tags/trading/" dark={dark} />
        <NodeCircle x={l2x} y={l2y} label="买预期" labelEn="Buy Signal" count={tagCounts["alpha"] || 0} dark={dark} />
        <NodeCircle x={l3x} y={l3y} label="复利之道" labelEn="Compounding" count={tagCounts["evergreen"] || 0} url="/tags/evergreen/" dark={dark} />
        <NodeCircle x={l4x} y={l4y} label="长期主义" labelEn="Long-term" count={(tagCounts["investment"] || 0) + (tagCounts["wealth"] || 0)} dark={dark} />
        <NodeCircle x={l5x} y={l5y} label="对手盘" labelEn="Counter-play" count={tagCounts["macro"] || 0} dark={dark} />
        <NodeCircle x={l6x} y={l6y} label="去中心化" labelEn="Decentralize" count={tagCounts["crypto"] || 0} url="/tags/crypto/" dark={dark} />

        {/* Outer Arts Branches */}
        <NodeCircle x={ob1x} y={ob1y} label="剑法·写作" labelEn="Sword·Write" count={postCount} url="/posts/" dark={dark} />
        <NodeCircle x={ob2x} y={ob2y} label="掌法·编程" labelEn="Palm·Code" count={tagCounts["ai"] || 0} url="/tags/ai/" dark={dark} />
        <NodeCircle x={ob3x} y={ob3y} label="轻功·探索" labelEn="Swift·Explore" count={tagCounts["travel"] || 0} url="/tags/travel/" dark={dark} />

        {/* Outer Arts Leaves */}
        <NodeCircle x={ol1x} y={ol1y} label="推文写作" labelEn="Tweet" count={postCount} dark={dark} />
        <NodeCircle x={ol2x} y={ol2y} label="长篇著文" labelEn="Long-form" count={Math.floor(postCount * 0.6)} dark={dark} />
        <NodeCircle x={ol3x} y={ol3y} label="Vibe Coding" labelEn="Vibe Code" count={tagCounts["vibe-coding"] || (tagCounts["ai"] || 0)} url="/tags/ai/" dark={dark} />
        <NodeCircle x={ol4x} y={ol4y} label="Agent 系统" labelEn="Agent Sys" count={builderLogCount} dark={dark} />
        <NodeCircle x={ol5x} y={ol5y} label="数字旅居" labelEn="Nomad" count={tagCounts["travel"] || 0} url="/tags/travel/" dark={dark} />
        <NodeCircle x={ol6x} y={ol6y} label="OG 见证" labelEn="OG Witness" count={tagCounts["og-witness"] || 0} dark={dark} />

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 40} y={tooltip.y - 20} width={80} height={20} rx={4} fill={dark ? "#2a2a3a" : "#fff"} stroke="rgba(137,83,209,0.3)" strokeWidth={1} />
            <text x={tooltip.x} y={tooltip.y - 6} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#a175e8">
              {tooltip.text}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
        {[
          { fill: "#8953d1", stroke: "#a175e8", label: "精通 Master (4+)", icon: "✦" },
          { fill: dark ? "#3a2060" : "#d4b8f0", stroke: "#8953d1", label: "入门 Novice (1-3)", icon: "◈" },
          { fill: dark ? "#2a2a3a" : "#e0d8f0", stroke: dark ? "#444" : "#ccc", label: "未点亮 Locked", icon: "🔒" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={14} height={14}><circle cx={7} cy={7} r={6} fill={l.fill} stroke={l.stroke} strokeWidth={1.5} /></svg>
            <span style={{ fontFamily: "serif", fontSize: 11, color: dark ? "#888" : "#999" }}>{l.label}</span>
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
                <div style={{ fontFamily: "serif", fontSize: 12, fontWeight: 700, color: a.unlocked ? "#8953d1" : textSecondary }}>
                  <span className="lang-zh">{a.nameZh}</span>
                  <span className="lang-en">{a.nameEn}</span>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontFamily: "serif", fontSize: 11, color: textSecondary, lineHeight: 1.4 }}>
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

// ─── ActivityLog ──────────────────────────────────────────────────────────────

function ActivityLog({ recentActivity, dark }: { recentActivity: PlayerStatsProps["recentActivity"]; dark: boolean }) {
  const bg = dark ? "#0d0d18" : "#f8f4ff";
  const border = dark ? "rgba(137,83,209,0.15)" : "rgba(137,83,209,0.12)";
  const textPrimary = dark ? "#e0e0e0" : "#333";
  const textSecondary = dark ? "#777" : "#aaa";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {recentActivity.map((act, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "10px 14px", borderRadius: 8,
          background: bg, border: `1px solid ${border}`,
        }}>
          {/* Date */}
          <div style={{ flexShrink: 0, width: 60, textAlign: "center" }}>
            <div style={{ fontFamily: "serif", fontSize: 11, color: textSecondary }}>
              <span className="lang-zh">{act.dateZh}</span>
              <span className="lang-en">{act.date}</span>
            </div>
          </div>

          {/* Icon */}
          <span style={{ fontSize: 18, flexShrink: 0 }}>{act.icon}</span>

          {/* Content */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontFamily: "monospace", fontSize: 11,
                color: "#8953d1", fontWeight: 700,
                background: "rgba(137,83,209,0.1)", padding: "1px 6px", borderRadius: 4,
              }}>
                <span className="lang-zh">{act.statZh}</span>
                <span className="lang-en">{act.statEn}</span>
                <span style={{ color: "#a175e8" }}> +{act.amount}</span>
              </span>
            </div>
            <p style={{ margin: "3px 0 0", fontFamily: "serif", fontSize: 12, color: textPrimary, lineHeight: 1.4 }}>
              <span className="lang-zh">{act.descZh}</span>
              <span className="lang-en">{act.descEn}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return (
    <h2 style={{
      margin: "0 0 1.25rem",
      fontFamily: "serif", fontSize: "1.1rem", fontWeight: 700,
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

  return (
    <div style={{ fontFamily: "serif", maxWidth: 900 }}>
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
        <ActivityLog recentActivity={recentActivity} dark={dark} />
      </div>
    </div>
  );
}
