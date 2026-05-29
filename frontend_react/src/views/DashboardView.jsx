import React, { useState, useEffect, useRef, useCallback } from 'react'
import Chart from 'chart.js/auto'
import { marked } from 'marked'
import { fetchFilterMeta, fetchAllModuleData } from '@/lib/apiClient.js'
import { sendAiMessage } from '@/lib/aiClient.js'
import { COLORS, baseChartOptions, moneyTooltip, fmtCurrency, fmtNum, fmtPct } from '@/lib/formatting.js'
import FilterBar from '@/components/FilterBar.jsx'
import KpiCards from '@/components/KpiCards.jsx'

const SYSTEM_PROMPT = 'You are a senior business analyst at a retail company. Analyze the provided sales data and give concise, data-driven insights. Use markdown formatting. Keep under 200 words.'

const sections = [
  { key: 'overview', label: 'Overview' },
  { key: 'categories', label: 'Categories' },
  { key: 'regional', label: 'Regional' },
  { key: 'timeseries', label: 'Trends' },
  { key: 'segments', label: 'Customers' },
  { key: 'products', label: 'Products' },
]

const PROMPTS = {
  overview: 'Analyze the overall business performance. Identify key trends in the sales and profit data, and highlight any concerning patterns or positive developments.',
  categories: 'Analyze category and sub-category performance. Which categories are the profit drivers? Suggest where to focus resources.',
  regional: 'Analyze regional and state-level performance. Identify the strongest and weakest regions.',
  timeseries: 'Analyze the time trends. What seasonal patterns do you observe? What should we prepare for?',
  segments: 'Analyze customer segment performance. Which segments are most valuable?',
  products: 'Analyze the top product rankings. Which products drive the most value?',
}

const BUILDERS = {
  overview(d) {
    if (!d) return ''
    const trend = (d.monthlyTrend || []).slice(-6).map(t => `${t.YearMonth}: Sales $${Number(t.sales).toLocaleString()}`).join('\n')
    return `## Overview\nTotal Sales: $${Number(d.totalSales).toLocaleString()}\nTotal Profit: $${Number(d.totalProfit).toLocaleString()}\nProfit Margin: ${Number(d.profitMargin).toFixed(1)}%\nOrders: ${d.totalOrders}\nYoY Sales: ${d.yoySalesGrowth}%\n\nLast 6 months:\n${trend}`
  },
  categories(d) {
    if (!d) return ''
    return '## Categories\n' + (d.byCategory || []).map(c => `- ${c.Category}: Sales $${Number(c.sales).toLocaleString()}, Profit $${Number(c.profit).toLocaleString()}`).join('\n') + '\n\n## Sub-Categories\n' + (d.bySubCategory || []).map(s => `- ${s['Sub-Category']} (${s.Category}): Sales $${Number(s.sales).toLocaleString()}`).join('\n')
  },
  regional(d) {
    if (!d) return ''
    return '## Regional\n' + (d.byRegion || []).map(r => `- ${r.Region}: Sales $${Number(r.sales).toLocaleString()}, Profit $${Number(r.profit).toLocaleString()}`).join('\n')
  },
  timeseries(d) {
    if (!d) return ''
    return '## Trends\n' + (d.yearly || []).map(y => `- ${y.Year}: Sales $${Number(y.sales).toLocaleString()}, Profit $${Number(y.profit).toLocaleString()}`).join('\n')
  },
  segments(d) {
    if (!d) return ''
    return '## Segments\n' + (d.bySegment || []).map(s => `- ${s.Segment}: Sales $${Number(s.sales).toLocaleString()}, Profit $${Number(s.profit).toLocaleString()}`).join('\n')
  },
  products(d) {
    if (!d) return ''
    return '## Products\n' + (d.products || []).map(p => `- ${p['Product Name']} (${p.Category}): Sales $${Number(p.sales).toLocaleString()}`).join('\n')
  },
}

const initialState = { loading: false, result: '', error: '' }

