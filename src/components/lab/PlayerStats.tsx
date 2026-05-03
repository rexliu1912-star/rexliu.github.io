import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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

export interface QuestData {
  id: string;
  titleCN: string;
  titleEN: string;
  target?: string;
  current?: number;
  goal?: number;
  unit?: string;
  status: "active" | "completed";
  progress?: string;
}

export interface EquipmentData {
  id: string;
  slotCN: string;
  slotEN: string;
  nameCN: string;
  nameEN: string;
  effectCN: string;
  effectEN: string;
  acquired: string;
  article: string | null;
}

export interface ChapterData {
  id: string;
  titleCN: string;
  titleEN: string;
  period: string;
  location: string;
  summary: string;
  summaryEN: string;
  articles: string[];
  boss?: {
    name: string;
    nameEN: string;
    description?: string;
    descriptionEN?: string;
    defeated: boolean;
    reward: string;
    rewardEN: string;
  } | null;
  rewards: string[];
  rewardsEN: string[];
}

export interface RelationshipData {
  id: string;
  nameCN: string;
  nameEN: string;
  roleCN: string;
  roleEN: string;
  impactCN: string;
  impactEN: string;
  avatar?: string | null;
  link?: string | null;
  platformCN?: string | null;
  platformEN?: string | null;
  article: string | null;
}

export interface StatFormulaData {
  labelZh: string;
  labelEn: string;
  value: number;
  formulaZh: string;
  formulaEn: string;
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
  quests: { main: QuestData[]; side: QuestData[] };
  equipment: EquipmentData[];
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
    link?: string;
  }>;
  chapters: ChapterData[];
  relationships: RelationshipData[];
  articleMeta: Record<string, { title: string; titleZh?: string | null }>;
  statFormulas: Record<string, StatFormulaData>;
  expFormula: { zh: string; en: string };
  levelFormula: { zh: string; en: string; nextLevel: string };
  mediaCount: number;
  bookCount: number;
}

const PURPLE = "#8953d1";
const TOOLTIP_SCOPE = "player-stats-tooltip";
const SUCCESS = "#5c8f68";
const STAT_META = [
  { key: "vitality", zh: "体力", en: "HP" },
  { key: "wisdom", zh: "灵力", en: "Spirit" },
  { key: "craft", zh: "武术", en: "Martial" },
  { key: "insight", zh: "身法", en: "Agility" },
  { key: "renown", zh: "声望", en: "Renown" },
  { key: "command", zh: "统御", en: "Command" },
] as const;

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") === "dark" || document.documentElement.classList.contains("dark");
}

function isRainyMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.getAttribute("data-mood") === "rainy";
}

function useTheme() {
  const [dark, setDark] = useState(false);
  const [rainy, setRainy] = useState(false);
  const [sunny, setSunny] = useState(false);
  useEffect(() => {
    setDark(isDarkMode());
    setRainy(isRainyMode());
    setSunny(document.documentElement.getAttribute("data-mood") === "sunny");
    const obs = new MutationObserver(() => {
      setDark(isDarkMode());
      setRainy(isRainyMode());
      setSunny(document.documentElement.getAttribute("data-mood") === "sunny");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mood", "class"] });
    return () => { obs.disconnect(); };
  }, []);
  return { dark, rainy, sunny };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(threshold = 0.18, persist = true) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    const ob = new IntersectionObserver(([entry]: IntersectionObserverEntry[]) => {
      if (persist) {
        if (entry?.isIntersecting) {
          setInView(true);
          ob.disconnect();
        }
      } else {
        setInView(Boolean(entry?.isIntersecting));
      }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold, persist]);
  return { ref, inView };
}

function useCountUp(target: number, duration = 700, enabled = true) {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(enabled ? 0 : target);
  useEffect(() => {
    if (!enabled || reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled, reduced]);
  return value;
}

function AchievementRing({ progress, max }: { progress: number; max: number }) {
  const ratio = max > 0 ? progress / max : 0;
  const r = 14;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - ratio * circumference;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" style={{ display: "block" }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(137,83,209,0.15)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={PURPLE} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 18 18)" />
    </svg>
  );
}

function TooltipWrap({ content, children, align = "left" }: { content: React.ReactNode; children: React.ReactNode; align?: "left" | "center" | "right" }) {
  const id = useMemo(() => `tt-${Math.random().toString(36).slice(2, 10)}`, []);
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const touchOpenRef = useRef(false);

  useEffect(() => {
    const close = () => setOpen(false);
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string; scope?: string }>).detail;
      if (detail?.scope === TOOLTIP_SCOPE && detail.id !== id) close();
    };
    const pointerHandler = (event: Event) => {
      if (!triggerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("player-stats:tooltip-open", handle as EventListener);
    document.addEventListener("pointerdown", pointerHandler);
    return () => {
      document.removeEventListener("player-stats:tooltip-open", handle as EventListener);
      document.removeEventListener("pointerdown", pointerHandler);
    };
  }, [id]);

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const show = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    document.dispatchEvent(new CustomEvent("player-stats:tooltip-open", { detail: { id, scope: TOOLTIP_SCOPE } }));
    setOpen(true);
  };

  const hide = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 80);
  };

  const justify = align === "center" ? "50%" : align === "right" ? "100%" : "0";
  const translate = align === "center" ? "translate(-50%, 6px)" : align === "right" ? "translate(-100%, 6px)" : "translate(0, 6px)";
  const openTranslate = align === "center" ? "translate(-50%, 0)" : align === "right" ? "translate(-100%, 0)" : "translate(0, 0)";

  return (
    <span
      ref={triggerRef}
      style={{ position: "relative", display: "block" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onTouchStart={() => {
        if (touchOpenRef.current) {
          setOpen(false);
          touchOpenRef.current = false;
          return;
        }
        show();
        touchOpenRef.current = true;
      }}
      onTouchEnd={() => {
        window.setTimeout(() => {
          setOpen(false);
          touchOpenRef.current = false;
        }, 900);
      }}
      tabIndex={0}
      aria-expanded={open}
    >
      {children}
      <span
        style={{
          position: "absolute",
          left: justify,
          top: "calc(100% + 10px)",
          zIndex: 24,
          width: "min(320px, calc(100vw - 48px))",
          padding: "10px 12px",
          borderRadius: 14,
          border: `1px solid rgba(137,83,209,0.34)`,
          background: "rgba(21,21,21,0.98)",
          color: "#f5efff",
          fontFamily: "monospace",
          fontSize: 11,
          lineHeight: 1.55,
          pointerEvents: "none",
          opacity: open ? 1 : 0,
          transform: open ? openTranslate : translate,
          transition: "opacity 170ms ease, transform 170ms ease",
          boxShadow: "0 10px 22px rgba(0,0,0,0.28)"
        }}
      >
        {content}
      </span>
    </span>
  );
}

const Section = memo(function Section({ dark, rainy, sunny, children, hero }: { dark: boolean; rainy: boolean; sunny: boolean; children: React.ReactNode; hero?: boolean }) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLElement>(0.1, true);
  void hero;
  const cardBg = rainy ? "#d8dfe8" : sunny ? "#fffaef" : (dark ? "#181818" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,242,255,0.96))");
  const cardShadow = rainy ? "0 1px 6px rgba(45,55,72,0.06)" : sunny ? "0 1px 6px rgba(0,0,0,0.04)" : (dark ? "0 2px 8px rgba(0,0,0,0.12)" : "0 10px 20px rgba(137,83,209,0.08)");
  const cardBorder = rainy ? "rgba(100,120,155,0.22)" : sunny ? "rgba(137,83,209,0.14)" : `rgba(137,83,209,${dark ? "0.22" : "0.14"})`;
  const style: CSSProperties = {
    width: "100%", maxWidth: 1200, margin: "0 auto",
    border: `1px solid ${cardBorder}`,
    borderRadius: 24, padding: "1.35rem",
    background: cardBg,
    boxShadow: cardShadow,
    opacity: reduced ? 1 : (inView ? 1 : 0),
    transform: reduced ? "none" : (inView ? "translateY(0)" : "translateY(18px)"),
    transition: reduced ? undefined : "opacity 500ms cubic-bezier(0.22,1,0.36,1), transform 500ms cubic-bezier(0.22,1,0.36,1)",
  };
  return <section ref={ref} className="ps-section" style={style}>{children}</section>;
});

