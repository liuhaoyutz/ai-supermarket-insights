<script setup>
/**
 * AI Analysis 专属页面 — 对标 cimujia 的 ReportAnalysisView。
 * 展示当前数据的上下文，允许用户与 DeepSeek AI 进行深度分析对话。
 */
import { ref, inject, onMounted } from 'vue'
import { marked } from 'marked'
import { createUserMessage, createAssistantMessage, buildAnalysisContext, sendAiMessage } from '@/lib/aiClient.js'
import { loadChatHistory, saveChatHistory } from '@/lib/apiClient.js'
import { fmtCurrency, fmtPct } from '@/lib/formatting.js'
import FilterBar from '@/components/FilterBar.vue'
import { fetchFilterMeta } from '@/lib/apiClient.js'

const moduleData = inject('moduleData', ref({}))
const filters = ref({ start_date: null, end_date: null, region: null, category: null })
const filterMeta = ref({})
const history = ref([])
const input = ref('')
const sending = ref(false)
const container = ref(null)

const QUICK_ANALYSES = [
  'Identify the top 3 growth opportunities in the current data',
  'Which regions are underperforming and why?',
  'Analyze profit margin trends across categories',
  'What is the customer segment with the highest potential?',
  'Summarize key risks based on the current numbers',
  'Compare performance of Technology vs Furniture categories',
]

function scrollBottom() {
  setTimeout(() => {
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  }, 50)
}

async function send(text) {
  const msg = text || input.value.trim()
  if (!msg || sending.value) return
  input.value = ''
  history.value.push({ role: 'user', content: msg, id: Date.now() })
  scrollBottom()

  sending.value = true
  try {
    const context = buildAnalysisContext(moduleData.value)
    const reply = await sendAiMessage(
      history.value.map(m => ({ role: m.role, content: m.content })),
      context
    )
    history.value.push({ role: 'assistant', content: reply, id: Date.now() + 1 })
    saveChatHistory(history.value)
    scrollBottom()
  } catch {
    history.value.push({ role: 'assistant', content: 'AI analysis unavailable. Please check your API configuration and try again.', id: Date.now() + 1 })
  }
  sending.value = false
}

function sendQuick(text) { send(text) }

function initHistory() {
  const saved = loadChatHistory()
  if (saved.length > 0) {
    history.value = saved
  } else {
    // 首次进入：自动分析当前数据
    history.value.push({ role: 'assistant', content: 'Hello! I am your AI business analyst. I have the current sales data loaded. Ask me about trends, performance, risks, or opportunities. Try one of the quick analyses below.', id: 0 })
  }
  scrollBottom()
}

onMounted(async () => {
  initHistory()
  filterMeta.value = await fetchFilterMeta()
})
</script>

<template>
  <FilterBar :filterMeta="filterMeta" v-model="filters" />

  <div class="content" style="display:flex;flex-direction:column;height:calc(100vh - 120px);padding:20px 24px">
    <div style="margin-bottom:16px">
      <h2 style="font-size:18px;font-weight:700">AI-Powered Business Analysis</h2>
      <p style="font-size:13px;color:#64748b;margin-top:4px">
        DeepSeek AI analyzes your current data to uncover insights, identify risks, and suggest growth opportunities.
      </p>
    </div>

    <!-- Quick analysis buttons -->
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
      <button
        v-for="q in QUICK_ANALYSES" :key="q"
        @click="sendQuick(q)"
        :disabled="sending"
        style="padding:8px 14px;border:1px solid #e2e8f0;border-radius:20px;background:#fff;font-size:12px;color:#334155;cursor:pointer;transition:all .15s"
      >{{ q }}</button>
    </div>

    <!-- Chat area -->
    <div
      ref="container"
      style="flex:1;overflow-y:auto;padding:16px;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);margin-bottom:16px"
    >
      <div v-for="m in history" :key="m.id" :style="{
        marginBottom: '14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
      }">
        <div :style="{
          maxWidth: '85%',
          padding: '10px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          lineHeight: '1.6',
          background: m.role === 'user' ? 'var(--accent)' : '#f1f5f9',
          color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
          borderBottomRightRadius: m.role === 'user' ? '4px' : '12px',
          borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '12px',
        }">
          <div v-if="m.role === 'assistant'" v-html="marked.parse(m.content, { breaks: true })"></div>
          <template v-else>{{ m.content }}</template>
        </div>
      </div>
      <div v-if="sending" style="font-size:13px;color:#64748b;padding:8px 16px">Analyzing data with DeepSeek AI...</div>
    </div>

    <!-- Input -->
    <div style="display:flex;gap:8px">
      <textarea
        v-model="input"
        rows="2"
        placeholder="Ask anything about your sales data..."
        style="flex:1;padding:10px 14px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px;font-family:inherit;resize:none;outline:none"
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button
        @click="send()"
        :disabled="sending || !input.trim()"
        style="padding:10px 24px;background:var(--accent);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer"
      >Send</button>
    </div>
  </div>
</template>
