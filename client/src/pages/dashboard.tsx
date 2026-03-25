import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, eachMonthOfInterval, startOfYear, endOfYear, differenceInDays, startOfWeek, endOfWeek, isWithinInterval, getISOWeek } from "date-fns";
import { Plus, Minus, Trash2, Sun, Moon, X } from "lucide-react";
import { EggBasket } from "@/components/EggBasket";
import { EggStackChart } from "@/components/EggStackChart";
import { WeatherBadge } from "@/components/WeatherBadge";
import type { EggEntry, Chicken } from "@shared/schema";

// ─── Milestone badges ───
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

function getEarnedMilestones(total: number) {
  return MILESTONES.filter(m => total >= m.threshold);
}

function getNextMilestone(total: number) {
  return MILESTONES.find(m => total < m.threshold) || null;
}

// ─── Affirmations pool ───
const AFFIRMATIONS = [
  "You're an absolute egg-laying superstar!",
  "The coop wouldn't be the same without you!",
  "Keep struttin' your stuff, you magnificent bird!",
  "You've been laying it DOWN this week!",
  "MVP of the henhouse, no contest!",
  "Your eggs are chef's kiss perfection!",
  "The flock looks up to you (literally)!",
  "Top-tier feathers AND top-tier eggs!",
  "You make every morning brighter!",
  "Cluckin' amazing work this week!",
  "The breakfast table thanks you!",
  "Nobody does it better, bawk bawk!",
  "You deserve all the scratch and treats!",
  "Queen of the nesting box!",
  "What a week — you crushed it!",
  "You lay eggs like it's your job... because it is, and you're great at it!",
  "Your commitment to breakfast excellence is unmatched!",
  "If there were a Chicken Hall of Fame, you'd be first ballot!",
];

function getWeeklyAffirmation(chickenName: string, weekNumber: number): string {
  // Deterministic pick based on chicken name + week so it stays stable for the week
  const seed = (chickenName.length * 31 + weekNumber * 17) % AFFIRMATIONS.length;
  return AFFIRMATIONS[seed];
}

function getChickenOfTheWeek(allChickens: Chicken[], weekNumber: number): Chicken | null {
  if (allChickens.length === 0) return null;
  const index = weekNumber % allChickens.length;
  return allChickens[index];
}

// ─── Theme toggle ───
function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    // Default to dark mode
    document.documentElement.classList.add("dark");
    return true;
  });

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <Button size="icon" variant="ghost" onClick={toggle} data-testid="theme-toggle">
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}

