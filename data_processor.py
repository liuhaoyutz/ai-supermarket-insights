"""数据处理层：加载 CSV，筛选，聚合计算。"""

import pandas as pd
import numpy as np
from pathlib import Path
import json

DATA_PATH = Path(__file__).parent / "data" / "Superstore.csv"

_df = None


def load_data():
    global _df
    if _df is not None:
        return _df
    _df = pd.read_csv(DATA_PATH, encoding='latin1')
    _df["Order Date"] = pd.to_datetime(_df["Order Date"], errors="coerce")
    _df["Ship Date"] = pd.to_datetime(_df["Ship Date"], errors="coerce")
    _df["YearMonth"] = _df["Order Date"].dt.strftime("%Y-%m")
    _df["Year"] = _df["Order Date"].dt.year
    _df["Month"] = _df["Order Date"].dt.month
    return _df


def apply_filters(df, start_date=None, end_date=None, region=None, category=None):
    mask = pd.Series(True, index=df.index)
    if start_date:
        mask &= df["Order Date"] >= pd.to_datetime(start_date)
    if end_date:
        mask &= df["Order Date"] <= pd.to_datetime(end_date)
    if region:
        mask &= df["Region"] == region
    if category:
        mask &= df["Category"] == category
    return df[mask].copy()


def _safe_value(v, default=0):
    val = v.item() if hasattr(v, "item") else v
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    return val


def _safe_json(df_result):
    if isinstance(df_result, pd.Series):
        d = df_result.to_dict()
        return {k: (None if (isinstance(v, float) and np.isnan(v)) else v) for k, v in d.items()}
    if isinstance(df_result, pd.DataFrame):
        return json.loads(df_result.where(df_result.notna(), None).to_json(orient="records", double_precision=2))
    return df_result


def compute_overview(df):
    total_sales = round(float(df["Sales"].sum()), 2)
    total_profit = round(float(df["Profit"].sum()), 2)
    total_orders = int(df["Order ID"].nunique())
    total_quantity = int(df["Quantity"].sum())
    avg_discount = round(float(df["Discount"].mean() * 100), 2) if len(df) > 0 else 0
    profit_margin = round((total_profit / total_sales * 100), 2) if total_sales > 0 else 0
    avg_order_value = round(total_sales / total_orders, 2) if total_orders > 0 else 0

    # YoY growth: compare latest full year vs previous year
    yoy_sales_growth = 0
    yoy_profit_growth = 0
    try:
        years = sorted(df["Year"].unique())
        if len(years) >= 2:
            latest_year = years[-1]
            prev_year = years[-2]
            latest_sales = float(df[df["Year"] == latest_year]["Sales"].sum())
            latest_profit = float(df[df["Year"] == latest_year]["Profit"].sum())
            prev_sales = float(df[df["Year"] == prev_year]["Sales"].sum())
            prev_profit = float(df[df["Year"] == prev_year]["Profit"].sum())
            if prev_sales > 0:
                yoy_sales_growth = round((latest_sales - prev_sales) / prev_sales * 100, 1)
            if prev_profit > 0:
                yoy_profit_growth = round((latest_profit - prev_profit) / prev_profit * 100, 1)
    except Exception:
        pass

    monthly = (
        df.groupby("YearMonth")
        .agg(sales=("Sales", "sum"), profit=("Profit", "sum"), orders=("Order ID", "nunique"))
        .sort_index()
        .reset_index()
    )

    return {
        "totalSales": total_sales,
        "totalProfit": total_profit,
        "totalOrders": total_orders,
        "totalQuantity": total_quantity,
        "avgDiscount": avg_discount,
        "profitMargin": profit_margin,
        "avgOrderValue": avg_order_value,
        "yoySalesGrowth": yoy_sales_growth,
        "yoyProfitGrowth": yoy_profit_growth,
        "monthlyTrend": _safe_json(monthly),
    }


