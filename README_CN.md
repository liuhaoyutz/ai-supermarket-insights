# Superstore Analytics Dashboard

基于 Flask + Vue 3 + React 18 的 AI 商业数据分析看板，使用经典的
[Sample Superstore](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final) 数据集。

## 功能特性

- **多维分析**：概览、品类、区域、趋势、客户、产品 — 6 大分析模块
- **交互式图表**：柱状图、折线图、环形图（基于 Chart.js），支持实时筛选
- **AI 智能分析**：集成 DeepSeek 大模型，点击按钮即可获得各模块的专业分析
- **双前端实现**：Vue 3 和 React 18 两个版本，功能完全一致，便于对比学习
- **苹果风格设计**：毛玻璃效果、微交互动画、响应式布局

## 系统架构

```
┌─────────────────┐     ┌──────────────────────────────┐
│  Flask 后端      │────▶│  Vue 3 前端 (端口 5173)      │
│  (端口 5000)     │     │  React 18 前端 (端口 5176)    │
│                  │     │                              │
│  data_processor  │     │  Chart.js + marked +         │
│  pandas + numpy  │     │  DeepSeek AI 集成            │
└─────────────────┘     └──────────────────────────────┘
```

- **后端**：Flask 读取 Superstore CSV，用 pandas 处理数据，提供 7 个 REST API
- **前端**：两个 SPA 实现（Vue 3 / React 18）消费同一套 API，渲染图表和表格
- **AI**：DeepSeek API（通过后端代理）提供按需商业分析

## 数据说明

[Sample Superstore](https://www.kaggle.com/datasets/vivek468/superstore-dataset-final) 数据集包含 9,994 条零售订单（2014-2017），覆盖全美各地区。

| 维度 | 取值 |
|------|------|
| 产品品类 | Furniture, Office Supplies, Technology |
| 区域 | East, West, Central, South |
| 客户细分 | Consumer, Corporate, Home Office |
| 指标 | Sales, Profit, Quantity, Discount |

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/filters` | 可用的筛选选项（区域、品类、日期范围） |
| `GET /api/overview` | KPI 摘要（总销售额、利润、订单数、同比增长、月度趋势） |
| `GET /api/categories` | 品类和子品类业绩分析 |
| `GET /api/regional` | 区域和州级分析 |
| `GET /api/timeseries` | 月度/年度销售与利润趋势 |
| `GET /api/segments` | 客户细分分析及交叉表 |
| `GET /api/products` | 产品排名（Top/Bottom N） |

所有接口支持可选查询参数：`start_date`、`end_date`、`region`、`category`。

## 快速开始

### 1. 安装 Python 依赖

```bash
pip install -r requirements.txt
```

### 2. 启动后端

```bash
python app.py
# 服务运行在 http://localhost:5000
```

### 3. 启动前端

**Vue 版本：**
```bash
cd frontend_vue
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

**React 版本：**
```bash
cd frontend_react
npm install
npm run dev
# 浏览器打开 http://localhost:5176
```

### 4. 配置 AI 功能（可选）

```bash
export DEEPSEEK_API_KEY="your-api-key"
```

不配置 AI Key 时，图表和表格正常使用，仅 "AI Analyze" 按钮会提示错误。

## 项目结构

```
/
├── app.py                    # Flask API 服务
├── data_processor.py         # 数据加载、筛选、聚合（pandas）
├── requirements.txt          # Python 依赖
├── data/
│   └── Superstore.csv        # 9,994 行零售数据集
├── frontend_vue/             # Vue 3 + Vite 实现
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.js           # 入口文件
│       ├── App.vue           # 根组件（侧边栏 + 路由）
│       ├── router/index.js   # 路由定义
│       ├── config.js         # API 路径配置
│       ├── lib/              # API 客户端、AI 客户端、格式化工具
│       ├── components/       # SidebarNav、FilterBar、KpiCards
│       ├── views/            # DashboardView、AiAnalysisView
│       └── assets/app.css    # 苹果风格设计系统
└── frontend_react/           # React 18 + Vite 实现
    └── src/                  # （与 Vue 版结构对称）
        ├── main.jsx
        ├── App.jsx
        ├── components/       # SidebarNav、FilterBar、KpiCards
        ├── views/            # DashboardView、AiAnalysisView
        └── lib/              # （与 Vue 版共享）
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3, Flask, pandas, NumPy |
| 前端 A | Vue 3 (Composition API), Vite, Chart.js, marked |
| 前端 B | React 18 (Hooks), Vite, Chart.js, marked |
| AI | DeepSeek Chat API |
| 数据 | Sample Superstore (Kaggle) |
