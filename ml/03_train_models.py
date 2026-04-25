"""
ML pipeline for the Glow Sales dashboard.

Models trained offline:
  1. Revenue forecasting   – Holt-Winters Exponential Smoothing (seasonal=7)
                             + train/test split + MAPE evaluation
  2. Anomaly detection     – Isolation Forest on daily (revenue, orders) features
  3. Product clustering    – K-Means on (revenue, orders, units, AOV) standardized
                             -> labelled Stars / Cash Cows / Niche / Underperformers
  4. Customer segmentation – synthesize customers, RFM scoring, K-Means -> personas
  5. Category market-basket – co-purchase lift between categories (associative rules lite)

Output: src/data/ml.json  (consumed by the React dashboard)
"""
import csv, json, math, random
from collections import defaultdict, Counter
from datetime import date, timedelta

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.ensemble import IsolationForest
from sklearn.metrics import silhouette_score
from statsmodels.tsa.holtwinters import ExponentialSmoothing

random.seed(7); np.random.seed(7)

# -------------------- LOAD --------------------
df = pd.read_csv("/tmp/sales.csv", parse_dates=["date"])
print(f"Loaded {len(df):,} rows")

# =====================================================================
# 1. REVENUE FORECASTING
# =====================================================================
daily = df.groupby("date").agg(revenue=("revenue","sum"), orders=("order_id","count")).reset_index()
daily = daily.sort_values("date").reset_index(drop=True)

H = 30  # forecast horizon (days)
train = daily.iloc[:-H]
test  = daily.iloc[-H:]

model = ExponentialSmoothing(
    train["revenue"].values,
    trend="add",
    seasonal="add",
    seasonal_periods=7,           # weekly cycle
    initialization_method="estimated",
).fit(optimized=True)

# in-sample fitted + future forecast (next 30 days beyond data)
fitted_train = model.fittedvalues
test_pred    = model.forecast(H)

# refit on full data -> forecast next 30 future days
full_model = ExponentialSmoothing(
    daily["revenue"].values, trend="add", seasonal="add",
    seasonal_periods=7, initialization_method="estimated",
).fit(optimized=True)
future_pred = full_model.forecast(H)
resid = daily["revenue"].values - full_model.fittedvalues
sigma = float(np.std(resid))
z95   = 1.96
last_date = daily["date"].iloc[-1]
future_dates = [(last_date + timedelta(days=i+1)).strftime("%Y-%m-%d") for i in range(H)]

# evaluate
mape = float(np.mean(np.abs((test["revenue"].values - test_pred) / test["revenue"].values)) * 100)
rmse = float(np.sqrt(np.mean((test["revenue"].values - test_pred) ** 2)))
mae  = float(np.mean(np.abs(test["revenue"].values - test_pred)))
print(f"Forecast MAPE={mape:.2f}%  RMSE=₹{rmse:,.0f}  MAE=₹{mae:,.0f}")

forecast_block = {
    "horizon_days": H,
    "metrics": {"mape_pct": round(mape,2), "rmse": round(rmse,2), "mae": round(mae,2)},
    "history": [
        {"date": d.strftime("%Y-%m-%d"), "actual": float(r)}
        for d, r in zip(daily["date"], daily["revenue"])
    ],
    "future": [
        {"date": dt, "forecast": float(p), "lower": float(p - z95*sigma), "upper": float(p + z95*sigma)}
        for dt, p in zip(future_dates, future_pred)
    ],
    "method": "Holt-Winters Exponential Smoothing (additive trend + 7-day seasonality)",
}

# =====================================================================
# 2. ANOMALY DETECTION
# =====================================================================
feat = daily[["revenue","orders"]].values
iso = IsolationForest(contamination=0.04, random_state=7).fit(feat)
score = -iso.score_samples(feat)        # higher = more anomalous
flags = iso.predict(feat) == -1

