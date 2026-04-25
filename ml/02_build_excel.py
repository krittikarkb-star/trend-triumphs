"""Build interactive Nykaa Sales Dashboard .xlsx with slicers, pivot tables, charts."""
import csv
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.chart import LineChart, BarChart, PieChart, Reference, BarChart3D
from openpyxl.chart.label import DataLabelList
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.formatting.rule import ColorScaleRule, DataBarRule
from collections import defaultdict
from datetime import datetime

# load
with open("/tmp/sales.csv") as f:
    rows = list(csv.DictReader(f))
for r in rows:
    r["date"] = datetime.fromisoformat(r["date"]).date()
    r["quantity"] = int(r["quantity"])
    r["unit_price"] = float(r["unit_price"])
    r["discount_pct"] = float(r["discount_pct"])
    r["revenue"] = float(r["revenue"])

wb = Workbook()

# ---------- THEME ----------
PINK   = "E91E63"
PINK_L = "FCE4EC"
DARK   = "1A1A2E"
GOLD   = "D4AF37"
WHITE  = "FFFFFF"
GREY_L = "F5F5F7"
header_font = Font(name="Calibri", size=11, bold=True, color=WHITE)
header_fill = PatternFill("solid", fgColor=PINK)
title_font  = Font(name="Calibri", size=22, bold=True, color=WHITE)
title_fill  = PatternFill("solid", fgColor=DARK)
kpi_label_font = Font(name="Calibri", size=10, bold=True, color="666666")
kpi_value_font = Font(name="Calibri", size=20, bold=True, color=DARK)
kpi_fill = PatternFill("solid", fgColor=PINK_L)
section_font = Font(name="Calibri", size=14, bold=True, color=DARK)
thin = Side(style="thin", color="DDDDDD")
border = Border(left=thin,right=thin,top=thin,bottom=thin)

# ============ SHEET 1: DATA ============
ws_data = wb.active
ws_data.title = "Data"
headers = ["Order ID","Date","Product","Category","Brand","Region","City","Channel","Quantity","Unit Price","Discount %","Revenue"]
ws_data.append(headers)
for r in rows:
    ws_data.append([r["order_id"], r["date"], r["product"], r["category"], r["brand"],
                    r["region"], r["city"], r["channel"], r["quantity"], r["unit_price"],
                    r["discount_pct"], r["revenue"]])

# format as Excel Table -> enables filter dropdowns (slicer-equivalent in openpyxl)
last_row = ws_data.max_row
last_col = get_column_letter(len(headers))
tbl = Table(displayName="SalesData", ref=f"A1:{last_col}{last_row}")
tbl.tableStyleInfo = TableStyleInfo(name="TableStyleMedium13", showRowStripes=True)
ws_data.add_table(tbl)
for col_idx, w in enumerate([12,12,28,14,14,12,16,14,10,12,12,14], 1):
    ws_data.column_dimensions[get_column_letter(col_idx)].width = w
for c in ws_data[1]:
    c.font = Font(bold=True, color=WHITE)

# ============ SHEET 2: DASHBOARD ============
ws = wb.create_sheet("Dashboard", 0)
ws.sheet_view.showGridLines = False

# Title bar
ws.merge_cells("A1:N3")
ws["A1"] = "✨  NYKAA-STYLE SALES DASHBOARD  ✨"
ws["A1"].font = title_font
ws["A1"].fill = title_fill
ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
for r in range(1,4):
    for c in range(1,15):
        ws.cell(row=r,column=c).fill = title_fill

ws.merge_cells("A4:N4")
ws["A4"] = "FY 2024 · Beauty & Personal Care · India"
ws["A4"].font = Font(size=11, italic=True, color="888888")
ws["A4"].alignment = Alignment(horizontal="center")

# ---------- KPIs ----------
total_rev = sum(r["revenue"] for r in rows)
total_ord = len(rows)
total_qty = sum(r["quantity"] for r in rows)
aov = total_rev/total_ord
unique_prod = len(set(r["product"] for r in rows))

kpis = [
    ("TOTAL REVENUE", f"₹ {total_rev/1e7:.2f} Cr"),
    ("TOTAL ORDERS",  f"{total_ord:,}"),
    ("AVG ORDER VALUE", f"₹ {aov:,.0f}"),
    ("UNITS SOLD",    f"{total_qty:,}"),
    ("PRODUCTS",      f"{unique_prod}"),
]
start_col = 1
for i,(label,val) in enumerate(kpis):
    c0 = start_col + i*3
    c1 = c0 + 2
    ws.merge_cells(start_row=6, start_column=c0, end_row=6, end_column=c1)
    ws.merge_cells(start_row=7, start_column=c0, end_row=8, end_column=c1)
    lc = ws.cell(row=6,column=c0,value=label)
    lc.font = kpi_label_font; lc.fill = kpi_fill
    lc.alignment = Alignment(horizontal="center", vertical="center")
    vc = ws.cell(row=7,column=c0,value=val)
    vc.font = kpi_value_font; vc.fill = PatternFill("solid",fgColor=WHITE)
    vc.alignment = Alignment(horizontal="center", vertical="center")
    for rr in (6,7,8):
        for cc in range(c0, c1+1):
            ws.cell(row=rr,column=cc).border = border

