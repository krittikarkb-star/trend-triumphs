🌟 Glow Sales — AI-Powered Beauty Commerce Intelligence

An end-to-end sales analytics and machine learning dashboard for a beauty e-commerce platform (inspired by Nykaa / Purplle).
This project demonstrates a complete ML workflow: data engineering → model training → evaluation → production-ready frontend.
🚀 Overview

Glow Sales is a full-stack analytics product that transforms raw e-commerce data into actionable business insights.

It combines:

📊 Interactive dashboards
🤖 Machine learning models
📈 Business intelligence reporting

All delivered through a fast, edge-optimized frontend with precomputed ML outputs.

✨ Key Features
📊 Dashboard (/)
KPI metrics: Revenue, Orders, AOV, Units
Revenue trends (daily / weekly / monthly)
Top-performing products
Category and regional breakdowns
Interactive slicers for dynamic filtering
🧠 ML Insights (/ml)
Revenue forecasting (30-day prediction)
Anomaly detection (fraud/spikes)
Product segmentation
Customer segmentation (RFM)
Market-basket analysis (cross-sell insights)
📥 Excel Report
One-click downloadable .xlsx
Includes charts, KPIs, and filterable data
Business-ready reporting format
🧠 Machine Learning Models
Model	Purpose	Output	Metric
Holt-Winters	Time-series forecasting	30-day revenue prediction	MAPE: 30.6%
Isolation Forest	Anomaly detection	Daily anomaly flags	15 anomalies/year
K-Means (Products)	Product segmentation	Stars / Cash Cows / etc.	Silhouette: 0.39
K-Means (RFM)	Customer segmentation	Customer personas	Silhouette: 0.37
Market Basket	Association rules	Cross-sell opportunities	Lift score
🎯 Why This Project Matters

This project demonstrates real-world ML + product thinking:

📈 Forecasting → Business planning & demand prediction
🚨 Anomaly detection → Fraud & operational monitoring
👥 Customer segmentation → Targeted marketing
🛒 Market-basket analysis → Cross-selling strategy

It covers:

Time-series modeling
Unsupervised learning
Clustering
Recommendation logic
🏗️ Architecture
ML Pipeline (Python)
   ↓
Processed Data (CSV / JSON / Excel)
   ↓
Frontend (React + TanStack)
   ↓
Interactive Dashboard
Key Design Decision:

👉 Train offline, serve as static JSON

No backend required at runtime
Ultra-fast loading (CDN-friendly)
Scalable and production-ready
📁 Project Structure
ml/                → ML pipeline (Python)
public/            → Excel dashboard
src/
  ├── data/        → JSON datasets
  ├── routes/      → Pages
  ├── components/  → UI components
⚙️ Run Locally
Frontend
npm install
npm run dev
ML Pipeline (Optional)
pip install -r requirements.txt

python ml/01_generate_data.py
python ml/02_build_excel.py
python ml/03_train_models.py
🌍 Deployment Options
✅ Recommended: Lovable
One-click deploy
Instant public URL
Custom domain support
⚡ Vercel / Netlify / Cloudflare
npm run build
📄 GitHub Pages (Static)
Deploy .output/public
Works without backend
🔄 Retraining Strategy
Manual retraining with Python scripts
Optional GitHub Actions automation (weekly)