anomalies = [
    {"date": d.strftime("%Y-%m-%d"), "revenue": float(r), "orders": int(o), "score": float(s)}
    for d, r, o, s, f in zip(daily["date"], daily["revenue"], daily["orders"], score, flags) if f
]
print(f"Detected {len(anomalies)} anomaly days")

anomaly_block = {
    "method": "Isolation Forest (contamination=4%)",
    "total_days": int(len(daily)),
    "anomaly_count": len(anomalies),
    "points": anomalies,
}

# =====================================================================
# 3. PRODUCT CLUSTERING (K-Means BCG-matrix-style)
# =====================================================================
prod = (df.groupby("product")
          .agg(revenue=("revenue","sum"),
               orders=("order_id","count"),
               units=("quantity","sum"),
               category=("category","first"))
          .reset_index())
prod["aov"] = prod["revenue"] / prod["orders"]

X = prod[["revenue","orders","units","aov"]].values
Xs = StandardScaler().fit_transform(X)
k_best = 4
km = KMeans(n_clusters=k_best, n_init=10, random_state=7).fit(Xs)
prod["cluster"] = km.labels_
sil = float(silhouette_score(Xs, km.labels_))
print(f"Product K-Means k={k_best} silhouette={sil:.3f}")

# label clusters: rank centroids by revenue & orders
centers_orig = pd.DataFrame(
    StandardScaler().fit(X).inverse_transform(km.cluster_centers_),
    columns=["revenue","orders","units","aov"]
)
labels_map = {}
ranked = centers_orig.sort_values("revenue", ascending=False).index.tolist()
names = ["⭐ Stars","💰 Cash Cows","✨ Niche Premium","📉 Underperformers"]
# tweak: highest AOV among non-top -> Niche Premium
top = ranked[0]
bottom = ranked[-1]
remaining = [i for i in ranked if i not in (top, bottom)]
remaining_sorted = sorted(remaining, key=lambda i: -centers_orig.loc[i,"aov"])
niche = remaining_sorted[0]; cash = remaining_sorted[-1]
labels_map = {top: names[0], cash: names[1], niche: names[2], bottom: names[3]}
prod["segment"] = prod["cluster"].map(labels_map)

cluster_summary = (prod.groupby("segment")
                       .agg(products=("product","count"),
                            revenue=("revenue","sum"),
                            avg_orders=("orders","mean"),
                            avg_aov=("aov","mean"))
                       .reset_index().to_dict("records"))

product_clusters = prod[["product","category","revenue","orders","units","aov","segment"]].to_dict("records")

cluster_block = {
    "method": "K-Means (k=4) on standardized [revenue, orders, units, AOV]",
    "silhouette": round(sil, 3),
    "summary": cluster_summary,
    "products": product_clusters,
}

# =====================================================================
# 4. RFM CUSTOMER SEGMENTATION
# =====================================================================
# Synthesize customer_id distribution: ~3,500 customers with power-law repeat behavior
n_customers = 3500
customer_ids = [f"C{1000+i}" for i in range(n_customers)]
# weights so few customers buy many times (long tail)
weights = np.random.pareto(1.4, n_customers) + 1
weights = weights / weights.sum()
df["customer_id"] = np.random.choice(customer_ids, size=len(df), p=weights)

snapshot = df["date"].max() + pd.Timedelta(days=1)
rfm = (df.groupby("customer_id")
         .agg(recency=("date", lambda s: (snapshot - s.max()).days),
              frequency=("order_id","count"),
              monetary=("revenue","sum"))
         .reset_index())

# log-transform monetary & frequency for scaling
rfm_feat = rfm[["recency","frequency","monetary"]].copy()
rfm_feat["frequency"] = np.log1p(rfm_feat["frequency"])
rfm_feat["monetary"]  = np.log1p(rfm_feat["monetary"])
rfm_s = StandardScaler().fit_transform(rfm_feat.values)
km_c = KMeans(n_clusters=4, n_init=10, random_state=7).fit(rfm_s)
rfm["cluster"] = km_c.labels_
sil_c = float(silhouette_score(rfm_s, km_c.labels_))
print(f"Customer K-Means silhouette={sil_c:.3f}")

