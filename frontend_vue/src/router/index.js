import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import AiAnalysisView from '../views/AiAnalysisView.vue'

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView, meta: { title: 'Superstore Analytics' } },
    { path: '/ai', name: 'ai-analysis', component: AiAnalysisView, meta: { title: 'AI Analysis' } },
  ],
})
