/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface RetainerData {
  id: string;
  name: string;
  emoji: string;
  titleZh: string;
  titleEn: string;
  sprite: string;
  level: number;
  sessions: number;
  tokens: number;
  model: string;
}

export interface AchievementData {
  id: string;
  icon: string;
  nameZh: string;
  nameEn: string;
  descZh: string;
  descEn: string;
  unlocked: boolean;
  category: string;
  hidden?: boolean;
  unlockedDate?: string;
  progress?: number;
  max?: number;
}

export interface PlayerStatsProps {
  stats: {
    vitality: number;
    wisdom: number;
    renown: number;
    command: number;
    craft: number;
    insight: number;
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
  achievements: AchievementData[];
  retainers: RetainerData[];
  activityLog: Array<{
    dateEn: string;
    dateZh: string;
    icon: string;
    statZh: string;
    statEn: string;
    exp: number;
    descZh: string;
    descEn: string;
    type: string;
  }>;
}

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

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(threshold = 0.22) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useCountUp(target: number, duration = 1200, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!enabled || reducedMotion) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(ease * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled, reducedMotion]);

  return value;
}

function PixelBar({ value, dark, color = "#8953d1", segments = 20, animate = true }: { value: number; dark: boolean; color?: string; segments?: number; animate?: boolean }) {
  const animated = useCountUp(value, 1000, animate);
  const filled = Math.round((animated / 100) * segments);
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: segments }, (_, i) => (
        <div
          key={i}
          style={{
            width: 7,
            height: 12,
            borderRadius: 999,
            background: i < filled
              ? `linear-gradient(180deg, ${color}, rgba(137,83,209,0.66))`
              : (dark ? "rgba(255,255,255,0.08)" : "rgba(60,20,90,0.08)"),
            boxShadow: i < filled ? "0 0 10px rgba(137,83,209,0.22)" : "none",
            transition: "background 0.2s ease, box-shadow 0.2s ease",
          }}
        />
      ))}
      <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 13, color, fontWeight: 700 }}>
        {animated}
      </span>
    </div>
  );
}