const SectionHeader = memo(function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><span style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.18)"}`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>{icon}</span><div style={{ fontFamily: "Georgia, Cambria, serif", fontWeight: 700, color: dark ? "#fff" : "#261a33", fontSize: "1.06rem" }}><span className="lang-zh">{zh}</span><span className="lang-en">{en}</span></div><div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(137,83,209,0.28), transparent)" }} /></div>;
});

const HeroCard = memo(function HeroCard({ dark, rank, level, totalExp, expInLevel, expNeeded, expProgress, avgStat, currentCity, travelDays, expFormula, levelFormula }: {
  dark: boolean; rank: { zh: string; en: string }; level: number; totalExp: number; expInLevel: number; expNeeded: number; expProgress: number; avgStat: number; currentCity: { name: string; nameCN: string }; travelDays: number; expFormula: { zh: string; en: string }; levelFormula: { zh: string; en: string; nextLevel: string };
}) {
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const expAnimated = Math.round(useCountUp(totalExp, 900, true));
  // expProgress used in EXP bar width below
  void useCountUp(expProgress, 900, true);
  const levelAnimated = Math.round(useCountUp(level, 900, true));
  const powerRating = Math.round(avgStat * level * 1.5);
  const powerAnimated = Math.round(useCountUp(powerRating, 1200, revealed));
  const filledBlocks = Math.round(expProgress / 10);

  useEffect(() => {
    if (reduced) { setRevealed(true); return; }
    const timer = setTimeout(() => setRevealed(true), 50);
    return () => clearTimeout(timer);
  }, [reduced]);

  const stagger = (delayMs: number): CSSProperties => reduced ? { opacity: 1, transform: "none" } : {
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 400ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 400ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
  };

  const sideStagger = (delayMs: number): CSSProperties => reduced ? { opacity: 1, transform: "none" } : {
    opacity: revealed ? 1 : 0,
    transform: revealed ? "translateX(0)" : "translateX(16px)",
    transition: `opacity 400ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, transform 400ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
  };

  const cornerStyle = (pos: "tl" | "tr" | "bl" | "br"): CSSProperties => ({
    position: "absolute",
    width: 12, height: 12,
    color: PURPLE, fontSize: 10, lineHeight: 1, fontWeight: 700, opacity: 0.6,
    ...(pos === "tl" ? { top: -2, left: -2 } : pos === "tr" ? { top: -2, right: -2 } : pos === "bl" ? { bottom: -2, left: -2 } : { bottom: -2, right: -2 }),
  });

  return <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "132px 1fr auto", gap: "1rem", alignItems: "center" }}>
    {/* Left: avatar with RPG corner decorations */}
    <div style={{ position: "relative", ...stagger(0) }}>
      <div style={{ position: "relative" }}>
        <div style={cornerStyle("tl")}>◤</div>
        <div style={cornerStyle("tr")}>◥</div>
        <div style={cornerStyle("bl")}>◣</div>
        <div style={cornerStyle("br")}>◢</div>
        <img src="/images/rex-avatar.png" alt="Rex avatar" width={132} height={160} style={{ width: 132, height: 160, objectFit: "cover", imageRendering: "pixelated", borderRadius: 18, border: "1px solid rgba(137,83,209,0.28)", boxShadow: "0 8px 18px rgba(137,83,209,0.12)" }} />
      </div>
      <TooltipWrap content={<><div className="lang-zh">{levelFormula.zh}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{levelFormula.en}</div><div style={{ marginTop: 6, color: "#fff" }}>{levelFormula.nextLevel}</div></>} align="center"><div style={{ position: "absolute", left: "50%", bottom: -12, transform: "translateX(-50%)", padding: "4px 14px", borderRadius: 6, background: dark ? "rgba(10,10,18,0.94)" : "rgba(255,255,255,0.94)", border: "1px solid rgba(137,83,209,0.24)", color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>Lv.{levelAnimated}</div></TooltipWrap>
    </div>
    {/* Center: info */}
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: dark ? "#fff" : "#261a33", fontSize: "2rem", fontFamily: "Georgia, Cambria, serif", ...stagger(80) }}>Rex Liu</h2>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", fontSize: 11, ...stagger(80) }}>
            <span style={{ color: PURPLE, fontWeight: 700 }}>PLAYER STATS</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ color: dark ? "#bcb2cb" : "#6f657d" }}>Lv.{levelAnimated}</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ color: SUCCESS, letterSpacing: "0.04em" }}>● ACTIVE</span>
          </div>
          <p style={{ margin: "10px 0 0", color: dark ? "#bcb2cb" : "#6f657d", lineHeight: 1.7, fontSize: 13, ...stagger(160) }}>
            <span className="lang-en">Sword intent in writing, inner strength in systems, footsteps across cities.</span>
            <span className="lang-zh">以文铸剑，以行入道，以器御世。</span>
          </p>
        </div>
      </div>
      {/* A3: KEY:VALUE badges */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 14, fontFamily: "monospace", fontSize: 12, ...stagger(240) }}>
        <span><span style={{ opacity: 0.5 }}>REALM:</span> <span className="lang-zh" style={{ fontWeight: 700, color: dark ? "#e9ddff" : "#6f46a3" }}>{rank.zh}</span><span className="lang-en" style={{ fontWeight: 700, color: dark ? "#e9ddff" : "#6f46a3" }}>{rank.en}</span></span>
        <span style={{ opacity: 0.35, margin: "0 4px" }}>·</span>
        <span><span style={{ opacity: 0.5 }}>LOC:</span> <span className="lang-zh" style={{ fontWeight: 700, color: dark ? "#e9ddff" : "#6f46a3" }}>{currentCity.nameCN}</span><span className="lang-en" style={{ fontWeight: 700, color: dark ? "#e9ddff" : "#6f46a3" }}>{currentCity.name}</span></span>
        <span style={{ opacity: 0.35, margin: "0 4px" }}>·</span>
        <span><span style={{ opacity: 0.5 }}>DAYS:</span> <span style={{ fontWeight: 700, color: dark ? "#e9ddff" : "#6f46a3" }}>{travelDays}d</span></span>
      </div>
      {/* EXP bar */}
      <div style={{ marginTop: 16, ...stagger(320) }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
          <TooltipWrap content={<><div className="lang-zh">{expFormula.zh}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><span style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>TOTAL EXP {expAnimated.toLocaleString()}</span></TooltipWrap>
          <span style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 12 }}>{expInLevel} / {expNeeded}</span>
        </div>
        <TooltipWrap content={<><div className="lang-zh">{expFormula.zh}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><div style={{ display: "flex", gap: 3 }}>
          {Array(10).fill(0).map((_, i) => <span key={i} style={{
            flex: 1, height: 16, borderRadius: 3,
            background: i < filledBlocks ? PURPLE : (dark ? "rgba(255,255,255,0.08)" : "rgba(60,20,90,0.08)"),
            transition: reduced ? undefined : `background 60ms ease ${300 + i * 90}ms`,
          }} />)}
        </div></TooltipWrap>
      </div>
    </div>
    {/* Right: side panel — compact stats only, no duplication with center */}
    <div className="hero-side" style={{ minWidth: 140, ...sideStagger(300) }}>
      <div style={{ borderRadius: 16, border: "1px solid rgba(137,83,209,0.2)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", padding: 16, fontFamily: "monospace", display: "grid", gap: 14 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: PURPLE, fontWeight: 700, fontSize: 28, fontFamily: "Georgia, Cambria, serif" }}>{powerAnimated.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: dark ? "#bcb2cb" : "#7a6d89", letterSpacing: "0.08em", marginTop: 4 }}>POWER RATING</div>
        </div>
        <div style={{ height: 1, background: "rgba(137,83,209,0.12)" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: dark ? "#9f93b1" : "#8b7a98", opacity: 0.6 }}>NEXT LV</div>
            <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{Math.max(expNeeded - expInLevel, 0)} EXP</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: dark ? "#9f93b1" : "#8b7a98", opacity: 0.6 }}>AVG STAT</div>
            <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{avgStat}</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
});

const ChapterCarousel = memo(function ChapterCarousel({ chapters, articleMeta, dark }: { chapters: ChapterData[]; articleMeta: Record<string, { title: string; titleZh?: string | null }>; dark: boolean }) {
  const reduced = usePrefersReducedMotion();
  const initialIndex = Math.max(0, chapters.findIndex(c => c.id === "current"));
  const [index, setIndex] = useState(initialIndex >= 0 ? initialIndex : Math.max(chapters.length - 1, 0));
  const [expanded, setExpanded] = useState(false);
  const active = chapters[index] ?? chapters[0];

  useEffect(() => {
    setExpanded(false);
  }, [index]);

  if (!active) return null;

  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 12 }}>Chapter {index + 1} / {chapters.length}</div>
      <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => setIndex(v => Math.max(0, v - 1))} disabled={index === 0} style={{ width: 38, height: 38, borderRadius: 999, cursor: index === 0 ? "not-allowed" : "pointer", border: "1px solid rgba(137,83,209,0.18)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", color: PURPLE, opacity: index === 0 ? 0.35 : 1 }}>←</button>
        <button type="button" onClick={() => setIndex(v => Math.min(chapters.length - 1, v + 1))} disabled={index === chapters.length - 1} style={{ width: 38, height: 38, borderRadius: 999, cursor: index === chapters.length - 1 ? "not-allowed" : "pointer", border: "1px solid rgba(137,83,209,0.18)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", color: PURPLE, opacity: index === chapters.length - 1 ? 0.35 : 1 }}>→</button>
      </div>
    </div>

    <div style={{ overflow: "hidden", borderRadius: 22 }}>
      <div key={active.id} className="chapter-slide-card" style={{ borderRadius: 22, border: `1px solid ${active.id === "current" ? "rgba(137,83,209,0.28)" : dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(21,21,21,0.98)" : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,240,255,0.98))", boxShadow: active.id === "current" ? "0 10px 22px rgba(137,83,209,0.12)" : undefined, animation: reduced ? undefined : "chapterSlide 260ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={{ display: "grid", gap: 16, padding: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{active.period}</div>
              <div style={{ marginTop: 6, color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 26, fontFamily: "Georgia, Cambria, serif" }}><span className="lang-zh">{active.titleCN}</span><span className="lang-en">{active.titleEN}</span></div>
              <div style={{ marginTop: 6, color: dark ? "#bcb2cb" : "#6f657d", fontSize: 13 }}>{active.location}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {active.id === "current" && <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.22)", background: "rgba(137,83,209,0.08)", color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>CURRENT</span>}
              {active.boss?.defeated && <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${SUCCESS}55`, background: `${SUCCESS}18`, color: SUCCESS, fontFamily: "monospace", fontSize: 11 }}><span className="lang-zh">✅ 已击败</span><span className="lang-en">✅ Defeated</span></span>}
            </div>
          </div>

          <p style={{ margin: 0, color: dark ? "#d3cae0" : "#6f657d", lineHeight: 1.8, fontSize: 14 }}><span className="lang-zh">{active.summary}</span><span className="lang-en">{active.summaryEN}</span></p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="chapter-dots" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {chapters.map((chapter, dotIndex) => <button key={chapter.id} type="button" onClick={() => setIndex(dotIndex)} aria-label={`Go to chapter ${dotIndex + 1}`} style={{ width: dotIndex === index ? 26 : 10, height: 10, borderRadius: 999, border: 0, background: dotIndex === index ? PURPLE : (dark ? "rgba(255,255,255,0.18)" : "rgba(137,83,209,0.2)"), cursor: "pointer", transition: "all 180ms ease" }} />)}
            </div>
            <button type="button" onClick={() => setExpanded(v => !v)} style={{ borderRadius: 999, border: "1px solid rgba(137,83,209,0.18)", background: expanded ? PURPLE : "transparent", color: expanded ? "#fff" : PURPLE, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>{expanded ? (<><span className="lang-zh">收起详情</span><span className="lang-en">Collapse</span></>) : (<><span className="lang-zh">展开详情</span><span className="lang-en">Details</span></>)}</button>
          </div>
          <div className="chapter-detail-grid" style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: reduced ? undefined : "grid-template-rows 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ paddingTop: 14, display: "grid", gap: 12, borderTop: "1px solid rgba(137,83,209,0.1)" }}>
                {active.boss && <div style={{ borderRadius: 16, padding: 14, border: "1px solid rgba(137,83,209,0.14)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", position: "relative" }}><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>Boss</div><div style={{ marginTop: 6, color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{active.boss.defeated ? <span className={expanded ? "boss-defeated-name" : ""}><span className="lang-zh">{active.boss.name}</span><span className="lang-en">{active.boss.nameEN}</span></span> : <><span className="lang-zh">{active.boss.name}</span><span className="lang-en">{active.boss.nameEN}</span></>}</div><div style={{ marginTop: 6, color: dark ? "#d3cae0" : "#6f657d", fontSize: 13 }}><span className="lang-zh">{active.boss.description || active.boss.reward}</span><span className="lang-en">{active.boss.descriptionEN || active.boss.rewardEN}</span></div>{active.boss.defeated && expanded && <div className="boss-stamp" style={{ position: "absolute", top: 8, right: 8, transform: "rotate(-12deg)", border: "2px solid #c94040", borderRadius: 6, padding: "2px 8px", color: "#c94040", fontFamily: "monospace", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", animation: reduced ? undefined : "stampReveal 300ms ease-out 500ms forwards", opacity: reduced ? 1 : 0 }}>DEFEATED</div>}</div>}
                {!!active.rewards.length && <div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>Rewards</div><div className="lang-zh" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{active.rewards.map(reward => <span key={reward} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.16)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", color: PURPLE, fontSize: 12 }}>{reward}</span>)}</div><div className="lang-en" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{active.rewardsEN.map(reward => <span key={reward} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.16)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", color: PURPLE, fontSize: 12 }}>{reward}</span>)}</div></div>}
                {!!active.articles.length && <div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>Articles</div><div style={{ display: "grid", gap: 8 }}>{active.articles.map(article => {
                  const meta = articleMeta[article];
                  const label = meta?.titleZh || meta?.title || article;
                  return <a key={article} href={`/posts/${article}/`} style={{ textDecoration: "none", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(137,83,209,0.12)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.74)", color: dark ? "#ece3ff" : "#4b2d78", fontSize: 13, lineHeight: 1.5 }}><span style={{ color: PURPLE, marginRight: 8, fontFamily: "monospace", fontSize: 11 }}>↗</span>{label}</a>;
                })}</div></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
});

const StatRadar = memo(function StatRadar({ stats, statFormulas, dark }: { stats: PlayerStatsProps["stats"]; statFormulas: Record<string, StatFormulaData>; dark: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.24, false);
  const animatedValues = STAT_META.map(({ key }) => useCountUp(stats[key], 900, inView));
  const size = 396;
  const center = size / 2;
  const radius = 128;
  const rings = [20, 40, 60, 80];
  const points = STAT_META.map((meta, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / STAT_META.length;
    const value = animatedValues[index] ?? 0;
    const x = center + Math.cos(angle) * radius * (value / 100);
    const y = center + Math.sin(angle) * radius * (value / 100);
    const labelRadius = radius + 72;
    const lx = center + Math.cos(angle) * labelRadius;
    const ly = center + Math.sin(angle) * labelRadius;
    const labelAlign = Math.abs(Math.cos(angle)) < 0.24 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    const labelTranslateX = labelAlign === "center" ? "-50%" : labelAlign === "left" ? "0" : "-100%";
    const labelTranslateY = Math.abs(Math.sin(angle)) > 0.9 ? (Math.sin(angle) > 0 ? "-10%" : "-92%") : "-50%";
    return { ...meta, angle, value, x, y, lx, ly, labelAlign, labelTranslateX, labelTranslateY, formula: statFormulas[meta.key] };
  });
  const polygon = points.map(point => `${point.x},${point.y}`).join(" ");

  const ringPolygon = (ratio: number) => STAT_META.map((_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / STAT_META.length;
    const x = center + Math.cos(angle) * radius * ratio;
    const y = center + Math.sin(angle) * radius * ratio;
    return `${x},${y}`;
  }).join(" ");

  return <div ref={ref} className={`radar-wrap ${inView ? "is-active" : ""}`} style={{ display: "grid", placeItems: "center" }}>
    <div style={{ position: "relative", width: "100%", maxWidth: 396, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: "100%", maxWidth: 396, height: "auto", display: "block", margin: "0 auto", overflow: "visible" }}>
        {rings.map(ring => <polygon key={ring} points={ringPolygon(ring / 100)} fill="none" stroke={dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.16)"} strokeWidth={1} />)}
        {STAT_META.map((_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / STAT_META.length;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          return <line key={index} x1={center} y1={center} x2={x} y2={y} stroke={dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"} strokeWidth={1} />;
        })}
        <polygon points={polygon} fill="rgba(137,83,209,0.3)" stroke={PURPLE} strokeWidth={2.2} />
        {points.map(point => <TooltipWrap key={point.key} content={<><div className="lang-zh">{point.formula?.formulaZh ?? `${point.zh} 公式暂缺`}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{point.formula?.formulaEn ?? `${point.en} formula pending`}</div><div style={{ marginTop: 6, color: "#fff" }}><span className="lang-zh">数据源：Player Stats / 实时聚合</span><span className="lang-en">Source: Player Stats / live aggregate</span></div></>} align="center"><g><circle cx={point.x} cy={point.y} r={6} fill={PURPLE} stroke={dark ? "#110d1b" : "#fff"} strokeWidth={2} /></g></TooltipWrap>)}
        <circle cx={center} cy={center} r={4} fill={PURPLE} />
      </svg>
      {points.map(point => <div key={`${point.key}-label`} style={{ position: "absolute", left: point.lx, top: point.ly, transform: `translate(${point.labelTranslateX}, ${point.labelTranslateY})`, textAlign: point.labelAlign === "center" ? "center" : point.labelAlign === "left" ? "left" : "right", minWidth: 110, pointerEvents: "none" }}>
        <div className="lang-zh" style={{ color: dark ? "#f3ebff" : "#261a33", fontSize: 14, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }}>{point.zh} <span style={{ color: PURPLE, fontFamily: "monospace" }}>{Math.round(point.value)}</span></div>
        <div className="lang-en" style={{ color: dark ? "#c9bddc" : "#7a6d89", fontSize: 12, lineHeight: 1.2, whiteSpace: "nowrap" }}>{point.en} <span style={{ color: PURPLE, fontFamily: "monospace" }}>{Math.round(point.value)}</span></div>
      </div>)}
    </div>
  </div>;
});

const StatLegend = memo(function StatLegend({ dark }: { dark: boolean }) {
  const items = [
    { zh: "体力", en: "HP", descZh: "看移动与旅居密度，越能扛长线生活，数值越高。", descEn: "Mobility and travel endurance." },
    { zh: "灵力", en: "Spirit", descZh: "看写作与输入强度，文章与阅读越多，灵力越高。", descEn: "Writing output plus sustained input." },
    { zh: "武术", en: "Martial", descZh: "看造物能力，产品、系统、代码做得越多，武术越高。", descEn: "Build power across product and code." },
    { zh: "身法", en: "Agility", descZh: "看知识调度与吸收速度，读得越广，转身越快。", descEn: "Knowledge range and adaptive speed." },
    { zh: "声望", en: "Renown", descZh: "看影响力积累，不是吵闹，是长期被看见。", descEn: "Reputation accumulated over time." },
    { zh: "统御", en: "Command", descZh: "看系统与 Agent 协同能力，盘子越大，统御越高。", descEn: "Systems orchestration and agent command." },
  ];

  return <div className="stat-legend-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 18 }}>
    {items.map(item => <div key={item.zh} style={{ borderRadius: 16, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{item.zh}</div>
        <div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{item.en}</div>
      </div>
      <div className="lang-zh" style={{ marginTop: 8, color: dark ? "#cfc4df" : "#6f657d", fontSize: 12, lineHeight: 1.65 }}>{item.descZh}</div>
      <div className="lang-en" style={{ marginTop: 8, color: dark ? "#cfc4df" : "#6f657d", fontSize: 12, lineHeight: 1.65 }}>{item.descEn}</div>
    </div>)}
  </div>;
});

const EquipmentRing = memo(function EquipmentRing({ equipment, dark }: { equipment: EquipmentData[]; dark: boolean }) {
  const positions = [
    { top: 18, left: "50%", transform: "translate(-50%, 0)" },
    { top: "26%", right: 24 },
    { bottom: "26%", right: 24 },
    { bottom: 18, left: "50%", transform: "translate(-50%, 0)" },
    { bottom: "26%", left: 24 },
    { top: "26%", left: 24 },
  ] as CSSProperties[];

  return <>
    <div className="equipment-ring" style={{ position: "relative", minHeight: 560 }}>
      <div className="equipment-ring-core" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(137,83,209,0.22)", background: dark ? "radial-gradient(circle at 50% 45%, rgba(137,83,209,0.1), rgba(21,21,21,0.98) 68%)" : "radial-gradient(circle at 50% 45%, rgba(137,83,209,0.12), rgba(250,246,255,0.98) 72%)", boxShadow: "0 0 0 1px rgba(137,83,209,0.06), 0 0 18px rgba(137,83,209,0.1)", display: "grid", placeItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: "1px dashed rgba(137,83,209,0.16)" }} />
        <div style={{ position: "absolute", width: 176, height: 176, borderRadius: "50%", border: "1px solid rgba(137,83,209,0.16)" }} />
        <div style={{ textAlign: "center", display: "grid", gap: 10, placeItems: "center" }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid rgba(137,83,209,0.2)", background: dark ? "rgba(137,83,209,0.06)" : "rgba(137,83,209,0.04)", color: PURPLE, fontSize: 30 }}>令</div>
          <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontFamily: "Georgia, Cambria, serif" }}><span className="lang-zh">江湖装备核心</span><span className="lang-en">Equipment Core</span></div>
          <div style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 11 }}>6 SLOTS ORBITING</div>
        </div>
      </div>
      <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }} viewBox="0 0 1000 560" preserveAspectRatio="none">
        {[
          [500, 280, 500, 92],
          [500, 280, 820, 152],
          [500, 280, 820, 408],
          [500, 280, 500, 468],
          [500, 280, 180, 408],
          [500, 280, 180, 152],
        ].map(([x1, y1, x2, y2], index) => (
          <line
            key={`line-${index}`}
            className="equipment-line"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(137,83,209,0.22)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        ))}
      </svg>
      {equipment.slice(0, 6).map((item, i) => {
        const card = <div className="equipment-floating" style={{ width: 196, borderRadius: 20, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(23,23,23,0.98)" : "rgba(255,255,255,0.94)", boxShadow: "0 8px 18px rgba(137,83,209,0.08)", position: "relative", zIndex: 2, willChange: "transform", "--float-delay": `${i * 0.6}s` } as CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ color: PURPLE, fontSize: 11, fontFamily: "monospace", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.18)" }}><span className="lang-zh">{item.slotCN}</span><span className="lang-en">{item.slotEN}</span></span><span style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 10 }}>{item.acquired}</span></div>
          <div style={{ marginTop: 10, color: dark ? "#fff" : "#261a33", fontWeight: 700, fontFamily: "Georgia, Cambria, serif" }}><span className="lang-zh">{item.nameCN}</span><span className="lang-en">{item.nameEN}</span></div>
          <TooltipWrap content={<><div className="lang-zh">{item.effectCN}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{item.effectEN}</div></>}><div style={{ marginTop: 8, color: dark ? "#d6cdf0" : "#6f46a3", fontSize: 12 }}><span className="lang-zh">{item.effectCN}</span><span className="lang-en">{item.effectEN}</span></div></TooltipWrap>
        </div>;
        const wrapped = item.article ? <a href={`/posts/${item.article}/`} style={{ textDecoration: "none" }}>{card}</a> : card;
        return <div key={item.id} style={{ position: "absolute", ...positions[i] }}>{wrapped}</div>;
      })}
    </div>
    <div className="equipment-mobile-grid" style={{ display: "none", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
      {equipment.map(item => <TooltipWrap key={item.id} content={<><div className="lang-zh">{item.effectCN}</div><div className="lang-en" style={{ color: "#ccb7f7" }}>{item.effectEN}</div></>}><a href={item.article ? `/posts/${item.article}/` : undefined} style={{ textDecoration: "none" }}><div style={{ borderRadius: 16, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(23,23,23,0.98)" : "rgba(255,255,255,0.94)" }}><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}><span className="lang-zh">{item.slotCN}</span><span className="lang-en">{item.slotEN}</span></div><div style={{ marginTop: 8, color: dark ? "#fff" : "#261a33", fontWeight: 700 }}><span className="lang-zh">{item.nameCN}</span><span className="lang-en">{item.nameEN}</span></div><div style={{ marginTop: 8, color: dark ? "#d6cdf0" : "#6f46a3", fontSize: 12 }}><span className="lang-zh">{item.effectCN}</span><span className="lang-en">{item.effectEN}</span></div></div></a></TooltipWrap>)}
    </div>
  </>;
});

function QuestRing({ quest, dark, active }: { quest: QuestData; dark: boolean; active: boolean }) {
  const current = Number(quest.current ?? 0);
  const goal = Number(quest.goal ?? 0);
  const ratio = quest.status === "completed" ? 100 : Math.max(0, Math.min(100, goal > 0 ? current / goal * 100 : 0));
  const progress = Math.round(useCountUp(ratio, 850, active));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference - (progress / 100) * circumference;
  const stroke = quest.status === "completed" ? SUCCESS : PURPLE;
  return <TooltipWrap content={<div>{current} / {goal}{quest.unit ? ` ${quest.unit}` : ""}</div>} align="center"><div style={{ borderRadius: 20, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", display: "grid", gap: 12, justifyItems: "center" }}>
    <div style={{ width: 92, height: 92, position: "relative" }}>
      <svg viewBox="0 0 92 92" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
        <circle cx="46" cy="46" r={radius} fill="none" stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(60,20,90,0.1)"} strokeWidth="8" />
        <circle cx="46" cy="46" r={radius} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashoffset} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "monospace", fontWeight: 700, color: quest.status === "completed" ? SUCCESS : PURPLE }}>
        <div style={{ textAlign: "center" }}>{quest.status === "completed" ? <><div style={{ fontSize: 18 }}>✅</div><div style={{ fontSize: 12 }}>100%</div></> : `${progress}%`}</div>
      </div>
    </div>
    <div style={{ textAlign: "center" }}>
      <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}><span className="lang-zh">{quest.titleCN}</span><span className="lang-en">{quest.titleEN}</span></div>
      {quest.target && <div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>{quest.target}</div>}
      <div style={{ marginTop: 8, color: dark ? "#c8bed8" : "#78688a", fontFamily: "monospace", fontSize: 11 }}>{current}{quest.unit ? ` ${quest.unit}` : ""} / {goal}{quest.unit ? ` ${quest.unit}` : ""}</div>
    </div>
  </div></TooltipWrap>;
}

const QuestPanel = memo(function QuestPanel({ quests, dark }: { quests: PlayerStatsProps["quests"]; dark: boolean }) {
  const [tab, setTab] = useState<"main" | "side">("main");
  const { ref, inView } = useInView<HTMLDivElement>(0.22, false);
  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, border: `1px solid ${dark ? "rgba(137,83,209,0.2)" : "rgba(137,83,209,0.16)"}` }}>
      {(["main", "side"] as const).map(key => <button key={key} type="button" onClick={() => setTab(key)} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "8px 14px", background: tab === key ? PURPLE : "transparent", color: tab === key ? "#fff" : (dark ? "#d6cdf0" : "#6f657d") }}>{key === "main" ? `主线 / Main (${quests.main.length})` : `支线 / Side (${quests.side.length})`}</button>)}
    </div>
    <div ref={ref} style={{ display: "grid", gap: 12, maxHeight: tab === "side" ? 720 : undefined, overflowY: tab === "side" ? "auto" : undefined, paddingRight: tab === "side" ? 4 : 0 }}>
      {tab === "main" ? <div className="quest-main-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>{quests.main.map(quest => <QuestRing key={quest.id} quest={quest} dark={dark} active={inView} />)}</div> : quests.side.map(quest => <div key={quest.id} style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}><div style={{ minWidth: 0, flex: 1 }}><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}><span className="lang-zh">{quest.titleCN}</span><span className="lang-en">{quest.titleEN}</span></div><div style={{ marginTop: 6, color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11, lineHeight: 1.6, wordBreak: "break-word" }}>{quest.progress}</div></div><div style={{ color: quest.status === "completed" ? PURPLE : (dark ? "#d6cdf0" : "#6f657d"), fontFamily: "monospace", fontSize: 11, whiteSpace: "nowrap", paddingTop: 2 }}>{quest.status === "completed" ? "COMPLETED" : "ACTIVE"}</div></div>)}
    </div>
  </div>;
});



type SkillNode = { label: string; desc: string; count: number; url?: string };
type SkillGroup = { label: string; nodes: SkillNode[] };

type SkillTreeNode = SkillNode & {
  id: string;
  depth: 0 | 1 | 2;
  x: number;
  y: number;
  width: number;
  height: number;
};

type SkillTreeEdge = {
  id: string;
  from: SkillTreeNode;
  to: SkillTreeNode;
  path: string;
  active: boolean;
};

function buildSkillTreeLayout(rootLabel: string, groups: SkillGroup[]) {
  const rootWidth = 152;
  const branchWidth = 152;
  const leafWidth = 176;
  const nodeHeight = 68;
  const rootX = 20;
  const branchX = 270;
  const leafX = 520;
  const sectionGap = 44;
  const leafGap = 68;

  let cursorY = 26;
  const branchCenters: number[] = [];
  const nodes: SkillTreeNode[] = [];
  const edges: SkillTreeEdge[] = [];

  const branchNodes = groups.map((group, groupIndex) => {
    const leafNodes = group.nodes.map((node, leafIndex) => {
      const leafNode: SkillTreeNode = {
        ...node,
        id: `leaf-${groupIndex}-${leafIndex}`,
        depth: 2,
        x: leafX,
        y: cursorY,
        width: leafWidth,
        height: nodeHeight,
      };
      cursorY += nodeHeight + leafGap;
      nodes.push(leafNode);
      return leafNode;
    });

    const firstLeaf = leafNodes[0]!;
    const lastLeaf = leafNodes[leafNodes.length - 1]!;
    const centerY = (firstLeaf.y + lastLeaf.y) / 2 + nodeHeight / 2;
    branchCenters.push(centerY);

    const branchNode: SkillTreeNode = {
      label: group.label,
      desc: `${group.nodes.length} 项分支`,
      count: group.nodes.reduce((sum, item) => sum + item.count, 0),
      id: `branch-${groupIndex}`,
      depth: 1,
      x: branchX,
      y: centerY - nodeHeight / 2,
      width: branchWidth,
      height: nodeHeight,
    };
    nodes.push(branchNode);

    leafNodes.forEach((leafNode, leafIndex) => {
      const startX = branchNode.x + branchNode.width;
      const startY = branchNode.y + branchNode.height / 2;
      const endX = leafNode.x;
      const endY = leafNode.y + leafNode.height / 2;
      const midX = startX + (endX - startX) * 0.45;
      edges.push({
        id: `edge-branch-${groupIndex}-${leafIndex}`,
        from: branchNode,
        to: leafNode,
        active: leafNode.count > 0,
        path: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`,
      });
    });

    cursorY += sectionGap;
    return branchNode;
  });

  const rootCenterY = (branchCenters[0]! + branchCenters[branchCenters.length - 1]!) / 2;
  const rootNode: SkillTreeNode = {
    label: rootLabel,
    desc: "武学总纲",
    count: branchNodes.reduce((sum, item) => sum + item.count, 0),
    id: "root",
    depth: 0,
    x: rootX,
    y: rootCenterY - nodeHeight / 2,
    width: rootWidth,
    height: nodeHeight,
  };
  nodes.push(rootNode);

  branchNodes.forEach((branchNode, index) => {
    const startX = rootNode.x + rootNode.width;
    const startY = rootNode.y + rootNode.height / 2;
    const endX = branchNode.x;
    const endY = branchNode.y + branchNode.height / 2;
    const midX = startX + (endX - startX) * 0.45;
    edges.push({
      id: `edge-root-${index}`,
      from: rootNode,
      to: branchNode,
      active: branchNode.count > 0,
      path: `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`,
    });
  });

  const width = leafX + leafWidth + 28;
  const height = Math.max(cursorY - sectionGap + 14, rootNode.y + rootNode.height + 28);
  return { nodes, edges, width, height };
}

