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

function TooltipWrap({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onTouchStart={() => setOpen(v => !v)}
      tabIndex={0}
    >
      {children}
      <span style={{
        position: "absolute",
        left: 0,
        top: "calc(100% + 10px)",
        zIndex: 20,
        width: "min(320px, calc(100vw - 48px))",
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${PURPLE}`,
        background: "rgba(12,10,20,0.96)",
        color: "#f5efff",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: 1.55,
        pointerEvents: open ? "auto" : "none",
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(-4px)",
        transition: "opacity 180ms ease, transform 180ms ease",
        boxShadow: "0 18px 40px rgba(0,0,0,0.32)"
      }}>{content}</span>
    </span>
  );
}

function Section({ dark, children }: { dark: boolean; children: React.ReactNode }) {
  return <section style={{ border: `1px solid ${dark ? "rgba(137,83,209,0.24)" : "rgba(137,83,209,0.14)"}`, borderRadius: 22, padding: "1.4rem", background: dark ? "linear-gradient(180deg, rgba(18,14,29,0.98), rgba(10,8,18,0.98))" : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,242,255,0.96))", boxShadow: dark ? "0 18px 42px rgba(0,0,0,0.22)" : "0 18px 34px rgba(137,83,209,0.08)" }}>{children}</section>;
}

function SectionHeader({ icon, zh, en, dark }: { icon: string; zh: string; en: string; dark: boolean }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}><span style={{ width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${dark ? "rgba(137,83,209,0.26)" : "rgba(137,83,209,0.18)"}`, background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)" }}>{icon}</span><div style={{ fontFamily: "Georgia, Cambria, serif", fontWeight: 700, color: dark ? "#fff" : "#261a33", fontSize: "1.06rem" }}><span className="lang-zh">{zh}</span><span className="lang-en">{en}</span></div><div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, rgba(137,83,209,0.34), transparent)` }} /></div>;
}

function HeroCard({ dark, rank, level, totalExp, expInLevel, expNeeded, expProgress, currentCity, travelDays, expFormula, levelFormula }: {
  dark: boolean; rank: { zh: string; en: string }; level: number; totalExp: number; expInLevel: number; expNeeded: number; expProgress: number; currentCity: { name: string; nameCN: string }; travelDays: number; expFormula: { zh: string; en: string }; levelFormula: { zh: string; en: string; nextLevel: string };
}) {
  const expAnimated = Math.round(useCountUp(totalExp, 900, true));
  const progressAnimated = Math.round(useCountUp(expProgress, 900, true));
  const levelAnimated = Math.round(useCountUp(level, 900, true));
  return <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "132px 1fr auto", gap: "1rem", alignItems: "center" }}>
    <div style={{ position: "relative" }}>
      <img src="/images/rex-avatar.png" alt="Rex avatar" width={132} height={160} style={{ width: 132, height: 160, objectFit: "cover", imageRendering: "pixelated", borderRadius: 18, border: `1px solid rgba(137,83,209,0.34)`, boxShadow: "0 12px 28px rgba(137,83,209,0.14)" }} />
      <TooltipWrap content={<><div>{levelFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{levelFormula.en}</div><div style={{ marginTop: 6, color: "#fff" }}>{levelFormula.nextLevel}</div></>}><div style={{ position: "absolute", left: "50%", bottom: -12, transform: "translateX(-50%)", padding: "4px 12px", borderRadius: 999, background: dark ? "rgba(10,10,18,0.94)" : "rgba(255,255,255,0.94)", border: `1px solid rgba(137,83,209,0.26)`, color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>Lv.{levelAnimated}</div></TooltipWrap>
    </div>
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: dark ? "#fff" : "#261a33", fontSize: "2rem", fontFamily: "Georgia, Cambria, serif" }}>Rex Liu</h2>
          <div style={{ marginTop: 6, color: PURPLE, fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>PLAYER STATS</div>
          <p style={{ margin: "10px 0 0", color: dark ? "#bcb2cb" : "#6f657d", lineHeight: 1.7 }}><span className="lang-en">Sword intent in writing, inner strength in systems, footsteps across cities.</span><span className="lang-zh">文章为剑，系统为功，城市为路。</span></p>
        </div>
        <div style={{ writingMode: "vertical-rl", textOrientation: "upright", letterSpacing: "0.12em", color: PURPLE, border: `1px solid rgba(137,83,209,0.22)`, borderRadius: 999, padding: "10px 6px", background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>江湖档案</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        {[`⚔️ ${rank.zh}`, `📍 ${currentCity.nameCN}`, `🗓️ 游历 ${travelDays} 天`].map(item => <span key={item} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid rgba(137,83,209,0.2)`, color: dark ? "#e9ddff" : "#6f46a3", background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)", fontSize: 12 }}>{item}</span>)}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
          <TooltipWrap content={<><div>{expFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><span style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 12 }}>TOTAL EXP {expAnimated.toLocaleString()}</span></TooltipWrap>
          <span style={{ color: dark ? "#bcb2cb" : "#6f657d", fontFamily: "monospace", fontSize: 12 }}>{expInLevel} / {expNeeded}</span>
        </div>
        <TooltipWrap content={<><div>{expFormula.zh}</div><div style={{ color: "#ccb7f7" }}>{expFormula.en}</div></>}><div style={{ height: 16, borderRadius: 999, overflow: "hidden", border: `1px solid rgba(137,83,209,0.22)`, background: dark ? "rgba(255,255,255,0.05)" : "rgba(60,20,90,0.06)" }}><div style={{ height: "100%", width: `${progressAnimated}%`, background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.56))`, boxShadow: "0 0 18px rgba(137,83,209,0.32)" }} /></div></TooltipWrap>
      </div>
    </div>
    <div className="hero-side" style={{ minWidth: 120 }}>
      <div style={{ borderRadius: 18, padding: 16, border: `1px solid rgba(137,83,209,0.22)`, background: dark ? "rgba(137,83,209,0.08)" : "rgba(137,83,209,0.05)" }}>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bcb2cb" : "#7a6d89" }}>Realm</div>
        <div style={{ color: PURPLE, fontWeight: 700, fontSize: 26, fontFamily: "Georgia, Cambria, serif" }}>{rank.zh}</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: dark ? "#bcb2cb" : "#7a6d89", marginTop: 10 }}>Progress</div>
        <div style={{ color: dark ? "#fff" : "#261a33", fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{progressAnimated}%</div>
      </div>
    </div>
  </div>;
}

function Timeline({ chapters, dark }: { chapters: ChapterData[]; dark: boolean }) {
  const [openId, setOpenId] = useState(chapters.find(c => c.id === "current")?.id ?? chapters[0]?.id);
  const reduced = usePrefersReducedMotion();
  return <div className="timeline-scroll" style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(280px, 320px)", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
    {chapters.map((chapter, i) => {
      const active = openId === chapter.id;
      const isCurrent = chapter.id === "current";
      return <button key={chapter.id} type="button" onClick={() => setOpenId(active ? "" : chapter.id)} style={{ textAlign: "left", borderRadius: 18, padding: 16, border: `1px solid ${active ? PURPLE : (dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)")}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)", color: "inherit", cursor: "pointer", opacity: 1, transform: "translateY(0)", animation: reduced ? undefined : `chapterFade 520ms ease ${i * 70}ms both`, boxShadow: isCurrent ? "0 0 0 1px rgba(137,83,209,0.12), 0 0 22px rgba(137,83,209,0.2)" : undefined }} className={isCurrent ? "chapter-current" : undefined}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div>
            <div style={{ color: PURPLE, fontSize: 11, fontFamily: "monospace" }}>{chapter.period}</div>
            <div style={{ marginTop: 4, color: dark ? "#fff" : "#261a33", fontWeight: 700, fontSize: 16, fontFamily: "Georgia, Cambria, serif" }}>{chapter.titleCN}</div>
            <div style={{ marginTop: 4, color: dark ? "#bcb2cb" : "#6f657d", fontSize: 12 }}>{chapter.location}</div>
          </div>
          {chapter.boss?.defeated && <span style={{ whiteSpace: "nowrap", color: PURPLE, fontSize: 11, fontFamily: "monospace" }}>✅ 已击败</span>}
        </div>
        <p style={{ margin: "12px 0 0", color: dark ? "#d3cae0" : "#6f657d", lineHeight: 1.65, fontSize: 13 }}>{chapter.summary}</p>
        {active && <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${dark ? "rgba(137,83,209,0.14)" : "rgba(137,83,209,0.12)"}` }}>
          {chapter.boss && <div style={{ fontSize: 12, marginBottom: 8, color: dark ? "#f0e8ff" : "#4a2d74" }}><strong>Boss：</strong>{chapter.boss.name}{chapter.boss.description ? ` · ${chapter.boss.description}` : ""}</div>}
          {!!chapter.rewards.length && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{chapter.rewards.map(reward => <span key={reward} style={{ padding: "4px 8px", borderRadius: 999, border: `1px solid rgba(137,83,209,0.18)`, background: dark ? "rgba(137,83,209,0.1)" : "rgba(137,83,209,0.06)", color: PURPLE, fontSize: 11 }}>{reward}</span>)}</div>}
        </div>}
      </button>;
    })}
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
  return <div ref={ref} className="stats-grid" style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 20, alignItems: "center" }}>
    <div style={{ textAlign: "center" }}>
      <img src="/images/rex-avatar.png" alt="Rex avatar" width={160} height={196} style={{ width: 160, height: 196, objectFit: "cover", imageRendering: "pixelated", borderRadius: 18, border: `1px solid rgba(137,83,209,0.28)`, boxShadow: "0 14px 28px rgba(137,83,209,0.14)" }} />
    </div>
    <div style={{ display: "grid", gap: 12 }}>
      {labels.map(([key, zh, en]) => {
        const target = stats[key];
        const animated = Math.round(useCountUp(target, 500, inView));
        const formula = statFormulas[key];
        return <TooltipWrap key={key} content={<><div>{formula?.formulaZh}</div><div style={{ color: "#ccb7f7" }}>{formula?.formulaEn}</div></>}><div style={{ borderRadius: 16, padding: "12px 14px", border: `1px solid ${dark ? "rgba(137,83,209,0.16)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.64)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ color: dark ? "#fff" : "#261a33", fontFamily: "Georgia, Cambria, serif", fontWeight: 700 }}>{zh} <span style={{ fontSize: 11, color: dark ? "#9f93b1" : "#8a7b97" }}>/ {en}</span></div>
            <div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700 }}>{animated}</div>
          </div>
          <div style={{ height: 12, borderRadius: 999, overflow: "hidden", background: dark ? "rgba(255,255,255,0.06)" : "rgba(60,20,90,0.06)" }}><div style={{ width: `${animated}%`, height: "100%", background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.5))`, boxShadow: "0 0 16px rgba(137,83,209,0.26)" }} /></div>
        </div></TooltipWrap>;
      })}
    </div>
  </div>;
}

function EquipmentRing({ equipment, dark }: { equipment: EquipmentData[]; dark: boolean }) {
  const positions: CSSProperties[] = [
    { top: 0, left: "50%", transform: "translate(-50%, 0)" },
    { top: "22%", right: 0 },
    { bottom: "22%", right: 0 },
    { bottom: 0, left: "50%", transform: "translate(-50%, 0)" },
    { bottom: "22%", left: 0 },
    { top: "22%", left: 0 },
  ];
  return <>
    <div className="equipment-ring" style={{ position: "relative", minHeight: 420, display: "block" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: 148, height: 180, borderRadius: 22, border: `1px solid rgba(137,83,209,0.26)`, overflow: "hidden", boxShadow: "0 0 28px rgba(137,83,209,0.18)" }}><img src="/images/rex-avatar.png" alt="Rex avatar" width={148} height={180} style={{ width: "100%", height: "100%", objectFit: "cover", imageRendering: "pixelated" }} /></div>
      {equipment.slice(0, 6).map((item, i) => {
        const card = <div style={{ width: 210, borderRadius: 18, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(21,16,34,0.96)" : "rgba(255,255,255,0.94)", transition: "transform 200ms ease, box-shadow 200ms ease", boxShadow: "0 10px 24px rgba(137,83,209,0.08)" }} className="equipment-floating">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><span style={{ color: PURPLE, fontSize: 11, fontFamily: "monospace", padding: "4px 8px", borderRadius: 999, border: `1px solid rgba(137,83,209,0.2)` }}>{item.slotCN}</span><span style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 10 }}>{item.acquired}</span></div>
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
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{quest.titleCN}</div>{quest.target && <div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>{quest.target}</div>}</div><div style={{ color: quest.status === "completed" ? PURPLE : PURPLE, fontFamily: "monospace", fontWeight: 700 }}>{quest.status === "completed" ? "✅ Completed" : `${Math.round(ratio)}%`}</div></div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11, color: dark ? "#c8bed8" : "#78688a" }}><span>{current}{quest.unit ? ` ${quest.unit}` : ""}</span><span>{goal}{quest.unit ? ` ${quest.unit}` : ""}</span></div>
          <div style={{ marginTop: 6, height: 12, overflow: "hidden", borderRadius: 999, background: dark ? "rgba(255,255,255,0.05)" : "rgba(60,20,90,0.06)" }}><div style={{ width: `${Math.round(ratio)}%`, height: "100%", background: `linear-gradient(90deg, ${PURPLE}, rgba(137,83,209,0.52))` }} /></div>
        </div></TooltipWrap>;
      }) : quests.side.map(quest => <div key={quest.id} style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{quest.titleCN}</div><div style={{ marginTop: 6, color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11 }}>{quest.progress}</div></div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>{quest.status}</div></div>)}
    </div>
  </div>;
}

function RetainerPanel({ retainers, dark }: { retainers: RetainerData[]; dark: boolean }) {
  return <div className="retainer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>{retainers.map(agent => <a key={agent.id} href="/lab/agents/" style={{ textDecoration: "none" }}><div style={{ borderRadius: 18, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)" }}><div style={{ display: "flex", gap: 12, alignItems: "center" }}><img src={agent.sprite} alt={agent.name} width={56} height={56} style={{ width: 56, height: 56, borderRadius: 14, objectFit: "cover", imageRendering: "pixelated", border: `1px solid rgba(137,83,209,0.26)` }} /><div><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{agent.name} {agent.emoji}</div><div style={{ color: PURPLE, fontSize: 11 }}>{agent.titleZh}</div></div></div><div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontFamily: "monospace", fontSize: 11 }}><span style={{ color: dark ? "#c8bed8" : "#78688a" }}>Lv.{agent.level}</span><span style={{ color: PURPLE }}>{agent.sessions} sessions</span></div></div></a>)}</div>;
}