function DecorativeSection({ children, dark, className, reveal = true, delay = 0 }: { children: ReactNode; dark: boolean; className?: string; reveal?: boolean; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15);
  const reducedMotion = usePrefersReducedMotion();
  const bg = dark
    ? "linear-gradient(180deg, rgba(19,16,32,0.98), rgba(12,10,24,0.98))"
    : "linear-gradient(180deg, rgba(253,250,255,0.96), rgba(248,243,255,0.96))";
  const border = dark ? "rgba(137,83,209,0.28)" : "rgba(137,83,209,0.16)";
  const visible = !reveal || reducedMotion || inView;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${border}`,
        borderRadius: 20,
        padding: "1.5rem",
        background: bg,
        boxShadow: dark ? "0 20px 50px rgba(0,0,0,0.28)" : "0 18px 40px rgba(137,83,209,0.08)",
        backdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
      }}
    >
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: dark ? 0.18 : 0.3, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(137,83,209,0.22) 1px, transparent 0)", backgroundSize: "14px 14px", mixBlendMode: dark ? "screen" : "multiply" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: dark ? 0.1 : 0.18, background: "repeating-linear-gradient(8deg, transparent 0 10px, rgba(137,83,209,0.08) 10px 11px, transparent 11px 20px)" }} />
      <div style={{ position: "absolute", top: -40, right: -10, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(137,83,209,0.16), transparent 68%)", filter: "blur(4px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -70, left: -30, width: 220, height: 180, background: "radial-gradient(circle, rgba(137,83,209,0.12), transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function VerticalSeal({ text, dark }: { text: string; dark: boolean }) {
  return (
    <div style={{
      writingMode: "vertical-rl",
      textOrientation: "upright",
      letterSpacing: "0.15em",
      padding: "10px 6px",
      borderRadius: 999,
      border: `1px solid ${dark ? "rgba(137,83,209,0.26)" : "rgba(137,83,209,0.2)"}`,
      background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.06)",
      color: "#8953d1",
      fontSize: 11,
      fontFamily: "Georgia, Cambria, serif",
      alignSelf: "stretch",
      display: "flex",
      justifyContent: "center",
    }}>
      {text}
    </div>
  );
}

function InfoTag({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderRadius: 999,
      border: `1px solid ${dark ? "rgba(137,83,209,0.28)" : "rgba(137,83,209,0.2)"}`,
      background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)",
      fontFamily: "Georgia, Cambria, serif",
      fontSize: "0.76rem",
      color: dark ? "#f4ecff" : "#6c3fa8",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
    }}>
      <span>{icon}</span>
      <span className="lang-zh">{zh}</span>
      <span className="lang-en">{en}</span>
    </span>
  );
}

function HeroCard({ rank, level, totalExp, expInLevel, expNeeded, expProgress, currentCity, travelDays, dark, animate }: {
  rank: { zh: string; en: string };
  level: number;
  totalExp: number;
  expInLevel: number;
  expNeeded: number;
  expProgress: number;
  currentCity: { name: string; nameCN: string };
  travelDays: number;
  dark: boolean;
  animate: boolean;
}) {
  const animatedLevel = useCountUp(level, 1400, animate);
  const animatedExp = useCountUp(totalExp, 1800, animate);
  const animatedProgress = useCountUp(expProgress, 1300, animate);
  const animatedTravelDays = useCountUp(travelDays, 1400, animate);
  const textPrimary = dark ? "#ffffff" : "#22172f";
  const textSecondary = dark ? "#b9b1c9" : "#6f657d";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "1rem", alignItems: "stretch" }} className="player-hero-grid">
      <div style={{ position: "relative", width: 132, minHeight: 160, justifySelf: "center" }}>
        <div style={{
          width: 132,
          height: 160,
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid rgba(137,83,209,0.34)",
          background: dark ? "linear-gradient(180deg, rgba(35,25,59,0.95), rgba(12,10,24,0.95))" : "linear-gradient(180deg, rgba(240,232,255,0.95), rgba(252,248,255,0.98))",
          boxShadow: "0 12px 30px rgba(137,83,209,0.16)",
        }}>
          <img src="/images/rex-avatar.png" alt="Rex Liu avatar" width={132} height={160} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
        </div>
        <div style={{ position: "absolute", inset: -8, borderRadius: 24, border: "1px solid rgba(137,83,209,0.2)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: "50%", bottom: -10, transform: "translateX(-50%)", whiteSpace: "nowrap", padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.26)", background: dark ? "rgba(10,10,22,0.92)" : "rgba(255,252,255,0.92)", fontFamily: "monospace", fontSize: 12, color: "#8953d1", fontWeight: 700 }}>Lv.{animatedLevel}</div>
      </div>

      <div style={{ minWidth: 0, alignSelf: "center" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 }}>
              <h2 style={{ margin: 0, fontFamily: "Georgia, Cambria, serif", fontSize: "2rem", fontWeight: 700, color: textPrimary }}>Rex Liu</h2>
              <span style={{ color: "#8953d1", fontFamily: "monospace", fontWeight: 700, fontSize: 12, letterSpacing: "0.16em" }}>PLAYER STATS</span>
            </div>
            <p style={{ margin: "0.5rem 0 0", color: textSecondary, fontFamily: "Georgia, Cambria, serif", fontSize: "0.92rem", lineHeight: 1.7 }}>
              <span className="lang-en">Sword intent in writing, inner strength in systems, footsteps across cities.</span>
              <span className="lang-zh">文章为剑，系统为功，城市为路。</span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
            <VerticalSeal text="修真档案" dark={dark} />
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <InfoTag icon="⚔️" zh={rank.zh} en={rank.en} dark={dark} />
          <InfoTag icon="🏔️" zh="逍遥道统" en="Xiaoyao Lineage" dark={dark} />
          <InfoTag icon="📍" zh={currentCity.nameCN} en={currentCity.name} dark={dark} />
          <InfoTag icon="🗓️" zh={`游历 ${animatedTravelDays} 天`} en={`Day ${animatedTravelDays}`} dark={dark} />
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, color: "#8953d1", fontWeight: 700 }}>TOTAL EXP {animatedExp.toLocaleString()}</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: textSecondary }}>{expInLevel} / {expNeeded}</span>
          </div>
          <div style={{ position: "relative", height: 18, borderRadius: 999, overflow: "hidden", border: `1px solid ${dark ? "rgba(137,83,209,0.28)" : "rgba(137,83,209,0.2)"}`, background: dark ? "rgba(255,255,255,0.05)" : "rgba(60,20,90,0.06)" }}>
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(90deg, transparent 0 18px, rgba(137,83,209,0.08) 18px 19px)" }} />
            <div style={{
              height: "100%",
              width: `${animatedProgress}%`,
              background: "linear-gradient(90deg, rgba(137,83,209,0.95), rgba(137,83,209,0.55))",
              boxShadow: "0 0 18px rgba(137,83,209,0.35)",
              transition: "width 0.2s linear",
              position: "relative",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.28), transparent)" }} />
            </div>
          </div>
        </div>

        <p style={{ margin: "0.9rem 0 0", fontFamily: "Georgia, Cambria, serif", fontSize: "0.84rem", color: textSecondary, fontStyle: "italic" }}>
          <span className="lang-en">“Simplify the complex. Repeat the simple.”</span>
          <span className="lang-zh">“复杂问题简单化，简单事情重复做。”</span>
        </p>
      </div>

      <div style={{ alignSelf: "center", justifySelf: "end", minWidth: 120 }} className="hero-side-stats">
        <div style={{ borderRadius: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.15)"}`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.04)", padding: 14 }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bdb4cb" : "#7d6c95" }}>Realm</div>
          <div style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 26, color: "#8953d1", fontWeight: 700, lineHeight: 1.1 }}>{rank.zh}</div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#8f859f" : "#91839f", marginTop: 8 }}>Progress</div>
          <div style={{ fontFamily: "monospace", fontSize: 22, color: dark ? "#ffffff" : "#2d203a", fontWeight: 700 }}>{animatedProgress}%</div>
        </div>
      </div>
    </div>
  );
}

