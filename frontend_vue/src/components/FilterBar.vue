<script setup>
import { computed } from 'vue'

const props = defineProps({
  filterMeta: { type: Object, default: () => ({}) },
  modelValue: { type: Object, default: () => ({ start_date: null, end_date: null, region: null, category: null }) },
})
const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

const regions = computed(() => props.filterMeta.regions || [])
const categories = computed(() => props.filterMeta.categories || [])

function update(key, e) {
  const v = e.target.value || null
  emit('update:modelValue', { ...props.modelValue, [key]: v })
}
</script>

<template>
  <header class="filter-bar">
    <label>Start</label>
    <input type="date" :value="modelValue.start_date" @input="update('start_date', $event)" />
    <label>End</label>
    <input type="date" :value="modelValue.end_date" @input="update('end_date', $event)" />
    <label>Region</label>
    <select :value="modelValue.region || ''" @change="update('region', $event)">
      <option value="">All Regions</option>
      <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
    </select>
    <label>Category</label>
    <select :value="modelValue.category || ''" @change="update('category', $event)">
      <option value="">All Categories</option>
      <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
    </select>
    <button class="primary" @click="$emit('apply')">Apply</button>
    <button @click="$emit('reset')">Reset</button>
  </header>
</template>
