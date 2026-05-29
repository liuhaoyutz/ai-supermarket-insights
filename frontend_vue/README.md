# Superstore Analytics — Vue 3 Frontend

A modern single-page analytics dashboard built with **Vue 3 Composition API** and **Vite**.

## For Beginners: What You'll Learn

This project is designed as a learning resource. By reading through the code, you'll understand:

1. **How a Vue 3 app is structured** — from entry point to components
2. **How data flows** — API → reactive state → template rendering
3. **How to use Chart.js** in Vue for interactive data visualization
4. **How to organize code** into reusable components, views, and utilities

## Quick Start

```bash
cd frontend_vue
npm install
npm run dev
# Open http://localhost:5173
```

Make sure the Flask backend is running on port 5000 first (`python app.py`).

## Project Structure — File by File

```
frontend_vue/
├── index.html                  # HTML shell — the <div id="app"> where Vue mounts
├── package.json                # Dependencies: vue, vue-router, chart.js, marked
├── vite.config.js              # Vite config — dev server port, /api proxy to backend
└── src/
    ├── main.js                 # 🔰 START HERE — creates Vue app, mounts it to #app
    ├── App.vue                 # Root component — sidebar navigation + router outlet
    ├── config.js               # API path helpers
    ├── router/
    │   └── index.js            # Route definitions — '/' → Dashboard, '/ai' → AI Chat
    ├── assets/
    │   └── app.css             # Global styles — CSS variables, layout, typography
    ├── lib/                    # Shared utility modules
    │   ├── apiClient.js        # API request functions (fetch wrapper)
    │   ├── aiClient.js         # DeepSeek AI chat client
    │   └── formatting.js       # Currency/percentage formatting, chart colors
    ├── components/             # Reusable UI building blocks
    │   ├── SidebarNav.vue      # Left navigation bar
    │   ├── FilterBar.vue       # Date/region/category filter controls
    │   └── KpiCards.vue        # Summary metric cards (sales, profit, etc.)
    └── views/                  # Page-level components
        ├── DashboardView.vue   # 🎯 Main dashboard — 6 analysis sections
        └── AiAnalysisView.vue  # AI chat page — DeepSeek-powered Q&A
```

## How to Read This Code (Beginner's Guide)

### Step 1: Understand the Entry Point

Open `src/main.js`. This is where everything starts:

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
```

**What happens**: Vue creates an application, registers the router (for page navigation), and mounts it to the `<div id="app">` in `index.html`.

### Step 2: Follow the Component Tree

```
App.vue
├── SidebarNav.vue          ← Left navigation with links
└── <RouterView />          ← This swaps between pages
    ├── DashboardView.vue   ← Shown at "/"
    │   ├── FilterBar.vue   ← Date/region/category filters
    │   ├── KpiCards.vue    ← 6 summary metric cards
    │   └── Charts (Chart.js via <canvas>)
    └── AiAnalysisView.vue  ← Shown at "/ai"
```

### Step 3: Understand Data Flow

Here's how data moves through the app, using the Dashboard page as an example:

```
1. onMounted() → loadData()
2. loadData() calls fetchAllModuleData() from apiClient.js
3. apiClient.js sends GET /api/overview, /api/categories, etc.
4. Flask backend receives requests, reads CSV, returns JSON
5. DashboardView receives JSON → assigns to reactive refs
6. Vue reactivity triggers template re-render
7. Template renders <KpiCards> and <canvas> elements
8. renderAllCharts() reads data from refs, draws Chart.js charts
```

**Key concept**: In Vue 3, `ref()` creates reactive variables. When you change a ref's value (e.g., `overview.value = newData`), Vue automatically updates any part of the template that uses that ref.

### Step 4: Understand Chart Rendering

Charts use Chart.js. The rendering happens in two steps:

1. **Template creates a `<canvas>` element** with a unique `id`
2. **JavaScript creates a `new Chart(ctx, config)`** targeting that canvas

```javascript
// In DashboardView.vue:
const ctx = document.getElementById('chart-overview-trend')
new Chart(ctx, {
  type: 'line',
  data: { labels: [...], datasets: [...] },
  options: { ... }
})
```

We use `setTimeout(renderAllCharts, 400)` to ensure the DOM is fully rendered before accessing canvas elements.

### Step 5: Understand AI Integration

When you click "AI Analyze" below a chart:

1. A context string is built from the current module's data
2. This context + analysis prompt is sent to `/api/llm/analyze`
3. The Flask backend forwards the request to DeepSeek API
4. DeepSeek returns markdown-formatted analysis
5. The markdown is rendered as HTML via the `marked` library

## Key Vue 3 Patterns Used

| Pattern | Where | Purpose |
|---------|-------|---------|
| `ref()` | `const data = ref(null)` | Reactive primitive values |
| `reactive()` | `const state = reactive({...})` | Reactive objects |
| `computed()` | KpiCards.vue | Derived values that auto-update |
| `watch()` | DashboardView.vue | React to data changes |
| `provide/inject` | DashboardView → AiChatPanel | Pass data through component tree |
| `<script setup>` | All .vue files | Simplified component syntax |
| `v-if` / `v-for` | Templates | Conditional rendering / lists |
| `@click` / `v-model` | Templates | Event handling / two-way binding |

## Customizing

### Change the chart colors

Edit `src/lib/formatting.js`:
```javascript
export const COLORS = {
  sales: '#3b82f6',    // Change to your brand color
  profit: '#10b981',
  // ...
}
```

### Change the analysis prompt

Edit the `PROMPTS` object in `src/views/DashboardView.vue` to customize what the AI analyzes.

### Add a new analysis module

1. Add a new entry to the `sections` array in DashboardView.vue
2. Create a new `<section>` in the template with a unique `id`
3. Add a new chart rendering function
4. Add a new entry to `PROMPTS` and `BUILDERS` for AI analysis

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| vue | ^3.4 | UI framework |
| vue-router | ^4.3 | Page routing |
| chart.js | ^4.4 | Interactive charts |
| marked | ^12.0 | Markdown to HTML (AI responses) |
| vite | ^5.4 | Dev server and build tool |
