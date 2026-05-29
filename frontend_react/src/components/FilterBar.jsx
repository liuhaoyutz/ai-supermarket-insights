import React from 'react'

export default function FilterBar({ filterMeta, filters, onFilterChange, onApply, onReset }) {
  const regions = filterMeta?.regions || []
  const categories = filterMeta?.categories || []

  const update = (key, e) => onFilterChange({ ...filters, [key]: e.target.value || null })

  return (
    <header className="filter-bar">
      <label>Start</label>
      <input type="date" value={filters.start_date || ''} onChange={e => update('start_date', e)} />
      <label>End</label>
      <input type="date" value={filters.end_date || ''} onChange={e => update('end_date', e)} />
      <label>Region</label>
      <select value={filters.region || ''} onChange={e => update('region', e)}>
        <option value="">All Regions</option>
        {regions.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <label>Category</label>
      <select value={filters.category || ''} onChange={e => update('category', e)}>
        <option value="">All Categories</option>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button className="primary" onClick={onApply}>Apply</button>
      <button onClick={onReset}>Reset</button>
    </header>
  )
}
