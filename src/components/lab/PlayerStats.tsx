import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

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
  }>;
  chapters: ChapterData[];
  relationships: RelationshipData[];
  statFormulas: Record<string, StatFormulaData>;
  expFormula: { zh: string; en: string };
  levelFormula: { zh: string; en: string; nextLevel: string };
}

const PURPLE = "#8953d1";
const TOOLTIP_SCOPE = "player-stats-tooltip";

function isDarkMode(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") === "dark" || document.documentElement.classList.contains("dark");
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
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const el = ref.current;
    const ob = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        ob.disconnect();
      }
    }, { threshold, rootMargin: "0px 0px -8% 0px" });
    ob.observe(el);
    return () => ob.disconnect();
  }, [threshold]);
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
    document.addEventListener("player-stats:tooltip-open", handle as EventListener);
    document.addEventListener("pointerdown", (event) => {
      if (!triggerRef.current?.contains(event.target as Node)) close();
    });
    return () => {
      document.removeEventListener("player-stats:tooltip-open", handle as EventListener);
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
          border: `1px solid rgba(137,83,209,0.42)`,
          background: "rgba(12,10,20,0.98)",
          color: "#f5efff",
          fontFamily: "monospace",
          fontSize: 11,
          lineHeight: 1.55,
          pointerEvents: "none",
          opacity: open ? 1 : 0,
          transform: open ? openTranslate : translate,
          transition: "opacity 170ms ease, transform 170ms ease",
          boxShadow: "0 18px 40px rgba(0,0,0,0.34)"
        }}
      >
        {content}
      </span>
    </span>
  );
}

function Section({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return <section className="ps-section" style={{ width: "100%", maxWidth: 1040, margin: "0 auto", border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.14)"}`, borderRadius: 24, padding: "1.4rem", background: dark ? "linear-gradient(180deg, rgba(18,14,29,0.98), rgba(10,8,18,0.98))" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,242,255,0.96))", boxShadow: dark ? "0 18px 42px rgba(0,0,0,0.22)" : "0 18px 34px rgba(137,83,209,0.08)" }}>{children}</section>;
}