function SkillTree({ tagCounts, postCount, builderLogCount, dark }: { tagCounts: Record<string, number>; postCount: number; builderLogCount: number; dark: boolean }) {
  const [tab, setTab] = useState<"inner" | "outer">("inner");
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
  const list = tab === "inner" ? inner : outer;
  return <div style={{ display: "grid", gap: 14 }}>
    <div style={{ display: "inline-flex", gap: 8, padding: 6, borderRadius: 999, border: `1px solid ${dark ? "rgba(137,83,209,0.22)" : "rgba(137,83,209,0.16)"}` }}>{([['inner','内功心法'],['outer','外功仙术']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setTab(key)} style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "8px 14px", background: tab === key ? PURPLE : "transparent", color: tab === key ? "#fff" : (dark ? "#d6cdf0" : "#6f657d"), transition: "all 180ms ease" }}>{label}</button>)}</div>
    <div key={tab} className="skill-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
      {list.map(node => <TooltipWrap key={node.label} content={<div>{node.count} 篇相关文章 · Lv.{node.count}</div>}><a href={node.url} style={{ textDecoration: "none" }}><div style={{ minHeight: 84, borderRadius: 18, padding: 14, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.7)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{node.label}</div><div style={{ color: PURPLE, fontFamily: "monospace", fontSize: 12 }}>Lv.{node.count}</div></div></a></TooltipWrap>)}
    </div>
  </div>;
}

