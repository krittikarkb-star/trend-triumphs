"""Generate beauty/cosmetics sales dataset (Nykaa/Purplle-like) and JSON for web dashboard."""
import json, random, csv
from datetime import date, timedelta

random.seed(42)

CATEGORIES = {
    "Skincare": ["Vitamin C Serum", "Hyaluronic Moisturizer", "Niacinamide Toner", "Sunscreen SPF 50", "Retinol Cream"],
    "Makeup": ["Matte Liquid Lipstick", "HD Foundation", "Kajal Eyeliner", "Compact Powder", "Mascara Volume"],
    "Haircare": ["Argan Oil Shampoo", "Keratin Conditioner", "Hair Serum Smooth", "Onion Hair Oil"],
    "Fragrance": ["Eau de Parfum Rose", "Body Mist Citrus", "Oud Perfume Luxe"],
    "Bath & Body": ["Shea Body Lotion", "Coffee Body Scrub", "Charcoal Face Wash"],
    "Wellness":  ["Biotin Gummies", "Collagen Powder", "Hair Vitamins"],
}
BRANDS = ["Glow Co", "Lumière", "Pureveda", "Bloomé", "Velvet", "Maison Lux"]
REGIONS = {
    "North":  ["Delhi", "Chandigarh", "Jaipur", "Lucknow"],
    "South":  ["Bengaluru", "Chennai", "Hyderabad", "Kochi"],
    "West":   ["Mumbai", "Pune", "Ahmedabad", "Surat"],
    "East":   ["Kolkata", "Bhubaneswar", "Guwahati"],
    "Central":["Indore", "Bhopal", "Nagpur"],
}
CHANNELS = ["Web", "Mobile App", "Marketplace"]

# Build product catalog with prices
products = []
for cat, items in CATEGORIES.items():
    for name in items:
        base = {"Skincare":750,"Makeup":550,"Haircare":450,"Fragrance":1800,"Bath & Body":380,"Wellness":900}[cat]
        price = base + random.randint(-100, 400)
        products.append({"product": name, "category": cat, "brand": random.choice(BRANDS), "price": price})

start = date(2024, 1, 1)
end   = date(2024, 12, 31)
days  = (end - start).days + 1

rows = []
oid = 100000
for d in range(days):
    cur = start + timedelta(days=d)
    # seasonality: more orders weekends + festive Oct-Nov
    base_orders = 35
    if cur.weekday() >= 5: base_orders += 12
    if cur.month in (10, 11): base_orders += 25
    if cur.month == 12: base_orders += 10
    n = max(5, int(random.gauss(base_orders, 8)))
    for _ in range(n):
        p = random.choice(products)
        qty = random.choices([1,2,3,4],[0.55,0.28,0.12,0.05])[0]
        region = random.choices(list(REGIONS.keys()), weights=[22,28,30,12,8])[0]
        city = random.choice(REGIONS[region])
        discount = random.choice([0,0,0,5,10,10,15,20,25])
        gross = p["price"] * qty
        revenue = round(gross * (1 - discount/100), 2)
        oid += 1
        rows.append({
            "order_id": f"NYK{oid}",
            "date": cur.isoformat(),
            "product": p["product"],
            "category": p["category"],
            "brand": p["brand"],
            "region": region,
            "city": city,
            "channel": random.choice(CHANNELS),
            "quantity": qty,
            "unit_price": p["price"],
            "discount_pct": discount,
            "revenue": revenue,
        })

# write CSV (will be embedded into xlsx too)
with open("/tmp/sales.csv","w",newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)

# Pre-aggregated JSON for web dashboard (smaller payload)
from collections import defaultdict
def agg(key_fn):
    d = defaultdict(lambda: {"revenue":0.0,"orders":0,"qty":0})
    for r in rows:
        k = key_fn(r)
        d[k]["revenue"] += r["revenue"]
        d[k]["orders"]  += 1
        d[k]["qty"]     += r["quantity"]
    return d

daily = agg(lambda r: r["date"])
by_cat = agg(lambda r: r["category"])
by_prod= agg(lambda r: r["product"])
by_reg = agg(lambda r: r["region"])
by_city= agg(lambda r: r["city"])
by_chan= agg(lambda r: r["channel"])
by_brand=agg(lambda r: r["brand"])

def to_list(d, key):
    return [{key:k, **{m:round(v[m],2) for m in v}} for k,v in d.items()]

out = {
    "summary": {
        "total_revenue": round(sum(r["revenue"] for r in rows),2),
        "total_orders":  len(rows),
        "total_units":   sum(r["quantity"] for r in rows),
        "avg_order_value": round(sum(r["revenue"] for r in rows)/len(rows),2),
        "date_start": start.isoformat(),
        "date_end":   end.isoformat(),
    },
    "daily":     sorted(to_list(daily,"date"),     key=lambda x:x["date"]),
    "category":  sorted(to_list(by_cat,"category"),key=lambda x:-x["revenue"]),
    "product":   sorted(to_list(by_prod,"product"),key=lambda x:-x["revenue"]),
    "region":    sorted(to_list(by_reg,"region"),  key=lambda x:-x["revenue"]),
    "city":      sorted(to_list(by_city,"city"),   key=lambda x:-x["revenue"]),
    "channel":   sorted(to_list(by_chan,"channel"),key=lambda x:-x["revenue"]),
    "brand":     sorted(to_list(by_brand,"brand"), key=lambda x:-x["revenue"]),
}
with open("src/data/sales.json","w") as f:
    json.dump(out, f)

print("rows:", len(rows), "revenue:", out["summary"]["total_revenue"])