function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><span style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${dark ? "rgba(137,83,209,0.26)" : "rgba(137,83,209,0.18)"}`, background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)" }}>{icon}</span><div style={{ fontFamily: "Georgia, Cambria, serif", fontWeight: 700, color: dark ? "#fff" : "#261a33", fontSize: "1.06rem" }}><span className="lang-zh">{zh}</span><span className="lang-en">{en}</span></div><div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(137,83,209,0.34), transparent)" }} /></div>;
}

function HeroCard({ dark, rank, level, totalExp, expInLevel, expNeeded, expProgress, currentCity, travelDays, expFormula, levelFormula }: {
  dark: boolean; rank: { zh: string; en: string }; level: number; totalExp: number; expInLevel: number; expNeeded: number; expProgress: number; currentCity: { name: string; nameCN: string }; travelDays: number; expFormula: { zh: string; en: string }; levelFormula: { zh: string; en: string; nextLevel: string };
}) {
  const expAnimated = Math.round(useCountUp(totalExp, 900, true));
  const progressAnimated = Math.round(useCountUp(expProgress, 900, true));
  const levelAnimated = Math.round(useCountUp(level, 900, true));
  return <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "132px 1fr auto", gap: "1rem", alignItems: "center" }}>
    <div style={{ position: "relative" }}>
      <img src="/images/rex-avatar.png" alt="Rex avatar" width={132} height={160} style={{ width: 132, height: 160, objectFit: "cover", imageRendering: "pixelated", borderRadius: 18, border: "1px solid rgba(137,83,209,0.34)", boxShadow: "0 12px 28px rgba(137,83,209,0.14)" }} />
      <TooltipWrap content={<><div>{levelFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{levelFormula.en}</div><div style={{ marginTop: 6, color: "#fff" }}>{levelFormula.nextLevel}</div></>} align="center"><div style={{ position: "absolute", left: "50%", bottom: -12, transform: "translateX(-50%)", padding: "4px 12px", borderRadius: 999, background: dark ? "rgba(10,10,18,0.94)" : "rgba(255,255,255,0.94)", border: "1px solid rgba(137,83,209,0.26)", color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>Lv.{levelAnimated}</div></TooltipWrap>
    </div>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: dark ? "#fff" : "#261a33", fontSize: "2rem", fontFamily: "Georgia, Cambria, serif" }}>Rex Liu</h2>
          <div style={{ marginTop: 6, color: PURPLE, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>PLAYER STATS</div>
          <p style={{ margin: "10px 0 0", color: dark ? "#bcb2cb" : "#6f657d", lineHeight: 1.7 }}><span className="lang-en">Sword intent in writing, inner strength in systems, footsteps across cities.</span><span className="lang-zh">文章为剑，系统为功，城市为路。</span></p>
        </div>
        <div style={{ writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "0.12em", color: PURPLE, border: "1px solid rgba(137,83,209,0.22)", borderRadius: 999, padding: "10px 6px", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>江湖档案</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {[`⚔️ ${rank.zh}`, `📍 ${currentCity.nameCN}`, `🗓️ 游历 ${travelDays} 天`].map(item => <span key={item} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.2)", color: dark ? "#e9ddff" : "#6f46a3", background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)", fontSize: 12 }}>{item}</span>)}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
          <TooltipWrap content={<><div>{expFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><span style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>TOTAL EXP {expAnimated.toLocaleString()}</span></TooltipWrap>
          <span style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 12 }}>{expInLevel} / {expNeeded}</span>
        </div>
        <TooltipWrap content={<><div>{expFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><div style={{ height: 16, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(137,83,209,0.22)", background: dark ? "rgba(255,255,255,0.05)" : "rgba(60,20,90,0.06)" }}><div style={{ height: "100%", width: `${progressAnimated}%`, background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.56))`, boxShadow: "0 0 18px rgba(137,83,209,0.32)" }} /></div></TooltipWrap>
      </div>
    </div>
    <div className="hero-side" style={{ minWidth: 120 }}>
      <div style={{ borderRadius: 18, padding: 16, border: "1px solid rgba(137,83,209,0.22)", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bcb2cb" : "#7a6d89" }}>Realm</div>
        <div style={{ color: PURPLE, fontWeight: 700, fontSize: 26, fontFamily: "Georgia, Cambria, serif" }}>{rank.zh}</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bcb2cb" : "#7a6d89", marginTop: 10 }}>Progress</div>
        <div style={{ color: dark ? "#fff" : "#261a33", fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{progressAnimated}%</div>
      </div>
    </div>
  </div>;
}

function ChapterCarousel({ chapters, dark }: { chapters: ChapterData[]; dark: boolean }) {
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
        <button type="button" onClick={() => setIndex(v => Math.max(0, v - 1))} disabled={index === 0} style={{ width: 38, height: 38, borderRadius: 999, cursor: index === 0 ? "not-allowed" : "pointer", border: "1px solid rgba(137,83,209,0.2)", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)", color: PURPLE, opacity: index === 0 ? 0.35 : 1 }}>←</button>
        <button type="button" onClick={() => setIndex(v => Math.min(chapters.length - 1, v + 1))} disabled={index === chapters.length - 1} style={{ width: 38, height: 38, borderRadius: 999, cursor: index === chapters.length - 1 ? "not-allowed" : "pointer", border: "1px solid rgba(137,83,209,0.2)", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)", color: PURPLE, opacity: index === chapters.length - 1 ? 0.35 : 1 }}>→</button>
      </div>
    </div>

    <div style={{ overflow: "hidden", borderRadius: 22 }}>
      <div key={active.id} className="chapter-slide-card" style={{ borderRadius: 22, border: `1px solid ${active.id === "current" ? "rgba(137,83,209,0.32)" : dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "linear-gradient(180deg, rgba(24,18,40,0.98), rgba(14,10,24,0.98))" : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(247,240,255,0.98))", boxShadow: active.id === "current" ? "0 18px 40px rgba(137,83,209,0.14), inset 0 0 0 1px rgba(137,83,209,0.08)" : undefined, animation: reduced ? undefined : "chapterSlide 260ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <div style={{ display: "grid", gap: 16, padding: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div>
              <div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{active.period}</div>
              <div style={{ marginTop: 6, color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 26, fontFamily: "Georgia, Cambria, serif" }}>{active.titleCN}</div>
              <div style={{ marginTop: 6, color: dark ? "#bcb2cb" : "#6f657d", fontSize: 13 }}>{active.location}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {active.id === "current" && <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.24)", background: "rgba(137,83,209,0.1)", color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>CURRENT</span>}
              {active.boss?.defeated && <span style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.24)", background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.7)", color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>✅ 已击败</span>}
            </div>
          </div>
          <p style={{ margin: 0, color: dark ? "#d3cae0" : "#6f657d", lineHeight: 1.8, fontSize: 14 }}>{active.summary}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="chapter-dots" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {chapters.map((chapter, dotIndex) => <button key={chapter.id} type="button" onClick={() => setIndex(dotIndex)} aria-label={`Go to chapter ${dotIndex + 1}`} style={{ width: dotIndex === index ? 26 : 10, height: 10, borderRadius: 999, border: 0, background: dotIndex === index ? PURPLE : (dark ? "rgba(255,255,255,0.18)" : "rgba(137,83,209,0.2)"), cursor: "pointer", transition: "all 180ms ease" }} />)}
            </div>
            <button type="button" onClick={() => setExpanded(v => !v)} style={{ borderRadius: 999, border: "1px solid rgba(137,83,209,0.2)", background: expanded ? PURPLE : "transparent", color: expanded ? "#fff" : PURPLE, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}>{expanded ? "收起详情" : "展开详情"}</button>
          </div>
          <div className="chapter-detail-grid" style={{ display: "grid", gridTemplateRows: expanded ? "1fr" : "0fr", transition: reduced ? undefined : "grid-template-rows 240ms cubic-bezier(0.22, 1, 0.36, 1)" }}>
            <div style={{ overflow: "hidden" }}>
              <div style={{ paddingTop: 14, display: "grid", gap: 12, borderTop: "1px solid rgba(137,83,209,0.12)" }}>
                {active.boss && <div style={{ borderRadius: 16, padding: 14, border: "1px solid rgba(137,83,209,0.16)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>Boss</div><div style={{ marginTop: 6, color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{active.boss.name}</div><div style={{ marginTop: 6, color: dark ? "#d3cae0" : "#6f657d", fontSize: 13 }}>{active.boss.description || active.boss.reward}</div></div>}
                {!!active.rewards.length && <div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>Rewards</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{active.rewards.map(reward => <span key={reward} style={{ padding: "6px 10px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.18)", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)", color: PURPLE, fontSize: 12 }}>{reward}</span>)}</div></div>}
                {!!active.articles.length && <div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11, marginBottom: 8 }}>Articles</div><div style={{ display: "grid", gap: 8 }}>{active.articles.map(article => <a key={article} href={`/posts/${article}/`} style={{ textDecoration: "none", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(137,83,209,0.14)", background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.74)", color: dark ? "#ece3ff" : "#4b2d78", fontFamily: "monospace", fontSize: 12 }}>↗ /posts/{article}/</a>)}</div></div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function StatBars({ stats, statFormulas, dark }: { stats: PlayerStatsProps["stats"]; statFormulas: Record<string, StatFormulaData>; dark: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const labels = [
    ["vitality", "体力", "HP"],
    ["wisdom", "灵力", "Spirit"],
    ["renown", "声望", "Renown"],
    ["command", "统御", "Command"],
    ["craft", "武术", "Martial"],
    ["insight", "身法", "Agility"],
  ] as const;
  return <div ref={ref} className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, alignItems: "stretch" }}>
    {labels.map(([key, zh, en]) => {
      const target = stats[key];
      const animated = Math.round(useCountUp(target, 500, inView));
      const formula = statFormulas[key];
      return <TooltipWrap key={key} content={<><div>{formula?.formulaZh}</div><div style={{ color: "#ccb7f7" }}>{formula?.formulaEn}</div></>}><div style={{ borderRadius: 18, padding: "14px 16px", border: `1px solid ${dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.64)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ color: dark ? "#fff" : "#261a33", fontFamily: "Georgia, Cambria, serif", fontWeight: 700 }}>{zh} <span style={{ fontSize: 11, color: dark ? "#9f93b1" : "#8a7b97" }}>/ {en}</span></div>
          <div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>{animated}</div>
        </div>
        <div style={{ height: 12, borderRadius: 999, overflow: "hidden", background: dark ? "rgba(255,255,255,0.06)" : "rgba(60,20,90,0.06)" }}><div style={{ width: `${animated}%`, height: "100%", background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.5))`, boxShadow: "0 0 16px rgba(137,83,209,0.26)" }} /></div>
      </div></TooltipWrap>;
    })}
  </div>;
}

function EquipmentRing({ equipment, dark }: { equipment: EquipmentData[]; dark: boolean }) {
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
      <div className="equipment-ring-core" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 240, height: 240, borderRadius: "50%", border: "1px solid rgba(137,83,209,0.24)", background: dark ? "radial-gradient(circle at 50% 45%, rgba(137,83,209,0.2), rgba(20,15,31,0.96) 68%)" : "radial-gradient(circle at 50% 45%, rgba(137,83,209,0.14), rgba(250,246,255,0.98) 72%)", boxShadow: "0 0 0 1px rgba(137,83,209,0.08), 0 0 34px rgba(137,83,209,0.14)", display: "grid", placeItems: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: "1px dashed rgba(137,83,209,0.18)" }} />
        <div style={{ position: "absolute", width: 176, height: 176, borderRadius: "50%", border: "1px solid rgba(137,83,209,0.18)", boxShadow: "0 0 24px rgba(137,83,209,0.12) inset" }} />
        <div style={{ textAlign: "center", display: "grid", gap: 10, placeItems: "center" }}>
          <div style={{ width: 92, height: 92, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid rgba(137,83,209,0.24)", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.06)", color: PURPLE, fontSize: 30 }}>令</div>
          <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontFamily: "Georgia, Cambria, serif" }}>江湖装备核心</div>
          <div style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 11 }}>6 SLOTS ORBITING</div>
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {positions.map((position, index) => {
          const angle = index * 60 - 90;
          return <div key={`line-${index}`} className="equipment-line" style={{ position: "absolute", left: "50%", top: "50%", width: 180, height: 2, transform: `translate(-50%, -50%) rotate(${angle}deg)`, transformOrigin: "left center", background: "linear-gradient(90deg, rgba(137,83,209,0.34), rgba(137,83,209,0.05))", boxShadow: "0 0 14px rgba(137,83,209,0.12)" }} />;
        })}
      </div>
      {equipment.slice(0, 6).map((item, i) => {
        const card = <div className="equipment-floating" style={{ width: 196, borderRadius: 20, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(21,16,34,0.96)" : "rgba(255,255,255,0.94)", boxShadow: "0 10px 24px rgba(137,83,209,0.08)", position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ color: PURPLE, fontSize: 11, fontFamily: "monospace", padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.2)" }}>{item.slotCN}</span><span style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 10 }}>{item.acquired}</span></div>
          <div style={{ marginTop: 10, color: dark ? "#fff" : "#261a33", fontWeight: 700, fontFamily: "Georgia, Cambria, serif" }}>{item.nameCN}</div>
          <TooltipWrap content={<><div>{item.effectCN}</div><div style={{ color: "#ccb7f7" }}>{item.effectEN}</div></>}><div style={{ marginTop: 8, color: dark ? "#d6cdf0" : "#6f46a3", fontSize: 12 }}>{item.effectCN}</div></TooltipWrap>
        </div>;
        const wrapped = item.article ? <a href={`/posts/${item.article}/`} style={{ textDecoration: "none" }}>{card}</a> : card;
        return <div key={item.id} style={{ position: "absolute", ...positions[i] }}>{wrapped}</div>;
      })}
    </div>
    <div className="equipment-mobile-grid" style={{ display: "none", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
      {equipment.map(item => <TooltipWrap key={item.id} content={<><div>{item.effectCN}</div><div style={{ color: "#ccb7f7" }}>{item.effectEN}</div></>}><a href={item.article ? `/posts/${item.article}/` : undefined} style={{ textDecoration: "none" }}><div style={{ borderRadius: 16, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(21,16,34,0.96)" : "rgba(255,255,255,0.94)" }}><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{item.slotCN}</div><div style={{ marginTop: 8, color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{item.nameCN}</div><div style={{ marginTop: 8, color: dark ? "#d6cdf0" : "#6f46a3", fontSize: 12 }}>{item.effectCN}</div></div></a></TooltipWrap>)}
    </div>
  </>;
}

function QuestPanel({ quests, dark }: { quests: PlayerStatsProps["quests"]; dark: boolean }) {
  const [tab, setTab] = useState<"main" | "side">("main");
  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, border: `1px solid ${dark ? "rgba(137,83,209,0.22)" : "rgba(137,83,209,0.16)"}` }}>
      {(["main", "side"] as const).map(key => <button key={key} type="button" onClick={() => setTab(key)} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "8px 14px", background: tab === key ? PURPLE : "transparent", color: tab === key ? "#fff" : (dark ? "#d6cdf0" : "#6f657d") }}>{key === "main" ? "主线 / Main" : "支线 / Side"}</button>)}
    </div>
    <div style={{ display: "grid", gap: 12 }}>
      {tab === "main" ? quests.main.map(quest => {
        const current = Number(quest.current ?? 0);
        const goal = Number(quest.goal ?? 0);
        const ratio = quest.status === "completed" ? 100 : Math.max(0, Math.min(100, goal > 0 ? current / goal * 100 : 0));
        return <TooltipWrap key={quest.id} content={<div>{current} / {goal}{quest.unit ? ` ${quest.unit}` : ""}</div>}><div style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{quest.titleCN}</div>{quest.target && <div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>{quest.target}</div>}</div><div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>{quest.status === "completed" ? "✅ Completed" : `${Math.round(ratio)}%`}</div></div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11, color: dark ? "#c8bed8" : "#78688a" }}><span>{current}{quest.unit ? ` ${quest.unit}` : ""}</span><span>{goal}{quest.unit ? ` ${quest.unit}` : ""}</span></div>
          <div style={{ marginTop: 6, height: 12, overflow: "hidden", borderRadius: 999, background: dark ? "rgba(255,255,255,0.05)" : "rgba(60,20,90,0.06)" }}><div style={{ width: `${Math.round(ratio)}%`, height: "100%", background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.52))` }} /></div>
        </div></TooltipWrap>;
      }) : quests.side.map(quest => <div key={quest.id} style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{quest.titleCN}</div><div style={{ marginTop: 6, color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11 }}>{quest.progress}</div></div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{quest.status}</div></div>)}
    </div>
  </div>;
}

