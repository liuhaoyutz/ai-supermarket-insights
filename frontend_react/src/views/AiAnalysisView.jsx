import React, { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import { loadChatHistory, saveChatHistory } from '@/lib/apiClient.js'
import { buildAnalysisContext, sendAiMessage } from '@/lib/aiClient.js'
import FilterBar from '@/components/FilterBar.jsx'
import { fetchFilterMeta, fetchAllModuleData } from '@/lib/apiClient.js'

const QUICK_ANALYSES = [
  'Identify the top 3 growth opportunities in the current data',
  'Which regions are underperforming and why?',
  'Analyze profit margin trends across categories',
  'What is the customer segment with the highest potential?',
  'Summarize key risks based on the current numbers',
  'Compare performance of Technology vs Furniture categories',
]

export default function AiAnalysisView() {
  const [filters, setFilters] = useState({ start_date: null, end_date: null, region: null, category: null })
  const [filterMeta, setFilterMeta] = useState({})
  const [moduleData, setModuleData] = useState({})
  const [history, setHistory] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const containerRef = useRef(null)

  const asMd = useCallback(t => marked.parse(t || '', { breaks: true }), [])

  const scrollBottom = useCallback(() => {
    setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight
    }, 50)
  }, [])

  useEffect(() => {
    const saved = loadChatHistory()
    if (saved.length > 0) {
      setHistory(saved)
    } else {
      setHistory([{ role: 'assistant', content: 'Hello! I am your AI business analyst. I have the current sales data loaded. Ask me about trends, performance, risks, or opportunities.', id: 0 }])
    }
    fetchFilterMeta().then(setFilterMeta)
    fetchAllModuleData({}).then(setModuleData)
  }, [])

  const send = useCallback(async (text) => {
    const msg = text || input.trim()
    if (!msg || sending) return
    setInput('')
    const newHistory = [...history, { role: 'user', content: msg, id: Date.now() }]
    setHistory(newHistory)
    scrollBottom()
    setSending(true)
    try {
      const ctx = buildAnalysisContext(moduleData)
      const reply = await sendAiMessage(newHistory.map(m => ({ role: m.role, content: m.content })), ctx)
      const updated = [...newHistory, { role: 'assistant', content: reply, id: Date.now() + 1 }]
      setHistory(updated)
      saveChatHistory(updated)
    } catch {
      setHistory([...newHistory, { role: 'assistant', content: 'AI analysis unavailable.', id: Date.now() + 1 }])
    }
    setSending(false)
    scrollBottom()
  }, [input, sending, history, moduleData, scrollBottom])

  useEffect(() => { scrollBottom() }, [history]) // eslint-disable-line

  return (
    <>
      <FilterBar filterMeta={filterMeta} filters={filters} onFilterChange={setFilters} />
      <div className="content" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', padding: '20px 24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>AI-Powered Business Analysis</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>DeepSeek AI analyzes your current data to uncover insights.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {QUICK_ANALYSES.map(q => (
            <button key={q} onClick={() => send(q)} disabled={sending}
              style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '20px', background: '#fff', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: '16px' }}>
          {history.map(m => (
            <div key={m.id} style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '85%', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.6', background: m.role === 'user' ? 'var(--accent)' : '#f1f5f9', color: m.role === 'user' ? '#fff' : 'var(--text-primary)', borderBottomRightRadius: m.role === 'user' ? '4px' : '12px', borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '12px' }}>
                {m.role === 'assistant' ? <div dangerouslySetInnerHTML={{ __html: asMd(m.content) }} /> : m.content}
              </div>
            </div>
          ))}
          {sending && <div style={{ fontSize: '13px', color: '#64748b', padding: '8px 16px' }}>Analyzing data with DeepSeek AI...</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows="2" placeholder="Ask anything about your sales data..."
            style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit', resize: 'none', outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())} />
          <button onClick={() => send()} disabled={sending || !input.trim()}
            style={{ padding: '10px 24px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
        </div>
      </div>
    </>
  )
}
