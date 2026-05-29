# Superstore Analytics — React 18 Frontend

A modern single-page analytics dashboard built with **React 18 Hooks** and **Vite**.

This is the React implementation of the Superstore dashboard. It shares the same backend API and produces identical visual output as the [Vue version](../frontend_vue/). Comparing the two is an excellent way to understand how the same application logic translates between frameworks.

## For Beginners: What You'll Learn

If you're new to React (or coming from Vue), this project demonstrates:

1. **How a React app is structured** — components, hooks, JSX
2. **How data flows** — API → useState → JSX rendering
3. **How React and Vue solve the same problems differently**
4. **How to use Chart.js** in React (same library, different integration)

## Quick Start

```bash
cd frontend_react
npm install
npm run dev
# Open http://localhost:5176
```

Make sure the Flask backend is running on port 5000 first (`python app.py`).

## Project Structure — File by File

```
frontend_react/
├── index.html                  # HTML shell — <div id="root"> where React mounts
├── package.json                # Dependencies: react, react-dom, react-router-dom, chart.js, marked
├── vite.config.js              # Vite config — dev server port 5176, /api proxy to backend
└── src/
    ├── main.jsx                # 🔰 START HERE — ReactDOM.createRoot, renders <App/>
    ├── App.jsx                 # Root component — sidebar + routes (Dashboard, AI Chat)
    ├── config.js               # API path helpers (shared with Vue version)
    ├── assets/
    │   └── app.css             # Global styles (shared with Vue version)
    ├── lib/                    # Utility modules (shared with Vue version)
    │   ├── apiClient.js        # API request functions
    │   ├── aiClient.js         # DeepSeek AI chat client
    │   └── formatting.js       # Currency/percentage formatting, chart colors
    ├── components/             # Reusable UI building blocks
    │   ├── SidebarNav.jsx      # Left navigation bar
    │   ├── FilterBar.jsx       # Date/region/category filter controls
    │   └── KpiCards.jsx        # Summary metric cards
    └── views/                  # Page-level components
        ├── DashboardView.jsx   # 🎯 Main dashboard — 6 analysis sections
        └── AiAnalysisView.jsx  # AI chat page — DeepSeek-powered Q&A
```

## How to Read This Code (Beginner's Guide)

### Step 1: Understand the Entry Point

Open `src/main.jsx`. This is where React boots up:

```jsx
import React from 'react'
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

**What happens**: React creates a "root" on the `<div id="root">` element and renders the `<App />` component inside it. `BrowserRouter` enables URL-based routing, and `StrictMode` helps catch bugs during development.

**Compare with Vue**:

| React | Vue |
|-------|-----|
| `ReactDOM.createRoot(...).render(<App/>)` | `createApp(App).mount('#app')` |
| `<BrowserRouter>` | `createRouter(…)` + `app.use(router)` |
| `main.jsx` | `main.js` |

### Step 2: Follow the Component Tree

```
App.jsx
├── <SidebarNav />           ← Left navigation links
└── <Routes>                 ← Swaps pages based on URL
    ├── <Route path="/" element={<DashboardView />} />
    │   ├── <FilterBar />    ← Filters
    │   ├── <KpiCards />     ← Summary cards
    │   └── Charts (<canvas> + Chart.js)
    └── <Route path="/ai" element={<AiAnalysisView />} />
