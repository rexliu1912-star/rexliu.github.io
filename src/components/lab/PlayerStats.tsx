/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlayerStatsProps {
  stats: {
    vitality: number;  // 体魄
    wisdom: number;    // 悟性
    renown: number;    // 声望
    command: number;   // 统御
    craft: number;     // 技巧
    insight: number;   // 见闻
  };
  level: number;
  totalExp: number;
  expInLevel: number;
  expNeeded: number;
  expProgress: number;
  rank: { zh: string; en: string };
  avgStat: number;
  currentCity: { name: string; nameCN: string };
  travelDays: number;
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  digestCount: number;
  libraryCount: number;
  cityCount: number;
  projectCount: number;
  cities: Array<{ id: string; name: string; nameCN: string; lat: number; lng: number }>;
  achievements: Array<{
    id: string; icon: string;
    nameZh: string; nameEn: string;
    descZh: string; descEn: string;
    unlocked: boolean;
    unlockedDate?: string;
    progress?: number; max?: number;
  }>;
  activityLog: Array<{
    dateEn: string; dateZh: string;
    icon: string; statZh: string; statEn: string; exp: number;
    descZh: string; descEn: string; type: string;
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

function PixelBar({ value, dark, color = "#8953d1" }: { value: number; dark: boolean; color?: string }) {
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
              ? (i < filled * 0.6 ? color : `${color}cc`)
              : (dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"),
            imageRendering: "pixelated",
            transition: "background 0.05s",
          }}
        />
      ))}
      <span style={{ marginLeft: 6, fontFamily: "monospace", fontSize: 13, color, fontWeight: 700 }}>
        {animated}
      </span>
    </div>
  );
}

// ─── HeroCard with pixel avatar + Level + EXP ─────────────────────────────────

function HeroCard({ rank, level, totalExp, expInLevel, expNeeded, expProgress, currentCity, travelDays, dark }: {
  rank: { zh: string; en: string };
  level: number;
  totalExp: number;
  expInLevel: number;
  expNeeded: number;
  expProgress: number;
  currentCity: { name: string; nameCN: string };
  travelDays: number;
  dark: boolean;
}) {
  const bg = dark ? "#1a1a24" : "#f8f4ff";
  const border = dark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.2)";
  const textPrimary = dark ? "#ffffff" : "#111111";
  const textSecondary = dark ? "#aaaaaa" : "#666666";

  const animatedLevel = useCountUp(level, 1500);
  const animatedExp = useCountUp(totalExp, 2000);

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
      {/* Pixel Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <div style={{
          width: 120, height: 120,
          borderRadius: 8,
          border: `2px solid rgba(137,83,209,0.6)`,
          overflow: "hidden",
          imageRendering: "pixelated",
          background: dark ? "#0d0d18" : "#ede8ff",
        }}>
          <img
            src="/images/rex-avatar.png"
            alt="Rex Liu pixel avatar"
            width={120}
            height={120}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              imageRendering: "pixelated",
            }}
          />
        </div>
        {/* Breathing glow */}
        <div style={{
          position: "absolute", inset: -4, borderRadius: 12,
          background: "radial-gradient(circle, rgba(137,83,209,0.2) 0%, transparent 70%)",
          animation: "breathe 3s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      </div>

      {/* Info: Name + Level + EXP bar */}
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{
            margin: 0,
            fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
            fontSize: "1.6rem", fontWeight: 700, color: textPrimary,
          }}>
            Rex Liu
          </h2>
          <span style={{
            fontFamily: "monospace", fontSize: 16, fontWeight: 800,
            color: "#8953d1",
            background: "rgba(137,83,209,0.12)",
            padding: "2px 10px", borderRadius: 6,
            border: "1px solid rgba(137,83,209,0.3)",
          }}>
            Lv.{animatedLevel}
          </span>
        </div>

        {/* EXP Progress Bar */}
        <div style={{ marginTop: 10, maxWidth: 340 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#8953d1", fontWeight: 700 }}>
              EXP {animatedExp.toLocaleString()}
            </span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: textSecondary }}>
              {expInLevel} / {expNeeded}
            </span>
          </div>
          <div style={{
            height: 10, borderRadius: 2, overflow: "hidden",
            background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            imageRendering: "pixelated",
          }}>
            <div style={{
              height: "100%",
              width: `${expProgress}%`,
              background: "linear-gradient(to right, #8953d1, #a175e8)",
              transition: "width 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
              imageRendering: "pixelated",
            }} />
          </div>
        </div>

        {/* Tags: Rank, School, Location, Days */}
        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <InfoTag icon="⚔️" zh={`${rank.zh}`} en={`${rank.en}`} color="#8953d1" />
          <InfoTag icon="🏔️" zh="逍遥派" en="Sovereign School" color="#a175e8" />
          <InfoTag icon="📍" zh={`${currentCity.nameCN}`} en={`${currentCity.name}`} color="#7040b0" />
          <InfoTag icon="🗓️" zh={`游历 ${travelDays} 天`} en={`Day ${travelDays}`} color="#9060c8" />
        </div>

        <p style={{
          margin: "0.6rem 0 0",
          fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
          fontSize: "0.82rem", color: textSecondary, fontStyle: "italic",
        }}>
          <span className="lang-en">"Simplify the complex. Repeat the simple."</span>
          <span className="lang-zh">"复杂问题简单化，简单事情重复做。"</span>
        </p>
      </div>
    </div>
  );
}

