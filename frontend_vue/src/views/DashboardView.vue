<script setup>
/**
 * Superstore Analytics Dashboard — 单页滚动布局。
 * 对标 cimujia 周报的模块化数据获取 + 组件化渲染体系。
 * 每个分析模块自带 AI 分析按钮，结果内联展示在图表下方。
 */
import { reactive, ref, onMounted, onBeforeUnmount, nextTick, provide } from 'vue'
import Chart from 'chart.js/auto'
import { marked } from 'marked'
import { fetchFilterMeta, fetchAllModuleData } from '@/lib/apiClient.js'
import { sendAiMessage, createUserMessage, createAssistantMessage } from '@/lib/aiClient.js'
import { COLORS, baseChartOptions, moneyTooltip, fmtCurrency, fmtNum, fmtPct } from '@/lib/formatting.js'
import FilterBar from '@/components/FilterBar.vue'
import KpiCards from '@/components/KpiCards.vue'

const sections = [
  { key: 'overview', label: 'Overview' },
  { key: 'categories', label: 'Categories' },
  { key: 'regional', label: 'Regional' },
  { key: 'timeseries', label: 'Trends' },
  { key: 'segments', label: 'Customers' },
  { key: 'products', label: 'Products' },
]
const activeSection = ref('overview')

function scrollTo(key) {
  activeSection.value = key
  document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

let scrollTimer = null
function onScroll() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    let current = sections[0].key
    for (const s of sections) {
      const el = document.getElementById(`sec-${s.key}`)
      if (el && el.getBoundingClientRect().top < 200) current = s.key
    }
    activeSection.value = current
  }, 100)
}

const filters = reactive({ start_date: null, end_date: null, region: null, category: null })
const filterMeta = ref({})
const moduleData = ref({})
const loading = ref(false)
const chartInstances = {}

provide('moduleData', moduleData)

const analysisState = reactive({
  overview: { loading: false, result: '', error: '' },
  categories: { loading: false, result: '', error: '' },
  regional: { loading: false, result: '', error: '' },
  timeseries: { loading: false, result: '', error: '' },
  segments: { loading: false, result: '', error: '' },
  products: { loading: false, result: '', error: '' },
})

function asMd(text) {
  return marked.parse(text, { breaks: true })
}

// ---- Chart-specific AI context builders ----
function buildOverviewContext() {
  const d = moduleData.value.overview
  if (!d) return ''
  const trend = (d.monthlyTrend || []).slice(-6).map(t => `${t.YearMonth}: Sales $${Number(t.sales).toLocaleString()}, Profit $${Number(t.profit).toLocaleString()}`).join('\n')
  return `## Overview Data
Total Sales: $${Number(d.totalSales).toLocaleString()}
Total Profit: $${Number(d.totalProfit).toLocaleString()}
Profit Margin: ${Number(d.profitMargin).toFixed(1)}%
Total Orders: ${Number(d.totalOrders).toLocaleString()}
Avg Order Value: $${Number(d.avgOrderValue).toLocaleString()}
YoY Sales Growth: ${Number(d.yoySalesGrowth).toFixed(1)}%
YoY Profit Growth: ${Number(d.yoyProfitGrowth).toFixed(1)}%

Last 6 months trend:
${trend}`
}

function buildCategoriesContext() {
  const d = moduleData.value.categories
  if (!d) return ''
  const cats = (d.byCategory || []).map(c => `- ${c.Category}: Sales $${Number(c.sales).toLocaleString()}, Profit $${Number(c.profit).toLocaleString()}, Margin ${(c.profitMargin * 100).toFixed(1)}%`).join('\n')
  const subs = (d.bySubCategory || []).map(s => `- ${s['Sub-Category']} (${s.Category}): Sales $${Number(s.sales).toLocaleString()}, Profit $${Number(s.profit).toLocaleString()}, Margin ${(s.profitMargin * 100).toFixed(1)}%`).join('\n')
  return `## Category Performance\n${cats}\n\n## Sub-Category Detail\n${subs}`
}