function RadarChart({ stats, dark, animate }: { stats: PlayerStatsProps["stats"]; dark: boolean; animate: boolean }) {
  const reducedMotion = usePrefersReducedMotion();
  const [animated, setAnimated] = useState({ vitality: 0, wisdom: 0, renown: 0, command: 0, craft: 0, insight: 0 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!animate || reducedMotion) {
      setAnimated(stats);
      return;
    }
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
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
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stats, animate, reducedMotion]);

  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 102;
  const axes = [
    { key: "vitality", zh: "体力", en: "HP", angle: -90 },
    { key: "wisdom", zh: "灵力", en: "Spirit", angle: -30 },
    { key: "craft", zh: "武术", en: "Martial", angle: 30 },
    { key: "command", zh: "统御", en: "Command", angle: 90 },
    { key: "renown", zh: "声望", en: "Renown", angle: 150 },
    { key: "insight", zh: "身法", en: "Agility", angle: 210 },
  ] as const;

  const statFormulas: Record<string, { zh: string; en: string }> = {
    vitality: { zh: "游历城池 → mid=50 渐近缩放", en: "cities explored → mid=50 asymptotic" },
    wisdom: { zh: "文章 + 书影音×0.3 → mid=120", en: "posts + library×0.3 → mid=120" },
    renown: { zh: "关注数 → mid=15000", en: "followers → mid=15000" },
    command: { zh: "门客×8 + 项目×2 → mid=80", en: "retainers×8 + projects×2 → mid=80" },
    craft: { zh: "造物日志 → mid=50", en: "builder logs → mid=50" },
    insight: { zh: "书影音 + 精读×0.2 → mid=100", en: "library + digests×0.2 → mid=100" },
  };

  function polar(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function hexPath(r: number) {
    return axes.map(a => polar(a.angle, (r / 100) * maxR)).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  function statsPath() {
    return axes.map(a => {
      const v = animated[a.key as keyof typeof animated];
      return polar(a.angle, (v / 100) * maxR);
    }).map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";
  }

  const activeKey = hovered ?? tooltip?.key ?? axes[0].key;
  const activeAxis = axes.find(a => a.key === activeKey) ?? axes[0];
  const activeValue = stats[activeAxis.key as keyof typeof stats];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center", justifyContent: "center" }}>
      <div style={{ flex: "0 0 auto", position: "relative" }}>
        <div style={{ position: "absolute", inset: 24, borderRadius: "50%", background: "radial-gradient(circle, rgba(137,83,209,0.12), transparent 72%)", filter: "blur(8px)" }} />
        <svg width={size} height={size} style={{ overflow: "visible", position: "relative" }}>
          {[20, 40, 60, 80, 100].map(lvl => <path key={lvl} d={hexPath(lvl)} fill="none" stroke={dark ? "rgba(137,83,209,0.14)" : "rgba(137,83,209,0.16)"} strokeWidth={1} />)}
          {axes.map(a => {
            const end = polar(a.angle, maxR);
            return <line key={a.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={dark ? "rgba(137,83,209,0.22)" : "rgba(137,83,209,0.2)"} strokeWidth={1} />;
          })}
          <path d={statsPath()} fill="rgba(137,83,209,0.18)" stroke="#8953d1" strokeWidth={2.2} />
          {axes.map(a => {
            const v = animated[a.key as keyof typeof animated];
            const p = polar(a.angle, (v / 100) * maxR);
            const isHovered = hovered === a.key;
            return (
              <g key={a.key}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 8 : 5.5}
                  fill="#8953d1"
                  stroke={dark ? "#140f20" : "#fff"}
                  strokeWidth={2}
                  style={{ cursor: "default" }}
                  onMouseEnter={() => {
                    setHovered(a.key);
                    setTooltip({ key: a.key, x: p.x, y: p.y - 22 });
                  }}
                  onMouseLeave={() => {
                    setHovered(null);
                    setTooltip(null);
                  }}
                />
              </g>
            );
          })}
          {axes.map(a => {
            const p = polar(a.angle, maxR + 28);
            const isHovered = hovered === a.key;
            return (
              <g
                key={a.key}
                style={{ cursor: "default" }}
                onMouseEnter={() => setHovered(a.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <text x={p.x} y={p.y - 4} textAnchor="middle" fontFamily="Georgia, Cambria, serif" fontSize={12} fontWeight={isHovered ? 700 : 500} fill={isHovered ? "#8953d1" : (dark ? "#ddd4ee" : "#443150")}>{a.zh}</text>
                <text x={p.x} y={p.y + 12} textAnchor="middle" fontFamily="monospace" fontSize={10} fill={dark ? "#8f85a0" : "#8b7999"}>{Math.round(animated[a.key as keyof typeof animated])}</text>
              </g>
            );
          })}
          {tooltip && (
            <g pointerEvents="none">
              <rect x={tooltip.x - 58} y={tooltip.y - 28} width={116} height={24} rx={12} fill={dark ? "rgba(19,16,30,0.96)" : "rgba(255,255,255,0.96)"} stroke="rgba(137,83,209,0.28)" strokeWidth={1} />
              <text x={tooltip.x} y={tooltip.y - 12} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#8953d1">{activeAxis.zh} · {stats[tooltip.key as keyof typeof stats]}</text>
            </g>
          )}
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 240, maxWidth: 380 }}>
        <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.22)" : "rgba(137,83,209,0.16)"}`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>
          <div style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 13, fontWeight: 700, color: dark ? "#fff" : "#2d203a" }}>{activeAxis.zh} <span style={{ fontSize: 11, color: dark ? "#8f85a0" : "#8b7999" }}>/ {activeAxis.en}</span></div>
          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 18, color: "#8953d1", fontWeight: 700 }}>{activeValue}</div>
          <div className="lang-zh" style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11, color: dark ? "#ccb7f7" : "#7a51b7" }}>{statFormulas[activeAxis.key]?.zh}</div>
          <div className="lang-en" style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#ccb7f7" : "#7a51b7" }}>{statFormulas[activeAxis.key]?.en}</div>
        </div>

        {axes.map(a => {
          const value = stats[a.key as keyof typeof stats];
          const isHovered = hovered === a.key;
          return (
            <div key={a.key} onMouseEnter={() => setHovered(a.key)} onMouseLeave={() => setHovered(null)} style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 14, border: `1px solid ${isHovered ? "rgba(137,83,209,0.3)" : (dark ? "rgba(255,255,255,0.06)" : "rgba(80,40,120,0.08)")}`, background: isHovered ? "rgba(137,83,209,0.08)" : (dark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.4)"), transition: "all 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, alignItems: "center" }}>
                <span style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 13, color: isHovered ? "#8953d1" : (dark ? "#fff" : "#2d203a"), fontWeight: 700 }}>{a.zh} <span style={{ fontSize: 11, color: dark ? "#8f85a0" : "#8b7999" }}>/ {a.en}</span></span>
              </div>
              <PixelBar value={value} dark={dark} animate={animate} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RetainerPanel({ retainers, dark }: { retainers: RetainerData[]; dark: boolean }) {
  return (
    <div className="retainer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
      {retainers.map(agent => (
        <a key={agent.id} href="/lab/agents/" style={{
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.14)"}`,
          borderRadius: 18,
          background: dark ? "linear-gradient(180deg, rgba(24,18,37,0.96), rgba(14,10,24,0.96))" : "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,242,255,0.92))",
          padding: "16px 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          textDecoration: "none",
          boxShadow: dark ? "0 10px 26px rgba(0,0,0,0.18)" : "0 12px 22px rgba(137,83,209,0.07)",
        }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(135deg, rgba(137,83,209,0.1), transparent 45%, rgba(137,83,209,0.05))" }} />
          <div style={{ display: "flex", gap: 12, alignItems: "center", position: "relative" }}>
            <div style={{ width: 58, height: 58, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(137,83,209,0.36)", background: dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.08)", boxShadow: "0 0 18px rgba(137,83,209,0.14)" }}>
              <img src={agent.sprite} alt={`${agent.name} sprite`} width={58} height={58} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 15, fontWeight: 700, color: dark ? "#fff" : "#2d203a", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>{agent.name} <span>{agent.emoji}</span></div>
              <div style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 11, color: "#8953d1" }}>
                <span className="lang-zh">{agent.titleZh}</span>
                <span className="lang-en">{agent.titleEn}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", position: "relative" }}>
            <div style={{ padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.22)", background: dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.06)", color: "#8953d1", fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>
              <span className="lang-zh">修为</span><span className="lang-en">Lv</span>.{agent.level}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: dark ? "#a69bb8" : "#8b7999", textAlign: "right" }}>{agent.sessions} sessions</div>
          </div>

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: dark ? "#bdb4cb" : "#7d6c95" }}>Affinity</span>
              <span style={{ fontFamily: "monospace", fontSize: 10, color: "#8953d1" }}>{Math.min(100, Math.max(8, agent.level * 6))}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, overflow: "hidden", background: dark ? "rgba(255,255,255,0.06)" : "rgba(60,20,90,0.06)" }}>
              <div style={{ width: `${Math.min(100, Math.max(8, agent.level * 6))}%`, height: "100%", background: "linear-gradient(90deg, rgba(137,83,209,0.9), rgba(137,83,209,0.45))" }} />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

