<script setup>
import { ref, nextTick, watch, inject } from 'vue'
import { useRoute } from 'vue-router'
import { loadChatHistory, saveChatHistory } from '@/lib/apiClient.js'
import { buildAnalysisContext, sendAiMessage, createUserMessage, createAssistantMessage } from '@/lib/aiClient.js'
import { marked } from 'marked'

const route = useRoute()
const moduleData = inject('moduleData', ref({}))
const aiTrigger = inject('aiTrigger', null)

const open = ref(false)
const messages = ref(loadChatHistory())
const input = ref('')
const sending = ref(false)
const container = ref(null)

function toggle() { open.value = !open.value }

function scrollBottom() {
  nextTick(() => {
    if (container.value) container.value.scrollTop = container.value.scrollHeight
  })
}

async function send(textOverride, contextOverride) {
  const text = textOverride || input.value.trim()
  const useContext = contextOverride || buildAnalysisContext(moduleData.value)
  if (!text || sending.value) return
  if (!textOverride) input.value = ''
  messages.value.push(createUserMessage(text))
  scrollBottom()

  sending.value = true
  try {
    const reply = await sendAiMessage(
      messages.value.map(m => ({ role: m.role, content: m.content })),
      useContext
    )
    messages.value.push(createAssistantMessage(reply))
    saveChatHistory(messages.value)
    scrollBottom()
  } catch {
    messages.value.push(createAssistantMessage('AI analysis unavailable. Please check your API configuration.'))
  }
  sending.value = false
}

function renderMd(text) {
  return marked.parse(text, { breaks: true })
}

watch(aiTrigger, () => {
  if (!aiTrigger || !aiTrigger.prompt || !aiTrigger.ts) return
  open.value = true
  scrollBottom()
  send(aiTrigger.prompt, aiTrigger.context)
})

watch(() => route.path, () => { /* keep chat open across navigation */ })
</script>

<template>
  <button class="fab" @click="toggle" :title="open ? 'Close AI chat' : 'Open AI chat'">&#10041;</button>

  <div class="ai-chat-panel" :class="{ open }">
    <div class="ai-chat-header">
      <h3>AI Analyst (DeepSeek)</h3>
      <button @click="toggle">&times;</button>
    </div>
    <div class="ai-chat-messages" ref="container">
      <div v-for="m in messages" :key="m.id" class="ai-msg" :class="m.role">
        <div v-if="m.role === 'assistant'" v-html="renderMd(m.content)"></div>
        <template v-else>{{ m.content }}</template>
      </div>
      <div v-if="sending" class="ai-msg assistant">Analyzing data...</div>
    </div>
    <div class="ai-chat-input">
      <textarea
        v-model="input"
        rows="2"
        placeholder="Ask about sales trends, category performance, regional insights..."
        @keydown.enter.exact.prevent="send()"
      ></textarea>
      <button @click="send()" :disabled="sending || !input.trim()">Send</button>
    </div>
  </div>
</template>
