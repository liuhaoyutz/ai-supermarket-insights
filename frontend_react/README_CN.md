# Superstore Analytics — React 18 前端

基于 **React 18 Hooks** + **Vite** 构建的现代化单页数据分析看板。

这是 Superstore 看板的 React 实现。它与 [Vue 版本](../frontend_vue/) 共享同一套后端 API，输出完全相同的视觉效果。对比两个版本是理解同一套业务逻辑在不同框架间转换的绝佳方式。

## 写给初学者：你可以学到什么

如果你是 React 新手（或从 Vue 转过来），这个项目展示了：

1. **React 应用的结构** — 组件、Hooks、JSX
2. **数据如何流动** — API → useState → JSX 渲染
3. **React 和 Vue 如何用不同方式解决相同问题**
4. **如何在 React 中使用 Chart.js**（同样的库，不同的集成方式）

## 快速启动

```bash
cd frontend_react
npm install
npm run dev
# 浏览器打开 http://localhost:5176
```

请先确保 Flask 后端已启动（`python app.py`）。

## 项目结构 — 逐文件说明

```
frontend_react/
├── index.html                  # HTML 外壳 — <div id="root"> 是 React 挂载点
├── package.json                # 依赖：react, react-dom, react-router-dom, chart.js, marked
├── vite.config.js              # Vite 配置 — 端口 5176，/api 代理到后端
└── src/
    ├── main.jsx                # 🔰 入口 — ReactDOM.createRoot，渲染 <App/>
    ├── App.jsx                 # 根组件 — 侧边栏 + 路由（Dashboard、AI Chat）
    ├── config.js               # API 路径工具（与 Vue 版共享）
    ├── assets/
    │   └── app.css             # 全局样式（与 Vue 版共享）
    ├── lib/                    # 工具模块（与 Vue 版共享）
    │   ├── apiClient.js        # API 请求函数
    │   ├── aiClient.js         # DeepSeek AI 聊天客户端
    │   └── formatting.js       # 货币/百分比格式化、图表配色
    ├── components/             # 可复用的 UI 组件
    │   ├── SidebarNav.jsx      # 左侧导航栏
    │   ├── FilterBar.jsx       # 日期/区域/品类筛选控件
    │   └── KpiCards.jsx        # 摘要指标卡片
    └── views/                  # 页面级组件
        ├── DashboardView.jsx   # 🎯 主看板 — 6 个分析模块
        └── AiAnalysisView.jsx  # AI 对话页 — DeepSeek 问答
```

## 如何阅读这个项目（初学者指南）

### 第 1 步：理解入口文件

打开 `src/main.jsx`，React 从这里启动：

```jsx
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
```

**发生了什么**：React 在 `<div id="root">` 上创建根节点，将 `<App />` 渲染进去。`BrowserRouter` 启用 URL 路由，`StrictMode` 在开发时帮助发现潜在问题。

**与 Vue 对比**：

| React | Vue |
|-------|-----|
| `ReactDOM.createRoot(...).render(<App/>)` | `createApp(App).mount('#app')` |
| `<BrowserRouter>` | `createRouter(…)` + `app.use(router)` |
| 入口文件 `main.jsx` | 入口文件 `main.js` |

### 第 2 步：追踪组件树

```
App.jsx
├── <SidebarNav />           ← 左侧导航链接
└── <Routes>                 ← 根据 URL 切换页面
    ├── <Route path="/" element={<DashboardView />} />
    │   ├── <FilterBar />    ← 筛选条件
    │   ├── <KpiCards />     ← 摘要卡片
    │   └── 图表 (<canvas> + Chart.js)
    └── <Route path="/ai" element={<AiAnalysisView />} />
```

**与 Vue 的关键区别**：React 使用 JSX（`<Component />` 语法）直接写在 `.jsx` 文件中。Vue 使用单文件组件（`.vue`），将 `<template>`、`<script>`、`<style>` 分开。

### 第 3 步：理解数据流

以下是数据在 React 应用中的流动方式：

```
1. useEffect(() => { loadData() }, [])  ← 组件挂载时执行一次
2. loadData() 调用 apiClient.js 中的 fetchAllModuleData()
3. apiClient.js 发送 GET 请求到 Flask 后端
4. 后端返回 JSON → setModuleData(json) 更新状态
5. React 用新数据重新渲染组件
6. JSX 渲染 <KpiCards data={...}> 和 <canvas> 元素
7. 另一个 useEffect 监听 moduleData 变化 → 调用 renderAllCharts()
8. Chart.js 在 canvas 上绘制图表
```

**核心概念**：React 的 `useState` Hook 创建状态变量。当调用 setter（如 `setModuleData(newData)`）时，React 安排一次重新渲染。组件函数再次执行，JSX 反映新数据。