def compute_categories(df):
    by_cat = (
        df.groupby("Category")
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orderCount=("Order ID", "nunique"),
        )
        .reset_index()
    )
    by_cat["profitMargin"] = (by_cat["profit"] / by_cat["sales"].replace(0, float("nan"))).round(4)

    by_sub = (
        df.groupby(["Category", "Sub-Category"])
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orderCount=("Order ID", "nunique"),
        )
        .reset_index()
    )
    by_sub["profitMargin"] = (by_sub["profit"] / by_sub["sales"].replace(0, float("nan"))).round(4)

    return {
        "byCategory": _safe_json(by_cat),
        "bySubCategory": _safe_json(by_sub),
    }


def compute_regional(df):
    by_region = (
        df.groupby("Region")
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orderCount=("Order ID", "nunique"),
        )
        .reset_index()
    )
    by_region["profitMargin"] = (by_region["profit"] / by_region["sales"].replace(0, float("nan"))).round(4)

    by_state = (
        df.groupby(["Region", "State"])
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orderCount=("Order ID", "nunique"),
        )
        .reset_index()
    )
    by_state["profitMargin"] = (by_state["profit"] / by_state["sales"].replace(0, float("nan"))).round(4)

    by_segment = (
        df.groupby(["Region", "Segment"])
        .agg(sales=("Sales", "sum"), profit=("Profit", "sum"))
        .reset_index()
    )

    return {
        "byRegion": _safe_json(by_region),
        "byState": _safe_json(by_state),
        "bySegment": _safe_json(by_segment),
    }


def compute_timeseries(df):
    monthly = (
        df.groupby("YearMonth")
        .agg(
            year=("Year", "first"),
            month=("Month", "first"),
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            orders=("Order ID", "nunique"),
            quantity=("Quantity", "sum"),
        )
        .reset_index()
        .sort_values("YearMonth")
    )

    yearly = (
        df.groupby("Year")
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            orders=("Order ID", "nunique"),
            quantity=("Quantity", "sum"),
        )
        .reset_index()
        .sort_values("Year")
    )

    return {
        "monthly": _safe_json(monthly),
        "yearly": _safe_json(yearly),
    }


def compute_segments(df):
    by_seg = (
        df.groupby("Segment")
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orderCount=("Order ID", "nunique"),
        )
        .reset_index()
    )
    by_seg["profitMargin"] = (by_seg["profit"] / by_seg["sales"].replace(0, float("nan"))).round(4)

    seg_cat = (
        df.groupby(["Segment", "Category"])
        .agg(sales=("Sales", "sum"), profit=("Profit", "sum"), quantity=("Quantity", "sum"))
        .reset_index()
    )

    return {
        "bySegment": _safe_json(by_seg),
        "segmentCategory": _safe_json(seg_cat),
    }


def compute_products(df, sort_by="sales", limit=10, order="desc"):
    ascending = order == "asc"
    prods = (
        df.groupby(["Product Name", "Category", "Sub-Category"])
        .agg(
            sales=("Sales", "sum"),
            profit=("Profit", "sum"),
            quantity=("Quantity", "sum"),
            orders=("Order ID", "nunique"),
        )
        .reset_index()
        .sort_values(sort_by, ascending=ascending)
        .head(limit)
    )

    category_breakdown = {str(k): int(v) for k, v in df["Category"].value_counts().items()}

    return {
        "products": _safe_json(prods),
        "summary": {
            "totalUniqueProducts": int(df["Product Name"].nunique()),
            "categoryBreakdown": category_breakdown,
        },
    }


def get_filters_info(df):
    return {
        "categories": sorted(df["Category"].dropna().unique().tolist()),
        "regions": sorted(df["Region"].dropna().unique().tolist()),
        "segments": sorted(df["Segment"].dropna().unique().tolist()),
        "dateRange": {
            "min": df["Order Date"].min().strftime("%Y-%m-%d"),
            "max": df["Order Date"].max().strftime("%Y-%m-%d"),
        },
    }
