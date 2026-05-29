# Superstore Analytics — Vue 3 前端

基于 **Vue 3 Composition API** + **Vite** 构建的现代化单页数据分析看板。

## 写给初学者：你可以学到什么

这个项目是为学习而设计的。阅读代码，你将理解：

1. **Vue 3 项目的结构** — 从入口文件到组件树
2. **数据如何流动** — API → 响应式状态 → 模板渲染
3. **如何使用 Chart.js** 在 Vue 中绘制交互式图表
4. **如何组织代码** — 组件、视图、工具函数的职责分离

## 快速启动

```bash
cd frontend_vue
npm install
npm run dev
# 浏览器打开 http://localhost:5173
```

请先确保 Flask 后端已启动（`python app.py`）。

## 项目结构 — 逐文件说明

```
frontend_vue/
├── index.html                  # HTML 外壳 — Vue 挂载到 <div id="app">
├── package.json                # 依赖：vue, vue-router, chart.js, marked
├── vite.config.js              # Vite 配置 — 开发端口、/api 代理到后端
└── src/
    ├── main.js                 # 🔰 入口 — 创建 Vue 应用，挂载到页面
    ├── App.vue                 # 根组件 — 侧边栏导航 + 路由出口
    ├── config.js               # API 路径工具函数
    ├── router/
    │   └── index.js            # 路由 — '/' 到看板，'/ai' 到 AI 对话
    ├── assets/
    │   └── app.css             # 全局样式 — CSS 变量、布局、排版
    ├── lib/                    # 共享工具模块
    │   ├── apiClient.js        # API 请求函数（封装 fetch）
    │   ├── aiClient.js         # DeepSeek AI 聊天客户端
    │   └── formatting.js       # 货币/百分比格式化、图表配色
    ├── components/             # 可复用的 UI 组件
    │   ├── SidebarNav.vue      # 左侧导航栏
    │   ├── FilterBar.vue       # 日期/区域/品类筛选控件
    │   └── KpiCards.vue        # 摘要指标卡片（销售额、利润等）
    └── views/                  # 页面级组件
        ├── DashboardView.vue   # 🎯 主看板 — 6 个分析模块
        └── AiAnalysisView.vue  # AI 对话页 — DeepSeek 问答
```

## 如何阅读这个项目（初学者指南）

### 第 1 步：理解入口文件

打开 `src/main.js`，一切从这里开始：

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

**发生了什么**：Vue 创建一个应用实例，注册路由（用于页面导航），然后挂载到 `index.html` 中的 `<div id="app">` 上。

### 第 2 步：追踪组件树

```
App.vue
├── SidebarNav.vue          ← 左侧导航链接
└── <RouterView />          ← 此处根据 URL 切换页面
    ├── DashboardView.vue   ← 路径 "/" 时显示
    │   ├── FilterBar.vue   ← 日期/区域/品类筛选
    │   ├── KpiCards.vue    ← 6 个摘要指标卡
    │   └── 图表 (Chart.js, 通过 <canvas> 渲染)
    └── AiAnalysisView.vue  ← 路径 "/ai" 时显示
```

### 第 3 步：理解数据流

以下以 Dashboard 页面为例，说明数据如何在应用中流动：

```
1. onMounted() 生命周期钩子 → 调用 loadData()
2. loadData() 调用 apiClient.js 中的 fetchAllModuleData()
3. apiClient.js 发送 GET /api/overview、/api/categories 等请求
4. Flask 后端接收请求，读取 CSV 文件，返回 JSON
5. DashboardView 接收 JSON → 赋值给响应式 ref 变量
6. Vue 响应式系统触发模板重新渲染
7. 模板渲染 <KpiCards> 组件和 <canvas> 元素
8. renderAllCharts() 从 ref 读取数据，用 Chart.js 绘制图表
```

**核心概念**：Vue 3 中，`ref()` 创建响应式变量。当你改变 ref 的值（如 `overview.value = newData`），Vue 会自动更新模板中使用该 ref 的所有位置。

### 第 4 步：理解图表渲染

图表使用 Chart.js 库。渲染分两步：

1. **模板创建 `<canvas>` 元素**，带有唯一的 `id`
2. **JavaScript 创建 `new Chart(ctx, config)`**，绑定到该 canvas

```javascript
// DashboardView.vue 中的代码：
const ctx = document.getElementById('chart-overview-trend')
new Chart(ctx, {
  type: 'line',                     // 图表类型
  data: { labels: [...], datasets: [...] },  // 数据
  options: { ... }                  // 样式配置
})
```

我们使用 `setTimeout(renderAllCharts, 400)` 延迟 400 毫秒执行图表渲染，确保 DOM 完全加载后再访问 canvas 元素。

### 第 5 步：理解 AI 集成

当你点击图表下方的 "AI Analyze" 按钮时：

1. 从当前模块的数据中构建「上下文」文本
2. 将上下文 + 分析指令发送到 `/api/llm/analyze`
3. Flask 后端将请求转发到 DeepSeek API
4. DeepSeek 返回 Markdown 格式的分析结果
5. 通过 `marked` 库将 Markdown 渲染为 HTML 显示在页面上

## Vue 3 核心模式一览

| 模式 | 代码示例 | 用途 |
|------|---------|------|
| `ref()` | `const data = ref(null)` | 响应式基础值 |
| `reactive()` | `const state = reactive({...})` | 响应式对象 |
| `computed()` | KpiCards.vue 中使用 | 自动更新的派生值 |
| `watch()` | DashboardView.vue 中使用 | 监听数据变化 |
| `provide/inject` | 跨组件传递数据 | 祖先向后代传值 |
| `<script setup>` | 所有 .vue 文件 | 简化组件写法 |
| `v-if` / `v-for` | 模板中 | 条件渲染 / 列表渲染 |
| `@click` / `v-model` | 模板中 | 事件处理 / 双向绑定 |

## 自定义修改

### 修改图表颜色

编辑 `src/lib/formatting.js`：
```javascript
export const COLORS = {
  sales: '#3b82f6',    // 改成你的品牌色
  profit: '#10b981',
  // ...
}
```

### 修改 AI 分析提示词

编辑 `src/views/DashboardView.vue` 中的 `PROMPTS` 对象，自定义 AI 分析的内容。

### 添加新的分析模块

1. 在 DashboardView.vue 的 `sections` 数组中添加新条目
2. 在模板中创建新的 `<section>` 并设置唯一的 `id`
3. 添加新的图表渲染函数
4. 在 `PROMPTS` 和 `BUILDERS` 中添加 AI 分析支持

## 依赖说明

| 包 | 版本 | 用途 |
|----|------|------|
| vue | ^3.4 | UI 框架 |
| vue-router | ^4.3 | 页面路由 |
| chart.js | ^4.4 | 交互式图表 |
| marked | ^12.0 | Markdown 转 HTML（AI 回复） |
| vite | ^5.4 | 开发服务器和构建工具 |
