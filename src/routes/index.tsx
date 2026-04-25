import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, ShoppingBag, Receipt, Package, Sparkles, Download, Filter } from "lucide-react";
import salesData from "@/data/sales.json";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Slicer } from "@/components/dashboard/Slicer";
import { inr, num, inrFull } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

type DailyRow = { date: string; revenue: number; orders: number; qty: number };
type Row = { revenue: number; orders: number; qty: number };

const PALETTE = [
  "oklch(0.62 0.24 0)",
  "oklch(0.72 0.18 350)",
  "oklch(0.55 0.18 300)",
  "oklch(0.78 0.16 80)",
  "oklch(0.45 0.12 200)",
  "oklch(0.5 0.18 30)",
];

function bucketDaily(rows: DailyRow[], mode: "Daily" | "Weekly" | "Monthly") {
  if (mode === "Daily") {
    return rows.map((r) => ({ key: r.date.slice(5), revenue: r.revenue, orders: r.orders }));
  }
  const map = new Map<string, { revenue: number; orders: number }>();
  rows.forEach((r) => {
    const d = new Date(r.date);
    let key: string;
    if (mode === "Weekly") {
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
      key = `W${String(week).padStart(2, "0")}`;
    } else {
      key = d.toLocaleString("en-US", { month: "short" });
    }
    const cur = map.get(key) ?? { revenue: 0, orders: 0 };
    cur.revenue += r.revenue;
    cur.orders += r.orders;
    map.set(key, cur);
  });
  return Array.from(map, ([key, v]) => ({ key, ...v }));
}