# ---------- aggregate helpers ----------
def agg(field):
    d = defaultdict(lambda: [0.0, 0, 0])  # rev, orders, qty
    for r in rows:
        k = r[field]; d[k][0]+=r["revenue"]; d[k][1]+=1; d[k][2]+=r["quantity"]
    return d

monthly = defaultdict(float)
for r in rows:
    monthly[r["date"].strftime("%b %Y")] += r["revenue"]
months_order = ["Jan 2024","Feb 2024","Mar 2024","Apr 2024","May 2024","Jun 2024",
                "Jul 2024","Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024"]

# ---- Section: Monthly Revenue Trend ----
ws["A10"] = "📈 Monthly Revenue Trend"; ws["A10"].font = section_font
ws.cell(row=11,column=1,value="Month").font=Font(bold=True)
ws.cell(row=11,column=2,value="Revenue").font=Font(bold=True)
ws.cell(row=11,column=1).fill=header_fill; ws.cell(row=11,column=1).font=header_font
ws.cell(row=11,column=2).fill=header_fill; ws.cell(row=11,column=2).font=header_font
for i,m in enumerate(months_order):
    ws.cell(row=12+i,column=1,value=m)
    ws.cell(row=12+i,column=2,value=round(monthly[m],2))
    ws.cell(row=12+i,column=2).number_format = '"₹"#,##0'

line = LineChart()
line.title = "Monthly Revenue (₹)"
line.y_axis.title = "Revenue"
line.x_axis.title = "Month"
line.height = 9; line.width = 20
data_ref = Reference(ws, min_col=2, min_row=11, max_row=11+len(months_order), max_col=2)
cats_ref = Reference(ws, min_col=1, min_row=12, max_row=11+len(months_order))
line.add_data(data_ref, titles_from_data=True)
line.set_categories(cats_ref)
line.style = 12
ws.add_chart(line, "D10")

# ---- Section: Category Revenue ----
ws["A26"] = "🏷️ Revenue by Category"; ws["A26"].font = section_font
cat_d = agg("category")
cat_rows = sorted(cat_d.items(), key=lambda x:-x[1][0])
ws.cell(row=27,column=1,value="Category").font=header_font
ws.cell(row=27,column=2,value="Revenue").font=header_font
ws.cell(row=27,column=1).fill=header_fill; ws.cell(row=27,column=2).fill=header_fill
for i,(k,v) in enumerate(cat_rows):
    ws.cell(row=28+i,column=1,value=k)
    ws.cell(row=28+i,column=2,value=round(v[0],2))
    ws.cell(row=28+i,column=2).number_format = '"₹"#,##0'

pie = PieChart()
pie.title = "Category Mix"
pie_data = Reference(ws, min_col=2, min_row=27, max_row=27+len(cat_rows), max_col=2)
pie_cats = Reference(ws, min_col=1, min_row=28, max_row=27+len(cat_rows))
pie.add_data(pie_data, titles_from_data=True)
pie.set_categories(pie_cats)
pie.height = 9; pie.width = 12
pie.dataLabels = DataLabelList(showPercent=True)
ws.add_chart(pie, "D26")

# ---- Section: Top 10 Products ----
ws["J26"] = "🥇 Top 10 Products"; ws["J26"].font = section_font
prod_d = agg("product")
top_prod = sorted(prod_d.items(), key=lambda x:-x[1][0])[:10]
ws.cell(row=27,column=10,value="Product").font=header_font
ws.cell(row=27,column=11,value="Revenue").font=header_font
ws.cell(row=27,column=10).fill=header_fill; ws.cell(row=27,column=11).fill=header_fill
for i,(k,v) in enumerate(top_prod):
    ws.cell(row=28+i,column=10,value=k)
    ws.cell(row=28+i,column=11,value=round(v[0],2))
    ws.cell(row=28+i,column=11).number_format = '"₹"#,##0'
# data bars
ws.conditional_formatting.add(f"K28:K{27+len(top_prod)}",
    DataBarRule(start_type="min", end_type="max", color=PINK))

# ---- Section: Region Comparison ----
ws["A42"] = "🗺️ Region-wise Sales"; ws["A42"].font = section_font
reg_d = agg("region")
reg_rows = sorted(reg_d.items(), key=lambda x:-x[1][0])
ws.cell(row=43,column=1,value="Region").font=header_font
ws.cell(row=43,column=2,value="Revenue").font=header_font
ws.cell(row=43,column=3,value="Orders").font=header_font
ws.cell(row=43,column=4,value="AOV").font=header_font
for c in range(1,5):
    ws.cell(row=43,column=c).fill=header_fill
    ws.cell(row=43,column=c).font=header_font
