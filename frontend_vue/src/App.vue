<script setup>
import { RouterView } from 'vue-router'
import SidebarNav from './components/SidebarNav.vue'
</script>

<template>
  <SidebarNav />
  <div class="main-wrap">
    <RouterView />
  </div>
</template>
