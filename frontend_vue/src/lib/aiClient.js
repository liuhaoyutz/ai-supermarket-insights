/**
 * DeepSeek AI 分析客户端。
 * 通过后端代理 /api/llm/analyze 调用 DeepSeek API。
 */

const LLM_API = '/api/llm/analyze'

export function buildOverviewContext(overview) {
  if (!overview) return ''
  return [
    '## Current Data Snapshot',
    `- Total Sales: $${(overview.totalSales || 0).toLocaleString()}`,
    `- Total Profit: $${(overview.totalProfit || 0).toLocaleString()}`,
    `- Profit Margin: ${(overview.profitMargin || 0).toFixed(1)}%`,
    `- Total Orders: ${(overview.totalOrders || 0).toLocaleString()}`,
    `- Average Order Value: $${Number(overview.avgOrderValue || 0).toLocaleString()}`,
    `- YoY Sales Growth: ${(overview.yoySalesGrowth || 0).toFixed(1)}%`,
    `- YoY Profit Growth: ${(overview.yoyProfitGrowth || 0).toFixed(1)}%`,
  ].join('\n')
}

export function buildCategoryContext(categories) {
  if (!categories?.byCategory) return ''
  return [
    '## Category Performance',
    ...categories.byCategory.map(c =>
      `- ${c.Category}: Sales $${Number(c.sales).toLocaleString()}, Profit $${Number(c.profit).toLocaleString()}, Margin ${(c.profitMargin * 100).toFixed(1)}%`
    ),
  ].join('\n')
}

export function buildRegionalContext(regional) {
  if (!regional?.byRegion) return ''
  return [
    '## Regional Performance',
    ...regional.byRegion.map(r =>
      `- ${r.Region}: Sales $${Number(r.sales).toLocaleString()}, Profit $${Number(r.profit).toLocaleString()}`
    ),
  ].join('\n')
}

export function buildAnalysisContext(moduleData) {
  const parts = [
    buildOverviewContext(moduleData.overview),
    buildCategoryContext(moduleData.categories),
    buildRegionalContext(moduleData.regional),
  ]
  return parts.filter(Boolean).join('\n\n')
}

const SYSTEM_PROMPT = `You are a senior business analyst at a retail company. Analyze the provided sales data and give:
1. Key findings (2-3 bullet points)
2. Opportunities or risks identified
3. One specific recommendation for the next period
Keep responses concise, professional, and data-driven. Use markdown formatting. Max 250 words.`

export async function sendAiMessage(history, moduleDataContext) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + moduleDataContext },
    ...history.map(m => ({ role: m.role, content: m.content })),
  ]

  const res = await fetch(LLM_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `LLM API error: ${res.status}`)
  }

  const data = await res.json()
  return data.content || data.reply || ''
}

export function createUserMessage(text) {
  return { role: 'user', content: text, id: Date.now() }
}

export function createAssistantMessage(text) {
  return { role: 'assistant', content: text, id: Date.now() + 1 }
}
