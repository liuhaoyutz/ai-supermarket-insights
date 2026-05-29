import React from 'react'
import { NavLink } from 'react-router-dom'

export default function SidebarNav() {
  return (
    <aside className="sidebar">
      <NavLink to="/" className="sidebar-logo">
        Superstore
        <span>Analytics Dashboard</span>
      </NavLink>
      <nav>
        <NavLink to="/">
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>&#9633;</span>
          Dashboard
        </NavLink>
        <NavLink to="/ai">
          <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>&#10041;</span>
          AI Analysis
        </NavLink>
      </nav>
    </aside>
  )
}
