"""Superstore Analytics API — Flask Backend."""

import os
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from data_processor import (
    load_data, apply_filters, get_filters_info,
    compute_overview, compute_categories, compute_regional,
    compute_timeseries, compute_segments, compute_products,
)

app = Flask(__name__)
CORS(app)

# DeepSeek LLM 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

df_all = load_data()


def _get_filters():
    return {
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date"),
        "region": request.args.get("region"),
        "category": request.args.get("category"),
    }


@app.route("/api/filters")
def api_filters():
    try:
        return jsonify({"ok": True, "data": get_filters_info(df_all)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/overview")
def api_overview():
    try:
        df = apply_filters(df_all, **_get_filters())
        return jsonify({"ok": True, "data": compute_overview(df)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/categories")
def api_categories():
    try:
        df = apply_filters(df_all, **_get_filters())
        return jsonify({"ok": True, "data": compute_categories(df)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/regional")
def api_regional():
    try:
        df = apply_filters(df_all, **_get_filters())
        return jsonify({"ok": True, "data": compute_regional(df)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/timeseries")
def api_timeseries():
    try:
        df = apply_filters(df_all, **_get_filters())
        return jsonify({"ok": True, "data": compute_timeseries(df)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/segments")
def api_segments():
    try:
        df = apply_filters(df_all, **_get_filters())
        return jsonify({"ok": True, "data": compute_segments(df)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/products")
def api_products():
    try:
        df = apply_filters(df_all, **_get_filters())
        sort_by = request.args.get("sort_by", "sales")
        limit = int(request.args.get("limit", 10))
        order = request.args.get("order", "desc")
        return jsonify({"ok": True, "data": compute_products(df, sort_by=sort_by, limit=limit, order=order)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/llm/analyze", methods=["POST"])
def api_llm_analyze():
    """DeepSeek AI 分析代理接口。"""
    try:
        body = request.get_json() or {}
        messages = body.get("messages", [])

        if not DEEPSEEK_API_KEY:
            return jsonify({"ok": False, "error": "DeepSeek API key not configured. Set DEEPSEEK_API_KEY env var."}), 500

        resp = requests.post(
            f"{DEEPSEEK_BASE_URL}/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": DEEPSEEK_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 800,
            },
            timeout=30,
        )
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"]
        return jsonify({"ok": True, "content": content})
    except requests.exceptions.Timeout:
        return jsonify({"ok": False, "error": "LLM request timed out"}), 504
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
