import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, eachMonthOfInterval, startOfYear, endOfYear, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, getISOWeek, subDays, isEqual, startOfDay } from "date-fns";
import { Plus, Minus, Trash2, Sun, Moon, X, LogOut, UserPlus, Settings, Pencil, Check } from "lucide-react";
import { EggBasket } from "@/components/EggBasket";
import { EggStackChart } from "@/components/EggStackChart";
import { WeatherBadge } from "@/components/WeatherBadge";
import { playEggLogged, playPlus, playMinus, playClick, playToggle } from "@/lib/sounds";
import { useAuth } from "@/lib/auth";

interface EggEntry { id: number; date: string; count: number; note?: string | null; collectorIds?: string | null; eggColors?: string | null; }
interface Chicken { id: number; name: string; }
interface Collector { id: number; name: string; }

// ─── Egg colors ───
const EGG_COLOR_OPTIONS = [
  { key: "white",    label: "White",    color: "#F5F0E8", border: "#D4CFC5" },
  { key: "brown",    label: "Brown",    color: "#C4956A", border: "#A67B52" },
  { key: "tan",      label: "Tan",      color: "#DBBF97", border: "#C4A67A" },
  { key: "blue",     label: "Blue",     color: "#A8C8D8", border: "#82AAB8" },
  { key: "green",    label: "Green",    color: "#B5CCAB", border: "#8FAF82" },
  { key: "pink",     label: "Pink",     color: "#E8C4C4", border: "#CDA5A5" },
  { key: "speckled", label: "Speckled", color: "#D4C0A8", border: "#B8A68E" },
  { key: "chocolate",label: "Dark",     color: "#7B5141", border: "#5E3C2E" },
];

// ─── Coop milestones ───
const MILESTONES = [
  { threshold: 10,    emoji: "🐣", title: "First Steps",       message: "Your first 10 eggs! The journey begins." },
  { threshold: 50,    emoji: "🥚", title: "Egg-cellent Start", message: "50 eggs collected — the coop is producing!" },
  { threshold: 100,   emoji: "💯", title: "Century Club",      message: "Triple digits! 100 eggs and counting." },
  { threshold: 250,   emoji: "🥉", title: "Bronze Coop",       message: "250 eggs — your flock is on a roll." },
  { threshold: 500,   emoji: "🥈", title: "Silver Coop",       message: "Half a thousand eggs! Incredible." },
  { threshold: 750,   emoji: "⭐", title: "Coop All-Star",     message: "750 eggs — your hens deserve a vacation." },
  { threshold: 1000,  emoji: "🥇", title: "Gold Coop",         message: "ONE THOUSAND EGGS. Legendary status." },
  { threshold: 1500,  emoji: "💎", title: "Diamond Coop",      message: "1,500 eggs — you're running a small farm empire." },
  { threshold: 2000,  emoji: "👑", title: "Royal Coop",        message: "2,000 eggs! Bow before the egg royalty." },
  { threshold: 3000,  emoji: "🏰", title: "Egg Dynasty",       message: "3,000 eggs. This isn't a hobby, it's a legacy." },
  { threshold: 5000,  emoji: "🚀", title: "To the Moon",       message: "5,000 eggs! Houston, we have a coop." },
  { threshold: 10000, emoji: "🐉", title: "Egg Dragon",        message: "10,000 eggs. You are the stuff of legend." },
];
function getEarnedMilestones(total: number) { return MILESTONES.filter(m => total >= m.threshold); }
function getNextMilestone(total: number) { return MILESTONES.find(m => total < m.threshold) || null; }

// ─── Collector titles ───
const COLLECTOR_TITLES = [
  { minEggs: 0,    minCollections: 0,  emoji: "🐣", title: "Egg Rookie" },
  { minEggs: 10,   minCollections: 3,  emoji: "🧤", title: "Coop Helper" },
  { minEggs: 30,   minCollections: 7,  emoji: "🥚", title: "Egg Apprentice" },
  { minEggs: 75,   minCollections: 15, emoji: "🧺", title: "Basket Filler" },
  { minEggs: 150,  minCollections: 25, emoji: "🥷", title: "Egg Ninja" },
  { minEggs: 300,  minCollections: 50, emoji: "⭐", title: "Star Collector" },
  { minEggs: 500,  minCollections: 75, emoji: "🦸", title: "Coop Hero" },
  { minEggs: 750,  minCollections: 100,emoji: "🏆", title: "Master Collector" },
  { minEggs: 1000, minCollections: 150,emoji: "👑", title: "Egg Royalty" },
  { minEggs: 2000, minCollections: 250,emoji: "🐉", title: "Legendary" },
];
function getCollectorTitle(eggs: number, collections: number) {
  let title = COLLECTOR_TITLES[0];
  for (const t of COLLECTOR_TITLES) {
    if (eggs >= t.minEggs && collections >= t.minCollections) title = t;
  }
  return title;
}