const SkillTreePanel = memo(function SkillTreePanel({ title, subtitle, rootLabel, groups, dark }: { title: string; subtitle: string; rootLabel: string; groups: SkillGroup[]; dark: boolean }) {
  const layout = useMemo(() => buildSkillTreeLayout(rootLabel, groups), [rootLabel, groups]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { ref, inView } = useInView<HTMLDivElement>(0.18, false);

  // Compute highlighted edge IDs when a node is hovered
  const highlightedEdgeIds = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const ids = new Set<string>();
    for (const edge of layout.edges) {
      if (edge.from.id === hoveredId || edge.to.id === hoveredId) {
        ids.add(edge.id);
        // If hovering a leaf, also highlight root→branch edge
        if (edge.from.depth === 1) {
          for (const e2 of layout.edges) {
            if (e2.to.id === edge.from.id) ids.add(e2.id);
          }
        }
        // If hovering a branch, also highlight all branch→leaf edges
        if (edge.from.depth === 0) {
          for (const e2 of layout.edges) {
            if (e2.from.id === hoveredId) ids.add(e2.id);
          }
        }
      }
    }
    return ids;
  }, [hoveredId, layout.edges]);

  return <div ref={ref} style={{ borderRadius: 24, padding: 18, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(21,21,21,0.98)" : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,240,255,0.98))", boxShadow: dark ? "0 10px 22px rgba(0,0,0,0.16)" : "0 10px 18px rgba(137,83,209,0.07)" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 12 }}>{title}</div>
        <div style={{ marginTop: 6, color: dark ? "#bcb2cb" : "#6f657d", fontSize: 13 }}>{subtitle}</div>
      </div>
      <div style={{ color: dark ? "#9f93b1" : "#8a7b97", fontFamily: "monospace", fontSize: 11 }}>ROOT → BRANCH → LEAF</div>
    </div>
    <div style={{ overflowX: "auto", overflowY: "hidden", borderRadius: 18 }}>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}>
        {layout.edges.map(edge => {
          const isHighlighted = highlightedEdgeIds.has(edge.id);
          const stroke = isHighlighted ? PURPLE : (edge.active ? "rgba(137,83,209,0.58)" : (dark ? "rgba(110,102,124,0.46)" : "rgba(160,150,174,0.4)"));
          const strokeW = isHighlighted ? 3.2 : 2;
          return <g key={edge.id}>
            <path d={edge.path} fill="none" stroke={stroke} strokeWidth={strokeW} strokeLinecap="round" style={{ transition: "stroke 200ms ease, stroke-width 200ms ease" }} />
            {edge.active && inView && <path d={edge.path} fill="none" stroke={isHighlighted ? "#b88aef" : PURPLE} strokeWidth={isHighlighted ? 3 : 2.2} strokeLinecap="round" className={`skill-tree-flow${isHighlighted ? " is-highlight-flow" : ""}`} />}
          </g>;
        })}
        {layout.nodes.map(node => {
          const active = node.count > 0 || node.depth === 0;
          const isHovered = hoveredId === node.id;
          const cardFill = active ? (dark ? "rgba(30,22,46,0.98)" : "rgba(255,255,255,0.98)") : (dark ? "rgba(35,33,42,0.98)" : "rgba(239,237,244,0.98)");
          const border = active ? PURPLE : (dark ? "rgba(97,91,108,0.7)" : "rgba(160,154,170,0.8)");
          const labelColor = active ? (dark ? "#f7f1ff" : "#261a33") : (dark ? "#9f93b1" : "#7f748d");
          const countColor = active ? PURPLE : (dark ? "#7e758d" : "#93889f");
          const body = <g className={`skill-tree-node ${active ? "is-active" : "is-dim"} ${node.url ? "is-link" : ""}`} onMouseEnter={() => setHoveredId(node.id)} onMouseLeave={() => setHoveredId(current => current === node.id ? null : current)}>
            <rect x={node.x} y={node.y} rx={16} ry={16} width={node.width} height={node.height} fill={cardFill} stroke={border} strokeWidth={active ? 1.3 : 1.1} />
            <text x={node.x + 14} y={node.y + 18} fill={labelColor} style={{ fontSize: node.depth === 0 ? 14 : 13, fontWeight: 700, fontFamily: 'Georgia, Cambria, serif', pointerEvents: 'none' }}>
              <tspan x={node.x + 14} dy="0.95em">{node.label}</tspan>
              <tspan x={node.x + 14} dy="1.38em" fill={dark ? "#a895c4" : "#7a6d89"} style={{ fontSize: 10.5, fontFamily: 'system-ui, sans-serif', fontWeight: 500 }}>{node.desc}</tspan>
            </text>
            <text x={node.x + 14} y={node.y + node.height - 12} fill={countColor} style={{ fontSize: 11, fontFamily: 'monospace', pointerEvents: 'none' }}>{node.depth === 0 ? `TOTAL ${node.count}` : `${node.count} 篇 · Lv.${node.count}`}</text>
            {isHovered && node.depth !== 0 && <g style={{ pointerEvents: 'none' }}>
              <rect x={Math.min(node.x + node.width + 12, layout.width - 248)} y={Math.max(node.y - 10, 10)} width={236} height={70} rx={14} ry={14} fill="rgba(21,21,21,0.98)" stroke="rgba(137,83,209,0.34)" strokeWidth={1.1} />
              <text x={Math.min(node.x + node.width + 26, layout.width - 234)} y={Math.max(node.y + 12, 24)} fill="#f5efff" style={{ fontSize: 12, fontFamily: 'Georgia, Cambria, serif' }}>{node.desc}</text>
              <text x={Math.min(node.x + node.width + 26, layout.width - 234)} y={Math.max(node.y + 38, 50)} fill="#ccb7f7" style={{ fontSize: 11, fontFamily: 'monospace' }}>{`${node.count} 篇相关文章 · Lv.${node.count}`}</text>
            </g>}
          </g>;

          if (node.url) {
            return <a key={node.id} href={node.url}>{body}</a>;
          }
          return <g key={node.id}>{body}</g>;
        })}
      </svg>
    </div>
  </div>;
});

