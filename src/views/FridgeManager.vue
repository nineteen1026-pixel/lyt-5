<template>
  <div class="fridge-manager">
    <header class="header">
      <h1>🧊 家庭冰箱管理</h1>
      <p class="subtitle">记录食材，合理规划，减少浪费</p>
    </header>

    <div class="todo-section card">
      <h2 class="todo-title">📋 今日待办</h2>
      <div class="todo-cards">
        <div class="todo-card expiring" @click="goToExpiringItems">
          <div class="todo-icon">⏰</div>
          <div class="todo-info">
            <span class="todo-count">{{ fridgeStore.expiringSoonItems.length }}</span>
            <span class="todo-label">快过期食材</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card missing" @click="goToMealPlan">
          <div class="todo-icon">🍳</div>
          <div class="todo-info">
            <span class="todo-count">{{ missingIngredientRecipesCount }}</span>
            <span class="todo-label">缺料菜谱</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card shopping" @click="goToShoppingList">
          <div class="todo-icon">🛒</div>
          <div class="todo-info">
            <span class="todo-count">{{ shoppingStore.pendingCount }}</span>
            <span class="todo-label">未买采购</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card leftover" @click="goToLeftoverItems">
          <div class="todo-icon">🍱</div>
          <div class="todo-info">
            <span class="todo-count">{{ leftoverStore.expiringSoonItems.length }}</span>
            <span class="todo-label">临期剩菜</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
      </div>
    </div>

    <div class="main-content">
      <section class="left-section">
        <FridgeInventoryPanel />
        <FridgeRecipePanel ref="recipePanelRef" />
      </section>

      <FridgeChecklistPanel
        @add-to-shopping-list="handleAddToShoppingList"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { useMealPlanStore } from '@/stores/mealPlan'
import { useLeftoverStore } from '@/stores/leftover'
import { matchIngredientByCategory } from '@/utils/categories'
import FridgeInventoryPanel from '@/components/FridgeInventoryPanel.vue'
import FridgeChecklistPanel from '@/components/FridgeChecklistPanel.vue'
import FridgeRecipePanel from '@/components/FridgeRecipePanel.vue'

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const mealPlanStore = useMealPlanStore()
const leftoverStore = useLeftoverStore()
const switchView = inject('switchView')
const scrollTarget = inject('scrollTarget')

const recipePanelRef = ref(null)

const missingIngredientRecipesCount = computed(() => {
  let count = 0
  for (const date of mealPlanStore.weekDates) {
    for (const mealTime of mealPlanStore.mealTimes) {
      const meals = mealPlanStore.getMeals(date, mealTime)
      for (const meal of meals) {
        if (meal.ingredientsDeducted) continue
        let hasMissing = false
        for (const ing of meal.ingredients) {
          const fridgeItem = fridgeStore.items.find(item =>
            matchIngredientByCategory(item.name, ing.name)
          )
          if (!fridgeItem || fridgeItem.quantity < ing.quantity) {
            hasMissing = true
            break
          }
        }
        if (hasMissing) count++
      }
    }
  }
  return count
})

function goToExpiringItems() {
  fridgeStore.setFilterState({ activeZone: '全部', expiryStatus: 'expiring' })
  nextTick(() => {
    const itemsListEl = document.querySelector('.items-list')
    if (itemsListEl) {
      itemsListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goToMealPlan() {
  if (switchView) {
    switchView('mealplan')
  }
}

function goToShoppingList() {
  nextTick(() => {
    const shoppingListEl = document.querySelector('.shopping-list')
    if (shoppingListEl) {
      shoppingListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goToLeftoverItems() {
  if (switchView) {
    switchView('leftover', '#expiring')
  }
}

function handleAddToShoppingList(item) {
  if (recipePanelRef.value) {
    recipePanelRef.value.addToShoppingList(item)
  }
}

let notificationCheckTimer = null

function startNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
  }
  fridgeStore.sendExpiringNotifications()
  notificationCheckTimer = setInterval(() => {
    fridgeStore.sendExpiringNotifications()
  }, 60 * 1000)
}

function stopNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
    notificationCheckTimer = null
  }
}

onMounted(() => {
  fridgeStore.checkNotificationPermission()
  startNotificationCheck()

  if (scrollTarget && scrollTarget.value) {
    nextTick(() => {
      const targetEl = document.querySelector(scrollTarget.value)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      scrollTarget.value = null
    })
  }
})

onUnmounted(() => {
  stopNotificationCheck()
})

watch(() => fridgeStore.notificationEnabled, (enabled) => {
  if (enabled) {
    startNotificationCheck()
  } else {
    stopNotificationCheck()
  }
})
</script>

<style scoped>
.fridge-manager {
  min-height: 100vh;
  background: linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 100%);
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 32px;
  color: #00796b;
}

.subtitle {
  margin: 8px 0 0;
  color: #546e7a;
}

.todo-section {
  max-width: 1200px;
  margin: 0 auto 20px;
}

.todo-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
}

.todo-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .todo-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.todo-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.todo-card.expiring {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.expiring:hover {
  border-color: #ff9800;
}

.todo-card.missing {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
  border-color: #f48fb1;
}

.todo-card.missing:hover {
  border-color: #e91e63;
}

.todo-card.shopping {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border-color: #80cbc4;
}

.todo-card.shopping:hover {
  border-color: #00897b;
}

.todo-card.leftover {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.leftover:hover {
  border-color: #ff9800;
}

.todo-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.todo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.todo-count {
  font-size: 28px;
  font-weight: 700;
  color: #37474f;
}

.todo-label {
  font-size: 14px;
  color: #546e7a;
  font-weight: 500;
}

.todo-arrow {
  font-size: 20px;
  color: #90a4ae;
  font-weight: 600;
  transition: transform 0.2s;
}

.todo-card:hover .todo-arrow {
  transform: translateX(4px);
  color: #546e7a;
}

@media (max-width: 768px) {
  .todo-cards {
    grid-template-columns: 1fr;
  }
}

.main-content {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}
</style>
