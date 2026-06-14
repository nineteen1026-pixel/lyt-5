<template>
  <div class="leftover-manager">
    <header class="header">
      <h1>🍱 剩余菜品管理</h1>
      <p class="subtitle">记录开封日期，追踪存效期，智能预警，减少浪费</p>
    </header>

    <div v-if="leftoverStore.expiringSoonItems.length > 0 || leftoverStore.expiredItems.length > 0" class="alert-section card">
      <div v-if="leftoverStore.expiredItems.length > 0" class="alert-item danger">
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <span class="alert-title">已过期</span>
          <span class="alert-count">{{ leftoverStore.expiredItems.length }} 项菜品已过期，请及时处理</span>
        </div>
        <button class="btn btn-small btn-danger" @click="scrollToSection('expired')">查看</button>
      </div>
      <div v-if="leftoverStore.expiringSoonItems.length > 0" class="alert-item warning">
        <div class="alert-icon">⏰</div>
        <div class="alert-content">
          <span class="alert-title">即将到期</span>
          <span class="alert-count">{{ leftoverStore.expiringSoonItems.length }} 项菜品将在 {{ leftoverStore.expiringDays }} 天内到期</span>
        </div>
        <button class="btn btn-small btn-warning" @click="scrollToSection('expiring')">查看</button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-num">{{ leftoverStore.items.length }}</span>
        <span class="stat-label">总剩余</span>
      </div>
      <div class="stat-item warning">
        <span class="stat-num">{{ leftoverStore.expiringSoonItems.length }}</span>
        <span class="stat-label">即将到期</span>
      </div>
      <div class="stat-item danger">
        <span class="stat-num">{{ leftoverStore.expiredItems.length }}</span>
        <span class="stat-label">已过期</span>
      </div>
      <div class="stat-item fresh">
        <span class="stat-num">{{ freshItemsCount }}</span>
        <span class="stat-label">保鲜期内</span>
      </div>
    </div>

    <div class="main-content">
      <InventoryPanel
        v-model:editingItem="editingItem"
        @consume-items="handleConsumeItems"
      />
      <ChecklistPanel
        @edit-item="handleEditItem"
        @consume-items="handleConsumeItems"
      />
    </div>

    <div class="settings-wrapper">
      <RecipePanel />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { useLeftoverStore } from '@/stores/leftover'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import InventoryPanel from '@/components/InventoryPanel.vue'
import RecipePanel from '@/components/RecipePanel.vue'
import ChecklistPanel from '@/components/ChecklistPanel.vue'

const leftoverStore = useLeftoverStore()
const orchestrator = useStockOrchestrator()
const scrollTarget = inject('scrollTarget')

const editingItem = ref(null)

const freshItemsCount = computed(() => {
  return leftoverStore.items.filter(item =>
    !leftoverStore.isExpiringSoonItem(item) && !leftoverStore.isExpired(item.expiryDate)
  ).length
})

function handleEditItem(item) {
  editingItem.value = item
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleConsumeItems(items) {
  if (!confirm(`确定要将选中的 ${items.length} 项菜品标记为已食用吗？`)) return
  items.forEach(item => {
    orchestrator.consumeFromLeftover(item.id)
  })
  alert(`已标记 ${items.length} 项菜品为已食用`)
}

function scrollToSection(section) {
  const el = document.getElementById(section)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

let notificationCheckTimer = null

function startNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
  }

  leftoverStore.sendExpiringNotifications()

  notificationCheckTimer = setInterval(() => {
    leftoverStore.sendExpiringNotifications()
  }, 60 * 1000)
}

function stopNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
    notificationCheckTimer = null
  }
}

onMounted(() => {
  leftoverStore.checkNotificationPermission()
  startNotificationCheck()

  if (scrollTarget && scrollTarget.value) {
    setTimeout(() => {
      const targetEl = document.querySelector(scrollTarget.value)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      scrollTarget.value = null
    }, 100)
  }
})

onUnmounted(() => {
  stopNotificationCheck()
})

watch(() => leftoverStore.notificationEnabled, (enabled) => {
  if (enabled) {
    startNotificationCheck()
  } else {
    stopNotificationCheck()
  }
})
</script>

<style scoped>
.leftover-manager {
  min-height: 100vh;
  background: linear-gradient(135deg, #fff3e0 0%, #e8f5e9 100%);
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 32px;
  color: #e65100;
}

.subtitle {
  margin: 8px 0 0;
  color: #5d4037;
}

.alert-section {
  max-width: 1200px;
  margin: 0 auto 16px;
  padding: 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffd54f;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.alert-item:last-child {
  margin-bottom: 0;
}

.alert-item.danger {
  background: #ffebee;
  border: 1px solid #ef9a9a;
}

.alert-item.warning {
  background: #fff8e1;
  border: 1px solid #ffe082;
}

.alert-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.alert-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-title {
  font-weight: 600;
  font-size: 14px;
}

.alert-item.danger .alert-title {
  color: #c62828;
}

.alert-item.warning .alert-title {
  color: #e65100;
}

.alert-count {
  font-size: 13px;
  color: #5d4037;
}

.btn-warning {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
}

.btn-warning:hover {
  background: linear-gradient(135deg, #f57c00, #ef6c00);
}

.btn-success {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #388e3c, #2e7d32);
}

.btn-secondary {
  background: #90a4ae;
  color: white;
}

.btn-secondary:hover {
  background: #78909c;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  max-width: 1200px;
  margin: 0 auto 16px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-item.warning {
  border-top: 3px solid #ff9800;
}

.stat-item.warning .stat-num {
  color: #f57c00;
}

.stat-item.danger {
  border-top: 3px solid #f44336;
}

.stat-item.danger .stat-num {
  color: #d32f2f;
}

.stat-item.fresh {
  border-top: 3px solid #4caf50;
}

.stat-item.fresh .stat-num {
  color: #388e3c;
}

.stat-num {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #37474f;
}

.stat-label {
  display: block;
  font-size: 13px;
  color: #78909c;
  margin-top: 4px;
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
  margin-bottom: 16px;
}

.btn {
  display: inline-block;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  flex: 1;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  font-weight: 500;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  background: #eceff1;
  color: #455a64;
}

.btn-danger {
  background: #ffcdd2;
  color: #c62828;
}

.settings-wrapper {
  max-width: 1200px;
  margin: 16px auto 0;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