```

**Key difference from Vue**: React uses JSX (`<Component />` syntax) directly in `.jsx` files. Vue uses Single-File Components (`.vue` files) with separate `<template>`, `<script>`, and `<style>` sections.

### Step 3: Understand Data Flow

Here's how data moves through the React app:

```
1. useEffect(() => { loadData() }, [])  ← runs once on mount
2. loadData() calls fetchAllModuleData() from apiClient.js
3. apiClient.js sends GET requests to Flask backend
4. Backend returns JSON → setModuleData(json) updates state
5. React re-renders the component with new data
6. JSX renders <KpiCards data={...}> and <canvas> elements
7. Another useEffect watches moduleData → calls renderAllCharts()
8. Chart.js draws charts on the canvas elements
```

**Key concept**: React's `useState` hook creates state variables. When you call the setter (e.g., `setModuleData(newData)`), React schedules a re-render. The component function runs again, and JSX reflects the new data.

**Compare with Vue**:

| React | Vue |
|-------|-----|
| `const [data, setData] = useState(null)` | `const data = ref(null)` |
| `setData(newValue)` | `data.value = newValue` |
| `useEffect(() => {...}, [dep])` | `watch(dep, () => {...})` |
| `useEffect(() => {...}, [])` | `onMounted(() => {...})` |

### Step 4: Understand Chart Rendering (React vs Vue)

Both versions use Chart.js identically. The difference is in WHEN and HOW they trigger rendering:

**React approach**:
```jsx
// Watch for data changes, then render charts
useEffect(() => {
  if (!loading && moduleData.overview) {
    destroyAllCharts()
    setTimeout(renderAllCharts, 300)  // Wait for DOM
  }
}, [moduleData])
```

**Vue approach**:
```javascript
// After data loads, wait for next DOM update
await nextTick()
setTimeout(renderAllCharts, 400)
```

Both use `setTimeout` because `useEffect` / `nextTick` only guarantees the virtual DOM is updated — actual DOM painting may take longer with complex nested elements.

### Step 5: React-Specific Patterns to Notice

**Conditional rendering** — React uses JavaScript, not template directives:

```jsx
// React: JavaScript && and ternary
{loading && <div className="loading-overlay">...</div>}
{data ? <Chart /> : <EmptyState />}

// Vue equivalent:
// <div v-if="loading" class="loading-overlay">...</div>
// <Chart v-if="data" /> <EmptyState v-else />
```

**List rendering** — React uses `.map()`:

```jsx
// React
{sections.map(s => (
  <button key={s.key} onClick={() => scrollTo(s.key)}>{s.label}</button>
))}

// Vue equivalent:
// <button v-for="s in sections" :key="s.key" @click="scrollTo(s.key)">{{ s.label }}</button>
```

**Two-way binding** — React uses explicit value + onChange:

```jsx
// React: one-way + handler
<input value={filters.region} onChange={e => setFilters({...filters, region: e.target.value})} />

// Vue equivalent:
// <input v-model="filters.region" />
```

**HTML rendering** — React uses `dangerouslySetInnerHTML`:

```jsx
// React
<div dangerouslySetInnerHTML={{ __html: marked.parse(markdown) }} />

// Vue equivalent:
// <div v-html="marked.parse(markdown)" />
```

## React ↔ Vue Cheat Sheet

| Concept | React 18 | Vue 3 |
|---------|----------|-------|
| File extension | `.jsx` | `.vue` |
| Component definition | `function Comp() { return <JSX/> }` | `<script setup>` + `<template>` |
| Reactive state | `useState(init)` | `ref(init)` / `reactive({})` |
| Computed values | `useMemo(() => val, [deps])` | `computed(() => val)` |
| Side effects | `useEffect(fn, [deps])` | `watch(deps, fn)` / `onMounted(fn)` |
| Template refs | `useRef()` + `ref={el}` | `ref="name"` + `const el = ref(null)` |
| Conditional | `{cond && <Tag/>}` | `v-if="cond"` |
| Loops | `{arr.map(x => <Tag key={x.id}/>)}` | `v-for="x in arr" :key="x.id"` |
| Events | `onClick={fn}` | `@click="fn"` |
| Props | `function Comp({ prop })` | `defineProps({ prop })` |
| Router | `react-router-dom` | `vue-router` |
| Styling | `className="..."` | `class="..."` |

## Shared Code

The `lib/` and `config.js` files are identical between the Vue and React versions. This demonstrates that framework-agnostic logic (API calls, data formatting, AI client) can be shared — only the UI layer differs.

## Customizing

### Use the other frontend

Both frontends consume the same backend API. You can run either one:
```bash
# Vue version (port 5173)
cd frontend_vue && npm run dev

# React version (port 5176)
cd frontend_react && npm run dev
```

### Learn by comparing

Open both `frontend_vue/src/views/DashboardView.vue` and `frontend_react/src/views/DashboardView.jsx` side by side. Find the same function/section in each and observe how the two frameworks handle:
- State management
- Chart rendering lifecycle
- Event handling
- Template/JSX patterns

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3 | UI library |
| react-dom | ^18.3 | DOM renderer |
| react-router-dom | ^6.26 | Page routing |
| chart.js | ^4.4 | Interactive charts |
| marked | ^12.0 | Markdown to HTML |
| vite | ^5.4 | Dev server and build tool |