// ─── Main dashboard ───
export default function Dashboard() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [eggCount, setEggCount] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [chickenName, setChickenName] = useState("");
  const [showManageChickens, setShowManageChickens] = useState(false);

  // ─── Data queries ───
  const { data: entries = [], isLoading } = useQuery<EggEntry[]>({
    queryKey: ["/api/entries", selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/entries?year=${selectedYear}`);
      return res.json();
    },
  });

  const { data: allChickens = [] } = useQuery<Chicken[]>({
    queryKey: ["/api/chickens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/chickens");
      return res.json();
    },
  });

  // ─── Mutations ───
  const addMutation = useMutation({
    mutationFn: async (data: { date: string; count: number }) => {
      const res = await apiRequest("POST", "/api/entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", selectedYear] });
      setEggCount("");
      toast({ title: "🥚 Eggs logged!", description: "Another great day at the coop." });
    },
    onError: () => {
      toast({ title: "Oops!", description: "Failed to save that entry.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", selectedYear] });
    },
  });

  const addChickenMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/chickens", { name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chickens"] });
      setChickenName("");
      toast({ title: "🐔 Welcome to the flock!", description: "New chicken added." });
    },
  });

  const deleteChickenMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chickens/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chickens"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) return;
    addMutation.mutate({ date: selectedDate, count });
  };

  const handleAddChicken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chickenName.trim()) return;
    addChickenMutation.mutate(chickenName.trim());
  };

  // ─── Computed stats ───
  const stats = useMemo(() => {
    if (!entries.length)
      return { total: 0, dailyAvg: 0, weeklyAvg: 0, monthlyAvg: 0, bestDay: null as EggEntry | null, bestCount: 0, daysLogged: 0 };

    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const daysLogged = entries.length;
    const dailyAvg = total / daysLogged;

    const now = new Date();
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = selectedYear === currentYear ? now : endOfYear(new Date(selectedYear, 0, 1));
    const totalWeeks = Math.max(1, Math.ceil(differenceInDays(yearEnd, yearStart) / 7));
    const weeklyAvg = total / totalWeeks;

    const monthsSet = new Set(entries.map((e) => e.date.substring(0, 7)));
    const monthlyAvg = monthsSet.size > 0 ? total / monthsSet.size : 0;

    const bestEntry = entries.reduce((best, e) => (e.count > (best?.count ?? 0) ? e : best), entries[0]);

    return { total, dailyAvg, weeklyAvg, monthlyAvg, bestDay: bestEntry, bestCount: bestEntry?.count ?? 0, daysLogged };
  }, [entries, selectedYear, currentYear]);

  // ─── Monthly bar chart ───
  const monthlyData = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return months.map((month) => {
      const monthStr = format(month, "yyyy-MM");
      const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
      const total = monthEntries.reduce((sum, e) => sum + e.count, 0);
      return { month: format(month, "MMM"), eggs: total };
    });
  }, [entries, selectedYear]);



  // ─── Recent entries ───
  const recentEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [entries]);

  // ─── This week ───
  const thisWeekTotal = useMemo(() => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 0 });
    const wEnd = endOfWeek(now, { weekStartsOn: 0 });
    return entries
      .filter((e) => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: wStart, end: wEnd });
      })
      .reduce((sum, e) => sum + e.count, 0);
  }, [entries]);

  // ─── Chicken of the Week ───
  const weekNumber = getISOWeek(new Date());
  const chickenOfTheWeek = getChickenOfTheWeek(allChickens, weekNumber);
  const affirmation = chickenOfTheWeek ? getWeeklyAffirmation(chickenOfTheWeek.name, weekNumber) : "";

  const availableYears = useMemo(() => {
    const years = [currentYear];
    for (let y = currentYear - 1; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl" role="img" aria-label="chicken">🐔</span>
              <h1 className="text-lg font-bold tracking-tight" data-testid="app-title">
                The Coop Counter
              </h1>
            </div>
            <div className="hidden sm:block">
              <WeatherBadge />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="text-sm bg-muted border border-border rounded-md px-2 py-1.5 font-medium"
              data-testid="year-selector"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ThemeToggle />
          </div>
        </div>
        {/* Weather on mobile — below header row */}
        <div className="sm:hidden max-w-6xl mx-auto px-4 pb-2">
          <WeatherBadge />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Egg Input Form */}
        <Card data-testid="egg-input-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">📅 Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="w-full sm:w-auto">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">🥚 Eggs collected</label>
                <div className="flex items-center gap-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="rounded-r-none flex-shrink-0"
                    onClick={() => setEggCount(String(Math.max(0, (parseInt(eggCount) || 0) - 1)))}
                    data-testid="button-minus"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={eggCount}
                    onChange={(e) => setEggCount(e.target.value)}
                    className="w-16 text-center rounded-none border-x-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    data-testid="input-egg-count"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="rounded-l-none flex-shrink-0"
                    onClick={() => setEggCount(String(Math.min(100, (parseInt(eggCount) || 0) + 1)))}
                    data-testid="button-plus"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button type="submit" disabled={addMutation.isPending || !eggCount} data-testid="button-submit">
                <Plus className="w-4 h-4 mr-1" />
                Log Eggs
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Chicken of the Week */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/[0.03]" data-testid="chicken-of-the-week">
          <CardContent className="pt-5 pb-5">
            {chickenOfTheWeek ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="text-5xl flex-shrink-0" role="img" aria-label="star chicken">🐓</div>
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">
                    🌟 Chicken of the Week 🌟
                  </p>
                  <p className="text-xl font-bold">{chickenOfTheWeek.name}</p>
                  <p className="text-sm text-muted-foreground mt-1 italic">"{affirmation}"</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">
                  🐣 No chickens in the flock yet! Add your chickens below to see who gets featured each week.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowManageChickens(true)}
                  data-testid="button-add-chickens-cta"
                >
                  Add Your Chickens
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="stat-total">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🥚</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedYear} Total</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-this-week">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">📦</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{thisWeekTotal}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-daily-avg">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">📊</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Daily Avg</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.dailyAvg.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-best-day">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🏆</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Best Day</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.bestCount}</p>
              {stats.bestDay && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(stats.bestDay.date), "MMM d, yyyy")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Averages row */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">📅</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly Avg</span>
              </div>
              <p className="text-xl font-bold tabular-nums mt-1">{stats.weeklyAvg.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">🗓️</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Avg</span>
              </div>
              <p className="text-xl font-bold tabular-nums mt-1">{stats.monthlyAvg.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Milestones & Badges */}
        <Card data-testid="milestones">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🏅 Milestones</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const earned = getEarnedMilestones(stats.total);
              const next = getNextMilestone(stats.total);
              return (
                <div>
                  {/* Earned badges */}
                  {earned.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <p className="text-2xl mb-2">🐣</p>
                      <p className="text-sm">Log your first 10 eggs to earn your first badge!</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {earned.map((m) => (
                        <div
                          key={m.threshold}
                          className="group relative flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/60 min-w-[80px]"
                          data-testid={`badge-${m.threshold}`}
                        >
                          <span className="text-2xl">{m.emoji}</span>
                          <span className="text-[10px] font-semibold text-center leading-tight">{m.title}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">{m.threshold.toLocaleString()}</span>
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground text-background text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {m.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Next milestone teaser */}
                  {next && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-dashed border-border">
                      <span className="text-xl opacity-40 grayscale">{next.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground">
                          Next: {next.title} — {next.threshold.toLocaleString()} eggs
                        </p>
                        <div className="w-full h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.min((stats.total / next.threshold) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        {(next.threshold - stats.total).toLocaleString()} to go
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Monthly Egg Stack Chart */}
          <Card data-testid="chart-monthly">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🍳 Eggs by Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <EggStackChart data={monthlyData} />
              </div>
            </CardContent>
          </Card>

          {/* Egg Basket */}
          <Card data-testid="chart-basket">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                🧺 {selectedYear} Egg Basket
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <EggBasket current={stats.total} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Entries */}
        <Card data-testid="recent-entries">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🪺 Recent Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : recentEntries.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-3xl mb-3">🐣</p>
                <p className="text-sm font-medium">No eggs logged yet</p>
                <p className="text-xs mt-1">Use the form above to start tracking your flock's hard work!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                    data-testid={`entry-row-${entry.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24 tabular-nums">
                        {format(parseISO(entry.date), "MMM d, yyyy")}
                      </span>
                      <span className="font-semibold tabular-nums flex items-center gap-1.5">
                        <span className="text-primary">{entry.count}</span>
                        <span className="text-xs text-muted-foreground">egg{entry.count !== 1 ? "s" : ""}</span>
                        {entry.count >= 6 && <span title="Great day!">🔥</span>}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      data-testid={`button-delete-${entry.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage Chickens */}
        <Card data-testid="manage-chickens">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">🐔 Your Flock</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManageChickens(!showManageChickens)}
                data-testid="button-toggle-manage"
              >
                {showManageChickens ? "Hide" : "Manage"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Always show the list */}
            {allChickens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                🐣 No chickens added yet. Give your hens their well-deserved names!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {allChickens.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm font-medium"
                    data-testid={`chicken-tag-${c.id}`}
                  >
                    🐔 {c.name}
                    {showManageChickens && (
                      <button
                        onClick={() => deleteChickenMutation.mutate(c.id)}
                        className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-remove-chicken-${c.id}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Add form (always visible when manage is open, or when no chickens) */}
            {(showManageChickens || allChickens.length === 0) && (
              <form onSubmit={handleAddChicken} className="flex gap-2 mt-2">
                <Input
                  placeholder="Chicken name..."
                  value={chickenName}
                  onChange={(e) => setChickenName(e.target.value)}
                  className="flex-1"
                  data-testid="input-chicken-name"
                />
                <Button type="submit" size="sm" disabled={!chickenName.trim() || addChickenMutation.isPending} data-testid="button-add-chicken">
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
        <p className="mb-1">🐔🥚🐔🥚🐔</p>
        <a
          href="https://www.perplexity.ai/computer"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-foreground transition-colors"
        >
          Created with Perplexity Computer
        </a>
      </footer>
    </div>
  );
}
