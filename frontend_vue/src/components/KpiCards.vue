<script setup>
import { computed } from 'vue'
import { fmtCurrency, fmtPct, fmtNum, growthToneClass } from '@/lib/formatting.js'

const props = defineProps({ overview: Object })

const cards = computed(() => {
  const d = props.overview || {}
  return [
    { label: 'Total Sales', value: fmtCurrency(d.totalSales), sub: d.yoySalesGrowth ? `YoY ${d.yoySalesGrowth > 0 ? '+' : ''}${d.yoySalesGrowth}%` : '', cls: growthToneClass(d.yoySalesGrowth) },
    { label: 'Total Profit', value: fmtCurrency(d.totalProfit), sub: d.yoyProfitGrowth ? `YoY ${d.yoyProfitGrowth > 0 ? '+' : ''}${d.yoyProfitGrowth}%` : '', cls: growthToneClass(d.yoyProfitGrowth) },
    { label: 'Profit Margin', value: fmtPct(d.profitMargin), sub: '', cls: '' },
    { label: 'Total Orders', value: fmtNum(d.totalOrders, 0), sub: '', cls: '' },
    { label: 'Avg Order Value', value: fmtCurrency(d.avgOrderValue), sub: '', cls: '' },
    { label: 'Avg Discount', value: fmtPct(d.avgDiscount), sub: '', cls: '' },
  ]
})
</script>

<template>
  <div class="kpi-grid">
    <div class="kpi-card" v-for="c in cards" :key="c.label">
      <div class="kpi-label">{{ c.label }}</div>
      <div class="kpi-value">{{ c.value }}</div>
      <div v-if="c.sub" class="kpi-sub" :class="c.cls">{{ c.sub }}</div>
    </div>
  </div>
</template>
