import { apiUrl } from '@/config'

export async function fetchFromApi(endpoint, params = {}) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, v) })
  const q = qs.toString()
  const url = apiUrl(endpoint) + (q ? '?' + q : '')
  const res = await fetch(url)
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'API request failed')
  return json.data
}

export function fetchApiSafe(endpoint, params = {}) {
  return fetchFromApi(endpoint, params).catch(e => {
    console.warn(`API ${endpoint} failed:`, e.message)
    return null
  })
}

export async function fetchAllModuleData(filters = {}) {
  const [overview, categories, regional, timeseries, segments, products, filterMeta] = await Promise.all([
    fetchApiSafe('/api/overview', filters),
    fetchApiSafe('/api/categories', filters),
    fetchApiSafe('/api/regional', filters),
    fetchApiSafe('/api/timeseries', filters),
    fetchApiSafe('/api/segments', filters),
    fetchApiSafe('/api/products', filters),
    fetchApiSafe('/api/filters'),
  ])
  return { overview, categories, regional, timeseries, segments, products, filterMeta }
}

export async function fetchFilterMeta() {
  return fetchFromApi('/api/filters')
}

const CHAT_HISTORY_LS_KEY = 'superstore_ai_chat_v1'

export function loadChatHistory() {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveChatHistory(messages) {
  try {
    const trimmed = messages.slice(-50)
    localStorage.setItem(CHAT_HISTORY_LS_KEY, JSON.stringify(trimmed))
  } catch { /* quota exceeded, ignore */ }
}