function RetainerPanel({ retainers, dark }: { retainers: RetainerData[]; dark: boolean }) {
  return <div className="retainer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>{retainers.map(agent => <a key={agent.id} href="/lab/agents/" style={{ textDecoration: "none" }}><div style={{ borderRadius: 18, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><img src={agent.sprite} alt={agent.name} width={56} height={56} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", imageRendering: "pixelated", border: "1px solid rgba(137,83,209,0.26)" }} /><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{agent.name} {agent.emoji}</div><div style={{ color: PURPLE, fontSize: 11 }}>{agent.titleZh}</div></div></div><div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11 }}><span style={{ color: dark ? "#c8bed8" : "#78688a" }}>Lv.{agent.level}</span><span style={{ color: PURPLE }}>{agent.sessions} sessions</span></div></div></a>)}</div>;
}

function SkillBranch({ title, nodes, dark }: { title: string; nodes: Array<{ label: string; count: number; url?: string }>; dark: boolean }) {
  return <div style={{ borderRadius: 22, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)" }}>
    <div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 12, marginBottom: 14 }}>{title}</div>
    <div className="skill-branch" style={{ display: "grid", gap: 14 }}>
      {nodes.map((node, index) => {
        const innerNode = <div className="skill-node" style={{ minHeight: 86, borderRadius: 18, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "linear-gradient(180deg, rgba(34,25,52,0.94), rgba(20,15,31,0.94))" : "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(248,242,255,0.98))", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
          <div className="skill-node-pulse" style={{ position: "absolute", inset: -20, background: "radial-gradient(circle at 12% 18%, rgba(137,83,209,0.12), transparent 38%)", opacity: 0.8 }} />
          <div style={{ position: "relative", zIndex: 1, color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{node.label}</div>
          <div style={{ position: "relative", zIndex: 1, color: PURPLE, fontFamily: "monospace", fontSize: 12 }}>Lv.{node.count}</div>
        </div>;
        const wrapped = node.url ? <a href={node.url} style={{ textDecoration: "none" }}>{innerNode}</a> : innerNode;
        return <div key={node.label} className="skill-row" style={{ display: "grid", gridTemplateColumns: index % 2 === 0 ? "1.1fr 0.9fr" : "0.9fr 1.1fr", gap: 14, alignItems: "center" }}>
          <div className="skill-line-wrap" style={{ position: "relative", height: 2, background: "linear-gradient(90deg, rgba(137,83,209,0.38), rgba(137,83,209,0.06))", overflow: "hidden", borderRadius: 999 }}><span className="skill-line-flow" style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent, rgba(137,83,209,0.9), transparent)", transform: "translateX(-100%)" }} /></div>
          <TooltipWrap content={<div>{node.count} 篇相关文章 · Lv.{node.count}</div>} align="center">{wrapped}</TooltipWrap>
        </div>;
      })}
    </div>
  </div>;
}

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: { tagCounts: Record<string, number>; postCount: number; builderLogCount: number; dark: boolean }) {
  const inner = [
    { label: "天罡战气", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
    { label: "金蝉脱壳", count: tagCounts.trading || 0 },
    { label: "飞龙探云手", count: tagCounts.alpha || 0 },
    { label: "真元护体", count: tagCounts.investment || 0, url: "/tags/investment/" },
    { label: "五气朝元", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { label: "醉仙望月步", count: (tagCounts.investment || 0) + (tagCounts.wealth || 0) },
    { label: "金刚咒", count: tagCounts.wealth || 0, url: "/tags/wealth/" },
    { label: "观音咒", count: tagCounts.macro || 0 },
    { label: "仙风云体术", count: tagCounts.crypto || 0, url: "/tags/crypto/" },
  ];
  const outer = [
    { label: "御剑术", count: postCount, url: "/posts/" },
    { label: "尘世篇", count: tagCounts.life || 0, url: "/tags/life/" },
    { label: "人物志", count: tagCounts.people || 0, url: "/tags/people/" },
    { label: "万剑诀", count: tagCounts.evergreen || 0, url: "/tags/evergreen/" },
    { label: "天剑", count: tagCounts.ai || 0, url: "/tags/ai/" },
    { label: "剑神", count: tagCounts["vibe coding"] || tagCounts.ai || 0, url: "/tags/ai/" },
    { label: "灵葫咒", count: builderLogCount, url: "/builder-log/" },
    { label: "凝神归元", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { label: "游方篇", count: tagCounts.travel || 0, url: "/tags/travel/" },
    { label: "仙风云体术", count: tagCounts.travel || 0 },
  ];

  return <div style={{ display: "grid", gap: 14 }}>
    <SkillBranch title="内功心法 / Inner Arts" nodes={inner} dark={dark} />
    <SkillBranch title="外功仙术 / Outer Arts" nodes={outer} dark={dark} />
  </div>;
}

function RelationshipPanel({ relationships, dark }: { relationships: RelationshipData[]; dark: boolean }) {
  return <div className="relationship-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{relationships.map(item => {
    const card = <div className="relationship-card" style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)", transition: "transform 180ms ease, box-shadow 180ms ease" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{item.nameCN}</div><span style={{ color: PURPLE, fontSize: 11, padding: "4px 8px", borderRadius: 999, border: "1px solid rgba(137,83,209,0.18)" }}>{item.roleCN}</span></div><p style={{ margin: "10px 0 0", color: dark ? "#d3cae0" : "#6f657d", fontSize: 13, lineHeight: 1.65 }}>{item.impactCN}</p>{item.article && <div style={{ marginTop: 10, color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>↗ /posts/{item.article}/</div>}</div>;
    return item.article ? <a key={item.id} href={`/posts/${item.article}/`} style={{ textDecoration: "none" }}>{card}</a> : <div key={item.id}>{card}</div>;
  })}</div>;
}