function Dashboard() {
  const data = salesData as unknown as {
    summary: { total_revenue: number; total_orders: number; total_units: number; avg_order_value: number; date_start: string; date_end: string };
    daily: DailyRow[];
    category: (Row & { category: string })[];
    product: (Row & { product: string })[];
    region: (Row & { region: string })[];
    city: (Row & { city: string })[];
    channel: (Row & { channel: string })[];
    brand: (Row & { brand: string })[];
  };

  const [trendMode, setTrendMode] = useState<"Daily" | "Weekly" | "Monthly">("Monthly");
  const [region, setRegion] = useState<string>("All");
  const [category, setCategory] = useState<string>("All");

  // Filter the daily data — for demo we approximate by scaling proportionally when filters set
  const filteredDaily = useMemo(() => {
    let factor = 1;
    if (region !== "All") {
      const r = data.region.find((x) => x.region === region);
      factor *= r ? r.revenue / data.summary.total_revenue : 1;
    }
    if (category !== "All") {
      const c = data.category.find((x) => x.category === category);
      factor *= c ? c.revenue / data.summary.total_revenue : 1;
    }
    return data.daily.map((d) => ({ ...d, revenue: d.revenue * factor, orders: Math.round(d.orders * factor) }));
  }, [region, category, data]);

  const trendData = useMemo(() => bucketDaily(filteredDaily, trendMode), [filteredDaily, trendMode]);

  const filteredSummary = useMemo(() => {
    const tr = filteredDaily.reduce((a, d) => a + d.revenue, 0);
    const to = filteredDaily.reduce((a, d) => a + d.orders, 0);
    return {
      revenue: tr,
      orders: to,
      aov: to ? tr / to : 0,
      units: filteredDaily.reduce((a, d) => a + d.qty, 0),
    };
  }, [filteredDaily]);

  const top10Products = data.product.slice(0, 10).map((p) => ({ name: p.product, revenue: p.revenue }));
  const regionsForChart = data.region.map((r) => ({ name: r.region, revenue: r.revenue, orders: r.orders }));
  const channelData = data.channel.map((c) => ({ name: c.channel, value: c.revenue }));

  const regionOptions = ["All", ...data.region.map((r) => r.region)];
  const categoryOptions = ["All", ...data.category.map((c) => c.category)];

  return (
    <div className="min-h-screen bg-background">
      {/* HERO HEADER */}
      <header className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay"
             style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 0%, transparent 40%), radial-gradient(circle at 80% 20%, oklch(0.78 0.16 80) 0%, transparent 35%)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-10 md:py-14">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="text-primary-foreground">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                Beauty & Personal Care · FY 2024
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                Glow Sales Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
                Real-time business performance across products, categories, channels and regions for India's leading cosmetics commerce.
              </p>
            </div>
            <a
              href="/Nykaa_Sales_Dashboard.xlsx"
              download
              className="inline-flex items-center gap-2 self-start rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-primary shadow-[var(--shadow-glow)] transition-transform hover:scale-105"
            >
              <Download className="h-4 w-4" />
              Download Excel Report
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* SLICERS */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Slicers
            <span className="text-xs font-normal text-muted-foreground">— click to filter the dashboard</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Slicer label="Region" options={regionOptions} value={region} onChange={setRegion} />
            <Slicer label="Category" options={categoryOptions} value={category} onChange={setCategory} />
            <Slicer
              label="Trend Granularity"
              options={["Daily", "Weekly", "Monthly"]}
              value={trendMode}
              onChange={(v) => setTrendMode(v as "Daily" | "Weekly" | "Monthly")}
            />
          </div>
        </section>

        {/* KPI CARDS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Revenue" value={inr(filteredSummary.revenue)} sub={inrFull(filteredSummary.revenue)} icon={TrendingUp} />
          <KpiCard label="Total Orders" value={num(filteredSummary.orders)} sub="paid + COD" icon={ShoppingBag} accent="accent" />
          <KpiCard label="Avg Order Value" value={inrFull(filteredSummary.aov)} sub="per checkout" icon={Receipt} />
          <KpiCard label="Units Sold" value={num(filteredSummary.units)} sub="across catalog" icon={Package} accent="accent" />
        </section>

        {/* REVENUE TREND */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Revenue Trend</h2>
              <p className="text-sm text-muted-foreground">{trendMode} performance over the period</p>
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer>
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.24 0)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.62 0.24 0)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" vertical={false} />
                <XAxis dataKey="key" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 12 }} stroke="oklch(0.92 0.015 340)" />
                <YAxis tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 12 }} stroke="oklch(0.92 0.015 340)" tickFormatter={(v) => inr(v)} />
                <Tooltip
                  contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.015 340)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => [inrFull(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.62 0.24 0)" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* TOP PRODUCTS + CATEGORIES */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-foreground">Top 10 Products</h2>
            <p className="mb-4 text-sm text-muted-foreground">Revenue leaders across the catalog</p>
            <div className="h-[360px]">
              <ResponsiveContainer>
                <BarChart data={top10Products} layout="vertical" margin={{ left: 20, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => inr(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "oklch(0.22 0.05 320)", fontSize: 11 }} width={140} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid oklch(0.92 0.015 340)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => [inrFull(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                    {top10Products.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-foreground">Category Mix</h2>
            <p className="mb-4 text-sm text-muted-foreground">Share of revenue</p>
            <div className="h-[280px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.category.map((c) => ({ name: c.category, value: c.revenue }))} dataKey="value" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {data.category.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => inrFull(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs">
              {data.category.map((c, i) => (
                <li key={c.category} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {c.category}
                  </span>
                  <span className="font-semibold text-foreground">{inr(c.revenue)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* REGION + CHANNEL */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
            <h2 className="font-display text-xl font-bold text-foreground">Region-wise Sales</h2>
            <p className="mb-4 text-sm text-muted-foreground">Revenue and orders comparison</p>
            <div className="h-[300px]">
              <ResponsiveContainer>
                <BarChart data={regionsForChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "oklch(0.22 0.05 320)", fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => inr(v)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number, n) => n === "revenue" ? [inrFull(v), "Revenue"] : [num(v), "Orders"]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="revenue" fill="oklch(0.62 0.24 0)" radius={[8, 8, 0, 0]} />
                  <Bar yAxisId="right" dataKey="orders" fill="oklch(0.78 0.16 80)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-xl font-bold text-foreground">Sales Channel</h2>
            <p className="mb-4 text-sm text-muted-foreground">Where customers shop</p>
            <div className="space-y-3">
              {channelData.map((c, i) => {
                const total = channelData.reduce((a, x) => a + x.value, 0);
                const pct = (c.value / total) * 100;
                return (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="text-muted-foreground">{inr(c.value)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: PALETTE[i] }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Cities</h3>
              <ul className="space-y-1.5 text-sm">
                {data.city.slice(0, 6).map((c, i) => (
                  <li key={c.city} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-primary">#{i + 1}</span>
                      {c.city}
                    </span>
                    <span className="font-semibold text-foreground">{inr(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <footer className="pb-8 pt-2 text-center text-xs text-muted-foreground">
          Data: {data.summary.date_start} — {data.summary.date_end} · {num(data.summary.total_orders)} orders · Built with Lovable
        </footer>
      </main>
    </div>
  );
}