// ─── Affirmations ───
const AFFIRMATIONS = [
  "You're an absolute egg-laying superstar!", "The coop wouldn't be the same without you!",
  "Keep struttin' your stuff, you magnificent bird!", "You've been laying it DOWN this week!",
  "MVP of the henhouse, no contest!", "Your eggs are chef's kiss perfection!",
  "The flock looks up to you (literally)!", "Top-tier feathers AND top-tier eggs!",
  "You make every morning brighter!", "Cluckin' amazing work this week!",
  "The breakfast table thanks you!", "Nobody does it better, bawk bawk!",
  "You deserve all the scratch and treats!", "Queen of the nesting box!",
  "What a week — you crushed it!", "You lay eggs like it's your job... because it is, and you're great at it!",
  "Your commitment to breakfast excellence is unmatched!", "If there were a Chicken Hall of Fame, you'd be first ballot!",
];
function getWeeklyAffirmation(name: string, week: number) { return AFFIRMATIONS[(name.length * 31 + week * 17) % AFFIRMATIONS.length]; }
function getChickenOfTheWeek(chickens: Chicken[], week: number) { return chickens.length ? chickens[week % chickens.length] : null; }

const RANK_DISPLAY = ["🥇", "🥈", "🥉"];

// ─── Streak calculator ───
function calculateStreak(entries: EggEntry[]): { current: number; best: number } {
  if (!entries.length) return { current: 0, best: 0 };
  const dates = new Set(entries.map(e => e.date));
  let current = 0;
  let day = startOfDay(new Date());
  // Check if today or yesterday has an entry (streak can still be active if you haven't logged today yet)
  const todayStr = format(day, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(day, 1), "yyyy-MM-dd");
  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return { current: 0, best: getBestStreak(dates) };
  const startFrom = dates.has(todayStr) ? day : subDays(day, 1);
  let d = startFrom;
  while (dates.has(format(d, "yyyy-MM-dd"))) {
    current++;
    d = subDays(d, 1);
  }
  return { current, best: Math.max(current, getBestStreak(dates)) };
}
function getBestStreak(dates: Set<string>): number {
  const sorted = Array.from(dates).sort();
  let best = 0, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = parseISO(sorted[i - 1]);
    const curr = parseISO(sorted[i]);
    if (isEqual(startOfDay(subDays(curr, 1)), startOfDay(prev))) { run++; }
    else { best = Math.max(best, run); run = 1; }
  }
  return Math.max(best, run);
}
function streakFlame(streak: number): string {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 3) return "🔥";
  if (streak >= 1) return "✨";
  return "";
}

