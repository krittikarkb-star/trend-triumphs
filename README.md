# Glow Sales — AI-Powered Beauty Commerce Intelligence

> An end-to-end **sales analytics + machine-learning dashboard** for an Indian beauty e-commerce company (inspired by Nykaa / Purplle).
> Built as a portfolio project demonstrating the full AI/ML workflow: data engineering → model training → evaluation → production-ready interactive frontend.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TanStack Start](https://img.shields.io/badge/TanStack-Start-EF4444)](https://tanstack.com/start)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.8-F7931E?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![statsmodels](https://img.shields.io/badge/statsmodels-0.14-3F51B5)](https://www.statsmodels.org)

---

## ✨ What it does

| Page | What you see |
|------|--------------|
| **`/` Dashboard** | KPIs (Revenue, Orders, AOV, Units), revenue trend (daily/weekly/monthly), top-10 products, category mix, region & channel breakdowns, **interactive slicers** for region / category / granularity. |
| **`/ml` ML Insights** | Five trained models: 30-day **revenue forecast** (Holt-Winters), **anomaly detection** (Isolation Forest), **product clustering** (K-Means), **customer RFM segmentation**, **category market-basket** (lift). |
| **Excel report** | One-click download of a fully-formatted `.xlsx` with KPI tiles, charts, data bars, and a filterable table acting as Excel's "slicers". |

## 🧠 Machine-learning models

| # | Model | Library | Output | Metric |
|---|-------|---------|--------|--------|
| 1 | Holt-Winters Exponential Smoothing | `statsmodels` | 30-day revenue forecast + 95% confidence band | MAPE 30.6%, RMSE ₹19.5K |
| 2 | Isolation Forest | `scikit-learn` | Daily anomaly flags (4% contamination) | 15 anomalies / 366 days |
| 3 | K-Means (k=4) on standardized [revenue, orders, units, AOV] | `scikit-learn` | Product segments → Stars / Cash Cows / Niche / Underperformers | Silhouette 0.39 |
| 4 | K-Means on log-scaled RFM | `scikit-learn` | Customer personas: Champions / Loyal / New / At-Risk | Silhouette 0.37 |
| 5 | Pairwise category co-occurrence | numpy | Top market-basket rules with lift | — |

### Why these models?

- **Forecasting** demonstrates classical time-series with seasonality (a must-have for retail).
- **Anomaly detection** shows unsupervised ML for ops monitoring (catches stockouts, viral days, fraud).
- **K-Means + RFM** is the textbook customer-analytics combo — exactly what e-commerce teams ship.
- **Market-basket** brings associative-rule mining into the picture (cross-sell opportunities).

Together they cover **time-series, unsupervised learning, clustering, and rule mining** — a well-rounded ML breadth for an internship resume.

---

## 🏗️ Architecture

```
┌────────────────────┐     ┌────────────────────┐     ┌───────────────────────┐
│ ml/01_generate.py  │ →   │ ml/sales.csv       │ ──┐ │  React 19 + Vite      │
└────────────────────┘     │ (15,667 orders)    │   │ │  TanStack Start       │
┌────────────────────┐     └────────────────────┘   ├→│  Tailwind v4          │
│ ml/02_build_excel  │ → public/Nykaa_…xlsx         │ │  Recharts             │
└────────────────────┘                              │ │                        │
┌────────────────────┐     ┌────────────────────┐   │ │  reads JSON →         │
│ ml/03_train_models │ →   │ src/data/ml.json   │ ──┘ │  renders charts       │
│ (sklearn+statsmod) │     │ src/data/sales.json│     └───────────────────────┘
└────────────────────┘     └────────────────────┘
```

The ML pipeline runs **offline** — predictions, cluster labels and aggregates are baked into static JSON. The frontend is a pure CDN/edge-friendly app (no Python at runtime). This is the same pattern used by real-world dashboards at Stripe, Spotify, etc. for fast loads.

---

## 📁 Project layout

```
.
├── ml/                          ← Python ML pipeline (run once, regenerate any time)
│   ├── 01_generate_data.py      ← synthesize realistic beauty-commerce dataset
│   ├── 02_build_excel.py        ← build downloadable .xlsx dashboard
│   ├── 03_train_models.py       ← train 5 ML models, export ml.json
│   └── sales.csv                ← generated dataset (15,667 rows)
├── requirements/requirements.txt
├── public/Nykaa_Sales_Dashboard.xlsx
├── src/
│   ├── data/{sales.json, ml.json}
│   ├── routes/{index.tsx, ml.tsx, __root.tsx}
│   ├── components/dashboard/{KpiCard.tsx, Slicer.tsx}
│   └── lib/format.ts
└── README.md
```

---

## 🚀 Run it locally

### 1. Frontend
```bash
bun install         # or npm install / pnpm install
bun dev             # opens http://localhost:5173
```

### 2. Re-train the ML models (optional — outputs are committed)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/requirements.txt
python ml/01_generate_data.py     # → ml/sales.csv + src/data/sales.json
python ml/02_build_excel.py       # → public/Nykaa_Sales_Dashboard.xlsx
python ml/03_train_models.py      # → src/data/ml.json
```

---

## 🌍 Deployment guide (3 paths)

### Path A — One-click on Lovable (easiest, recommended)
The frontend is already running in Lovable's preview. To make it public:

1. Click the **Publish** button (top-right of the editor).
2. Choose **Public** visibility.
3. Lovable gives you a permanent URL: `https://<your-project>.lovable.app` — share it on your resume.
4. Want a custom domain? **Project Settings → Domains → Connect domain**.

> Both static JSON and the `.xlsx` in `public/` ship automatically.

### Path B — Deploy to Vercel / Netlify / Cloudflare Pages
TanStack Start outputs a standard SSR build. From your forked repo:

```bash
bun run build         # produces .output/
```

Then on the host:
- **Vercel**: Import the repo → framework preset = "Other" → build cmd `bun run build` → output `.output/public`.
- **Cloudflare Pages**: Same build cmd, output dir `.output/public`. The included `wrangler.jsonc` deploys edge SSR if you use Workers.
- **Netlify**: Same. Add `bun` via `engines` or use a `netlify.toml`.

### Path C — GitHub Pages (static-only, simplest)
Because everything is pre-rendered JSON, you can also run a fully-static build:

```bash
bun run build
# Push the .output/public folder to a `gh-pages` branch
```
Enable Pages → branch `gh-pages` → `/`. Your dashboard goes live at `https://<user>.github.io/<repo>`.

### Re-running the ML pipeline in production
The training scripts only need to run when you have new data. Two patterns:

1. **Manual**: re-run `python ml/03_train_models.py` locally, commit `src/data/ml.json`, push → CI redeploys.
2. **GitHub Actions** (cron): schedule weekly retrains. Sample workflow:

```yaml
# .github/workflows/retrain.yml
name: Weekly retrain
on:
  schedule: [{ cron: "0 2 * * 1" }]
  workflow_dispatch:
jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r requirements/requirements.txt
      - run: |
          python ml/01_generate_data.py
          python ml/03_train_models.py
      - uses: stefanzweifel/git-auto-commit-action@v5
        with: { commit_message: "chore: weekly ML retrain" }
```

---

## 📈 Resume bullet points (steal these)

> **Glow Sales — AI-powered Beauty Commerce Dashboard** · React, Python, scikit-learn
> - Designed and shipped an end-to-end analytics product on **15,667 synthesized orders** with 5 ML models: Holt-Winters revenue forecasting (MAPE **30.6%**), Isolation-Forest anomaly detection, K-Means product & customer (RFM) segmentation, and category market-basket mining.
> - Built an interactive React 19 / TanStack Start frontend with **slicer-based filters**, animated charts, and a one-click downloadable Excel report.
> - Followed a **train-offline / serve-as-static** architecture for sub-second loads on edge hosting; automated weekly retrains via GitHub Actions.

---

## 🗣️ Talking points (for interviews)

- **Why Holt-Winters and not ARIMA / Prophet?** Holt-Winters captures additive trend + weekly seasonality with very few hyperparameters and is interpretable; ARIMA needs differencing/order tuning, Prophet adds heavy dependencies. For a single time series with strong weekly cycles, HW is the lean, defensible choice.
- **Why Isolation Forest?** It's distribution-free, handles small dimensions well, and gives a tunable contamination knob — perfect for ops monitoring.
- **Why log-transform monetary in RFM?** It reduces the heavy right tail so K-Means' Euclidean distance behaves sensibly.
- **What would you improve next?** Add a transformer-based recommender (e.g., SASRec) on real session data; replace HW with NeuralProphet for multivariate exogenous features; ship the ML as a FastAPI service for live retraining.

---

## 📜 License

MIT — fork, learn, ship.
