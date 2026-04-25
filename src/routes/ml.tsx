import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ScatterChart, Scatter, ZAxis, Legend, BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { Brain, TrendingUp, AlertTriangle, Users, Boxes, ArrowLeft, Sparkles, Layers } from "lucide-react";
import mlData from "@/data/ml.json";
import { inr, num, inrFull } from "@/lib/format";

export const Route = createFileRoute("/ml")({
  component: MLInsights,
});

const PALETTE = [
  "oklch(0.62 0.24 0)",   // hot pink
  "oklch(0.78 0.16 80)",  // gold
  "oklch(0.55 0.18 300)", // violet
  "oklch(0.45 0.12 200)", // teal
];

type Forecast = typeof mlData.forecast;
type Anomaly  = typeof mlData.anomaly;
type Clusters = typeof mlData.clusters;
type RFM      = typeof mlData.rfm;
type Basket   = typeof mlData.basket;

function MLInsights() {
  const ml = mlData as unknown as {
    forecast: Forecast; anomaly: Anomaly; clusters: Clusters; rfm: RFM; basket: Basket;
    meta: { trained_at: string; rows_trained_on: number; stack: string[] };
  };

  // Build forecast series: history + future overlap
  const fc = ml.forecast;
  const histTail = fc.history.slice(-90);
  const fcSeries = [
    ...histTail.map((h) => ({ date: h.date.slice(5), actual: h.actual, forecast: null as number | null, lower: null as number | null, upper: null as number | null })),
    ...fc.future.map((f) => ({ date: f.date.slice(5), actual: null as number | null, forecast: f.forecast, lower: f.lower, upper: f.upper })),
  ];

  // anomalies merged into recent history for the dot plot
  const anomalyDates = new Set(ml.anomaly.points.map((p) => p.date));
  const anomalySeries = ml.forecast.history.map((h) => ({
    date: h.date.slice(5),
    revenue: h.actual,
    anomaly: anomalyDates.has(h.date) ? h.actual : null,
  }));

  // product cluster colors
  const segmentColor: Record<string, string> = {
    "⭐ Stars": PALETTE[0],
    "💰 Cash Cows": PALETTE[1],
    "✨ Niche Premium": PALETTE[2],
    "📉 Underperformers": PALETTE[3],
  };
  const customerColor: Record<string, string> = {
    "👑 Champions": PALETTE[0],
    "🛍️ Loyal Regulars": PALETTE[1],
    "🌱 New / One-Timers": PALETTE[2],
    "💤 At Risk": PALETTE[3],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay"
             style={{ backgroundImage: "radial-gradient(circle at 70% 40%, white 0%, transparent 40%), radial-gradient(circle at 10% 80%, oklch(0.78 0.16 80) 0%, transparent 35%)" }} />
        <div className="relative mx-auto max-w-7xl px-6 py-10">
          <Link to="/" className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-md hover:bg-white/20">
            <ArrowLeft className="h-3 w-3" /> Back to dashboard
          </Link>
          <div className="text-primary-foreground">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md">
              <Brain className="h-3.5 w-3.5" />
              Machine Learning Insights · scikit-learn · statsmodels
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
              ML-Powered Sales Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80 md:text-base">
              Five models trained on {num(ml.meta.rows_trained_on)} transactions: revenue forecasting, anomaly detection, product & customer segmentation, and category market-basket analysis.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* MODEL CARDS OVERVIEW */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <ModelTag icon={TrendingUp} title="Forecasting" sub="Holt-Winters" />
          <ModelTag icon={AlertTriangle} title="Anomaly Detection" sub="Isolation Forest" />
          <ModelTag icon={Boxes} title="Product Segments" sub="K-Means (k=4)" />
          <ModelTag icon={Users} title="Customer RFM" sub="K-Means (k=4)" />
          <ModelTag icon={Layers} title="Market Basket" sub="Lift analysis" />
        </section>

        {/* 1. FORECAST */}
        <Section
          icon={TrendingUp}
          title="30-Day Revenue Forecast"
          subtitle={`Holt-Winters · MAPE ${fc.metrics.mape_pct}% · RMSE ${inrFull(fc.metrics.rmse)} · 95% confidence band`}
        >
          <div className="h-[360px]">
            <ResponsiveContainer>
              <ComposedChart data={fcSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 80)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 80)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => inr(v)} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  formatter={(v) => v == null ? "—" : inrFull(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#band)" name="Confidence band" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="white" />
                <Line type="monotone" dataKey="actual" stroke="oklch(0.62 0.24 0)" strokeWidth={2.5} dot={false} name="Actual revenue" />
                <Line type="monotone" dataKey="forecast" stroke="oklch(0.45 0.12 200)" strokeWidth={2.5} strokeDasharray="6 4" dot={false} name="Forecast" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Metric label="MAPE" value={`${fc.metrics.mape_pct}%`} hint="Mean abs % error on holdout" />
            <Metric label="RMSE" value={inrFull(fc.metrics.rmse)} hint="Root mean squared error" />
            <Metric label="MAE"  value={inrFull(fc.metrics.mae)}  hint="Mean absolute error" />
          </div>
        </Section>

        {/* 2. ANOMALIES */}
        <Section
          icon={AlertTriangle}
          title="Anomaly Detection"
          subtitle={`Isolation Forest flagged ${ml.anomaly.anomaly_count} unusual days out of ${ml.anomaly.total_days}`}
        >
          <div className="h-[280px]">
            <ResponsiveContainer>
              <ComposedChart data={anomalySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 10 }} interval={20} />
                <YAxis tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => inr(v)} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => v == null ? "—" : inrFull(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.62 0.24 0)" strokeWidth={1.5} dot={false} name="Daily revenue" />
                <Scatter dataKey="anomaly" fill="oklch(0.78 0.16 80)" name="Anomaly" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-secondary text-foreground">
                <tr><th className="p-2 text-left">Date</th><th className="p-2 text-right">Revenue</th><th className="p-2 text-right">Orders</th><th className="p-2 text-right">Score</th></tr>
              </thead>
              <tbody>
                {ml.anomaly.points.map((p) => (
                  <tr key={p.date} className="border-t border-border">
                    <td className="p-2">{p.date}</td>
                    <td className="p-2 text-right">{inrFull(p.revenue)}</td>
                    <td className="p-2 text-right">{num(p.orders)}</td>
                    <td className="p-2 text-right font-mono text-primary">{p.score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 3. PRODUCT CLUSTERING */}
        <Section
          icon={Boxes}
          title="Product Segmentation (K-Means)"
          subtitle={`${ml.clusters.products.length} products clustered into 4 segments · silhouette score ${ml.clusters.silhouette}`}
        >
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="h-[340px] lg:col-span-3">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" />
                  <XAxis type="number" dataKey="orders" name="Orders" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} label={{ value: "Orders →", position: "insideBottom", offset: -10, fontSize: 11, fill: "oklch(0.48 0.04 320)" }} />
                  <YAxis type="number" dataKey="aov" name="AOV" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => `₹${v}`} label={{ value: "AOV →", angle: -90, position: "insideLeft", fontSize: 11, fill: "oklch(0.48 0.04 320)" }} />
                  <ZAxis type="number" dataKey="revenue" range={[60, 400]} />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    formatter={(v, name) => name === "AOV" ? `₹${Number(v).toFixed(0)}` : name === "Orders" ? num(Number(v)) : inrFull(Number(v))}
                  />
                  {Object.keys(segmentColor).map((seg) => (
                    <Scatter
                      key={seg} name={seg}
                      data={ml.clusters.products.filter((p) => p.segment === seg)}
                      fill={segmentColor[seg]}
                      fillOpacity={0.75}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 lg:col-span-2">
              {ml.clusters.summary.map((s) => (
                <div key={s.segment} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: segmentColor[s.segment] }}>{s.segment}</span>
                    <span className="text-xs text-muted-foreground">{s.products} products</span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                    <span><span className="text-muted-foreground">Revenue:</span> <b className="text-foreground">{inr(s.revenue)}</b></span>
                    <span><span className="text-muted-foreground">Avg AOV:</span> <b className="text-foreground">₹{Math.round(s.avg_aov)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 4. CUSTOMER RFM */}
        <Section
          icon={Users}
          title="Customer RFM Segmentation"
          subtitle={`${num(ml.rfm.total_customers)} customers grouped by Recency / Frequency / Monetary · silhouette ${ml.rfm.silhouette}`}
        >
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="h-[340px] lg:col-span-3">
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" />
                  <XAxis type="number" dataKey="recency" name="Recency (days)" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} label={{ value: "Recency (days since last order) →", position: "insideBottom", offset: -10, fontSize: 11, fill: "oklch(0.48 0.04 320)" }} />
                  <YAxis type="number" dataKey="monetary" name="Monetary" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} tickFormatter={(v) => inr(v)} label={{ value: "Lifetime spend →", angle: -90, position: "insideLeft", fontSize: 11, fill: "oklch(0.48 0.04 320)" }} />
                  <ZAxis type="number" dataKey="frequency" range={[40, 320]} name="Frequency" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    formatter={(v, name) => name === "Monetary" ? inrFull(Number(v)) : num(Number(v))}
                  />
                  {Object.keys(customerColor).map((seg) => (
                    <Scatter
                      key={seg} name={seg}
                      data={ml.rfm.sample_points.filter((p) => p.segment === seg)}
                      fill={customerColor[seg]}
                      fillOpacity={0.65}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 lg:col-span-2">
              {ml.rfm.summary.map((s) => (
                <div key={s.segment} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: customerColor[s.segment] }}>{s.segment}</span>
                    <span className="text-xs text-muted-foreground">{num(s.customers)} customers</span>
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                    <span><span className="text-muted-foreground">R:</span> <b>{Math.round(s.avg_recency)}d</b></span>
                    <span><span className="text-muted-foreground">F:</span> <b>{s.avg_frequency.toFixed(1)}</b></span>
                    <span><span className="text-muted-foreground">M:</span> <b>{inr(s.avg_monetary)}</b></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 5. MARKET BASKET */}
        <Section
          icon={Sparkles}
          title="Category Market-Basket (Lift)"
          subtitle={`Co-purchase rules across ${num(ml.basket.total_baskets)} baskets — lift > 1 means above-random affinity`}
        >
          <div className="h-[300px]">
            <ResponsiveContainer>
              <BarChart data={ml.basket.top_rules.map((r) => ({ pair: `${r.a} + ${r.b}`, lift: r.lift, confidence: r.confidence }))} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 340)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.48 0.04 320)", fontSize: 11 }} />
                <YAxis type="category" dataKey="pair" tick={{ fill: "oklch(0.22 0.05 320)", fontSize: 11 }} width={170} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <ReferenceLine x={1} stroke="oklch(0.45 0.12 200)" strokeDasharray="4 4" label={{ value: "baseline", fontSize: 10, fill: "oklch(0.48 0.04 320)" }} />
                <Bar dataKey="lift" radius={[0, 8, 8, 0]}>
                  {ml.basket.top_rules.map((r, i) => (
                    <Cell key={i} fill={r.lift >= 1 ? PALETTE[0] : PALETTE[3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* METHODOLOGY */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-foreground">Methodology & Stack</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Models trained offline in Python on {num(ml.meta.rows_trained_on)} transaction rows; predictions and segments are exported as static JSON and rendered on a TanStack Start (React 19 + Vite) edge-deployed frontend.
          </p>
          <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <li className="rounded-lg border border-border p-3"><b>Forecasting</b><br /><span className="text-muted-foreground">Holt-Winters Exponential Smoothing (additive trend + 7-day seasonality), train/test split, MAPE + RMSE evaluation, 95% confidence band from residual sigma.</span></li>
            <li className="rounded-lg border border-border p-3"><b>Anomaly Detection</b><br /><span className="text-muted-foreground">Isolation Forest on 2D (revenue, orders) feature space, 4% contamination rate, decision-function score.</span></li>
            <li className="rounded-lg border border-border p-3"><b>Product Segmentation</b><br /><span className="text-muted-foreground">K-Means (k=4) on z-scored [revenue, orders, units, AOV]; centroids ranked → BCG-matrix labels (Stars / Cash Cows / Niche / Underperformers).</span></li>
            <li className="rounded-lg border border-border p-3"><b>Customer RFM</b><br /><span className="text-muted-foreground">Recency / Frequency / Monetary metrics, log-transformed and standardized, K-Means with silhouette validation, behavioral persona naming.</span></li>
            <li className="rounded-lg border border-border p-3"><b>Market-Basket</b><br /><span className="text-muted-foreground">Pairwise category co-occurrence in customer-day baskets; support, confidence, and lift computed.</span></li>
            <li className="rounded-lg border border-border p-3"><b>Stack</b><br /><span className="text-muted-foreground">{ml.meta.stack.join(", ")} · React 19 · TanStack Start · Recharts · Tailwind · trained {ml.meta.trained_at}</span></li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function ModelTag({ icon: Icon, title, sub }: { icon: typeof Brain; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, subtitle, children }: { icon: typeof Brain; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground" style={{ background: "var(--gradient-hero)" }}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
