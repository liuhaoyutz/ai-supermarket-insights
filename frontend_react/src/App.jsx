import React from 'react'
import { Routes, Route } from 'react-router-dom'
import SidebarNav from './components/SidebarNav.jsx'
import DashboardView from './views/DashboardView.jsx'
import AiAnalysisView from './views/AiAnalysisView.jsx'

export default function App() {
  return (
    <div id="app">
      <SidebarNav />
      <div className="main-wrap">
        <Routes>
          <Route path="/" element={<DashboardView />} />
          <Route path="/ai" element={<AiAnalysisView />} />
        </Routes>
      </div>
    </div>
  )
}