function InfoTag({ icon, zh, en, color }: { icon: string; zh: string; en: string; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999,
      border: `1px solid ${color}40`,
      background: `${color}12`,
      fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", fontSize: "0.75rem", color,
    }}>
      <span>{icon}</span>
      <span className="lang-zh">{zh}</span>
      <span className="lang-en">{en}</span>
    </span>
  );
}

// ─── RadarChart ───────────────────────────────────────────────────────────────

function RadarChart({ stats, dark }: { stats: PlayerStatsProps["stats"]; dark: boolean }) {
  const [animated, setAnimated] = useState({ vitality: 0, wisdom: 0, renown: 0, command: 0, craft: 0, insight: 0 });
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
        renown: stats.renown * ease,
        command: stats.command * ease,
        craft: stats.craft * ease,
        insight: stats.insight * ease,
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
    { key: "vitality", zh: "体魄", en: "Vitality", angle: -90 },
    { key: "wisdom",   zh: "悟性", en: "Wisdom",   angle: -30 },
    { key: "craft",    zh: "技巧", en: "Craft",    angle:  30 },
    { key: "command",  zh: "统御", en: "Command",  angle:  90 },
    { key: "renown",   zh: "声望", en: "Renown",   angle: 150 },
    { key: "insight",  zh: "见闻", en: "Insight",  angle: 210 },
  ];

  function polar(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const gridLevels = [20, 40, 60, 80, 100];
  const gridColor = dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.15)";
  const axisColor = dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.25)";
  const textColor = dark ? "#aaaaaa" : "#777777";

  function hexPath(r: number) {
    return axes.map(a => polar(a.angle, (r / 100) * maxR))
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  }

  function statsPath() {
    return axes.map(a => {
      const v = animated[a.key as keyof typeof animated];
      return polar(a.angle, (v / 100) * maxR);
    }).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ") + " Z";
  }

  const statFormulas: Record<string, { zh: string; en: string }> = {
    vitality: { zh: "城市数 × 5", en: "cities × 5" },
    wisdom:   { zh: "文章数 + 书影音 × 0.3", en: "posts + library × 0.3" },
    renown:   { zh: "log₁₀(关注数) × 25", en: "log₁₀(followers) × 25" },
    command:  { zh: "Agent × 8 + 项目 × 2", en: "agents × 8 + projects × 2" },
    craft:    { zh: "造物日志 × 3", en: "builder-logs × 3" },
    insight:  { zh: "(书影音 + 精读 × 0.2) × 0.8", en: "(library + digests × 0.2) × 0.8" },
  };

  const labelPrimary = dark ? "#ffffff" : "#111111";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
      {/* SVG Radar */}
      <div style={{ flex: "0 0 auto" }}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          {gridLevels.map(lvl => (
            <path key={lvl} d={hexPath(lvl)} fill="none" stroke={gridColor} strokeWidth={1} />
          ))}
          {axes.map(a => {
            const end = polar(a.angle, maxR);
            return <line key={a.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={axisColor} strokeWidth={1} />;
          })}
          <path d={statsPath()} fill="rgba(137,83,209,0.2)" stroke="#8953d1" strokeWidth={2} />
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
          {axes.map(a => {
            const p = polar(a.angle, maxR + 22);
            const isSelected = selected === a.key;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} onClick={() => setSelected(selected === a.key ? null : a.key)}>
                <text x={p.x} y={p.y - 4} textAnchor="middle" dominantBaseline="auto"
                  fontFamily="Georgia, Cambria, serif" fontSize={11}
                  fill={isSelected ? "#8953d1" : textColor} fontWeight={isSelected ? 700 : 400}>
                  {a.zh}
                </text>
                <text x={p.x} y={p.y + 9} textAnchor="middle" dominantBaseline="auto"
                  fontFamily="monospace" fontSize={10}
                  fill={isSelected ? "#a175e8" : dark ? "#555" : "#ccc"}>
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
                marginBottom: 10, cursor: "pointer", padding: "6px 10px", borderRadius: 8,
                background: isSelected ? "rgba(137,83,209,0.08)" : "transparent",
                border: `1px solid ${isSelected ? "rgba(137,83,209,0.3)" : "transparent"}`,
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{
                  fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
                  fontSize: 13, color: isSelected ? "#8953d1" : labelPrimary, fontWeight: isSelected ? 700 : 400,
                }}>
                  {a.zh} <span style={{ fontSize: 11, color: textColor }}>/ {a.en}</span>
                </span>
              </div>
              <PixelBar value={v} dark={dark} />
              {isSelected && statFormulas[a.key] && (
                <div style={{ marginTop: 6, padding: "4px 0", borderTop: "1px solid rgba(137,83,209,0.15)" }}>
                  <div className="lang-zh" style={{ fontFamily: "monospace", fontSize: 11, color: "#a175e8" }}>
                    {statFormulas[a.key]?.zh}
                  </div>
                  <div className="lang-en" style={{ fontFamily: "monospace", fontSize: 11, color: "#a175e8" }}>
                    {statFormulas[a.key]?.en}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SkillTree (horizontal with Lv.N labels) ─────────────────────────────────

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: {
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  dark: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  // Node box with Lv.N label
  function NodeBox({ x, y, w, h, label, labelEn, count, url }: {
    x: number; y: number; w: number; h: number;
    label: string; labelEn: string; count: number; url?: string;
  }) {
    const lv = count;
    const isActive = lv > 0;
    const borderColor = isActive ? "#8953d1" : (dark ? "#444" : "#ccc");
    const fillColor = isActive
      ? (dark ? "rgba(137,83,209,0.15)" : "rgba(137,83,209,0.08)")
      : (dark ? "#1a1a24" : "#f0edf5");
    const textColor = isActive ? (dark ? "#e0d0ff" : "#5a20c0") : (dark ? "#555" : "#aaa");
    const lvColor = isActive ? "#8953d1" : (dark ? "#555" : "#bbb");
    const cx = x + w / 2;

    function handleClick() {
      if (url && isActive) window.location.href = url;
    }

    return (
      <g
        style={{ cursor: isActive && url ? "pointer" : "default" }}
        onClick={handleClick}
        onMouseEnter={() => {
          const msg = isActive ? `${count} 篇 · Lv.${lv}` : "未点亮 · Locked";
          setTooltip({ text: msg, x: cx, y: y - 8 });
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <rect x={x} y={y} width={w} height={h} rx={5}
          fill={fillColor} stroke={borderColor} strokeWidth={1.5} />
        {/* Label */}
        <text x={cx} y={y + h / 2 - 5} textAnchor="middle" dominantBaseline="middle"
          fontFamily="Georgia, Cambria, serif" fontSize={11} fontWeight={700} fill={textColor}>
          {label}
        </text>
        {/* Lv.N */}
        <text x={cx} y={y + h / 2 + 9} textAnchor="middle" dominantBaseline="middle"
          fontFamily="monospace" fontSize={10} fontWeight={700} fill={lvColor}>
          Lv.{lv}
        </text>
      </g>
    );
  }

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
    const midX = (x1 + x2) / 2;
    return <path d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`}
      fill="none" stroke={stroke} strokeWidth={1.5} strokeDasharray="4 3" />;
  }

  const nW = 110, nH = 38;
  const rW = 80, rH = 44;

  function rightOf(x: number, y: number, w: number, h: number) { return { x: x + w, y: y + h / 2 }; }
  function leftOf(x: number, y: number, h: number) { return { x, y: y + h / 2 }; }

  // ── Inner Arts ──
  const iRx = 20, iRy = 94;
  const b1y = 28, b2y = 100, b3y = 172;
  const bX = 150;
  const lX = 310;
  const l1y = 10, l2y = 58, l3y = 82, l4y = 130, l5y = 154, l6y = 202;

  // ── Outer Arts ──
  const yOff = 260;
  const oRx = 20, oRy = 94 + yOff;
  const ob1y = 28 + yOff, ob2y = 100 + yOff, ob3y = 172 + yOff;
  const obX = 150;
  const olX = 310;
  const ol1y = 10 + yOff, ol2y = 58 + yOff, ol3y = 82 + yOff;
  const ol4y = 112 + yOff, ol5y = 154 + yOff;
  const ol6y = 178 + yOff, ol7y = 222 + yOff;

  const svgH = 560;
  const svgW = 500;

  return (
    <div style={{ position: "relative", overflowX: "auto" }}>
      <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ overflow: "visible", minWidth: svgW }}>

        {/* ── Inner Arts ── */}
        <RootBox x={iRx} y={iRy} w={rW} h={rH} label="内功" />

        {[b1y, b2y, b3y].map(by => {
          const r = rightOf(iRx, iRy, rW, rH);
          const l = leftOf(bX, by, nH);
          return <HLine key={by} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}

        {/* Branch 1: 周期心法 */}
        <NodeBox x={bX} y={b1y} w={nW} h={nH} label="周期心法" labelEn="Cycle Arts" count={tagCounts["crypto"] || 0} url="/tags/crypto/" />
        {[l1y, l2y].map(ly => {
          const r = rightOf(bX, b1y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l1y} w={nW} h={nH} label="盈亏同源" labelEn="P&L Unity" count={tagCounts["trading"] || 0} />
        <NodeBox x={lX} y={l2y} w={nW} h={nH} label="买预期卖事实" labelEn="Buy Signal" count={tagCounts["alpha"] || 0} />

        {/* Branch 2: 价值心法 */}
        <NodeBox x={bX} y={b2y} w={nW} h={nH} label="价值心法" labelEn="Value Arts" count={tagCounts["investment"] || 0} url="/tags/investment/" />
        {[l3y, l4y].map(ly => {
          const r = rightOf(bX, b2y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l3y} w={nW} h={nH} label="复利之道" labelEn="Compounding" count={tagCounts["evergreen"] || 0} url="/tags/evergreen/" />
        <NodeBox x={lX} y={l4y} w={nW} h={nH} label="长期主义" labelEn="Long-term" count={(tagCounts["investment"] || 0) + (tagCounts["wealth"] || 0)} />

        {/* Branch 3: 风控心法 */}
        <NodeBox x={bX} y={b3y} w={nW} h={nH} label="风控心法" labelEn="Risk Arts" count={tagCounts["wealth"] || 0} url="/tags/wealth/" />
        {[l5y, l6y].map(ly => {
          const r = rightOf(bX, b3y, nW, nH);
          const l = leftOf(lX, ly, nH);
          return <HLine key={ly} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={lX} y={l5y} w={nW} h={nH} label="对手盘" labelEn="Counter-play" count={tagCounts["macro"] || 0} />
        <NodeBox x={lX} y={l6y} w={nW} h={nH} label="去中心化" labelEn="Decentralize" count={tagCounts["crypto"] || 0} url="/tags/crypto/" />

        {/* ── Outer Arts ── */}
        <RootBox x={oRx} y={oRy} w={rW} h={rH} label="外功" />

        {[ob1y, ob2y, ob3y].map(by => {
          const r = rightOf(oRx, oRy, rW, rH);
          const l = leftOf(obX, by, nH);
          return <HLine key={by + 1000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}

        {/* Branch 1: 剑法·写作 */}
        <NodeBox x={obX} y={ob1y} w={nW} h={nH} label="剑法·写作" labelEn="Sword·Write" count={postCount} url="/posts/" />
        {[ol1y, ol2y, ol3y].map(ly => {
          const r = rightOf(obX, ob1y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 2000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol1y} w={nW} h={nH} label="生活" labelEn="Life" count={tagCounts["life"] || 0} url="/tags/life/" />
        <NodeBox x={olX} y={ol2y} w={nW} h={nH} label="人物志" labelEn="People" count={tagCounts["people"] || 0} url="/tags/people/" />
        <NodeBox x={olX} y={ol3y} w={nW} h={nH} label="常青文" labelEn="Evergreen" count={tagCounts["evergreen"] || 0} url="/tags/evergreen/" />

        {/* Branch 2: 掌法·编程 */}
        <NodeBox x={obX} y={ob2y} w={nW} h={nH} label="掌法·编程" labelEn="Palm·Code" count={tagCounts["ai"] || 0} url="/tags/ai/" />
        {[ol4y, ol5y].map(ly => {
          const r = rightOf(obX, ob2y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 3000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol4y} w={nW} h={nH} label="Vibe Coding" labelEn="Vibe Code" count={tagCounts["vibe coding"] || tagCounts["ai"] || 0} url="/tags/ai/" />
        <NodeBox x={olX} y={ol5y} w={nW} h={nH} label="Agent 系统" labelEn="Agent Sys" count={builderLogCount} />

        {/* Branch 3: 轻功·探索 */}
        <NodeBox x={obX} y={ob3y} w={nW} h={nH} label="轻功·探索" labelEn="Swift·Explore" count={tagCounts["travel"] || 0} url="/tags/travel/" />
        {[ol6y, ol7y].map(ly => {
          const r = rightOf(obX, ob3y, nW, nH);
          const l = leftOf(olX, ly, nH);
          return <HLine key={ly + 4000} x1={r.x} y1={r.y} x2={l.x} y2={l.y} />;
        })}
        <NodeBox x={olX} y={ol6y} w={nW} h={nH} label="旅居" labelEn="Nomad Stay" count={tagCounts["travel"] || 0} url="/tags/travel/" />
        <NodeBox x={olX} y={ol7y} w={nW} h={nH} label="数字游牧" labelEn="Digital Nomad" count={tagCounts["travel"] || 0} />

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 55} y={tooltip.y - 22} width={110} height={20} rx={4}
              fill={dark ? "#2a2a3a" : "#fff"} stroke="rgba(137,83,209,0.3)" strokeWidth={1} />
            <text x={tooltip.x} y={tooltip.y - 8} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#a175e8">
              {tooltip.text}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

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
              <div style={{
                fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
                fontSize: 12, fontWeight: 700,
                color: a.unlocked ? "#8953d1" : textSecondary,
              }}>
                <span className="lang-zh">{a.nameZh}</span>
                <span className="lang-en">{a.nameEn}</span>
              </div>
            </div>

            <p style={{
              margin: 0,
              fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
              fontSize: 11, color: textSecondary, lineHeight: 1.4,
            }}>
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

// ─── CultivationLog (全历史修行日志，可折叠) ─────────────────────────────────

function CultivationLog({ activityLog, dark }: {
  activityLog: PlayerStatsProps["activityLog"];
  dark: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;

  const bg = dark ? "#0d0d18" : "#f8f4ff";
  const border = dark ? "rgba(137,83,209,0.15)" : "rgba(137,83,209,0.12)";
  const textPrimary = dark ? "#e0e0e0" : "#333";
  const textSecondary = dark ? "#777" : "#aaa";

  const visible = showAll ? activityLog : activityLog.slice(0, INITIAL_COUNT);
  const hasMore = activityLog.length > INITIAL_COUNT;

  // Running EXP total (from bottom up)
  const runningExp: number[] = [];
  let cumExp = 0;
  for (let i = activityLog.length - 1; i >= 0; i--) {
    cumExp += activityLog[i]!.exp;
    runningExp[i] = cumExp;
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((act, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "8px 12px", borderRadius: 8,
            background: bg, border: `1px solid ${border}`,
          }}>
            {/* Date */}
            <div style={{ flexShrink: 0, width: 80, textAlign: "left" }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: textSecondary }}>
                <span className="lang-zh">{act.dateZh}</span>
                <span className="lang-en">{act.dateEn}</span>
              </div>
            </div>

            {/* Icon */}
            <span style={{ fontSize: 16, flexShrink: 0 }}>{act.icon}</span>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif",
                fontSize: 12, color: textPrimary, lineHeight: 1.4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                <span className="lang-zh">{act.descZh}</span>
                <span className="lang-en">{act.descEn}</span>
              </p>
            </div>

            {/* EXP badge */}
            <span style={{
              flexShrink: 0,
              fontFamily: "monospace", fontSize: 11,
              color: "#22c55e", fontWeight: 700,
              background: "rgba(34,197,94,0.1)", padding: "1px 6px", borderRadius: 4,
              border: "1px solid rgba(34,197,94,0.25)",
              whiteSpace: "nowrap",
            }}>
              +{act.exp} EXP
            </span>
          </div>
        ))}
      </div>

      {/* Show more / less toggle */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{
            marginTop: 12, padding: "8px 20px", borderRadius: 8,
            background: "transparent",
            border: `1px solid ${dark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.2)"}`,
            color: "#8953d1", fontFamily: "Georgia, Cambria, serif",
            fontSize: 13, cursor: "pointer",
            transition: "all 0.15s",
            width: "100%",
          }}
        >
          {showAll ? (
            <>
              <span className="lang-zh">收起</span>
              <span className="lang-en">Show less</span>
            </>
          ) : (
            <>
              <span className="lang-zh">查看全部 {activityLog.length} 条记录 ↓</span>
              <span className="lang-en">View all {activityLog.length} entries ↓</span>
            </>
          )}
        </button>
      )}

      {/* Total EXP summary */}
      <div style={{
        marginTop: 12, padding: "10px 14px", borderRadius: 8,
        background: bg, border: `1px solid ${dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.15)"}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 12, color: textSecondary }}>
          <span className="lang-zh">累计修为</span>
          <span className="lang-en">Total Cultivation</span>
        </span>
        <span style={{ fontFamily: "monospace", fontSize: 14, color: "#8953d1", fontWeight: 800 }}>
          {cumExp.toLocaleString()} EXP
        </span>
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
  const {
    stats, level, totalExp, expInLevel, expNeeded, expProgress,
    rank, currentCity, travelDays, tagCounts, postCount, builderLogCount,
    cities, achievements, activityLog,
  } = props;

  const sectionBg = dark ? "#161620" : "#f9f6ff";
  const sectionBorder = dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.12)";

  return (
    <div style={{ fontFamily: "Georgia, Cambria, 'Times New Roman', Times, serif", maxWidth: 900 }}>
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
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
        <HeroCard
          rank={rank}
          level={level}
          totalExp={totalExp}
          expInLevel={expInLevel}
          expNeeded={expNeeded}
          expProgress={expProgress}
          currentCity={currentCity}
          travelDays={travelDays}
          dark={dark}
        />
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

      {/* Explore Summary */}
      <a href="/travel/" style={{
        display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center",
        padding: "1rem 1.5rem", borderRadius: 12,
        border: `1px solid ${dark ? "rgba(137,83,209,0.3)" : "rgba(137,83,209,0.2)"}`,
        background: dark ? "#1a1a24" : "#f8f4ff",
        textDecoration: "none", cursor: "pointer",
        transition: "border-color 0.2s",
        marginBottom: "1.5rem",
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

      {/* Cultivation Log */}
      <div className="player-section">
        <SectionHeader icon="📜" zh="修行日志" en="Cultivation Log" dark={dark} />
        <CultivationLog activityLog={activityLog} dark={dark} />
      </div>
    </div>
  );
}