function buildRegionalContext() {
  const d = moduleData.value.regional
  if (!d) return ''
  const regions = (d.byRegion || []).map(r => `- ${r.Region}: Sales $${Number(r.sales).toLocaleString()}, Profit $${Number(r.profit).toLocaleString()}, Margin ${(r.profitMargin * 100).toFixed(1)}%`).join('\n')
  const states = (d.byState || []).sort((a,b) => b.sales - a.sales).slice(0, 5).map(s => `- ${s.State} (${s.Region}): Sales $${Number(s.sales).toLocaleString()}, Profit $${Number(s.profit).toLocaleString()}`).join('\n')
  return `## Regional Performance\n${regions}\n\n## Top 5 States\n${states}`
}

function buildTrendsContext() {
  const d = moduleData.value.timeseries
  if (!d) return ''
  const yearly = (d.yearly || []).map(y => `- ${y.Year}: Sales $${Number(y.sales).toLocaleString()}, Profit $${Number(y.profit).toLocaleString()}, Orders ${y.orders}`).join('\n')
  return `## Yearly Trends\n${yearly}`
}

function buildSegmentsContext() {
  const d = moduleData.value.segments
  if (!d) return ''
  const segs = (d.bySegment || []).map(s => `- ${s.Segment}: Sales $${Number(s.sales).toLocaleString()}, Profit $${Number(s.profit).toLocaleString()}, Margin ${(s.profitMargin * 100).toFixed(1)}%`).join('\n')
  const cross = (d.segmentCategory || []).map(s => `- ${s.Segment} x ${s.Category}: Sales $${Number(s.sales).toLocaleString()}, Profit $${Number(s.profit).toLocaleString()}`).join('\n')
  return `## Customer Segments\n${segs}\n\n## Segment x Category Cross\n${cross}`
}

function buildProductsContext() {
  const d = moduleData.value.products
  if (!d) return ''
  const prods = (d.products || []).map(p => `- ${p['Product Name']} (${p.Category}): Sales $${Number(p.sales).toLocaleString()}, Profit $${Number(p.profit).toLocaleString()}, Qty ${p.quantity}`).join('\n')
  return `## Top Products\n${prods}\n\nTotal unique products: ${d.summary?.totalUniqueProducts || 'N/A'}`
}

const BUILDERS = { overview: buildOverviewContext, categories: buildCategoriesContext, regional: buildRegionalContext, timeseries: buildTrendsContext, segments: buildSegmentsContext, products: buildProductsContext }

const PROMPTS = {
  overview: 'Analyze the overall business performance. Identify key trends in the sales and profit data, and highlight any concerning patterns or positive developments. Give 2-3 actionable recommendations.',
  categories: 'Analyze category and sub-category performance. Which categories are the profit drivers? Which sub-categories are underperforming? Suggest where to focus resources.',
  regional: 'Analyze regional and state-level performance. Identify the strongest and weakest regions. What patterns do you see in the region x segment cross analysis?',
  timeseries: 'Analyze the time trends. What seasonal patterns do you observe? How has the business evolved year-over-year? What should we prepare for in the coming months?',
  segments: 'Analyze customer segment performance. Which segments are most valuable? What does the segment x category breakdown reveal about purchasing behavior?',
  products: 'Analyze the top product rankings. Which products drive the most value? Are there products with high sales but low profit margins that need attention?',
}

const SYSTEM_PROMPT = 'You are a senior business analyst at a retail company. Analyze the provided data and give concise insights. Use markdown formatting. Keep under 200 words.'

async function handleAiAnalysis(chartKey) {
  const st = analysisState[chartKey]
  if (!st || st.loading) return
  st.loading = true
  st.result = ''
  st.error = ''
  try {
    const builder = BUILDERS[chartKey]
    const context = builder ? builder() : ''
    const prompt = PROMPTS[chartKey] || 'Analyze this data.'
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + context },
      { role: 'user', content: prompt },
    ]
    const reply = await sendAiMessage(messages, context)
    st.result = reply
  } catch (e) {
    st.error = 'AI analysis unavailable. Please ensure DEEPSEEK_API_KEY is configured.'
  }
  st.loading = false
}

async function loadData() {
  loading.value = true
  try {
    const fm = await fetchFilterMeta()
    filterMeta.value = fm
    const data = await fetchAllModuleData({ ...filters })
    moduleData.value = data
    // clear previous analysis when filter changes
    Object.keys(analysisState).forEach(k => { analysisState[k].result = ''; analysisState[k].error = '' })
    await nextTick()
    renderCharts()
  } finally {
    loading.value = false
  }
}