// ─── Theme toggle ───
function ThemeToggle() {
  const [dark, setDark] = useState(() => { document.documentElement.classList.add("dark"); return true; });
  return (
    <Button size="icon" variant="ghost" onClick={() => { const n = !dark; setDark(n); document.documentElement.classList.toggle("dark", n); playClick(); }} data-testid="theme-toggle">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ─── Egg color nest viz ───
// Nest positions for eggs — arranged in a natural pile inside a nest shape
const NEST_EGG_SLOTS: [number, number][] = [
  // Bottom row
  [55, 145], [80, 148], [105, 146], [130, 148], [155, 145],
  // Row 2
  [65, 128], [92, 125], [118, 125], [145, 128],
  // Row 3
  [55, 110], [82, 107], [110, 105], [138, 107], [158, 110],
  // Row 4
  [70, 92], [98, 88], [125, 88], [150, 92],
  // Row 5
  [60, 75], [88, 72], [115, 70], [140, 72], [160, 75],
  // Top overflow
  [75, 58], [105, 55], [132, 58],
];

function EggColorRainbow({ entries }: { entries: EggEntry[] }) {
  const colorTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach(entry => {
      if (!entry.eggColors) return;
      try {
        const colors: Record<string, number> = JSON.parse(entry.eggColors);
        Object.entries(colors).forEach(([k, v]) => { totals[k] = (totals[k] || 0) + v; });
      } catch {}
    });
    return totals;
  }, [entries]);

  const total = Object.values(colorTotals).reduce((s, v) => s + v, 0);

  // Build a list of individual eggs with their colors, proportional to totals
  // Must call useMemo unconditionally (React hooks rules)
  const nestEggs = useMemo(() => {
    if (total === 0) return [];
    const eggs: { color: string; border: string; label: string }[] = [];
    // Scale so max eggs fill the nest
    const maxSlots = NEST_EGG_SLOTS.length;
    const scale = total > maxSlots ? maxSlots / total : 1;

    EGG_COLOR_OPTIONS.forEach(opt => {
      const count = colorTotals[opt.key] || 0;
      if (count === 0) return;
      const scaledCount = Math.max(1, Math.round(count * scale));
      for (let i = 0; i < scaledCount && eggs.length < maxSlots; i++) {
        eggs.push({ color: opt.color, border: opt.border, label: opt.label });
      }
    });

    // Shuffle deterministically for a natural mixed look
    for (let i = eggs.length - 1; i > 0; i--) {
      const j = (i * 7 + 3) % (i + 1);
      [eggs[i], eggs[j]] = [eggs[j], eggs[i]];
    }
    return eggs;
  }, [colorTotals, total]);

  if (total === 0) return (
    <div className="text-center py-4 text-muted-foreground">
      <p className="text-2xl mb-2">🌈</p>
      <p className="text-sm">Tag egg colors when logging to see your rainbow!</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 215 185" className="w-full max-w-[280px] h-auto">
        {/* Nest body — woven straw look */}
        <ellipse cx="108" cy="140" rx="75" ry="35" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
        {/* Straw texture lines */}
        {[125, 135, 145, 155].map((y, i) => {
          const shrink = Math.abs(y - 140) * 1.2;
          return <line key={i} x1={40 + shrink} y1={y} x2={176 - shrink} y2={y}
            stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />;
        })}
        {[60, 80, 108, 136, 156].map((x, i) => (
          <line key={`v${i}`} x1={x} y1={110} x2={x + (x > 108 ? 3 : -3)} y2={165}
            stroke="hsl(var(--border))" strokeWidth="0.8" opacity="0.35" />
        ))}

        {/* Colored eggs */}
        {nestEggs.map((egg, i) => {
          if (i >= NEST_EGG_SLOTS.length) return null;
          const [cx, cy] = NEST_EGG_SLOTS[i];
          const rotation = ((i * 23 + 7) % 30) - 15;
          const rx = 10 + (i % 3) * 0.5;
          const ry = 12.5 + (i % 2) * 0.5;
          return (
            <g key={i} transform={`rotate(${rotation}, ${cx}, ${cy})`}>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
                fill={egg.color} stroke={egg.border} strokeWidth="0.8">
                <animate attributeName="opacity" from="0" to="1" dur="0.3s"
                  begin={`${i * 0.04}s`} fill="freeze" />
              </ellipse>
              {/* Highlight */}
              <ellipse cx={cx - 2} cy={cy - 3} rx={rx * 0.35} ry={ry * 0.3}
                fill="white" opacity="0.3" />
              {/* Speckle dots for speckled eggs */}
              {egg.label === "Speckled" && (
                <>
                  <circle cx={cx - 3} cy={cy - 1} r="1" fill="#8B7355" opacity="0.5" />
                  <circle cx={cx + 2} cy={cy + 2} r="0.8" fill="#8B7355" opacity="0.4" />
                  <circle cx={cx + 1} cy={cy - 4} r="0.6" fill="#8B7355" opacity="0.4" />
                </>
              )}
            </g>
          );
        })}

        {/* Nest rim — front */}
        <path d="M30,130 Q30,110 108,105 Q186,110 186,130"
          fill="none" stroke="hsl(var(--foreground))" strokeWidth="2.5" opacity="0.2" strokeLinecap="round" />
      </svg>

      {/* Legend below */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
        {EGG_COLOR_OPTIONS.filter(c => (colorTotals[c.key] || 0) > 0).map(c => (
          <div key={c.key} className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color, border: `1px solid ${c.border}` }} />
            <span className="text-muted-foreground">{c.label}</span>
            <span className="font-semibold tabular-nums">{colorTotals[c.key]}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1 tabular-nums">{total} colored eggs total</p>
    </div>
  );
}

// ─── Main ───
export default function Dashboard() {
  const { toast } = useToast();
  const { user, family, logout } = useAuth();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [eggCount, setEggCount] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedCollectors, setSelectedCollectors] = useState<number[]>([]);
  const [selectedColors, setSelectedColors] = useState<Record<string, number>>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [chickenName, setChickenName] = useState("");
  const [showManageChickens, setShowManageChickens] = useState(false);
  const [collectorName, setCollectorName] = useState("");
  const [showManageCollectors, setShowManageCollectors] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [showFamilySettings, setShowFamilySettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editCoopName, setEditCoopName] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [isEditingCoopName, setIsEditingCoopName] = useState(false);

  // Family members & invites
  const { data: familyMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/family/members"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/family/members"); return r.json(); },
  });
  const { data: pendingInvites = [] } = useQuery<any[]>({
    queryKey: ["/api/family/invites"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/family/invites"); return r.json(); },
  });
  const inviteMutation = useMutation({
    mutationFn: async (email: string) => { const r = await apiRequest("POST", "/api/family/invite", { email }); return r.json(); },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/family/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/family/invites"] });
      setInviteEmail("");
      toast({ title: data.autoAdded ? "👥 Member added!" : "📧 Invite sent!", description: data.message });
    },
    onError: () => { toast({ title: "Oops!", description: "Failed to send invite.", variant: "destructive" }); },
  });

  // ─── Queries ───
  const { data: entries = [], isLoading } = useQuery<EggEntry[]>({
    queryKey: ["/api/entries", selectedYear],
    queryFn: async () => { const r = await apiRequest("GET", `/api/entries?year=${selectedYear}`); return r.json(); },
  });
  const { data: allChickens = [] } = useQuery<Chicken[]>({
    queryKey: ["/api/chickens"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/chickens"); return r.json(); },
  });
  const { data: allCollectors = [] } = useQuery<Collector[]>({
    queryKey: ["/api/collectors"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/collectors"); return r.json(); },
  });

  // ─── Mutations ───
  const addMutation = useMutation({
    mutationFn: async (data: { date: string; count: number; collectorIds?: string; eggColors?: string }) => {
      const r = await apiRequest("POST", "/api/entries", data); return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", selectedYear] });
      setEggCount(""); setSelectedCollectors([]); setSelectedColors({}); setShowColorPicker(false);
      playEggLogged();
      toast({ title: "🥚 Eggs logged!", description: "Another great day at the coop." });
    },
    onError: () => { toast({ title: "Oops!", description: "Failed to save.", variant: "destructive" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/entries/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/entries", selectedYear] }); },
  });
  const addChickenMutation = useMutation({
    mutationFn: async (name: string) => { const r = await apiRequest("POST", "/api/chickens", { name }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chickens"] }); setChickenName(""); playEggLogged(); toast({ title: "🐔 Welcome to the flock!" }); },
  });
  const deleteChickenMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/chickens/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chickens"] }); },
  });
  const addCollectorMutation = useMutation({
    mutationFn: async (name: string) => { const r = await apiRequest("POST", "/api/collectors", { name }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/collectors"] }); setCollectorName(""); playEggLogged(); toast({ title: "👤 Collector added!" }); },
  });
  const deleteCollectorMutation = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/collectors/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/collectors"] }); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) return;
    const collectorIds = selectedCollectors.length > 0 ? JSON.stringify(selectedCollectors) : undefined;
    const colorTotal = Object.values(selectedColors).reduce((s, v) => s + v, 0);
    const eggColors = colorTotal > 0 ? JSON.stringify(selectedColors) : undefined;
    addMutation.mutate({ date: selectedDate, count, collectorIds, eggColors });
  };

  const toggleCollector = (id: number) => {
    playToggle();
    setSelectedCollectors(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const adjustColor = (key: string, delta: number) => {
    playClick();
    setSelectedColors(prev => {
      const next = { ...prev };
      const val = (next[key] || 0) + delta;
      if (val <= 0) { delete next[key]; } else { next[key] = val; }
      return next;
    });
  };

  // ─── Stats ───
  const stats = useMemo(() => {
    if (!entries.length) return { total: 0, dailyAvg: 0, weeklyAvg: 0, monthlyAvg: 0, bestDay: null as EggEntry | null, bestCount: 0 };
    const total = entries.reduce((s, e) => s + e.count, 0);
    const dailyAvg = total / entries.length;
    const now = new Date();
    const yStart = startOfYear(new Date(selectedYear, 0, 1));
    const yEnd = selectedYear === currentYear ? now : endOfYear(new Date(selectedYear, 0, 1));
    const weeklyAvg = total / Math.max(1, Math.ceil(differenceInDays(yEnd, yStart) / 7));
    const monthsSet = new Set(entries.map(e => e.date.substring(0, 7)));
    const monthlyAvg = monthsSet.size > 0 ? total / monthsSet.size : 0;
    const bestEntry = entries.reduce((b, e) => (e.count > (b?.count ?? 0) ? e : b), entries[0]);
    return { total, dailyAvg, weeklyAvg, monthlyAvg, bestDay: bestEntry, bestCount: bestEntry?.count ?? 0 };
  }, [entries, selectedYear, currentYear]);

  const streak = useMemo(() => calculateStreak(entries), [entries]);

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: new Date(selectedYear, 0, 1), end: new Date(selectedYear, 11, 31) });
    return months.map(m => {
      const ms = format(m, "yyyy-MM");
      return { month: format(m, "MMM"), eggs: entries.filter(e => e.date.startsWith(ms)).reduce((s, e) => s + e.count, 0) };
    });
  }, [entries, selectedYear]);

  const recentEntries = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [entries]);

  const thisWeekTotal = useMemo(() => {
    const now = new Date(); const wS = startOfWeek(now, { weekStartsOn: 0 }); const wE = endOfWeek(now, { weekStartsOn: 0 });
    return entries.filter(e => isWithinInterval(parseISO(e.date), { start: wS, end: wE })).reduce((s, e) => s + e.count, 0);
  }, [entries]);

  // ─── Leaderboard with titles ───
  const leaderboard = useMemo(() => {
    const collectorMap = new Map<number, { name: string; totalEggs: number; collections: number }>();
    allCollectors.forEach(c => collectorMap.set(c.id, { name: c.name, totalEggs: 0, collections: 0 }));
    entries.forEach(entry => {
      if (!entry.collectorIds) return;
      try {
        const ids: number[] = JSON.parse(entry.collectorIds);
        ids.forEach(id => {
          const c = collectorMap.get(id);
          if (c) { c.totalEggs += entry.count; c.collections += 1; }
        });
      } catch {}
    });
    return Array.from(collectorMap.values()).sort((a, b) => b.totalEggs - a.totalEggs);
  }, [entries, allCollectors]);

  const weekNumber = getISOWeek(new Date());
  const chickenOfTheWeek = getChickenOfTheWeek(allChickens, weekNumber);
  const affirmation = chickenOfTheWeek ? getWeeklyAffirmation(chickenOfTheWeek.name, weekNumber) : "";
  const availableYears = useMemo(() => { const y = [currentYear]; for (let i = currentYear - 1; i >= currentYear - 5; i--) y.push(i); return y; }, [currentYear]);

  const getCollectorNames = (entry: EggEntry): string[] => {
    if (!entry.collectorIds) return [];
    try { return (JSON.parse(entry.collectorIds) as number[]).map(id => allCollectors.find(c => c.id === id)?.name).filter(Boolean) as string[]; }
    catch { return []; }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐔</span>
              <h1 className="text-lg font-bold tracking-tight" data-testid="app-title">The Coop Counter</h1>
            </div>
            <div className="hidden sm:block"><WeatherBadge /></div>
          </div>
          <div className="flex items-center gap-2">
            {family && <span className="text-xs text-muted-foreground hidden sm:inline">🏠 {family.name}</span>}
            <select value={selectedYear} onChange={(e) => { setSelectedYear(parseInt(e.target.value)); playClick(); }}
              className="text-sm bg-muted border border-border rounded-md px-2 py-1.5 font-medium" data-testid="year-selector">
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ThemeToggle />
            <Button size="icon" variant="ghost" onClick={logout} title="Log out" data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="sm:hidden max-w-6xl mx-auto px-4 pb-2"><WeatherBadge /></div>
      </header>

      {/* Coop Name Banner */}
      <div className="max-w-6xl mx-auto px-4 pt-5 pb-1">
        <div className="flex items-center gap-2">
          {isEditingCoopName ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (editCoopName.trim()) {
                await apiRequest("PATCH", "/api/family", { name: editCoopName.trim() });
                queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                // Update local state
                if (family) family.name = editCoopName.trim();
              }
              setIsEditingCoopName(false);
            }} className="flex items-center gap-2">
              <Input value={editCoopName} onChange={(e) => setEditCoopName(e.target.value)}
                className="text-xl font-bold h-auto py-1 px-2 w-64" autoFocus data-testid="input-edit-coop-name" />
              <Button type="submit" size="icon" variant="ghost"><Check className="w-4 h-4" /></Button>
              <Button type="button" size="icon" variant="ghost" onClick={() => setIsEditingCoopName(false)}><X className="w-4 h-4" /></Button>
            </form>
          ) : (
            <>
              <h2 className="text-xl font-bold">{family?.name || "My Coop"}</h2>
              <Button size="icon" variant="ghost" className="opacity-50 hover:opacity-100" onClick={() => {
                setEditCoopName(family?.name || ""); setIsEditingCoopName(true);
              }} data-testid="button-edit-coop-name"><Pencil className="w-3.5 h-3.5" /></Button>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Welcome back, {user?.name} 👋</p>
      </div>

      <main className="max-w-6xl mx-auto px-4 pb-6 space-y-6">
        {/* Egg Input Form */}
        <Card data-testid="egg-input-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">📅 Date</label>
                  <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} data-testid="input-date" />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">🥚 Eggs collected</label>
                  <div className="flex items-center gap-0">
                    <Button type="button" variant="secondary" size="icon" className="rounded-r-none flex-shrink-0"
                      onClick={() => { setEggCount(String(Math.max(0, (parseInt(eggCount) || 0) - 1))); playMinus(); }} data-testid="button-minus">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input type="number" min="0" max="100" placeholder="0" value={eggCount}
                      onChange={(e) => setEggCount(e.target.value)}
                      className="w-16 text-center rounded-none border-x-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      data-testid="input-egg-count" />
                    <Button type="button" variant="secondary" size="icon" className="rounded-l-none flex-shrink-0"
                      onClick={() => { setEggCount(String(Math.min(100, (parseInt(eggCount) || 0) + 1))); playPlus(); }} data-testid="button-plus">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={addMutation.isPending || !eggCount} data-testid="button-submit">
                  <Plus className="w-4 h-4 mr-1" /> Log Eggs
                </Button>
              </div>

              {/* Collector selection */}
              {allCollectors.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">👤 Who collected?</label>
                  <div className="flex flex-wrap gap-2">
                    {allCollectors.map(c => (
                      <button key={c.id} type="button" onClick={() => toggleCollector(c.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCollectors.includes(c.id) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        data-testid={`collector-toggle-${c.id}`}>
                        {selectedCollectors.includes(c.id) ? "✓ " : ""}{c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Egg color picker */}
              <div>
                <button type="button" onClick={() => { setShowColorPicker(!showColorPicker); playClick(); }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  🌈 {showColorPicker ? "Hide" : "Tag"} egg colors {Object.keys(selectedColors).length > 0 ? `(${Object.values(selectedColors).reduce((s,v)=>s+v,0)} tagged)` : "(optional)"}
                </button>
                {showColorPicker && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mt-2">
                    {EGG_COLOR_OPTIONS.map(c => (
                      <div key={c.key} className="flex flex-col items-center gap-1">
                        <div className="w-8 h-10 rounded-full" style={{ backgroundColor: c.color, border: `2px solid ${c.border}` }}
                          title={c.label} />
                        <span className="text-[10px] text-muted-foreground">{c.label}</span>
                        <div className="flex items-center gap-0.5">
                          <button type="button" onClick={() => adjustColor(c.key, -1)}
                            className="w-5 h-5 rounded bg-muted text-xs flex items-center justify-center hover:bg-muted-foreground/20">−</button>
                          <span className="w-5 text-center text-xs font-semibold tabular-nums">{selectedColors[c.key] || 0}</span>
                          <button type="button" onClick={() => adjustColor(c.key, 1)}
                            className="w-5 h-5 rounded bg-muted text-xs flex items-center justify-center hover:bg-muted-foreground/20">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Chicken of the Week */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/[0.03]" data-testid="chicken-of-the-week">
          <CardContent className="pt-5 pb-5">
            {chickenOfTheWeek ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-5xl flex-shrink-0">🐓</div>
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">🌟 Chicken of the Week 🌟</p>
                  <p className="text-xl font-bold">{chickenOfTheWeek.name}</p>
                  <p className="text-sm text-muted-foreground mt-1 italic">"{affirmation}"</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">🐣 No chickens in the flock yet! Add your chickens below to see who gets featured each week.</p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={() => { setShowManageChickens(true); playClick(); }}>Add Your Chickens</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards + Streak */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">🥚</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedYear} Total</span></div>
            <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">📦</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</span></div>
            <p className="text-2xl font-bold tabular-nums">{thisWeekTotal}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">{streak.current > 0 ? "🔥" : "📊"}</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Streak</span></div>
            <p className="text-2xl font-bold tabular-nums">{streak.current} <span className="text-sm font-normal text-muted-foreground">day{streak.current !== 1 ? "s" : ""}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">{streakFlame(streak.current)} {streak.best > streak.current ? `Best: ${streak.best}` : streak.current > 0 ? "Keep it going!" : "Log today to start!"}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">🏆</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Best Day</span></div>
            <p className="text-2xl font-bold tabular-nums">{stats.bestCount}</p>
            {stats.bestDay && <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(stats.bestDay.date), "MMM d, yyyy")}</p>}
          </CardContent></Card>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">📅</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly Avg</span></div>
            <p className="text-xl font-bold tabular-nums mt-1">{stats.weeklyAvg.toFixed(1)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1"><span className="text-base">🗓️</span><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Avg</span></div>
            <p className="text-xl font-bold tabular-nums mt-1">{stats.monthlyAvg.toFixed(0)}</p>
          </CardContent></Card>
        </div>

        {/* Leaderboard with collector titles */}
        {allCollectors.length > 0 && (
          <Card data-testid="leaderboard">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🏆 Egg Collection Leaderboard</CardTitle></CardHeader>
            <CardContent>
              {leaderboard.every(c => c.totalEggs === 0) ? (
                <div className="text-center py-4 text-muted-foreground"><p className="text-2xl mb-2">🏁</p><p className="text-sm">No eggs collected yet! Start logging and selecting who collected.</p></div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((person, i) => {
                    const maxEggs = leaderboard[0]?.totalEggs || 1;
                    const barWidth = Math.max(5, (person.totalEggs / maxEggs) * 100);
                    const title = getCollectorTitle(person.totalEggs, person.collections);
                    return (
                      <div key={person.name} className="flex items-center gap-3" data-testid={`leaderboard-row-${i}`}>
                        <span className="text-lg w-8 text-center flex-shrink-0">
                          {i < 3 ? RANK_DISPLAY[i] : <span className="text-xs text-muted-foreground font-bold">{i + 1}</span>}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold truncate">{person.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex-shrink-0">
                                {title.emoji} {title.title}
                              </span>
                            </div>
                            <span className="text-sm font-bold tabular-nums flex-shrink-0 ml-2">{person.totalEggs} 🥚</span>
                          </div>
                          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${barWidth}%`, backgroundColor: i === 0 ? "hsl(var(--primary))" : i === 1 ? "hsl(var(--chart-4))" : i === 2 ? "hsl(var(--chart-5))" : "hsl(var(--muted-foreground))", opacity: i >= 3 ? 0.5 : 1 }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{person.collections} collection{person.collections !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Egg Color Rainbow */}
        <Card data-testid="egg-rainbow">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🌈 Your Egg Rainbow</CardTitle></CardHeader>
          <CardContent><EggColorRainbow entries={entries} /></CardContent>
        </Card>

        {/* Milestones */}
        <Card data-testid="milestones">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🏅 Milestones</CardTitle></CardHeader>
          <CardContent>
            {(() => {
              const earned = getEarnedMilestones(stats.total);
              const next = getNextMilestone(stats.total);
              return (
                <div>
                  {earned.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground"><p className="text-2xl mb-2">🐣</p><p className="text-sm">Log your first 10 eggs to earn your first badge!</p></div>
                  ) : (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {earned.map(m => (
                        <div key={m.threshold} className="group relative flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/60 min-w-[80px]" data-testid={`badge-${m.threshold}`}>
                          <span className="text-2xl">{m.emoji}</span>
                          <span className="text-[10px] font-semibold text-center leading-tight">{m.title}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{m.threshold.toLocaleString()}</span>
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">{m.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {next && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-dashed border-border">
                      <span className="text-xl opacity-40 grayscale">{next.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">Next: {next.title} — {next.threshold.toLocaleString()} eggs</p>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min((stats.total / next.threshold) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">{(next.threshold - stats.total).toLocaleString()} to go</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🍳 Eggs by Month</CardTitle></CardHeader>
            <CardContent><div className="h-56"><EggStackChart data={monthlyData} /></div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🧺 {selectedYear} Egg Basket</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center"><EggBasket current={stats.total} /></CardContent></Card>
        </div>

        {/* Recent Entries */}
        <Card data-testid="recent-entries">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">🪺 Recent Entries</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />)}</div>
            ) : recentEntries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground"><p className="text-3xl mb-3">🐣</p><p className="text-sm font-medium">No eggs logged yet</p></div>
            ) : (
              <div className="space-y-1">
                {recentEntries.map(entry => {
                  const names = getCollectorNames(entry);
                  return (
                    <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group" data-testid={`entry-row-${entry.id}`}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm text-muted-foreground w-24 tabular-nums">{format(parseISO(entry.date), "MMM d, yyyy")}</span>
                        <span className="font-semibold tabular-nums flex items-center gap-1.5">
                          <span className="text-primary">{entry.count}</span>
                          <span className="text-xs text-muted-foreground">egg{entry.count !== 1 ? "s" : ""}</span>
                          {entry.count >= 6 && <span>🔥</span>}
                        </span>
                        {names.length > 0 && <span className="text-xs text-muted-foreground">👤 {names.join(", ")}</span>}
                        {entry.eggColors && (() => {
                          try {
                            const colors = JSON.parse(entry.eggColors) as Record<string, number>;
                            return (
                              <span className="flex gap-0.5">
                                {Object.entries(colors).map(([k, v]) => {
                                  const opt = EGG_COLOR_OPTIONS.find(o => o.key === k);
                                  return opt ? <span key={k} className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: opt.color, border: `1px solid ${opt.border}` }} title={`${opt.label}: ${v}`} /> : null;
                                })}
                              </span>
                            );
                          } catch { return null; }
                        })()}
                      </div>
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteMutation.mutate(entry.id)} data-testid={`button-delete-${entry.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage Collectors */}
        <Card data-testid="manage-collectors">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">👥 Egg Collectors</CardTitle>
              {allCollectors.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setShowManageCollectors(!showManageCollectors); playClick(); }}>{showManageCollectors ? "Hide" : "Manage"}</Button>}
            </div>
          </CardHeader>
          <CardContent>
            {allCollectors.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">👋 Add the family members who collect eggs to start the leaderboard competition!</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {allCollectors.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm font-medium" data-testid={`collector-tag-${c.id}`}>
                    👤 {c.name}
                    {showManageCollectors && <button onClick={() => deleteCollectorMutation.mutate(c.id)} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>}
                  </span>
                ))}
              </div>
            )}
            {(showManageCollectors || allCollectors.length === 0) && (
              <form onSubmit={(e) => { e.preventDefault(); if (collectorName.trim()) addCollectorMutation.mutate(collectorName.trim()); }} className="flex gap-2 mt-2">
                <Input placeholder="Name..." value={collectorName} onChange={(e) => setCollectorName(e.target.value)} className="flex-1" data-testid="input-collector-name" />
                <Button type="submit" size="sm" disabled={!collectorName.trim()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Manage Chickens */}
        <Card data-testid="manage-chickens">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">🐔 Your Flock</CardTitle>
              {allChickens.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setShowManageChickens(!showManageChickens); playClick(); }}>{showManageChickens ? "Hide" : "Manage"}</Button>}
            </div>
          </CardHeader>
          <CardContent>
            {allChickens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">🐣 No chickens added yet. Give your hens their well-deserved names!</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {allChickens.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm font-medium" data-testid={`chicken-tag-${c.id}`}>
                    🐔 {c.name}
                    {showManageChickens && <button onClick={() => deleteChickenMutation.mutate(c.id)} className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>}
                  </span>
                ))}
              </div>
            )}
            {(showManageChickens || allChickens.length === 0) && (
              <form onSubmit={(e) => { e.preventDefault(); if (chickenName.trim()) addChickenMutation.mutate(chickenName.trim()); }} className="flex gap-2 mt-2">
                <Input placeholder="Chicken name..." value={chickenName} onChange={(e) => setChickenName(e.target.value)} className="flex-1" />
                <Button type="submit" size="sm" disabled={!chickenName.trim()}><Plus className="w-4 h-4 mr-1" /> Add</Button>
              </form>
            )}
          </CardContent>
        </Card>
        {/* Settings */}
        <Card data-testid="settings">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">⚙️ Settings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
                {showSettings ? "Hide" : "Show"}
              </Button>
            </div>
          </CardHeader>
          {showSettings && (
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">👤 Your Name</label>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (editUserName.trim()) {
                    await apiRequest("PATCH", "/api/auth/profile", { name: editUserName.trim() });
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                    if (user) user.name = editUserName.trim();
                    toast({ title: "✅ Name updated!" });
                  }
                }} className="flex gap-2">
                  <Input value={editUserName || user?.name || ""} onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="Your name" className="flex-1" data-testid="input-edit-name" />
                  <Button type="submit" size="sm" disabled={!editUserName.trim() || editUserName.trim() === user?.name}>Save</Button>
                </form>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">📧 Email</label>
                <p className="text-sm text-foreground">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Email can't be changed yet</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">🐔 Coop Name</label>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (editCoopName.trim()) {
                    await apiRequest("PATCH", "/api/family", { name: editCoopName.trim() });
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                    if (family) family.name = editCoopName.trim();
                    setIsEditingCoopName(false);
                    toast({ title: "✅ Coop name updated!" });
                  }
                }} className="flex gap-2">
                  <Input value={editCoopName || family?.name || ""} onChange={(e) => setEditCoopName(e.target.value)}
                    placeholder="Coop name" className="flex-1" data-testid="input-settings-coop-name" />
                  <Button type="submit" size="sm" disabled={!editCoopName.trim() || editCoopName.trim() === family?.name}>Save</Button>
                </form>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Family Management */}
        <Card data-testid="family-management">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">🏠 {family?.name || "Your Family"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowFamilySettings(!showFamilySettings)}>
                {showFamilySettings ? "Hide" : "Manage"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Current members */}
            <div className="flex flex-wrap gap-2 mb-3">
              {familyMembers.map((m: any) => (
                <span key={m.id} className="inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm font-medium">
                  {m.role === "owner" ? "👑" : "👤"} {m.userName || "Member"}
                  <span className="text-[10px] text-muted-foreground">{m.role}</span>
                </span>
              ))}
            </div>

            {showFamilySettings && (
              <div className="space-y-3 mt-3">
                {/* Invite form */}
                <form onSubmit={(e) => { e.preventDefault(); if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim()); }} className="flex gap-2">
                  <Input type="email" placeholder="Family member's email..." value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)} className="flex-1" data-testid="input-invite-email" />
                  <Button type="submit" size="sm" disabled={!inviteEmail.trim() || inviteMutation.isPending}>
                    <UserPlus className="w-4 h-4 mr-1" /> Invite
                  </Button>
                </form>

                {/* Pending invites */}
                {pendingInvites.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">⏳ Pending invites</p>
                    {pendingInvites.map((inv: any) => (
                      <p key={inv.id} className="text-xs text-muted-foreground">📧 {inv.email}</p>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Invited members will join your coop when they sign up with that email.
                  Everyone in the family shares the same eggs, chickens, and leaderboard.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <p className="mb-1">🐔🥚🐔🥚🐔</p>
        <a href="https://www.perplexity.ai/computer" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Created with Perplexity Computer</a>
      </footer>
    </div>
  );
}