const CATEGORY_META: Record<string, { icon: string; zh: string }> = { cultivation: { icon: "🗡️", zh: "修行" }, jianghu: { icon: "🌍", zh: "江湖" }, command: { icon: "🤖", zh: "统御" }, knowledge: { icon: "📚", zh: "身法" }, health: { icon: "💪", zh: "体力" }, investment: { icon: "💰", zh: "财修" }, hidden: { icon: "🔮", zh: "奇遇" } };

function AchievementBadges({ achievements, dark }: { achievements: AchievementData[]; dark: boolean }) {
  const groups = achievements.reduce<Record<string, AchievementData[]>>((acc, item) => {
    if (item.hidden && !item.unlocked) return acc;
    (acc[item.category] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(groups).map(([key, items]) => (
        <div key={key} style={{ marginBottom: 20 }}>
          <div style={{ color: PURPLE, fontWeight: 700, marginBottom: 10 }}>
            {CATEGORY_META[key]?.icon} {CATEGORY_META[key]?.zh}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            {items.map(item => (
              <div
                key={item.id}
                style={{
                  borderRadius: 16,
                  padding: 14,
                  border: `1px solid ${item.unlocked ? "rgba(137,83,209,0.24)" : (dark ? "rgba(255,255,255,0.08)" : "rgba(90,45,140,0.08)")}`,
                  background: item.unlocked ? (dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)") : (dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)"),
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 13 }}>{item.nameZh}</div>
                </div>
                <p style={{ margin: "8px 0 0", color: dark ? "#c8bed8" : "#78688a", fontSize: 12, lineHeight: 1.6 }}>{item.descZh}</p>
                {item.unlocked && item.unlockedDate && (
                  <div style={{ marginTop: 8, color: PURPLE, fontFamily: "monospace", fontSize: 10 }}>✓ {item.unlockedDate}</div>
                )}
                {!item.unlocked && item.progress !== undefined && item.max !== undefined && (
                  <div style={{ marginTop: 8, color: dark ? "#c8bed8" : "#78688a", fontFamily: "monospace", fontSize: 10 }}>
                    {item.progress}/{item.max}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CultivationLog({ activityLog, dark }: { activityLog: PlayerStatsProps["activityLog"]; dark: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? activityLog : activityLog.slice(0, 10);
  return <div><div style={{ display: "grid", gap: 10 }}>{visible.map((item, i) => <div key={`${item.dateEn}-${i}`} className="cultivation-row" style={{ display: "grid", gridTemplateColumns: "80px 28px 1fr auto", gap: 10, alignItems: "start", borderRadius: 14, padding: "10px 12px", border: `1px solid ${dark ? "rgba(137,83,209,0.14)" : "rgba(137,83,209,0.1)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)" }}><div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11 }}>{item.dateZh}</div><div>{item.icon}</div><div style={{ color: dark ? "#fff" : "#261a33", fontSize: 12 }}>{item.descZh}</div><div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>+{item.exp} EXP</div></div>)}</div>{activityLog.length > 10 && <button type="button" onClick={() => setShowAll(v => !v)} style={{ marginTop: 12, borderRadius: 999, border: "1px solid rgba(137,83,209,0.2)", background: "transparent", color: PURPLE, padding: "10px 16px", cursor: "pointer" }}>{showAll ? "收起" : `查看全部 ${activityLog.length} 条记录`}</button>}</div>;
}

export default function PlayerStats(props: PlayerStatsProps) {
  const dark = useTheme();
  const { stats, level, totalExp, expInLevel, expNeeded, expProgress, rank, currentCity, travelDays, tagCounts, postCount, builderLogCount, cities, achievements, retainers, quests, equipment, activityLog, chapters, relationships, statFormulas, expFormula, levelFormula } = props;
  return <div style={{ width: "100%", maxWidth: 1080, margin: "0 auto", fontFamily: "Georgia, Cambria, serif", paddingInline: 12 }}>
    <style>{`
      @keyframes chapterSlide { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes skillPulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.03); opacity: 1; } }
      @keyframes lineFlow { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
      .equipment-floating { transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms cubic-bezier(0.22, 1, 0.36, 1), border-color 220ms ease; }
      .equipment-floating:hover { transform: translateY(-8px); box-shadow: 0 22px 36px rgba(137,83,209,0.2), 0 0 26px rgba(137,83,209,0.16); border-color: rgba(137,83,209,0.34); }
      .equipment-ring-core::after { content: ""; position: absolute; inset: 16px; border-radius: 50%; box-shadow: inset 0 0 28px rgba(137,83,209,0.08); }
      .equipment-line { animation: lineFlow 3.4s linear infinite; }
      .skill-node { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 180ms ease, border-color 180ms ease; box-shadow: 0 8px 18px rgba(137,83,209,0.06); }
      .skill-node:hover { transform: translateY(-4px); box-shadow: 0 18px 28px rgba(137,83,209,0.14), 0 0 18px rgba(137,83,209,0.12); border-color: rgba(137,83,209,0.28); }
      .skill-node:hover .skill-node-pulse { animation: skillPulse 1.3s ease-in-out infinite; }
      .skill-row:hover .skill-line-flow { animation-duration: 1.1s; }
      .skill-line-flow { animation: lineFlow 2.6s linear infinite; opacity: 0.9; }
      .relationship-card:hover { transform: translateY(-4px); box-shadow: 0 14px 26px rgba(137,83,209,0.12); }
      @media (max-width: 960px) {
        .hero-grid { grid-template-columns: 1fr !important; }
        .hero-side { min-width: 0 !important; }
        .stats-grid { grid-template-columns: 1fr !important; }
        .retainer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        .skill-row { grid-template-columns: 1fr !important; }
        .skill-line-wrap { display: none !important; }
      }
      @media (max-width: 760px) {
        .equipment-ring { display: none !important; }
        .equipment-mobile-grid { display: grid !important; }
        .cultivation-row { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 640px) {
        .retainer-grid, .relationship-grid { grid-template-columns: 1fr !important; }
      }
      @media (prefers-reduced-motion: reduce) {
        .chapter-slide-card, .equipment-floating, .skill-node, .skill-line-flow, .equipment-line { animation: none !important; transition: none !important; }
      }
    `}</style>
    <div style={{ display: "grid", gap: 18 }}>
      <Section dark={dark}><HeroCard dark={dark} rank={rank} level={level} totalExp={totalExp} expInLevel={expInLevel} expNeeded={expNeeded} expProgress={expProgress} currentCity={currentCity} travelDays={travelDays} expFormula={expFormula} levelFormula={levelFormula} /></Section>
      <Section dark={dark}><SectionHeader icon="🧭" zh="人生章节" en="Chapter Archive" dark={dark} /><ChapterCarousel chapters={chapters} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="📊" zh="六维属性" en="Six Attributes" dark={dark} /><StatBars stats={stats} statFormulas={statFormulas} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="🧰" zh="装备栏" en="Equipment" dark={dark} /><EquipmentRing equipment={equipment} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="📜" zh="任务面板" en="Quest Board" dark={dark} /><QuestPanel quests={quests} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="🏯" zh="门客系统" en="Retainers" dark={dark} /><RetainerPanel retainers={retainers} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="🌳" zh="技能树" en="Skill Tree" dark={dark} /><SkillTree tagCounts={tagCounts} postCount={postCount} builderLogCount={builderLogCount} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="🤝" zh="江湖关系" en="Relationships" dark={dark} /><RelationshipPanel relationships={relationships} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="🏆" zh="成就" en="Achievements" dark={dark} /><AchievementBadges achievements={achievements} dark={dark} /></Section>
      <Section dark={dark}><SectionHeader icon="📜" zh="修行日志" en="Cultivation Log" dark={dark} /><CultivationLog activityLog={activityLog} dark={dark} /></Section>
      <Section dark={dark}><a href="/travel/" style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: "center", textDecoration: "none" }}><span style={{ fontSize: 28 }}>🗺️</span><div><div style={{ color: PURPLE, fontWeight: 700, fontSize: 24 }}>{cities.length} <span style={{ color: dark ? "#c8bed8" : "#78688a", fontSize: 13, fontWeight: 400 }}>座城市已游历</span></div><div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontSize: 12 }}>→ 查看完整旅居地图</div></div></a></Section>
    </div>
  </div>;
}
