<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <aside class="sidebar">
    <router-link to="/" class="sidebar-logo">
      Superstore
      <span>Analytics Dashboard</span>
    </router-link>
    <nav>
      <router-link to="/">
        <span style="font-size:16px;width:20px;text-align:center">&#9633;</span>
        Dashboard
      </router-link>
      <router-link to="/ai">
        <span style="font-size:16px;width:20px;text-align:center">&#10041;</span>
        AI Analysis
      </router-link>
    </nav>
  </aside>
</template>