type SkillNode = {
  id: string;
  group: "inner" | "outer";
  tier: 1 | 2 | 3;
  row: number;
  label: string;
  count: number;
  url?: string;
};

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: {
  tagCounts: Record<string, number>;
  postCount: number;
  builderLogCount: number;
  dark: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const innerNodes: SkillNode[] = [
    { id: "i-1", group: "inner", tier: 1, row: 0, label: "周期心法", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
    { id: "i-2", group: "inner", tier: 2, row: 0, label: "盈亏同源", count: tagCounts.trading || 0 },
    { id: "i-3", group: "inner", tier: 2, row: 1, label: "先知先觉", count: tagCounts.alpha || 0 },
    { id: "i-4", group: "inner", tier: 1, row: 2, label: "价值心法", count: tagCounts.investment || 0, url: "/tags/investment/" },
    { id: "i-5", group: "inner", tier: 2, row: 2, label: "复利之道", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { id: "i-6", group: "inner", tier: 2, row: 3, label: "长期主义", count: (tagCounts.investment || 0) + (tagCounts.wealth || 0) },
    { id: "i-7", group: "inner", tier: 1, row: 4, label: "真元护体", count: tagCounts.wealth || 0, url: "/tags/wealth/" },
    { id: "i-8", group: "inner", tier: 2, row: 4, label: "读心术", count: tagCounts.macro || 0 },
    { id: "i-9", group: "inner", tier: 2, row: 5, label: "逍遥心法", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
  ];

  const outerNodes: SkillNode[] = [
    { id: "o-1", group: "outer", tier: 1, row: 0, label: "御剑·写作", count: postCount, url: "/posts/" },
    { id: "o-2", group: "outer", tier: 2, row: 0, label: "尘世游记", count: tagCounts.life || 0, url: "/tags/life/" },
    { id: "o-3", group: "outer", tier: 2, row: 1, label: "人物列传", count: tagCounts.people || 0, url: "/tags/people/" },
    { id: "o-4", group: "outer", tier: 2, row: 2, label: "长青秘籍", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { id: "o-5", group: "outer", tier: 1, row: 3, label: "天工·编程", count: tagCounts.ai || 0, url: "/tags/ai/" },
    { id: "o-6", group: "outer", tier: 2, row: 3, label: "灵犀一指", count: tagCounts["vibe coding"] || tagCounts.ai || 0, url: "/tags/ai/" },
    { id: "o-7", group: "outer", tier: 2, row: 4, label: "御灵术", count: builderLogCount, url: "/builder-log/" },
    { id: "o-8", group: "outer", tier: 1, row: 5, label: "踏雪·探索", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { id: "o-9", group: "outer", tier: 2, row: 5, label: "游方记", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { id: "o-10", group: "outer", tier: 2, row: 6, label: "仙风云体", count: tagCounts.travel || 0 },
  ];

  const layout = useMemo(() => {
    const width = 920;
    const height = 860;
    const rootW = 96;
    const rootH = 50;
    const nodeW = 132;
    const nodeH = 46;
    const tierX = { root: 76, tier1: 248, tier2: 460 };
    const sectionTop = { inner: 96, outer: 482 };
    const rowGap = 74;

    const roots = {
      inner: { x: tierX.root, y: 214, w: rootW, h: rootH, label: "内功心法" },
      outer: { x: tierX.root, y: 600, w: rootW, h: rootH, label: "外功仙术" },
    };

    const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
    [...innerNodes, ...outerNodes].forEach(node => {
      const x = node.tier === 1 ? tierX.tier1 : tierX.tier2;
      const y = sectionTop[node.group] + node.row * rowGap;
      positions.set(node.id, { x, y, w: nodeW, h: nodeH });
    });

    return { width, height, roots, positions };
  }, [builderLogCount, postCount, tagCounts]);

  function pointRight(box: { x: number; y: number; w: number; h: number }) { return { x: box.x + box.w, y: box.y + box.h / 2 }; }
  function pointLeft(box: { x: number; y: number; h: number }) { return { x: box.x, y: box.y + box.h / 2 }; }

  function Connector({ from, to }: { from: { x: number; y: number; w: number; h: number }; to: { x: number; y: number; w: number; h: number } }) {
    const p1 = pointRight(from);
    const p2 = pointLeft(to);
    const curve = `M ${p1.x} ${p1.y} C ${p1.x + 34} ${p1.y}, ${p2.x - 34} ${p2.y}, ${p2.x} ${p2.y}`;
    return (
      <>
        <path d={curve} fill="none" stroke={dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.16)"} strokeWidth={8} strokeLinecap="round" />
        <path className={reducedMotion ? "" : "meridian-flow"} d={curve} fill="none" stroke="#8953d1" strokeOpacity={0.42} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="5 7" />
      </>
    );
  }

  function NodeBox({ node }: { node: SkillNode }) {
    const box = layout.positions.get(node.id)!;
    const active = node.count > 0;
    const textColor = active ? (dark ? "#f5efff" : "#4a2d74") : (dark ? "#7d738f" : "#9c8dac");
    const fill = active ? (dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.08)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(75,35,120,0.03)");
    const border = active ? "rgba(137,83,209,0.7)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(90,45,140,0.12)");

    return (
      <g
        style={{ cursor: active && node.url ? "pointer" : "default" }}
        onClick={() => { if (active && node.url) window.location.href = node.url; }}
        onMouseEnter={() => setTooltip({ text: active ? `${node.count} 篇 · 点击前往` : "未点亮 · Locked", x: box.x + box.w / 2, y: box.y - 14 })}
        onMouseLeave={() => setTooltip(null)}
      >
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={14} fill={fill} stroke={border} strokeWidth={1.5} style={{ filter: active ? "drop-shadow(0 0 16px rgba(137,83,209,0.14))" : undefined, transition: "all 0.2s ease" }} />
        <rect x={box.x + 6} y={box.y + 6} width={box.w - 12} height={box.h - 12} rx={10} fill="transparent" stroke={dark ? "rgba(255,255,255,0.04)" : "rgba(137,83,209,0.08)"} strokeWidth={1} />
        <text x={box.x + box.w / 2} y={box.y + 18} textAnchor="middle" fontFamily="Georgia, Cambria, serif" fontSize={12} fontWeight={700} fill={textColor}>{node.label}</text>
        <text x={box.x + box.w / 2} y={box.y + 33} textAnchor="middle" fontFamily="monospace" fontSize={10} fontWeight={700} fill={active ? "#8953d1" : (dark ? "#7d738f" : "#ae9fba")}>Lv.{node.count}</text>
      </g>
    );
  }

  function RootBox({ root, label }: { root: { x: number; y: number; w: number; h: number }; label: string }) {
    return (
      <g>
        <rect x={root.x} y={root.y} width={root.w} height={root.h} rx={16} fill={dark ? "rgba(36,22,62,0.95)" : "rgba(241,233,255,0.96)"} stroke="#8953d1" strokeWidth={2} />
        <rect x={root.x + 6} y={root.y + 6} width={root.w - 12} height={root.h - 12} rx={12} fill="transparent" stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(137,83,209,0.1)"} strokeWidth={1} />
        <text x={root.x + root.w / 2} y={root.y + root.h / 2 + 4} textAnchor="middle" fontFamily="Georgia, Cambria, serif" fontSize={16} fontWeight={800} fill="#8953d1">{label}</text>
      </g>
    );
  }

  const tier1Inner = innerNodes.filter(node => node.tier === 1);
  const tier1Outer = outerNodes.filter(node => node.tier === 1);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 920, overflowX: "auto", paddingBottom: 6 }}>
          <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ display: "block", margin: "0 auto", minWidth: layout.width, overflow: "visible" }}>
            <defs>
              <radialGradient id="meridianGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(137,83,209,0.28)" />
                <stop offset="100%" stopColor="rgba(137,83,209,0)" />
              </radialGradient>
            </defs>
            <rect x={0} y={0} width={layout.width} height={layout.height} rx={26} fill={dark ? "rgba(10,8,18,0.32)" : "rgba(255,255,255,0.45)"} stroke={dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.1)"} />
            <circle cx={160} cy={240} r={110} fill="url(#meridianGlow)" />
            <circle cx={160} cy={626} r={110} fill="url(#meridianGlow)" />
            <text x={78} y={84} fontFamily="Georgia, Cambria, serif" fontSize={14} fontWeight={700} fill="#8953d1">道心脉络</text>
            <text x={78} y={470} fontFamily="Georgia, Cambria, serif" fontSize={14} fontWeight={700} fill="#8953d1">行技脉络</text>

            <RootBox root={layout.roots.inner} label="内功心法" />
            <RootBox root={layout.roots.outer} label="外功仙术" />

            {tier1Inner.map(node => <Connector key={`root-inner-${node.id}`} from={layout.roots.inner} to={layout.positions.get(node.id)!} />)}
            {tier1Outer.map(node => <Connector key={`root-outer-${node.id}`} from={layout.roots.outer} to={layout.positions.get(node.id)!} />)}
            {innerNodes.filter(node => node.tier === 2).map(node => {
              const parent = node.row <= 1 ? "i-1" : node.row <= 3 ? "i-4" : "i-7";
              return <Connector key={`inner-${node.id}`} from={layout.positions.get(parent)!} to={layout.positions.get(node.id)!} />;
            })}
            {outerNodes.filter(node => node.tier === 2).map(node => {
              const parent = node.row <= 2 ? "o-1" : node.row <= 4 ? "o-5" : "o-8";
              return <Connector key={`outer-${node.id}`} from={layout.positions.get(parent)!} to={layout.positions.get(node.id)!} />;
            })}

            {[...innerNodes, ...outerNodes].map(node => <NodeBox key={node.id} node={node} />)}

            {tooltip && (
              <g>
                <rect x={tooltip.x - 64} y={tooltip.y - 20} width={128} height={24} rx={12} fill={dark ? "rgba(19,16,30,0.96)" : "rgba(255,255,255,0.96)"} stroke="rgba(137,83,209,0.28)" strokeWidth={1} />
                <text x={tooltip.x} y={tooltip.y - 4} textAnchor="middle" fontFamily="monospace" fontSize={10} fill="#8953d1">{tooltip.text}</text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

const CATEGORY_META: Record<string, { icon: string; zh: string; en: string }> = {
  cultivation: { icon: "🗡️", zh: "修行", en: "Cultivation" },
  jianghu: { icon: "🌍", zh: "江湖", en: "Exploration" },
  command: { icon: "🤖", zh: "统御", en: "Command" },
  knowledge: { icon: "📚", zh: "身法", en: "Knowledge" },
  health: { icon: "💪", zh: "体力", en: "Health" },
  investment: { icon: "💰", zh: "财修", en: "Investment" },
  hidden: { icon: "🔮", zh: "奇遇", en: "Hidden" },
};
const CATEGORY_ORDER = ["cultivation", "jianghu", "command", "knowledge", "health", "investment", "hidden"];

function AchievementBadges({ achievements, dark }: { achievements: AchievementData[]; dark: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const grouped: Record<string, AchievementData[]> = {};
  for (const a of achievements) {
    if (a.hidden && !a.unlocked) continue;
    const cat = a.category || "hidden";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat]!.push(a);
  }

  return (
    <div>
      {CATEGORY_ORDER.map(cat => {
        const items = grouped[cat];
        if (!items?.length) return null;
        const meta = CATEGORY_META[cat] ?? { icon: "📋", zh: cat, en: cat };
        return (
          <div key={cat} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}` }}>
              <span>{meta.icon}</span>
              <span style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 13, fontWeight: 700, color: "#8953d1" }}><span className="lang-zh">{meta.zh}</span><span className="lang-en">{meta.en}</span></span>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bdb4cb" : "#857593" }}>{items.filter(a => a.unlocked).length}/{items.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
              {items.map(a => {
                const isSelected = selected === a.id;
                const border = a.unlocked ? (isSelected ? "rgba(137,83,209,0.46)" : "rgba(137,83,209,0.22)") : (dark ? "rgba(255,255,255,0.08)" : "rgba(70,35,110,0.08)");
                const bg = a.unlocked ? (dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.05)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(70,35,110,0.03)");
                return (
                  <div key={a.id} onClick={() => setSelected(isSelected ? null : a.id)} className={a.unlocked ? "achievement-unlocked" : undefined} style={{ border: `1px solid ${border}`, borderRadius: 16, background: bg, padding: "12px 14px", cursor: "pointer", opacity: a.unlocked ? 1 : 0.7, boxShadow: a.unlocked ? "0 0 0 rgba(137,83,209,0)" : "none", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 22, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.icon}</span>
                      <div style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 12, fontWeight: 700, color: a.unlocked ? (dark ? "#fff" : "#352345") : (dark ? "#a69bb8" : "#8b7999") }}><span className="lang-zh">{a.nameZh}</span><span className="lang-en">{a.nameEn}</span></div>
                    </div>
                    <p style={{ margin: 0, fontFamily: "Georgia, Cambria, serif", fontSize: 11, lineHeight: 1.5, color: dark ? "#bdb4cb" : "#857593" }}><span className="lang-zh">{a.descZh}</span><span className="lang-en">{a.descEn}</span></p>
                    {a.unlocked && a.unlockedDate && <div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 10, color: "#8953d1" }}>✓ {a.unlockedDate}</div>}
                    {!a.unlocked && a.progress !== undefined && a.max !== undefined && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontFamily: "monospace", fontSize: 10, color: dark ? "#a69bb8" : "#8b7999" }}>{a.progress}/{a.max}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 10, color: "#8953d1" }}>{Math.round((a.progress / a.max) * 100)}%</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: dark ? "rgba(255,255,255,0.06)" : "rgba(60,20,90,0.06)" }}>
                          <div style={{ width: `${Math.min(100, (a.progress / a.max) * 100)}%`, height: "100%", background: "linear-gradient(90deg, rgba(137,83,209,0.9), rgba(137,83,209,0.45))" }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CultivationLog({ activityLog, dark }: { activityLog: PlayerStatsProps["activityLog"]; dark: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>(0.18);
  const reducedMotion = usePrefersReducedMotion();
  const visible = showAll ? activityLog : activityLog.slice(0, 10);
  const totalExp = activityLog.reduce((sum, item) => sum + item.exp, 0);
  const animatedTotalExp = useCountUp(totalExp, 1200, inView);

  return (
    <div ref={ref}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map((act, i) => {
          const entered = reducedMotion || inView;
          return (
            <div
              key={`${act.dateEn}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "78px 28px 1fr auto",
                gap: 10,
                alignItems: "start",
                padding: "10px 12px",
                borderRadius: 14,
                border: `1px solid ${dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.1)"}`,
                background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.58)",
                opacity: entered ? 1 : 0,
                transform: entered ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 520ms ease ${i * 55}ms, transform 520ms ease ${i * 55}ms`,
              }}
              className="cultivation-row"
            >
              <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#a69bb8" : "#8b7999" }}><span className="lang-zh">{act.dateZh}</span><span className="lang-en">{act.dateEn}</span></div>
              <span style={{ fontSize: 16 }}>{act.icon}</span>
              <p style={{ margin: 0, fontFamily: "Georgia, Cambria, serif", fontSize: 12, lineHeight: 1.5, color: dark ? "#fff" : "#2d203a" }}><span className="lang-zh">{act.descZh}</span><span className="lang-en">{act.descEn}</span></p>
              <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8953d1", fontWeight: 700, whiteSpace: "nowrap", padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.2)", background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)" }}>+{act.exp} EXP</span>
            </div>
          );
        })}
      </div>
      {activityLog.length > 10 && (
        <button onClick={() => setShowAll(v => !v)} style={{ marginTop: 12, width: "100%", padding: "10px 16px", borderRadius: 999, border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.18)"}`, background: "transparent", color: "#8953d1", fontFamily: "Georgia, Cambria, serif", fontSize: 13, cursor: "pointer" }}>
          {showAll ? <><span className="lang-zh">收起</span><span className="lang-en">Show less</span></> : <><span className="lang-zh">查看全部 {activityLog.length} 条记录 ↓</span><span className="lang-en">View all {activityLog.length} entries ↓</span></>}
        </button>
      )}
      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.04)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "Georgia, Cambria, serif", fontSize: 12, color: dark ? "#bdb4cb" : "#857593" }}><span className="lang-zh">累计修为</span><span className="lang-en">Total Cultivation</span></span>
        <span style={{ fontFamily: "monospace", fontSize: 15, color: "#8953d1", fontWeight: 800 }}>{animatedTotalExp.toLocaleString()} EXP</span>
      </div>
    </div>
  );
}

