/** API 路径配置 */
export const API_ROOT = ''

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return p
}

/** 各模块后端接口映射 */
export const MODULE_API = {
  overview: '/api/overview',
  categories: '/api/categories',
  regional: '/api/regional',
  timeseries: '/api/timeseries',
  segments: '/api/segments',
  products: '/api/products',
  filters: '/api/filters',
}

/** DeepSeek API endpoint（通过后端代理） */
export const LLM_ENDPOINT = '/api/llm/analyze'

/** localStorage 键 */
export const CHAT_KEY = 'superstore_ai_chat_v1'