# label clusters by behavior
centers = pd.DataFrame(km_c.cluster_centers_, columns=["recency","frequency","monetary"])
def label_row(c):
    r,f,m = c["recency"], c["frequency"], c["monetary"]
    if f > 0 and m > 0 and r < 0:    return "👑 Champions"
    if r > 0 and m < 0:              return "💤 At Risk"
    if f < 0 and m < 0 and r > 0:    return "🌱 New / One-Timers"
    return "🛍️ Loyal Regulars"
centers["label"] = centers.apply(label_row, axis=1)
# guarantee uniqueness
seen = set(); labels = []
fallback = ["👑 Champions","🛍️ Loyal Regulars","🌱 New / One-Timers","💤 At Risk"]
for i, row in centers.iterrows():
    lab = row["label"]
    if lab in seen:
        lab = next(x for x in fallback if x not in seen)
    seen.add(lab); labels.append(lab)
centers["label"] = labels
seg_map = dict(zip(centers.index, centers["label"]))
rfm["segment"] = rfm["cluster"].map(seg_map)

segment_summary = (rfm.groupby("segment")
                      .agg(customers=("customer_id","count"),
                           avg_recency=("recency","mean"),
                           avg_frequency=("frequency","mean"),
                           avg_monetary=("monetary","mean"),
                           total_revenue=("monetary","sum"))
                      .reset_index().to_dict("records"))

# sample 500 for the scatter plot
rfm_sample = rfm.sample(min(600, len(rfm)), random_state=7)[["recency","frequency","monetary","segment"]].to_dict("records")

rfm_block = {
    "method": "K-Means on log-scaled RFM features (Recency, Frequency, Monetary)",
    "silhouette": round(sil_c, 3),
    "total_customers": int(len(rfm)),
    "summary": segment_summary,
    "sample_points": rfm_sample,
}

# =====================================================================
# 5. CATEGORY CO-PURCHASE LIFT (mini market-basket)
# =====================================================================
baskets = df.groupby(["customer_id","date"])["category"].apply(lambda s: list(set(s)))
cat_count = Counter()
pair_count = Counter()
total_baskets = len(baskets)
for items in baskets:
    for c in items: cat_count[c] += 1
    for i in range(len(items)):
        for j in range(i+1, len(items)):
            a,b = sorted([items[i], items[j]])
            pair_count[(a,b)] += 1

rules = []
for (a,b), c in pair_count.items():
    support_ab = c / total_baskets
    p_a = cat_count[a] / total_baskets
    p_b = cat_count[b] / total_baskets
    if p_a*p_b == 0: continue
    lift = support_ab / (p_a * p_b)
    confidence = c / cat_count[a]
    rules.append({"a": a, "b": b, "support": round(support_ab,4),
                  "confidence": round(confidence,3), "lift": round(lift,3),
                  "count": int(c)})
rules.sort(key=lambda x: -x["lift"])
basket_block = {
    "method": "Pairwise category co-occurrence with lift score",
    "total_baskets": total_baskets,
    "top_rules": rules[:10],
}

# =====================================================================
# WRITE OUT
# =====================================================================
out = {
    "forecast": forecast_block,
    "anomaly":  anomaly_block,
    "clusters": cluster_block,
    "rfm":      rfm_block,
    "basket":   basket_block,
    "meta": {
        "trained_at": str(date.today()),
        "rows_trained_on": int(len(df)),
        "stack": ["scikit-learn 1.8", "statsmodels 0.14", "pandas", "numpy"],
    }
}
with open("src/data/ml.json","w") as f:
    json.dump(out, f, default=float)
print("Wrote src/data/ml.json")