**与 Vue 对比**：

| React | Vue |
|-------|-----|
| `const [data, setData] = useState(null)` | `const data = ref(null)` |
| `setData(newValue)` | `data.value = newValue` |
| `useEffect(() => {...}, [dep])` | `watch(dep, () => {...})` |
| `useEffect(() => {...}, [])` | `onMounted(() => {...})` |

### 第 4 步：理解图表渲染（React vs Vue）

两个版本使用完全相同的 Chart.js。区别在于**何时**以及**如何**触发渲染：

**React 方式**：
```jsx
// 监听数据变化，然后渲染图表
useEffect(() => {
  if (!loading && moduleData.overview) {
    destroyAllCharts()
    setTimeout(renderAllCharts, 300)  // 等待 DOM 渲染完成
  }
}, [moduleData])
```

**Vue 方式**：
```javascript
// 数据加载后，等待下一次 DOM 更新
await nextTick()
setTimeout(renderAllCharts, 400)
```

两者都使用 `setTimeout`，因为 `useEffect` / `nextTick` 只保证虚拟 DOM 更新完毕，实际的 DOM 绘制在复杂的嵌套元素中可能需要更长时间。

### 第 5 步：React 特有的模式

**条件渲染** — React 直接使用 JavaScript 表达式：

```jsx
// React：JavaScript && 和三元运算符
{loading && <div className="loading-overlay">加载中...</div>}
{data ? <Chart /> : <EmptyState />}

// Vue 等价写法：
// <div v-if="loading" class="loading-overlay">加载中...</div>
// <Chart v-if="data" /> <EmptyState v-else />
```

**列表渲染** — React 使用 `.map()`：

```jsx
// React
{sections.map(s => (
  <button key={s.key} onClick={() => scrollTo(s.key)}>{s.label}</button>
))}

// Vue 等价写法：
// <button v-for="s in sections" :key="s.key" @click="scrollTo(s.key)">{{ s.label }}</button>
```

**双向绑定** — React 使用显式的 value + onChange：

```jsx
// React：单向数据流 + 事件处理
<input value={value} onChange={e => setValue(e.target.value)} />

// Vue 等价写法：
// <input v-model="value" />
```

**HTML 渲染** — React 使用 `dangerouslySetInnerHTML`：

```jsx
// React
<div dangerouslySetInnerHTML={{ __html: marked.parse(markdown) }} />

// Vue 等价写法：
// <div v-html="marked.parse(markdown)" />
```

## React ↔ Vue 对照表

| 概念 | React 18 | Vue 3 |
|------|----------|-------|
| 文件扩展名 | `.jsx` | `.vue` |
| 组件定义 | `function Comp() { return <JSX/> }` | `<script setup>` + `<template>` |
| 响应式状态 | `useState(init)` | `ref(init)` / `reactive({})` |
| 计算属性 | `useMemo(() => val, [deps])` | `computed(() => val)` |
| 副作用 | `useEffect(fn, [deps])` | `watch(deps, fn)` / `onMounted(fn)` |
| 模板引用 | `useRef()` + `ref={el}` | `ref="name"` + `const el = ref(null)` |
| 条件渲染 | `{cond && <Tag/>}` | `v-if="cond"` |
| 循环渲染 | `{arr.map(x => <Tag key={x.id}/>)}` | `v-for="x in arr" :key="x.id"` |
| 事件处理 | `onClick={fn}` | `@click="fn"` |
| Props | `function Comp({ prop })` | `defineProps({ prop })` |
| 路由 | `react-router-dom` | `vue-router` |
| 样式类名 | `className="..."` | `class="..."` |

## 共享代码

`lib/` 目录和 `config.js` 在 Vue 和 React 版本中完全相同。这说明与框架无关的逻辑（API 调用、数据格式化、AI 客户端）是可以共享的 — 只有 UI 层不同。

## 对比学习建议

同时打开 `frontend_vue/src/views/DashboardView.vue` 和 `frontend_react/src/views/DashboardView.jsx` 并排对比。找到相同的功能/区块，观察两个框架如何处理：
- 状态管理
- 图表渲染的生命周期
- 事件处理
- 模板/JSX 模式

## 依赖说明

| 包 | 版本 | 用途 |
|----|------|------|
| react | ^18.3 | UI 库 |
| react-dom | ^18.3 | DOM 渲染器 |
| react-router-dom | ^6.26 | 页面路由 |
| chart.js | ^4.4 | 交互式图表 |
| marked | ^12.0 | Markdown 转 HTML |
| vite | ^5.4 | 开发服务器和构建工具 |