export default function DashboardView() {
  const [filters, setFilters] = useState({ start_date: null, end_date: null, region: null, category: null })
  const [filterMeta, setFilterMeta] = useState({})
  const [moduleData, setModuleData] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('overview')
  const [analysis, setAnalysis] = useState({ overview: { ...initialState }, categories: { ...initialState }, regional: { ...initialState }, timeseries: { ...initialState }, segments: { ...initialState }, products: { ...initialState } })

  const chartRefs = useRef({})
  const scrollTimer = useRef(null)

  const asMd = useCallback(t => marked.parse(t || '', { breaks: true }), [])

  // ---- Scroll spy ----
  useEffect(() => {
    const onScroll = () => {
      if (scrollTimer.current) return
      scrollTimer.current = setTimeout(() => {
        scrollTimer.current = null
        let current = sections[0].key
        for (const s of sections) {
          const el = document.getElementById(`sec-${s.key}`)
          if (el && el.getBoundingClientRect().top < 200) current = s.key
        }
        setActiveSection(current)
      }, 100)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = useCallback(key => {
    setActiveSection(key)
    document.getElementById(`sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // ---- Load data ----
  const loadData = useCallback(async (filtersToUse) => {
    setLoading(true)
    try {
      const fm = await fetchFilterMeta()
      setFilterMeta(fm)
      const data = await fetchAllModuleData({ ...filtersToUse })
      setModuleData(data)
      // Clear AI results
      setAnalysis({
        overview: { ...initialState }, categories: { ...initialState },
        regional: { ...initialState }, timeseries: { ...initialState },
        segments: { ...initialState }, products: { ...initialState },
      })
      // Update charts after DOM renders
      setTimeout(() => {
        destroyAllCharts()
        setTimeout(renderAllCharts, 100)
      }, 200)
    } catch (e) { console.error('Load error:', e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadData(filters) }, []) // eslint-disable-line

  const handleApply = useCallback(() => {
    loadData(filters)
  }, [filters, loadData])

  const handleReset = useCallback(() => {
    const empty = { start_date: null, end_date: null, region: null, category: null }
    setFilters(empty)
    // Reset needs to wait for state update, so use a timeout
    setTimeout(() => loadData(empty), 0)
  }, [loadData])

  // ---- Charts ----
  const destroyAllCharts = useCallback(() => {
    Object.values(chartRefs.current).forEach(c => c?.destroy())
    chartRefs.current = {}
  }, [])

  const tryChart = useCallback((id, fn) => {
    const canvas = document.getElementById(id)
    if (!canvas) return
    if (chartRefs.current[id]) chartRefs.current[id].destroy()
    try { chartRefs.current[id] = fn(canvas) } catch {}
  }, [])

  const renderAllCharts = useCallback(() => {
    const d = moduleData
    if (!d.overview?.monthlyTrend) return

    // Overview trend
    const trend = d.overview.monthlyTrend
    tryChart('chart-overview-trend', c => new Chart(c, {
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
    }))

    // Category bars
    if (d.categories) {
      const cats = d.categories.byCategory || []
      const subs = d.categories.bySubCategory || []
      tryChart('chart-cat-bar', c => new Chart(c, {
        type: 'bar', data: { labels: cats.map(r => r.Category), datasets: [{ label: 'Sales', data: cats.map(r => r.sales), backgroundColor: COLORS.sales, borderRadius: 4 }, { label: 'Profit', data: cats.map(r => r.profit), backgroundColor: COLORS.profit, borderRadius: 4 }] },
        options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
      tryChart('chart-subcat-bar', c => new Chart(c, {
        type: 'bar', data: { labels: subs.map(r => r['Sub-Category']), datasets: [{ label: 'Sales', data: subs.map(r => r.sales), backgroundColor: COLORS.sales, borderRadius: 4 }, { label: 'Profit', data: subs.map(r => r.profit), backgroundColor: COLORS.profit, borderRadius: 4 }] },
        options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip() } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
    }

    // Regional
    if (d.regional) {
      const regions = d.regional.byRegion || []
      const states = (d.regional.byState || []).sort((a, b) => b.sales - a.sales).slice(0, 10)
      const segCross = d.regional.bySegment || []
      tryChart('chart-region-bar', c => new Chart(c, {
        type: 'bar', data: { labels: regions.map(r => r.Region), datasets: [{ label: 'Sales', data: regions.map(r => r.sales), backgroundColor: COLORS.sales, borderRadius: 4 }, { label: 'Profit', data: regions.map(r => r.profit), backgroundColor: COLORS.profit, borderRadius: 4 }] },
        options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
      const ri = {}
      regions.forEach((r, i) => { ri[r.Region] = i })
      tryChart('chart-state-bar', c => new Chart(c, {
        type: 'bar', data: { labels: states.map(s => s.State), datasets: [{ label: 'Sales', data: states.map(s => s.sales), backgroundColor: states.map(s => COLORS.catColors[(ri[s.Region] || 0) % 4]), borderRadius: 4 }] },
        options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip(), legend: { display: false } } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
      const segNames = [...new Set(segCross.map(s => s.Segment))]
      const regionNames = [...new Set(segCross.map(s => s.Region))]
      tryChart('chart-region-segment', c => new Chart(c, {
        type: 'bar', data: { labels: regionNames, datasets: segNames.map((sn, i) => ({ label: sn, data: regionNames.map(rn => { const row = segCross.find(s => s.Region === rn && s.Segment === sn); return row ? row.sales : 0 }), backgroundColor: COLORS.segmentColors[i], borderRadius: 4 })) },
        options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
    }

    // Timeseries
    if (d.timeseries) {
      const monthly = d.timeseries.monthly || []
      const yearly = d.timeseries.yearly || []
      tryChart('chart-monthly-full', c => new Chart(c, {
        type: 'line', data: { labels: monthly.map(m => m.YearMonth), datasets: [{ label: 'Sales', data: monthly.map(m => m.sales), borderColor: COLORS.sales, yAxisID: 'y', tension: 0.15, pointRadius: 0 }, { label: 'Profit', data: monthly.map(m => m.profit), borderColor: COLORS.profit, yAxisID: 'y1', tension: 0.15, pointRadius: 0 }] },
        options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { type: 'linear', position: 'left', title: { display: true, text: 'Sales ($)' }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } }, y1: { type: 'linear', position: 'right', title: { display: true, text: 'Profit ($)' }, grid: { drawOnChartArea: false }, ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
      tryChart('chart-yearly', c => new Chart(c, {
        type: 'bar', data: { labels: yearly.map(y => 'Year ' + y.Year), datasets: [{ label: 'Sales', data: yearly.map(y => y.sales), backgroundColor: COLORS.sales, borderRadius: 4 }, { label: 'Profit', data: yearly.map(y => y.profit), backgroundColor: COLORS.profit, borderRadius: 4 }] },
        options: { ...baseChartOptions({ plugins: { tooltip: moneyTooltip() } }), scales: { y: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
    }

    // Segments
    if (d.segments) {
      const segs = d.segments.bySegment || []
      tryChart('chart-segment-doughnut', c => new Chart(c, {
        type: 'doughnut', data: { labels: segs.map(s => s.Segment), datasets: [{ data: segs.map(s => s.sales), backgroundColor: COLORS.segmentColors, borderWidth: 0 }] },
        options: baseChartOptions(),
      }))
    }

    // Products
    if (d.products) {
      const prods = d.products.products || []
      tryChart('chart-products-bar', c => new Chart(c, {
        type: 'bar', data: { labels: prods.map(p => p['Product Name']), datasets: [{ label: 'Sales', data: prods.map(p => p.sales), backgroundColor: COLORS.sales, borderRadius: 4 }, { label: 'Profit', data: prods.map(p => p.profit), backgroundColor: COLORS.profit, borderRadius: 4 }] },
        options: { ...baseChartOptions({ indexAxis: 'y', plugins: { tooltip: moneyTooltip() } }), scales: { x: { ticks: { callback: v => '$' + (v / 1000).toFixed(0) + 'k' } } } },
      }))
    }
  }, [moduleData, tryChart])

  // Re-render charts when moduleData changes
  useEffect(() => {
    if (!loading && moduleData.overview) {
      destroyAllCharts()
      setTimeout(renderAllCharts, 300)
    }
  }, [moduleData]) // eslint-disable-line

  // ---- AI Analysis ----
  const handleAiAnalysis = useCallback(async chartKey => {
    setAnalysis(prev => ({ ...prev, [chartKey]: { loading: true, result: '', error: '' } }))
    try {
      const builder = BUILDERS[chartKey]
      const context = builder ? builder(moduleData[chartKey]) : ''
      const prompt = PROMPTS[chartKey] || 'Analyze this data.'
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT + '\n\n' + context },
        { role: 'user', content: prompt },
      ]
      const reply = await sendAiMessage(messages, context)
      setAnalysis(prev => ({ ...prev, [chartKey]: { loading: false, result: reply, error: '' } }))
    } catch {
      setAnalysis(prev => ({ ...prev, [chartKey]: { loading: false, result: '', error: 'AI analysis unavailable. Check DEEPSEEK_API_KEY.' } }))
    }
  }, [moduleData])

  // ---- Rendering ----
  const SectionHeader = ({ num, title }) => (
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', paddingBottom: '10px', borderBottom: '2px solid #e2e8f0' }}>{num}. {title}</h2>
  )

  const AiButton = ({ chartKey, label }) => {
    const st = analysis[chartKey]
    return (
      <>
        <button className="ai-chart-btn" disabled={st.loading} onClick={() => handleAiAnalysis(chartKey)}>
          &#10041; {st.loading ? 'Analyzing...' : label}
        </button>
        {st.loading && <div style={{ padding: '12px 0', fontSize: '13px', color: '#64748b' }}>Analyzing data with DeepSeek AI...</div>}
        {st.result && <div className="ai-result" dangerouslySetInnerHTML={{ __html: asMd(st.result) }} />}
        {st.error && <div style={{ padding: '10px', marginTop: '8px', background: '#fef2f2', borderRadius: '8px', fontSize: '13px', color: '#b91c1c' }}>{st.error}</div>}
      </>
    )
  }

  return (
    <>
      <FilterBar filterMeta={filterMeta} filters={filters} onFilterChange={setFilters} onApply={handleApply} onReset={handleReset} />

      <div className="content-with-nav">
        {loading && <div className="loading-overlay"><div className="spinner"></div></div>}

        <div className="content-main">

          {/* 1. Overview */}
          <section id="sec-overview" style={{ marginBottom: '24px' }}>
            <SectionHeader num={1} title="Overview" />
            <KpiCards overview={moduleData.overview} />
            <div className="chart-row single">
              <div className="chart-card">
                <h3>Monthly Sales &amp; Profit Trend</h3>
                <div className="chart-wrap"><canvas id="chart-overview-trend"></canvas></div>
                <AiButton chartKey="overview" label="AI Analyze Overview" />
              </div>
            </div>
          </section>

          {/* 2. Categories */}
          <section id="sec-categories" style={{ marginBottom: '24px' }}>
            <SectionHeader num={2} title="Categories" />
            <div className="chart-row">
              <div className="chart-card">
                <h3>Sales &amp; Profit by Category</h3>
                <div className="chart-wrap"><canvas id="chart-cat-bar"></canvas></div>
              </div>
              <div className="chart-card">
                <h3>Sub-Category Performance</h3>
                <div className="chart-wrap"><canvas id="chart-subcat-bar"></canvas></div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card"><AiButton chartKey="categories" label="AI Analyze Categories" /></div>
            </div>
          </section>

          {/* 3. Regional */}
          <section id="sec-regional" style={{ marginBottom: '24px' }}>
            <SectionHeader num={3} title="Regional" />
            <div className="chart-row">
              <div className="chart-card">
                <h3>Sales by Region</h3>
                <div className="chart-wrap"><canvas id="chart-region-bar"></canvas></div>
              </div>
              <div className="chart-card">
                <h3>Top 10 States</h3>
                <div className="chart-wrap"><canvas id="chart-state-bar"></canvas></div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card">
                <h3>Region &times; Segment Cross Analysis</h3>
                <div className="chart-wrap"><canvas id="chart-region-segment"></canvas></div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card"><AiButton chartKey="regional" label="AI Analyze Regional" /></div>
            </div>
          </section>

          {/* 4. Trends */}
          <section id="sec-timeseries" style={{ marginBottom: '24px' }}>
            <SectionHeader num={4} title="Trends" />
            <div className="chart-row single">
              <div className="chart-card">
                <h3>Full-Period Monthly Trends</h3>
                <div className="chart-wrap" style={{ maxHeight: '400px' }}><canvas id="chart-monthly-full"></canvas></div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card">
                <h3>Yearly Comparison</h3>
                <div className="chart-wrap"><canvas id="chart-yearly"></canvas></div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card"><AiButton chartKey="timeseries" label="AI Analyze Trends" /></div>
            </div>
          </section>

          {/* 5. Customers */}
          <section id="sec-segments" style={{ marginBottom: '24px' }}>
            <SectionHeader num={5} title="Customers" />
            <div className="chart-row one-two">
              <div className="chart-card">
                <h3>Sales by Segment</h3>
                <div className="chart-wrap"><canvas id="chart-segment-doughnut"></canvas></div>
              </div>
              <div className="chart-card">
                <h3>Segment &times; Category Breakdown</h3>
                <div className="chart-wrap" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Segment</th><th>Category</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Qty</th></tr></thead>
                    <tbody>
                      {(moduleData.segments?.segmentCategory || []).map((r, i) => (
                        <tr key={i}><td>{r.Segment}</td><td>{r.Category}</td><td className="num">{fmtCurrency(r.sales)}</td><td className="num">{fmtCurrency(r.profit)}</td><td className="num">{fmtNum(r.quantity, 0)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card"><AiButton chartKey="segments" label="AI Analyze Customers" /></div>
            </div>
          </section>

          {/* 6. Products */}
          <section id="sec-products" style={{ marginBottom: '24px' }}>
            <SectionHeader num={6} title="Products" />
            <div className="chart-row one-two">
              <div className="chart-card">
                <h3>Top 10 Products by Sales</h3>
                <div className="chart-wrap"><canvas id="chart-products-bar"></canvas></div>
              </div>
              <div className="chart-card">
                <h3>Product Ranking</h3>
                <div className="chart-wrap" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Product</th><th>Category</th><th className="num">Sales</th><th className="num">Profit</th><th className="num">Qty</th></tr></thead>
                    <tbody>
                      {(moduleData.products?.products || []).map((p, i) => (
                        <tr key={i}><td>{p['Product Name']}</td><td>{p.Category}</td><td className="num">{fmtCurrency(p.sales)}</td><td className="num">{fmtCurrency(p.profit)}</td><td className="num">{fmtNum(p.quantity, 0)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="chart-row single" style={{ marginTop: '16px' }}>
              <div className="chart-card"><AiButton chartKey="products" label="AI Analyze Products" /></div>
            </div>
          </section>

        </div>{/* /content-main */}

        {/* Right Section Nav */}
        <nav className="section-nav">
          {sections.map(s => (
            <button
              key={s.key}
              className={`section-nav-btn${activeSection === s.key ? ' active' : ''}`}
              onClick={() => scrollTo(s.key)}
            >{s.label}</button>
          ))}
        </nav>
      </div>
    </>
  )
}