function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 1.2rem" }}>
      <div style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${dark ? "rgba(137,83,209,0.28)" : "rgba(137,83,209,0.2)"}`, display: "grid", placeItems: "center", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontFamily: "Georgia, Cambria, serif", fontSize: "1.06rem", fontWeight: 700, color: dark ? "#fff" : "#21162d" }}><span className="lang-zh">{zh}</span><span className="lang-en">{en}</span></h2>
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(137,83,209,0.32), rgba(137,83,209,0))` }} />
      <div style={{ width: 16, height: 16, borderTop: "1px solid rgba(137,83,209,0.28)", borderRight: "1px solid rgba(137,83,209,0.28)", transform: "rotate(45deg)" }} />
    </div>
  );
}

export default function PlayerStats(props: PlayerStatsProps) {
  const dark = useTheme();
  const heroReveal = useInView<HTMLDivElement>(0.15);
  const statsReveal = useInView<HTMLDivElement>(0.2);
  const { stats, level, totalExp, expInLevel, expNeeded, expProgress, rank, currentCity, travelDays, tagCounts, postCount, builderLogCount, cities, achievements, retainers, activityLog } = props;

  return (
    <div style={{ fontFamily: "Georgia, Cambria, serif", maxWidth: 980, margin: "0 auto" }}>
      <style>{`
        .player-shell {
          position: relative;
          overflow: hidden;
        }
        .player-shell::before,
        .player-shell::after {
          content: "";
          position: fixed;
          pointer-events: none;
          width: 220px;
          height: 220px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(137,83,209,0.10), transparent 68%);
          filter: blur(10px);
          z-index: 0;
          animation: playerMist 14s ease-in-out infinite;
        }
        .player-shell::before { top: 12%; left: -50px; }
        .player-shell::after { bottom: 8%; right: -40px; animation-delay: -7s; }
        @keyframes playerMist {
          0%, 100% { transform: translate3d(0,0,0) scale(1); opacity: 0.55; }
          50% { transform: translate3d(18px,-12px,0) scale(1.08); opacity: 0.85; }
        }
        .player-stack { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 1.35rem; }
        .meridian-flow {
          animation: meridianFlow 8s linear infinite;
        }
        @keyframes meridianFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -72; }
        }
        .achievement-unlocked:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 18px rgba(137,83,209,0.14);
        }
        @media (prefers-reduced-motion: reduce) {
          .player-shell::before,
          .player-shell::after,
          .meridian-flow {
            animation: none !important;
          }
        }
        @media (max-width: 900px) {
          .player-hero-grid { grid-template-columns: 1fr !important; }
          .hero-side-stats { justify-self: stretch !important; min-width: 0 !important; }
        }
        @media (max-width: 780px) {
          .retainer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .cultivation-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 520px) {
          .retainer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="player-shell">
        <div className="player-stack">
          <div ref={heroReveal.ref}>
            <DecorativeSection dark={dark} delay={0}>
              <HeroCard rank={rank} level={level} totalExp={totalExp} expInLevel={expInLevel} expNeeded={expNeeded} expProgress={expProgress} currentCity={currentCity} travelDays={travelDays} dark={dark} animate={heroReveal.inView} />
            </DecorativeSection>
          </div>

          <div ref={statsReveal.ref}>
            <DecorativeSection dark={dark} delay={40}>
              <SectionHeader icon="📊" zh="六维属性" en="Six Attributes" dark={dark} />
              <RadarChart stats={stats} dark={dark} animate={statsReveal.inView} />
            </DecorativeSection>
          </div>

          <DecorativeSection dark={dark} delay={60}>
            <SectionHeader icon="🏯" zh="门客" en="Retainers" dark={dark} />
            <RetainerPanel retainers={retainers} dark={dark} />
          </DecorativeSection>

          <DecorativeSection dark={dark} delay={80}>
            <SectionHeader icon="🌳" zh="技能树" en="Skill Tree" dark={dark} />
            <SkillTree tagCounts={tagCounts} postCount={postCount} builderLogCount={builderLogCount} dark={dark} />
          </DecorativeSection>

          <DecorativeSection dark={dark} delay={100}>
            <a href="/travel/" style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", padding: "1.1rem 1.5rem", borderRadius: 20, border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.14)"}`, background: dark ? "linear-gradient(180deg, rgba(22,16,34,0.98), rgba(12,10,24,0.98))" : "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(248,242,255,0.95))", textDecoration: "none", boxShadow: dark ? "0 12px 30px rgba(0,0,0,0.18)" : "0 12px 26px rgba(137,83,209,0.06)" }}>
              <span style={{ fontSize: 28 }}>🗺️</span>
              <div>
                <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: "#8953d1" }}>{cities.length} <span style={{ fontSize: 14, fontWeight: 400, color: dark ? "#bdb4cb" : "#6f657d" }}><span className="lang-en">cities explored</span><span className="lang-zh">座城市已游历</span></span></div>
                <div style={{ fontSize: 12, color: dark ? "#a69bb8" : "#8b7999", fontFamily: "Georgia, serif" }}><span className="lang-en">→ Open full travel map</span><span className="lang-zh">→ 查看完整旅居地图</span></div>
              </div>
            </a>
          </DecorativeSection>

          <DecorativeSection dark={dark} delay={120}>
            <SectionHeader icon="🏆" zh="功勋录" en="Achievements" dark={dark} />
            <AchievementBadges achievements={achievements} dark={dark} />
          </DecorativeSection>

          <DecorativeSection dark={dark} delay={140}>
            <SectionHeader icon="📜" zh="修行日志" en="Cultivation Log" dark={dark} />
            <CultivationLog activityLog={activityLog} dark={dark} />
          </DecorativeSection>
        </div>
      </div>
    </div>
  );
}