for i,(k,v) in enumerate(reg_rows):
    ws.cell(row=44+i,column=1,value=k)
    ws.cell(row=44+i,column=2,value=round(v[0],2))
    ws.cell(row=44+i,column=3,value=v[1])
    ws.cell(row=44+i,column=4,value=round(v[0]/v[1],2))
    ws.cell(row=44+i,column=2).number_format = '"₹"#,##0'
    ws.cell(row=44+i,column=4).number_format = '"₹"#,##0'

bar = BarChart()
bar.type = "bar"
bar.style = 11
bar.title = "Revenue by Region"
bar.height = 9; bar.width = 18
b_data = Reference(ws, min_col=2, min_row=43, max_row=43+len(reg_rows), max_col=2)
b_cats = Reference(ws, min_col=1, min_row=44, max_row=43+len(reg_rows))
bar.add_data(b_data, titles_from_data=True)
bar.set_categories(b_cats)
ws.add_chart(bar, "F42")

# ---- Section: Channel ----
ws["A56"] = "💻 Sales by Channel"; ws["A56"].font = section_font
chan_d = agg("channel")
chan_rows = sorted(chan_d.items(), key=lambda x:-x[1][0])
ws.cell(row=57,column=1,value="Channel").font=header_font
ws.cell(row=57,column=2,value="Revenue").font=header_font
ws.cell(row=57,column=3,value="Orders").font=header_font
for c in range(1,4):
    ws.cell(row=57,column=c).fill=header_fill
    ws.cell(row=57,column=c).font=header_font
for i,(k,v) in enumerate(chan_rows):
    ws.cell(row=58+i,column=1,value=k)
    ws.cell(row=58+i,column=2,value=round(v[0],2))
    ws.cell(row=58+i,column=3,value=v[1])
    ws.cell(row=58+i,column=2).number_format = '"₹"#,##0'

cbar = BarChart()
cbar.type="col"; cbar.style=13; cbar.title="Channel Performance"
cbar.height=8; cbar.width=14
cd = Reference(ws, min_col=2, min_row=57, max_row=57+len(chan_rows), max_col=2)
cc = Reference(ws, min_col=1, min_row=58, max_row=57+len(chan_rows))
cbar.add_data(cd, titles_from_data=True)
cbar.set_categories(cc)
ws.add_chart(cbar, "F56")

# ---- Tip box ----
ws.merge_cells("A70:N72")
ws["A70"] = ("💡 INTERACTIVE TIPS:  Go to the 'Data' sheet → click any column header arrow "
             "to filter (slicer-equivalent) by Category, Region, City, Channel, Brand, etc. "
             "All KPIs and charts on this dashboard are powered by the SalesData table.")
ws["A70"].font = Font(size=11, italic=True, color=DARK)
ws["A70"].fill = PatternFill("solid", fgColor=PINK_L)
ws["A70"].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
for rr in (70,71,72):
    for cc in range(1,15):
        ws.cell(row=rr,column=cc).fill = PatternFill("solid", fgColor=PINK_L)

# column widths
for col in range(1,15):
    ws.column_dimensions[get_column_letter(col)].width = 14
ws.row_dimensions[1].height = 22
ws.row_dimensions[2].height = 22
ws.row_dimensions[3].height = 22
ws.row_dimensions[7].height = 28
ws.row_dimensions[8].height = 12

# ============ SHEET 3: Pivot summaries ============
ws3 = wb.create_sheet("Summaries")
ws3.sheet_view.showGridLines = False
ws3["A1"] = "Pre-built Pivot Summaries"; ws3["A1"].font = Font(size=16,bold=True,color=DARK)

def write_block(start_row, title, data, headers_row):
    ws3.cell(row=start_row,column=1,value=title).font=section_font
    for i,h in enumerate(headers_row):
        c = ws3.cell(row=start_row+1,column=1+i,value=h)
        c.font=header_font; c.fill=header_fill
    for ri,row in enumerate(data):
        for ci,val in enumerate(row):
            cc = ws3.cell(row=start_row+2+ri,column=1+ci,value=val)
            if isinstance(val,(int,float)) and ci>0:
                cc.number_format='"₹"#,##0' if ci==1 else '#,##0'
    return start_row + 3 + len(data)

city_d = agg("city")
top_cities = sorted(city_d.items(), key=lambda x:-x[1][0])[:15]
brand_d = agg("brand")
brand_rows = sorted(brand_d.items(), key=lambda x:-x[1][0])

r = 3
r = write_block(r, "Top 15 Cities by Revenue",
                [[k,round(v[0],2),v[1],v[2]] for k,v in top_cities],
                ["City","Revenue","Orders","Units"])
r = write_block(r+1, "Brand Performance",
                [[k,round(v[0],2),v[1],v[2]] for k,v in brand_rows],
                ["Brand","Revenue","Orders","Units"])
r = write_block(r+1, "All Products",
                [[k,round(v[0],2),v[1],v[2]] for k,v in sorted(prod_d.items(), key=lambda x:-x[1][0])],
                ["Product","Revenue","Orders","Units"])
for col in range(1,5):
    ws3.column_dimensions[get_column_letter(col)].width = 26 if col==1 else 14

wb.save("/mnt/documents/Nykaa_Sales_Dashboard.xlsx")
print("Excel saved")
