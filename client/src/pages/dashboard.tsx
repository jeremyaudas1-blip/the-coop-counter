import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Egg, TrendingUp, Trophy, CalendarDays, Plus, Trash2, Sun, Moon, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import type { EggEntry } from "@shared/schema";

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

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

// Chicken SVG logo
function ChickenLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-label="The Coop Counter logo">
      {/* Egg body */}
      <ellipse cx="16" cy="18" rx="9" ry="11" fill="currentColor" opacity="0.15" />
      <ellipse cx="16" cy="18" rx="9" ry="11" stroke="currentColor" strokeWidth="1.5" fill="none" />
      {/* Comb */}
      <path d="M13 8 C13 5 15 4 16 4 C17 4 19 5 19 8" stroke="hsl(var(--primary))" strokeWidth="1.5" fill="hsl(var(--primary))" opacity="0.8" />
      {/* Eye */}
      <circle cx="14.5" cy="14" r="1" fill="currentColor" />
      {/* Beak */}
      <path d="M10 16 L13 15 L13 17 Z" fill="hsl(var(--chart-4))" />
    </svg>
  );
}

function EggIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 30" className={className} fill="currentColor">
      <ellipse cx="12" cy="17" rx="10" ry="12" />
    </svg>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [eggCount, setEggCount] = useState("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: entries = [], isLoading } = useQuery<EggEntry[]>({
    queryKey: ["/api/entries", selectedYear],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/entries?year=${selectedYear}`);
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { date: string; count: number }) => {
      const res = await apiRequest("POST", "/api/entries", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries", selectedYear] });
      setEggCount("");
      toast({ title: "Eggs logged", description: "Your egg count has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save entry.", variant: "destructive" });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(eggCount);
    if (isNaN(count) || count < 0) return;
    addMutation.mutate({ date: selectedDate, count });
  };

  // Computed stats
  const stats = useMemo(() => {
    if (!entries.length) return { total: 0, dailyAvg: 0, weeklyAvg: 0, monthlyAvg: 0, bestDay: null as EggEntry | null, bestCount: 0, daysLogged: 0 };

    const total = entries.reduce((sum, e) => sum + e.count, 0);
    const daysLogged = entries.length;
    const dailyAvg = total / daysLogged;

    // Weekly average: group by week
    const now = new Date();
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = selectedYear === currentYear ? now : endOfYear(new Date(selectedYear, 0, 1));
    const totalWeeks = Math.max(1, Math.ceil(differenceInDays(yearEnd, yearStart) / 7));
    const weeklyAvg = total / totalWeeks;

    // Monthly average
    const monthsSet = new Set(entries.map((e) => e.date.substring(0, 7)));
    const monthlyAvg = monthsSet.size > 0 ? total / monthsSet.size : 0;

    // Best day
    const bestEntry = entries.reduce((best, e) => (e.count > (best?.count ?? 0) ? e : best), entries[0]);

    return { total, dailyAvg, weeklyAvg, monthlyAvg, bestDay: bestEntry, bestCount: bestEntry?.count ?? 0, daysLogged };
  }, [entries, selectedYear, currentYear]);

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31);
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });

    return months.map((month) => {
      const monthStr = format(month, "yyyy-MM");
      const monthEntries = entries.filter((e) => e.date.startsWith(monthStr));
      const total = monthEntries.reduce((sum, e) => sum + e.count, 0);
      return {
        month: format(month, "MMM"),
        eggs: total,
      };
    });
  }, [entries, selectedYear]);

  // Cumulative chart data
  const cumulativeData = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let cumulative = 0;
    return sorted.map((entry) => {
      cumulative += entry.count;
      return {
        date: format(parseISO(entry.date), "MMM d"),
        rawDate: entry.date,
        daily: entry.count,
        cumulative,
      };
    });
  }, [entries]);

  // Recent entries (last 10)
  const recentEntries = useMemo(() => {
    return [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  }, [entries]);

  // This week's eggs
  const thisWeekTotal = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    return entries
      .filter((e) => {
        const d = parseISO(e.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, e) => sum + e.count, 0);
  }, [entries]);

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
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChickenLogo />
            <h1 className="text-lg font-bold tracking-tight" data-testid="app-title">
              The Coop Counter
            </h1>
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
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Egg Input Form */}
        <Card data-testid="egg-input-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Eggs collected</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={eggCount}
                  onChange={(e) => setEggCount(e.target.value)}
                  data-testid="input-egg-count"
                />
              </div>
              <Button type="submit" disabled={addMutation.isPending || !eggCount} data-testid="button-submit">
                <Plus className="w-4 h-4 mr-1" />
                Log Eggs
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card data-testid="stat-total">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Egg className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selectedYear} Total</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.total}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-this-week">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays className="w-4 h-4 text-chart-3" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">This Week</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{thisWeekTotal}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-daily-avg">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-chart-2" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Daily Avg</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{stats.dailyAvg.toFixed(1)}</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-best-day">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-chart-4" />
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

        {/* More averages row */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly Avg</span>
              <p className="text-xl font-bold tabular-nums mt-1">{stats.weeklyAvg.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Avg</span>
              <p className="text-xl font-bold tabular-nums mt-1">{stats.monthlyAvg.toFixed(0)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Monthly Bar Chart */}
          <Card data-testid="chart-monthly">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Eggs by Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: 13,
                      }}
                      formatter={(value: number) => [`${value} eggs`, "Total"]}
                    />
                    <Bar
                      dataKey="eggs"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      animationDuration={800}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cumulative Area Chart */}
          <Card data-testid="chart-cumulative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-chart-3" />
                Cumulative Eggs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cumGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        fontSize: 13,
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} eggs`,
                        name === "cumulative" ? "Running Total" : "Daily",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="hsl(var(--chart-3))"
                      fill="url(#cumGradient)"
                      strokeWidth={2}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Entries */}
        <Card data-testid="recent-entries">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Recent Entries</CardTitle>
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
                <EggIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No eggs logged yet</p>
                <p className="text-xs mt-1">Use the form above to start tracking.</p>
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

      </main>

      <footer className="text-center py-6 text-xs text-muted-foreground">
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
