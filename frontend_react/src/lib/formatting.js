export const COLORS = {
  sales: '#3b82f6',
  profit: '#10b981',
  catColors: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'],
  regionColors: ['#3b82f6', '#ef4444', '#f59e0b', '#10b981'],
  segmentColors: ['#8b5cf6', '#f59e0b', '#10b981'],
}

export function fmtCurrency(n) {
  if (n == null) return '-'
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export function fmtNum(n, decimals = 2) {
  if (n == null) return '-'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals })
}

export function fmtPct(n) {
  if (n == null) return '-'
  return Number(n).toFixed(1) + '%'
}

export function growthToneClass(val) {
  if (val == null) return ''
  return val >= 0 ? 'up' : 'down'
}

export function baseChartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { usePointStyle: true, backgroundColor: 'rgba(15,25,35,0.9)', padding: 10, cornerRadius: 6 },
      legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, boxWidth: 8 } },
      ...(extra.plugins || {}),
    },
    interaction: { mode: 'index', intersect: false },
    ...extra,
  }
}

export function moneyTooltip() {
  return {
    callbacks: {
      label: ctx => {
        const label = ctx.dataset.label || ''
        return label + ': ' + fmtCurrency(ctx.raw)
      }
    }
  }
}