function destroyChart(key) {
  if (chartInstances[key]) { chartInstances[key].destroy(); chartInstances[key] = null }
}

function destroyAllCharts() {
  Object.keys(chartInstances).forEach(destroyChart)
}

function handleApply() { destroyAllCharts(); loadData() }
function handleReset() {
  filters.start_date = null; filters.end_date = null; filters.region = null; filters.category = null
  destroyAllCharts(); loadData()
}

// ---- Chart Rendering ----
function renderCharts() {
  renderOverviewTrend()
  renderCategoryBars()
  renderRegionalBars()
  renderMonthlyTrend()
  renderSegmentDoughnut()
  renderProductsBar()
}

function renderOverviewTrend() {
  if (!moduleData.value.overview?.monthlyTrend) return
  destroyChart('overviewTrend')
  const trend = moduleData.value.overview.monthlyTrend
  const ctx = document.getElementById('chart-overview-trend')
  if (!ctx) return
  chartInstances.overviewTrend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trend.map(t => t.YearMonth),
      datasets: [
        { label: 'Sales', data: trend.map(t => t.sales), borderColor: COLORS.sales, backgroundColor: 'rgba(59,130,246,0.05)', yAxisID: 'y', tension: 0.2, fill: true },
        { label: 'Profit', data: trend.map(t => t.profit), borderColor: COLORS.profit, backgroundColor: 'rgba(16,185,129,0.05)', yAxisID: 'y1', tension: 0.2, fill: true },
      ],
    },
    options: {
      ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }),
      scales: {
        y: { type: 'linear', position: 'left', title: { display: true, text: 'Sales ($)' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
        y1: { type: 'linear', position: 'right', title: { display: true, text: 'Profit ($)' }, grid: { drawOnChartArea: false }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
      },
    },
  })
}

