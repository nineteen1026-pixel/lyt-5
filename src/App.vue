<template>
  <div class="app-container">
    <nav class="nav-bar">
      <div class="nav-brand">🧊 家庭冰箱管理</div>
      <div class="nav-links">
        <button
          class="nav-link"
          :class="{ active: currentView === 'fridge' }"
          @click="currentView = 'fridge'"
        >
          🧊 冰箱管理
        </button>
        <button
          class="nav-link"
          :class="{ active: currentView === 'mealplan' }"
          @click="currentView = 'mealplan'"
        >
          📅 周餐计划
        </button>
      </div>
    </nav>
    <main class="main-view">
      <FridgeManager v-if="currentView === 'fridge'" />
      <MealPlan v-else-if="currentView === 'mealplan'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import FridgeManager from '@/views/FridgeManager.vue'
import MealPlan from '@/views/MealPlan.vue'

const currentView = ref('fridge')
</script>

<style>
#app {
  width: 100%;
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  font-size: 20px;
  font-weight: 700;
  color: #00796b;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  padding: 8px 20px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: #546e7a;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f5f5f5;
  color: #00796b;
}

.nav-link.active {
  background: #e0f2f1;
  color: #00796b;
  font-weight: 600;
}

.main-view {
  min-height: calc(100vh - 60px);
}
</style>