function RelationshipPanel({ relationships, dark }: { relationships: RelationshipData[]; dark: boolean }) {
  return <div className="relationship-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>{relationships.map(item => {
    const card = <div className="relationship-card" style={{ borderRadius: 18, padding: 16, border: `1px solid ${dark ? "rgba(137,83,209,0.18)" : "rgba(137,83,209,0.12)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)", transition: "transform 180ms ease, box-shadow 180ms ease" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div style={{ color: dark ? "#fff" : "#261a33", fontWeight: 700 }}>{item.nameCN}</div><span style={{ color: PURPLE, fontSize: 11, padding: "4px 8px", borderRadius: 999, border: `1px solid rgba(137,83,209,0.18)` }}>{item.roleCN}</span></div><p style={{ margin: "10px 0 0", color: dark ? "#d3cae0" : "#6f657d", fontSize: 13, lineHeight: 1.65 }}>{item.impactCN}</p>{item.article && <div style={{ marginTop: 10, color: PURPLE, fontFamily: "monospace", fontSize: 11 }}>↗ /posts/{item.article}/</div>}</div>;
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
  return <div><div style={{ display: "grid", gap: 10 }}>{visible.map((item, i) => <div key={`${item.dateEn}-${i}`} className="cultivation-row" style={{ display: "grid", gridTemplateColumns: "80px 28px 1fr auto", gap: 10, alignItems: "start", borderRadius: 14, padding: "10px 12px", border: `1px solid ${dark ? "rgba(137,83,209,0.14)" : "rgba(137,83,209,0.1)"}`, background: dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.72)" }}><div style={{ color: dark ? "#ac9fbe" : "#8b7a98", fontFamily: "monospace", fontSize: 11 }}>{item.dateZh}</div><div>{item.icon}</div><div style={{ color: dark ? "#fff" : "#261a33", fontSize: 12 }}>{item.descZh}</div><div style={{ color: PURPLE, fontFamily: "monospace", fontWeight: 700, fontSize: 11 }}>+{item.exp} EXP</div></div>)}</div>{activityLog.length > 10 && <button type="button" onClick={() => setShowAll(v => !v)} style={{ marginTop: 12, borderRadius: 999, border: `1px solid rgba(137,83,209,0.2)`, background: "transparent", color: PURPLE, padding: "10px 16px", cursor: "pointer" }}>{showAll ? "收起" : `查看全部 ${activityLog.length} 条记录`}</button>}</div>;
}

export default function PlayerStats(props: PlayerStatsProps) {
  const dark = useTheme();
  const { stats, level, totalExp, expInLevel, expNeeded, expProgress, rank, currentCity, travelDays, tagCounts, postCount, builderLogCount, cities, achievements, retainers, quests, equipment, activityLog, chapters, relationships, statFormulas, expFormula, levelFormula } = props;
  return <div style={{ maxWidth: 1040, margin: "0 auto", fontFamily: "Georgia, Cambria, serif" }}>
    <style>{`
      @keyframes chapterFade { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(137,83,209,0.18); } 50% { box-shadow: 0 0 24px 4px rgba(137,83,209,0.24); } }
      .chapter-current { animation: pulseGlow 2.4s ease-in-out infinite; }
      .equipment-floating:hover { transform: translateY(-6px); box-shadow: 0 18px 32px rgba(137,83,209,0.18); }
      .relationship-card:hover { transform: translateY(-4px); box-shadow: 0 14px 26px rgba(137,83,209,0.12); }
      .skill-fade { animation: skillFade 180ms ease; }
      @keyframes skillFade { from { opacity: 0; } to { opacity: 1; } }
      @media (max-width: 900px) { .hero-grid, .stats-grid { grid-template-columns: 1fr !important; } .hero-side { min-width: 0 !important; } .retainer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
      @media (max-width: 760px) { .equipment-ring { display: none !important; } .equipment-mobile-grid { display: grid !important; } .cultivation-row { grid-template-columns: 1fr !important; } }
      @media (max-width: 640px) { .retainer-grid { grid-template-columns: 1fr !important; } .timeline-scroll { grid-auto-columns: minmax(88vw, 88vw) !important; } }
      @media (prefers-reduced-motion: reduce) { .chapter-current, .skill-fade { animation: none !important; } }
    `}</style>
    <div style={{ display: "grid", gap: 18 }}>
      <Section dark={dark}><HeroCard dark={dark} rank={rank} level={level} totalExp={totalExp} expInLevel={expInLevel} expNeeded={expNeeded} expProgress={expProgress} currentCity={currentCity} travelDays={travelDays} expFormula={expFormula} levelFormula={levelFormula} /></Section>
      <Section dark={dark}><SectionHeader icon="🧭" zh="章节时间线" en="Chapter Timeline" dark={dark} /><Timeline chapters={chapters} dark={dark} /></Section>
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