function renderCategoryBars() {
  if (!moduleData.value.categories) return
  const cats = moduleData.value.categories.byCategory || []
  const subs = moduleData.value.categories.bySubCategory || []
  destroyChart('catBar'); destroyChart('subcatBar')

  const c1 = document.getElementById('chart-cat-bar')
  if (c1) {
    chartInstances.catBar = new Chart(c1, {
      type: 'bar',
      data: {
        labels: cats.map(c => c.Category),
        datasets: [
          { label: 'Sales', data: cats.map(c => c.sales), backgroundColor: COLORS.sales, borderRadius: 4 },
          { label: 'Profit', data: cats.map(c => c.profit), backgroundColor: COLORS.profit, borderRadius: 4 },
        ],
      },
      options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }

  const c2 = document.getElementById('chart-subcat-bar')
  if (c2) {
    chartInstances.subcatBar = new Chart(c2, {
      type: 'bar',
      data: {
        labels: subs.map(s => s['Sub-Category']),
        datasets: [
          { label: 'Sales', data: subs.map(s => s.sales), backgroundColor: COLORS.sales, borderRadius: 4 },
          { label: 'Profit', data: subs.map(s => s.profit), backgroundColor: COLORS.profit, borderRadius: 4 },
        ],
      },
      options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip() } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }
}

function renderRegionalBars() {
  if (!moduleData.value.regional) return
  const regions = moduleData.value.regional.byRegion || []
  const states = (moduleData.value.regional.byState || []).sort((a, b) => b.sales - a.sales).slice(0, 10)
  const segCross = moduleData.value.regional.bySegment || []
  destroyChart('regionBar'); destroyChart('stateBar'); destroyChart('regionSegment')

  const c1 = document.getElementById('chart-region-bar')
  if (c1) {
    chartInstances.regionBar = new Chart(c1, {
      type: 'bar',
      data: {
        labels: regions.map(r => r.Region),
        datasets: [
          { label: 'Sales', data: regions.map(r => r.sales), backgroundColor: COLORS.sales, borderRadius: 4 },
          { label: 'Profit', data: regions.map(r => r.profit), backgroundColor: COLORS.profit, borderRadius: 4 },
        ],
      },
      options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }

  const c2 = document.getElementById('chart-state-bar')
  if (c2) {
    const ri = regions.reduce((m, r, i) => { m[r.Region] = i; return m }, {})
    chartInstances.stateBar = new Chart(c2, {
      type: 'bar',
      data: {
        labels: states.map(s => s.State),
        datasets: [{ label: 'Sales', data: states.map(s => s.sales), backgroundColor: states.map(s => COLORS.catColors[(ri[s.Region] || 0) % 4]), borderRadius: 4 }],
      },
      options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip(), legend: { display: false } } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }

  const c3 = document.getElementById('chart-region-segment')
  if (c3) {
    const segNames = [...new Set(segCross.map(s => s.Segment))]
    const regionNames = [...new Set(segCross.map(s => s.Region))]
    chartInstances.regionSegment = new Chart(c3, {
      type: 'bar',
      data: {
        labels: regionNames,
        datasets: segNames.map((sn, i) => ({
          label: sn, data: regionNames.map(rn => { const r = segCross.find(s => s.Region === rn && s.Segment === sn); return r ? r.sales : 0 }),
          backgroundColor: COLORS.segmentColors[i], borderRadius: 4,
        })),
      },
      options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }
}

function renderMonthlyTrend() {
  if (!moduleData.value.timeseries) return
  const monthly = moduleData.value.timeseries.monthly || []
  const yearly = moduleData.value.timeseries.yearly || []
  destroyChart('monthlyFull'); destroyChart('yearly')

  const c1 = document.getElementById('chart-monthly-full')
  if (c1) {
    chartInstances.monthlyFull = new Chart(c1, {
      type: 'line',
      data: {
        labels: monthly.map(m => m.YearMonth),
        datasets: [
          { label: 'Sales', data: monthly.map(m => m.sales), borderColor: COLORS.sales, yAxisID: 'y', tension: 0.15, pointRadius: 0 },
          { label: 'Profit', data: monthly.map(m => m.profit), borderColor: COLORS.profit, yAxisID: 'y1', tension: 0.15, pointRadius: 0 },
        ],
      },
      options: {
        ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }),
        scales: {
          y: { type: 'linear', position: 'left', title: { display: true, text: 'Sales ($)' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
          y1: { type: 'linear', position: 'right', title: { display: true, text: 'Profit ($)' }, grid: { drawOnChartArea: false }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } },
        },
      },
    })
  }

  const c2 = document.getElementById('chart-yearly')
  if (c2) {
    chartInstances.yearly = new Chart(c2, {
      type: 'bar',
      data: {
        labels: yearly.map(y => 'Year ' + y.Year),
        datasets: [
          { label: 'Sales', data: yearly.map(y => y.sales), backgroundColor: COLORS.sales, borderRadius: 4 },
          { label: 'Profit', data: yearly.map(y => y.profit), backgroundColor: COLORS.profit, borderRadius: 4 },
        ],
      },
      options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }
}

function renderSegmentDoughnut() {
  if (!moduleData.value.segments) return
  const segs = moduleData.value.segments.bySegment || []
  destroyChart('segmentDoughnut')
  const c = document.getElementById('chart-segment-doughnut')
  if (c) {
    chartInstances.segmentDoughnut = new Chart(c, {
      type: 'doughnut',
      data: { labels: segs.map(s => s.Segment), datasets: [{ data: segs.map(s => s.sales), backgroundColor: COLORS.segmentColors, borderWidth: 0 }] },
      options: baseChartOptions(),
    })
  }
}

function renderProductsBar() {
  if (!moduleData.value.products) return
  const prods = moduleData.value.products.products || []
  destroyChart('productsBar')
  const c = document.getElementById('chart-products-bar')
  if (c) {
    chartInstances.productsBar = new Chart(c, {
      type: 'bar',
      data: {
        labels: prods.map(p => p['Product Name']),
        datasets: [
          { label: 'Sales', data: prods.map(p => p.sales), backgroundColor: COLORS.sales, borderRadius: 4 },
          { label: 'Profit', data: prods.map(p => p.profit), backgroundColor: COLORS.profit, borderRadius: 4 },
        ],
      },
      options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip() } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
    })
  }
}

onMounted(() => {
  loadData()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <FilterBar :filterMeta="filterMeta" v-model="filters" @apply="handleApply" @reset="handleReset" />

  <div class="content-with-nav">
    <div v-if="loading" class="loading-overlay"><div class="spinner"></div></div>

    <div class="content-main">

    <!-- ========== 1. Overview ========== -->
    <section id="sec-overview" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">1. Overview</h2>
      <KpiCards :overview="moduleData.overview" />
      <div class="chart-row single">
        <div class="chart-card">
          <h3>Monthly Sales &amp; Profit Trend</h3>
          <div class="chart-wrap"><canvas id="chart-overview-trend"></canvas></div>
          <button class="ai-chart-btn" :disabled="analysisState.overview.loading" @click="handleAiAnalysis('overview')">
            &#10041; {{ analysisState.overview.loading ? 'Analyzing...' : 'AI Analyze Overview' }}
          </button>
          <div v-if="analysisState.overview.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.overview.result" class="ai-result" v-html="asMd(analysisState.overview.result)"></div>
          <div v-if="analysisState.overview.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.overview.error }}</div>
        </div>
      </div>
    </section>

    <!-- ========== 2. Categories ========== -->
    <section id="sec-categories" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">2. Categories</h2>
      <div class="chart-row">
        <div class="chart-card">
          <h3>Sales &amp; Profit by Category</h3>
          <div class="chart-wrap"><canvas id="chart-cat-bar"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Sub-Category Performance</h3>
          <div class="chart-wrap"><canvas id="chart-subcat-bar"></canvas></div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <button class="ai-chart-btn" :disabled="analysisState.categories.loading" @click="handleAiAnalysis('categories')">
            &#10041; {{ analysisState.categories.loading ? 'Analyzing...' : 'AI Analyze Categories' }}
          </button>
          <div v-if="analysisState.categories.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.categories.result" class="ai-result" v-html="asMd(analysisState.categories.result)"></div>
          <div v-if="analysisState.categories.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.categories.error }}</div>
        </div>
      </div>
    </section>

    <!-- ========== 3. Regional ========== -->
    <section id="sec-regional" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">3. Regional</h2>
      <div class="chart-row">
        <div class="chart-card">
          <h3>Sales by Region</h3>
          <div class="chart-wrap"><canvas id="chart-region-bar"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Top 10 States</h3>
          <div class="chart-wrap"><canvas id="chart-state-bar"></canvas></div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <h3>Region &times; Segment Cross Analysis</h3>
          <div class="chart-wrap"><canvas id="chart-region-segment"></canvas></div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <button class="ai-chart-btn" :disabled="analysisState.regional.loading" @click="handleAiAnalysis('regional')">
            &#10041; {{ analysisState.regional.loading ? 'Analyzing...' : 'AI Analyze Regional' }}
          </button>
          <div v-if="analysisState.regional.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.regional.result" class="ai-result" v-html="asMd(analysisState.regional.result)"></div>
          <div v-if="analysisState.regional.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.regional.error }}</div>
        </div>
      </div>
    </section>

    <!-- ========== 4. Trends ========== -->
    <section id="sec-timeseries" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">4. Trends</h2>
      <div class="chart-row single">
        <div class="chart-card">
          <h3>Full-Period Monthly Trends</h3>
          <div class="chart-wrap" style="max-height:400px"><canvas id="chart-monthly-full"></canvas></div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <h3>Yearly Comparison</h3>
          <div class="chart-wrap"><canvas id="chart-yearly"></canvas></div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <button class="ai-chart-btn" :disabled="analysisState.timeseries.loading" @click="handleAiAnalysis('timeseries')">
            &#10041; {{ analysisState.timeseries.loading ? 'Analyzing...' : 'AI Analyze Trends' }}
          </button>
          <div v-if="analysisState.timeseries.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.timeseries.result" class="ai-result" v-html="asMd(analysisState.timeseries.result)"></div>
          <div v-if="analysisState.timeseries.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.timeseries.error }}</div>
        </div>
      </div>
    </section>

    <!-- ========== 5. Customers ========== -->
    <section id="sec-segments" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">5. Customers</h2>
      <div class="chart-row one-two">
        <div class="chart-card">
          <h3>Sales by Segment</h3>
          <div class="chart-wrap"><canvas id="chart-segment-doughnut"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Segment &times; Category Breakdown</h3>
          <div class="chart-wrap" style="max-height:380px;overflow-y:auto">
            <table class="data-table">
              <thead><tr>
                <th>Segment</th><th>Category</th><th class="num">Sales</th><th class="num">Profit</th><th class="num">Qty</th>
              </tr></thead>
              <tbody>
                <tr v-for="(r, i) in (moduleData.segments?.segmentCategory || [])" :key="i">
                  <td>{{ r.Segment }}</td>
                  <td>{{ r.Category }}</td>
                  <td class="num">{{ fmtCurrency(r.sales) }}</td>
                  <td class="num">{{ fmtCurrency(r.profit) }}</td>
                  <td class="num">{{ fmtNum(r.quantity, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <button class="ai-chart-btn" :disabled="analysisState.segments.loading" @click="handleAiAnalysis('segments')">
            &#10041; {{ analysisState.segments.loading ? 'Analyzing...' : 'AI Analyze Customers' }}
          </button>
          <div v-if="analysisState.segments.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.segments.result" class="ai-result" v-html="asMd(analysisState.segments.result)"></div>
          <div v-if="analysisState.segments.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.segments.error }}</div>
        </div>
      </div>
    </section>

    <!-- ========== 6. Products ========== -->
    <section id="sec-products" style="margin-bottom:24px">
      <h2 style="font-size:18px;font-weight:700;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #e2e8f0">6. Products</h2>
      <div class="chart-row one-two">
        <div class="chart-card">
          <h3>Top 10 Products by Sales</h3>
          <div class="chart-wrap"><canvas id="chart-products-bar"></canvas></div>
        </div>
        <div class="chart-card">
          <h3>Product Ranking Table</h3>
          <div class="chart-wrap" style="max-height:420px;overflow-y:auto">
            <table class="data-table">
              <thead><tr>
                <th>Product</th><th>Category</th><th class="num">Sales</th><th class="num">Profit</th><th class="num">Qty</th>
              </tr></thead>
              <tbody>
                <tr v-for="(p, i) in (moduleData.products?.products || [])" :key="i">
                  <td>{{ p['Product Name'] }}</td>
                  <td>{{ p.Category }}</td>
                  <td class="num">{{ fmtCurrency(p.sales) }}</td>
                  <td class="num">{{ fmtCurrency(p.profit) }}</td>
                  <td class="num">{{ fmtNum(p.quantity, 0) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="chart-row single" style="margin-top:16px">
        <div class="chart-card">
          <button class="ai-chart-btn" :disabled="analysisState.products.loading" @click="handleAiAnalysis('products')">
            &#10041; {{ analysisState.products.loading ? 'Analyzing...' : 'AI Analyze Products' }}
          </button>
          <div v-if="analysisState.products.loading" style="padding:12px 0;font-size:13px;color:#64748b">Analyzing data with DeepSeek AI...</div>
          <div v-if="analysisState.products.result" class="ai-result" v-html="asMd(analysisState.products.result)"></div>
          <div v-if="analysisState.products.error" style="padding:10px;margin-top:8px;background:#fef2f2;border-radius:8px;font-size:13px;color:#b91c1c">{{ analysisState.products.error }}</div>
        </div>
      </div>
    </section>

    </div><!-- /content-main -->

    <!-- Right Section Nav -->
    <nav class="section-nav">
      <button
        v-for="s in sections" :key="s.key"
        class="section-nav-btn"
        :class="{ active: activeSection === s.key }"
        @click="scrollTo(s.key)"
      >{{ s.label }}</button>
    </nav>

  </div><!-- /content-with-nav -->
</template>

<style scoped>
.ai-result {
  margin-top: 12px;
  padding: 14px 18px;
  background: #f8fafc;
  border-left: 3px solid var(--accent);
  border-radius: 0 8px 8px 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
}
.ai-result :deep(p) { margin: 0 0 6px; }
.ai-result :deep(p:last-child) { margin-bottom: 0; }
.ai-result :deep(strong) { color: var(--accent-dim); }
.ai-result :deep(ul), .ai-result :deep(ol) { margin: 4px 0; padding-left: 18px; }
.ai-result :deep(li) { margin-bottom: 2px; }
</style>