const SkillTree = memo(function SkillTree({ tagCounts, postCount, builderLogCount, dark }: { tagCounts: Record<string, number>; postCount: number; builderLogCount: number; dark: boolean }) {
  const inner = [
    { label: "天罡战气", desc: "周期判断 · 顺势而为", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
    { label: "金蝉脱壳", desc: "盈亏同源 · 全身而退", count: tagCounts.trading || 0 },
    { label: "飞龙探云手", desc: "买预期卖事实 · 先人一步", count: tagCounts.alpha || 0 },
    { label: "真元护体", desc: "价值投资 · 守护本金", count: tagCounts.investment || 0, url: "/tags/investment/" },
    { label: "五气朝元", desc: "复利之道 · 累积回报", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { label: "醉仙望月步", desc: "长期主义 · 耐心换双倍", count: (tagCounts.investment || 0) + (tagCounts.wealth || 0) },
    { label: "金刚咒", desc: "风控心法 · 铜墙铁壁", count: tagCounts.wealth || 0, url: "/tags/wealth/" },
    { label: "观音咒", desc: "洞察对手 · 研究对手盘", count: tagCounts.macro || 0 },
    { label: "仙风云体术", desc: "逍遥心法 · 去中心化信仰", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
  ];
  const outer = [
    { label: "御剑术", desc: "写作 · 第一把剑", count: postCount, url: "/posts/" },
    { label: "尘世篇", desc: "生活随笔 · 人间烟火", count: tagCounts.life || 0, url: "/tags/life/" },
    { label: "人物志", desc: "人物列传 · 记录启发者", count: tagCounts.people || 0, url: "/tags/people/" },
    { label: "万剑诀", desc: "常青内容 · 经久不衰", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { label: "天剑", desc: "编程 · 最强武器", count: tagCounts.ai || 0, url: "/tags/ai/" },
    { label: "剑神", desc: "AI 编程 · 终极技能", count: tagCounts["vibe coding"] || tagCounts.ai || 0, url: "/tags/ai/" },
    { label: "灵葫咒", desc: "御灵术 · 驾驭 Agent", count: builderLogCount, url: "/builder-log/" },
    { label: "凝神归元", desc: "旅行 · 修复与充电", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { label: "游方篇", desc: "旅居记录 · 行走江湖", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { label: "仙风云体术", desc: "数字游牧 · 身法如风", count: tagCounts.travel || 0 },
  ];

  const innerGroups: SkillGroup[] = [
    { label: "势", nodes: inner.slice(0, 3) },
    { label: "守", nodes: inner.slice(3, 6) },
    { label: "观", nodes: inner.slice(6, 9) },
  ];
  const outerGroups: SkillGroup[] = [
    { label: "文", nodes: outer.slice(0, 3) },
    { label: "技", nodes: outer.slice(3, 7) },
    { label: "行", nodes: outer.slice(7, 10) },
  ];

  return <div style={{ display: "grid", gap: 16 }}>
    <SkillTreePanel title="内功心法 / Inner Arts" subtitle="根基先立，再向右生长出分支与叶脉。" rootLabel="内功心法" groups={innerGroups} dark={dark} />
    <SkillTreePanel title="外功仙术 / Outer Arts" subtitle="兵器、写作与游历并行，整棵树上下展开显示。" rootLabel="外功仙术" groups={outerGroups} dark={dark} />
  </div>;
});

const RelationshipPanel = memo(function RelationshipPanel({ relationships, dark, articleMeta }: { relationships: RelationshipData[]; dark: boolean; articleMeta: Record<string, { title: string; titleZh?: string | null }> }) {
  return <div className="relationship-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{relationships.map(item => {
    const hasExternal = Boolean(item.link);
    const card = <div
      className={`relationship-card ${hasExternal ? "is-clickable" : ""}`}
      role={hasExternal ? "link" : undefined}
      tabIndex={hasExternal ? 0 : undefined}
      onClick={hasExternal ? () => window.open(item.link!, "_blank", "noopener,noreferrer") : undefined}
      onKeyDown={hasExternal ? event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.open(item.link!, "_blank", "noopener,noreferrer");
        }
      } : undefined}
      style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)", transition: "transform 180ms ease, box-shadow 180ms ease", willChange: "transform", display: "grid", gap: 12 }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "48px 1fr", gap: 12, alignItems: "center" }}>
        <img src={item.avatar || "/images/rex-avatar.png"} alt={item.nameEN || item.nameCN} width={48} height={48} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `2px solid ${PURPLE}`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }} />
        <div style={{ minWidth: 0 }}>
          <div className="lang-zh" style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, lineHeight: 1.2 }}>{item.nameCN}</div>
          <div className="lang-en" style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, lineHeight: 1.2 }}>{item.nameEN}</div>
          <div className="lang-zh" style={{ marginTop: 4, color: dark ? "#c9bddc" : "#7a6d89", fontSize: 12 }}>{item.roleCN}</div>
          <div className="lang-en" style={{ marginTop: 4, color: dark ? "#c9bddc" : "#7a6d89", fontSize: 12 }}>{item.roleEN}</div>
          {!!item.platformCN && <div className="lang-zh" style={{ marginTop: 4, color: PURPLE, fontSize: 11, fontFamily: "monospace" }}>{item.platformCN}</div>}
          {!!item.platformEN && <div className="lang-en" style={{ marginTop: 4, color: PURPLE, fontSize: 11, fontFamily: "monospace" }}>{item.platformEN}</div>}
        </div>
      </div>
      <div>
        <div className="lang-zh" style={{ color: dark ? "#d3cae0" : "#6f657d", fontSize: 13, lineHeight: 1.65 }}>{item.impactCN}</div>
        <div className="lang-en" style={{ color: dark ? "#d3cae0" : "#6f657d", fontSize: 13, lineHeight: 1.65 }}>{item.impactEN}</div>
      </div>
      {item.article && <div style={{ paddingTop: 8, borderTop: `1px solid ${dark ? "rgba(137,83,209,0.12)" : "rgba(137,83,209,0.08)"}` }}>
        <a href={`/posts/${item.article}/`} onClick={event => event.stopPropagation()} style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, textDecoration: "none" }}>↗ {(() => { const m = articleMeta[item.article!]; return m?.titleZh || m?.title || item.article; })()}</a>
      </div>}
    </div>;
    return <div key={item.id}>{card}</div>;
  })}</div>;
});

