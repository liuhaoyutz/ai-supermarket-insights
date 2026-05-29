import React, { useMemo } from 'react'
import { fmtCurrency, fmtPct, fmtNum, growthToneClass } from '@/lib/formatting.js'

export default function KpiCards({ overview }) {
  const cards = useMemo(() => {
    const d = overview || {}
    return [
      { label: 'Total Sales', value: fmtCurrency(d.totalSales), sub: d.yoySalesGrowth ? `YoY ${d.yoySalesGrowth > 0 ? '+' : ''}${d.yoySalesGrowth}%` : '', cls: growthToneClass(d.yoySalesGrowth) },
      { label: 'Total Profit', value: fmtCurrency(d.totalProfit), sub: d.yoyProfitGrowth ? `YoY ${d.yoyProfitGrowth > 0 ? '+' : ''}${d.yoyProfitGrowth}%` : '', cls: growthToneClass(d.yoyProfitGrowth) },
      { label: 'Profit Margin', value: fmtPct(d.profitMargin), sub: '', cls: '' },
      { label: 'Total Orders', value: fmtNum(d.totalOrders, 0), sub: '', cls: '' },
      { label: 'Avg Order Value', value: fmtCurrency(d.avgOrderValue), sub: '', cls: '' },
      { label: 'Avg Discount', value: fmtPct(d.avgDiscount), sub: '', cls: '' },
    ]
  }, [overview])

  return (
    <div className="kpi-grid">
      {cards.map(c => (
        <div className="kpi-card" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className="kpi-value">{c.value}</div>
          {c.sub && <div className={`kpi-sub ${c.cls}`}>{c.sub}</div>}
        </div>
      ))}
    </div>
  )
}