const CATEGORY_META: Record<string, { icon: string; zh: string }> = { cultivation: { icon: "🗡️", zh: "修行" }, jianghu: { icon: "🌍", zh: "江湖" }, command: { icon: "🤖", zh: "统御" }, knowledge: { icon: "📚", zh: "身法" }, health: { icon: "💪", zh: "体力" }, investment: { icon: "💰", zh: "财修" }, hidden: { icon: "🔮", zh: "奇遇" } };

const AchievementBadges = memo(function AchievementBadges({ achievements, dark }: { achievements: AchievementData[]; dark: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.22, true);
  const groups = achievements.reduce<Record<string, AchievementData[]>>((acc, item) => {
    if (item.hidden && !item.unlocked) return acc;
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  let unlockedIndex = 0;

  return (
    <div ref={ref}>
      {Object.entries(groups).map(([key, items]) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ color: PURPLE, fontWeight: 700, marginBottom: 10 }}>
            {CATEGORY_META[key]?.icon} {CATEGORY_META[key]?.zh}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {items.map(item => {
              const delay = item.unlocked ? unlockedIndex++ * 80 : 0;
              return (
                <div
                  key={item.id}
                  className={item.unlocked && inView ? "achievement-badge is-revealed" : "achievement-badge"}
                  style={{
                    borderRadius: 16,
                    padding: 14,
                    border: `1px solid ${item.unlocked ? "rgba(137,83,209,0.22)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(90,45,140,0.08)")}`,
                    background: item.unlocked ? (dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)"),
                    opacity: item.unlocked ? (inView ? 1 : 0) : 0.5,
                    transform: item.unlocked ? (inView ? "scale(1)" : "scale(0.85)") : "scale(1)",
                    transition: item.unlocked ? `opacity 260ms ease ${delay}ms, transform 260ms ease ${delay}ms, box-shadow 260ms ease ${delay}ms` : undefined,
                    boxShadow: item.unlocked && inView ? "0 0 18px rgba(137,83,209,0.18)" : "none"
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 22 }}>{item.icon}</span>
                    <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 13 }}><span className="lang-zh">{item.nameZh}</span><span className="lang-en">{item.nameEn}</span></div>
                  </div>
                  <p style={{ margin: "8px 0 0", color: dark ? "#c8bed8" : "#78688a", fontSize: 12, lineHeight: 1.6 }}><span className="lang-zh">{item.descZh}</span><span className="lang-en">{item.descEn}</span></p>
                  {item.unlocked && item.unlockedDate && (
                    <div style={{ marginTop: 8, color: PURPLE, fontFamily: "monospace", fontSize: 10 }}>✓ {item.unlockedDate}</div>
                  )}
                  {!item.unlocked && item.progress !== undefined && item.max !== undefined && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ color: dark ? "#c8bed8" : "#78688a", fontFamily: "monospace", fontSize: 10 }}>
                        {item.progress}/{item.max}
                      </div>
                      <AchievementRing progress={item.progress} max={item.max} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
});

const CultivationLog = memo(function CultivationLog({ activityLog, dark }: { activityLog: PlayerStatsProps["activityLog"]; dark: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activityLog : activityLog.slice(0, 20);
  const hasMore = activityLog.length > 20;
  return (
    <div style={{ position: "relative", paddingLeft: 22 }}>
      <div style={{ position: "absolute", left: 7, top: 6, bottom: 6, width: 2, background: PURPLE, opacity: 0.45 }} />
      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((item, i) => {
          const cardContent = (
            <div style={{ borderRadius: 16, padding: "12px 14px", border: `1px solid ${dark ? "rgba(137,83,209,0.14)" : "rgba(137,83,209,0.1)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)", transition: "box-shadow 150ms ease, border-color 150ms ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11 }}>
                  <span className="lang-zh">{item.dateZh}</span>
                  <span className="lang-en">{item.dateEn}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {item.link && <span style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, opacity: 0.6 }}>↗</span>}
                  <div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>+{item.exp} EXP</div>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "26px 1fr", gap: 10, alignItems: "start" }}>
                <div>{item.icon}</div>
                <div style={{ color: dark ? "#fff" : "#261a33", fontSize: 12, lineHeight: 1.7 }}>
                  <span className="lang-zh">{item.descZh}</span>
                  <span className="lang-en">{item.descEn}</span>
                </div>
              </div>
            </div>
          );
          return (
            <div key={`${item.dateEn}-${i}`} style={{ position: "relative", paddingLeft: 18 }}>
              <span style={{ position: "absolute", left: -1, top: 10, width: 8, height: 8, borderRadius: "50%", background: PURPLE }} />
              {item.link
                ? <a href={item.link} style={{ textDecoration: "none", display: "block" }}>{cardContent}</a>
                : cardContent}
            </div>
          );
        })}
        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
            <button type="button" onClick={() => setShowAll(v => !v)} style={{ borderRadius: 999, border: `1px solid rgba(137,83,209,0.2)`, background: showAll ? PURPLE : "transparent", color: showAll ? "#fff" : PURPLE, padding: "10px 20px", cursor: "pointer", fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>
              {showAll ? (<><span className="lang-zh">收起</span><span className="lang-en">Show less</span></>) : (<><span className="lang-zh">查看全部 ({activityLog.length})</span><span className="lang-en">View all ({activityLog.length})</span></>)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const SaveFooter = memo(function SaveFooter({ dark, travelDays, mediaCount, bookCount, postCount, cityCount, level }: {
  dark: boolean; travelDays: number; mediaCount: number; bookCount: number; postCount: number; cityCount: number; level: number;
}) {
  const buildDate = new Date().toISOString().slice(0, 10);
  const stats = [
    { label: "POSTS", value: postCount, icon: "✍️" },
    { label: "MEDIA", value: mediaCount, icon: "🎬" },
    { label: "BOOKS", value: bookCount, icon: "📚" },
    { label: "CITIES", value: cityCount, icon: "📍" },
    { label: "DAYS", value: travelDays, icon: "🗓️" },
    { label: "LEVEL", value: level, icon: "⚔️" },
  ];
  return (
    <div style={{ textAlign: "center", display: "grid", gap: 16 }}>
      <div className="save-footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 10 }}>
        {stats.map(s => (
          <div key={s.label} style={{ borderRadius: 16, padding: "14px 8px", border: `1px solid ${dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 18 }}>{s.value.toLocaleString()}</div>
            <div style={{ color: dark ? "#9f93b1" : "#8b7a98", fontFamily: "monospace", fontSize: 10, marginTop: 4, letterSpacing: "0.06em" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#7a6d89" : "#8b7a98", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
        <span><span className="lang-en">All stats auto-calculated</span><span className="lang-zh">所有属性自动计算</span></span>
        <span>·</span>
        <span>Last build: {buildDate}</span>
      </div>
    </div>
  );
});

export default function PlayerStats(props: PlayerStatsProps) {
  const { dark, rainy, sunny } = useTheme();
  const { stats, level, totalExp, expInLevel, expNeeded, expProgress, rank, avgStat, currentCity, travelDays, tagCounts, postCount, builderLogCount, cities, achievements, quests, equipment, activityLog, chapters, relationships, articleMeta, statFormulas, expFormula, levelFormula, mediaCount, bookCount } = props;
  return <div style={{ width: "100%", maxWidth: 1200, margin: "0 auto", fontFamily: "Georgia, Cambria, serif", paddingInline: 12 }}>
    <style>{`
      @keyframes chapterSlide { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes strikethrough { from { width: 0; } to { width: 100%; } }
      @keyframes stampReveal { from { opacity: 0; transform: rotate(-12deg) scale(1.4); } to { opacity: 1; transform: rotate(-12deg) scale(1); } }
      .boss-defeated-name { position: relative; display: inline-block; }
      .boss-defeated-name::after { content: ""; position: absolute; left: 0; top: 50%; height: 2px; background: #c94040; animation: strikethrough 400ms ease-out 200ms forwards; width: 0; }
      @keyframes lineFlow { from { stroke-dashoffset: 180; } to { stroke-dashoffset: 0; } }
      @keyframes radarPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.01); } }
      @keyframes radarExpand { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .radar-wrap.is-active > :first-child { animation: radarExpand 700ms cubic-bezier(0.22,1,0.36,1) forwards, radarPulse 4s ease-in-out 700ms infinite; transform-origin: center; will-change: transform; }
      @keyframes equipFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      .equipment-floating { transition: box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms ease; animation: equipFloat 3.5s ease-in-out infinite; animation-delay: var(--float-delay, 0s); }
      .equipment-floating:hover { transform: translateY(-6px); box-shadow: 0 12px 22px rgba(137,83,209,0.16); border-color: rgba(137,83,209,0.28); animation-play-state: paused; }
      @keyframes coreOrbit { to { transform: rotate(360deg); } }
      .equipment-ring-core::after { content: ""; position: absolute; inset: 16px; border-radius: 50%; box-shadow: inset 0 0 12px rgba(137,83,209,0.08); }
      .equipment-ring-core::before { content: ""; position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed rgba(137,83,209,0.12); animation: coreOrbit 60s linear infinite; }
      .equipment-line { animation: lineFlow 3.4s linear infinite; stroke-dasharray: 120; }
      .skill-tree-node { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease; transform-origin: center; cursor: default; will-change: transform; }
      .skill-tree-node.is-link { cursor: pointer; }
      .skill-tree-node:hover { transform: translateY(-2px) scale(1.01); }
      .skill-tree-flow { stroke-dasharray: 16 164; animation: lineFlow 4.2s linear infinite; transition: stroke 200ms ease, stroke-width 200ms ease; }
      .skill-tree-flow.is-highlight-flow { stroke-dasharray: 24 96; animation-duration: 1.8s; }
      .relationship-card:hover { transform: translateY(-4px); box-shadow: 0 10px 18px rgba(137,83,209,0.1); }
      .relationship-card.is-clickable { cursor: pointer; }
      @media (max-width: 960px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .hero-side { min-width: 0 !important; }
        .stats-grid { grid-template-columns: 1fr !important; }
        .radar-wrap { grid-template-columns: 1fr !important; }
        .retainer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .stat-legend-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .save-footer-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 760px) {
        .equipment-ring { display: none !important; }
        .equipment-mobile-grid { display: grid !important; }
        .quest-main-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }
      @media (max-width: 640px) {
        .retainer-grid, .relationship-grid, .stat-legend-grid { grid-template-columns: 1fr !important; }
        .save-footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .ps-section { padding: 0.8rem !important; }
        .quest-main-grid { grid-template-columns: 1fr !important; }
        .chapter-nav-btn { width: 32px !important; height: 32px !important; min-width: 32px !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .chapter-slide-card, .equipment-floating, .equipment-line, .equipment-ring-core::before, .skill-tree-flow, .skill-tree-flow.is-highlight-flow, .radar-wrap.is-active > :first-child, .achievement-badge, .boss-defeated-name::after, .boss-stamp { animation: none !important; transition: none !important; opacity: 1 !important; }
      }
    `}</style>
    <div style={{ display: "grid", gap: 18 }}>
      <Section dark={dark} rainy={rainy} sunny={sunny} hero><HeroCard dark={dark} rank={rank} level={level} totalExp={totalExp} expInLevel={expInLevel} expNeeded={expNeeded} expProgress={expProgress} avgStat={avgStat} currentCity={currentCity} travelDays={travelDays} expFormula={expFormula} levelFormula={levelFormula} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="🧭" zh="人生章节" en="Chapter Archive" dark={dark} /><ChapterCarousel chapters={chapters} articleMeta={articleMeta} dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><a href="/travel/" style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", textDecoration: "none" }}><span style={{ fontSize: 28 }}>🗺️</span><div><div style={{ color: PURPLE, fontWeight: 700, fontSize: 24 }}>{cities.length} <span style={{ color: dark ? "#c8bed8" : "#78688a", fontSize: 13, fontWeight: 400 }}><span className="lang-zh">座城市已游历</span><span className="lang-en">cities explored</span></span></div><div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontSize: 12 }}><span className="lang-zh">→ 查看完整旅居地图</span><span className="lang-en">→ View full travel map</span></div></div></a></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="📊" zh="六维属性" en="Six Attributes" dark={dark} /><StatRadar stats={stats} statFormulas={statFormulas} dark={dark} /><StatLegend dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="🧰" zh="装备栏" en="Equipment" dark={dark} /><EquipmentRing equipment={equipment} dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="📜" zh="任务面板" en="Quest Board" dark={dark} /><QuestPanel quests={quests} dark={dark} /></Section>

      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="🌳" zh="技能树" en="Skill Tree" dark={dark} /><SkillTree tagCounts={tagCounts} postCount={postCount} builderLogCount={builderLogCount} dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="🤝" zh="江湖关系" en="Relationships" dark={dark} /><RelationshipPanel relationships={relationships} dark={dark} articleMeta={articleMeta} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="🏆" zh="成就" en="Achievements" dark={dark} /><AchievementBadges achievements={achievements} dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SectionHeader icon="📜" zh="修行日志" en="Cultivation Log" dark={dark} /><CultivationLog activityLog={activityLog} dark={dark} /></Section>
      <Section dark={dark} rainy={rainy} sunny={sunny}><SaveFooter dark={dark} travelDays={travelDays} mediaCount={mediaCount} bookCount={bookCount} postCount={postCount} cityCount={cities.length} level={level} /></Section>
    </div>
  </div>;
}
