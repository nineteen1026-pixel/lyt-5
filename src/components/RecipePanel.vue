<template>
  <div>
    <div class="settings-card card">
      <div class="settings-header" @click="showSettings = !showSettings">
        <h2>⚙️ 设置</h2>
        <span class="toggle-icon">{{ showSettings ? '▼' : '▶' }}</span>
      </div>
      <div v-if="showSettings" class="settings-body">
        <div class="form-group">
          <label>临期预警天数配置</label>
          <div class="expiry-rules-entry">
            <span class="expiry-rules-summary">
              默认 {{ leftoverStore.expiringDays }} 天
              <span class="expiry-rules-detail">
                （分区 {{ Object.keys(leftoverStore.expiryRules.zoneRules).length }} 项，
                品类 {{ Object.keys(leftoverStore.expiryRules.categoryRules).length }} 项）
              </span>
            </span>
            <button class="btn btn-small btn-primary" @click="showExpiryRulesDialog = true">⚙️ 详细配置</button>
          </div>
        </div>
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="localNotificationEnabled"
              @change="updateNotificationEnabled"
            />
            <span>启用浏览器通知</span>
          </label>
        </div>
        <div v-if="localNotificationEnabled" class="notification-subsection">
          <div class="form-group">
            <label>提前通知天数</label>
            <select v-model.number="localNotificationDays" @change="updateNotificationDays">
              <option :value="1">1 天</option>
              <option :value="2">2 天</option>
              <option :value="3">3 天</option>
              <option :value="5">5 天</option>
            </select>
          </div>
          <div class="form-group">
            <label>
              通知权限状态：
              <span :class="{
                'status-granted': leftoverStore.notificationPermission === 'granted',
                'status-denied': leftoverStore.notificationPermission === 'denied',
                'status-default': leftoverStore.notificationPermission === 'default'
              }">
                {{ getPermissionStatusText() }}
              </span>
            </label>
            <button
              v-if="leftoverStore.notificationPermission !== 'granted'"
              class="btn btn-small btn-primary"
              type="button"
              @click="handleRequestNotificationPermission"
            >
              {{ leftoverStore.notificationPermission === 'denied' ? '已被拒绝，请在浏览器设置中开启' : '请求通知权限' }}
            </button>
          </div>
          <div class="form-group">
            <button
              class="btn btn-small"
              type="button"
              @click="handleTestNotification"
              :disabled="leftoverStore.notificationPermission !== 'granted'"
            >
              发送测试通知
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showExpiryRulesDialog" class="expiry-rules-dialog-overlay" @click.self="showExpiryRulesDialog = false">
      <div class="expiry-rules-dialog">
        <div class="expiry-rules-dialog-header">
          <h3>⏰ 剩菜临期预警规则配置</h3>
          <button class="expiry-rules-dialog-close" @click="showExpiryRulesDialog = false">✕</button>
        </div>
        <div class="expiry-rules-dialog-body">
          <div class="expiry-rules-section">
            <h4>📐 默认预警天数</h4>
            <p class="expiry-rules-hint">当剩菜没有匹配的分区或品类规则时，使用此默认值</p>
            <div class="expiry-rules-row">
              <label>默认天数</label>
              <select v-model.number="localExpiringDays" @change="updateExpiringDays">
                <option :value="1">1 天</option>
                <option :value="2">2 天</option>
                <option :value="3">3 天</option>
                <option :value="5">5 天</option>
                <option :value="7">7 天</option>
              </select>
            </div>
          </div>

          <div class="expiry-rules-section">
            <h4>📍 按分区配置</h4>
            <p class="expiry-rules-hint">不同存储分区的剩菜，临期预警天数可以不同</p>
            <div
              v-for="zone in leftoverStore.storageZones"
              :key="zone"
              class="expiry-rules-row"
            >
              <label>{{ zone }}</label>
              <div class="expiry-rules-input-group">
                <input
                  type="number"
                  min="1"
                  max="365"
                  :value="leftoverStore.expiryRules.zoneRules[zone] || leftoverStore.expiryRules.defaultDays"
                  @change="handleExpiryZoneRuleChange(zone, $event)"
                />
                <span class="expiry-rules-unit">天</span>
              </div>
            </div>
          </div>

          <div class="expiry-rules-section">
            <h4>📦 按品类配置</h4>
            <p class="expiry-rules-hint">不同品类的剩菜，临期预警天数可以不同</p>
            <div
              v-for="group in leftoverCategories"
              :key="group.id"
              class="expiry-rules-category-group"
            >
              <div class="expiry-rules-category-group-title">{{ group.name }}</div>
              <div
                v-for="sub in group.children"
                :key="sub.id"
                class="expiry-rules-row"
              >
                <label>
                  <span class="expiry-rules-cat-icon">{{ sub.icon }}</span>
                  {{ sub.name }}
                </label>
                <div class="expiry-rules-input-group">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    :value="leftoverStore.expiryRules.categoryRules[sub.id] || leftoverStore.expiryRules.defaultDays"
                    @change="handleExpiryCategoryRuleChange(sub.id, $event)"
                  />
                  <span class="expiry-rules-unit">天</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="expiry-rules-dialog-footer">
          <button class="btn btn-small btn-danger" @click="handleResetExpiryRules">🔄 恢复默认</button>
          <button class="btn btn-primary" @click="showExpiryRulesDialog = false">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useLeftoverStore } from '@/stores/leftover'
import { sendNotification } from '@/utils/storage'
import { categories } from '@/utils/categories'

const leftoverStore = useLeftoverStore()

const showSettings = ref(false)
const localExpiringDays = ref(leftoverStore.expiringDays)
const localNotificationEnabled = ref(leftoverStore.notificationEnabled)
const localNotificationDays = ref(leftoverStore.notificationDays)
const showExpiryRulesDialog = ref(false)

const leftoverCategories = computed(() => {
  const leftoverSpecificCategories = [
    { id: 'leftover-cooked', name: '剩菜类', children: [
      { id: 'cooked-veg', name: '熟菜类', icon: '🥬' },
      { id: 'cooked-meat', name: '熟肉类', icon: '🍖' },
      { id: 'cooked-grain', name: '主食类', icon: '🍚' },
      { id: 'soup', name: '汤品类', icon: '🍲' }
    ]}
  ]
  return [...leftoverSpecificCategories, ...categories]
})

function updateExpiringDays() {
  leftoverStore.setExpiringDays(localExpiringDays.value)
}

function handleExpiryZoneRuleChange(zone, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    leftoverStore.setZoneExpiringDays(zone, value)
  }
}

function handleExpiryCategoryRuleChange(categoryId, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    leftoverStore.setCategoryExpiringDays(categoryId, value)
  }
}

function handleResetExpiryRules() {
  if (confirm('确定要恢复临期预警规则为默认值吗？所有自定义配置将丢失。')) {
    leftoverStore.resetExpiryRules()
    localExpiringDays.value = leftoverStore.expiringDays
  }
}

function updateNotificationEnabled() {
  if (localNotificationEnabled.value) {
    leftoverStore.enableNotification()
  } else {
    leftoverStore.disableNotification()
  }
}

function updateNotificationDays() {
  leftoverStore.setNotificationDays(localNotificationDays.value)
}

function getPermissionStatusText() {
  switch (leftoverStore.notificationPermission) {
    case 'granted':
      return '已允许'
    case 'denied':
      return '已拒绝'
    case 'default':
      return '未设置'
    default:
      return '不支持'
  }
}

async function handleRequestNotificationPermission() {
  const granted = await leftoverStore.enableNotification()
  if (granted) {
    localNotificationEnabled.value = true
    leftoverStore.checkNotificationPermission()
  }
}

function handleTestNotification() {
  if (leftoverStore.notificationPermission !== 'granted') {
    alert('请先允许浏览器通知权限')
    return
  }
  sendNotification('🍱 剩余菜品管理 - 测试通知', {
    body: '浏览器通知功能已正常启用！当有剩余菜品即将到期时，您将收到提醒。',
    tag: 'leftover-test-notification'
  })
}
</script>

<style scoped>
.card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 16px;
}

.card h2 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
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

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  background: #eceff1;
  color: #455a64;
}

.btn-small:hover {
  background: #cfd8dc;
}

.btn-danger {
  background: #ffcdd2;
  color: #c62828;
}

.btn-danger:hover {
  background: #ef9a9a;
}

.settings-card {
  padding: 0;
  overflow: hidden;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #eceff1;
}

.settings-header h2 {
  margin: 0;
}

.toggle-icon {
  font-size: 12px;
  color: #90a4ae;
}

.settings-body {
  padding: 16px 20px;
}

.settings-body .form-group {
  margin-bottom: 12px;
}

.settings-body label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.settings-body select,
.settings-body input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.settings-body select:focus,
.settings-body input:focus {
  outline: none;
  border-color: #ff9800;
}

.checkbox-group {
  margin-bottom: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #546e7a;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #ff9800;
  cursor: pointer;
}

.notification-subsection {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #ff9800;
}

.status-granted {
  color: #2e7d32;
  font-weight: 600;
}

.status-denied {
  color: #c62828;
  font-weight: 600;
}

.status-default {
  color: #f57c00;
  font-weight: 600;
}

.expiry-rules-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff8e1, #fff3e0);
  border-radius: 10px;
  border: 1px solid #ffe0b2;
}

.expiry-rules-summary {
  font-size: 15px;
  font-weight: 600;
  color: #e65100;
}

.expiry-rules-detail {
  font-size: 12px;
  font-weight: 400;
  color: #bf360c;
  opacity: 0.7;
}

.expiry-rules-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.expiry-rules-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 640px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.expiry-rules-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.expiry-rules-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.expiry-rules-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.expiry-rules-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.expiry-rules-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.expiry-rules-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.expiry-rules-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.expiry-rules-section h4 {
  margin: 0 0 8px;
  font-size: 16px;
  color: #37474f;
}

.expiry-rules-hint {
  margin: 0 0 14px;
  font-size: 12px;
  color: #90a4ae;
  line-height: 1.5;
}

.expiry-rules-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}

.expiry-rules-row:last-child {
  border-bottom: none;
}

.expiry-rules-row label {
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.expiry-rules-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.expiry-rules-input-group input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.expiry-rules-input-group input:focus {
  border-color: #00897b;
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 137, 123, 0.15);
}

.expiry-rules-unit {
  font-size: 13px;
  color: #90a4ae;
}

.expiry-rules-cat-icon {
  font-size: 14px;
}

.expiry-rules-category-group {
  margin-bottom: 12px;
}

.expiry-rules-category-group:last-child {
  margin-bottom: 0;
}

.expiry-rules-category-group-title {
  font-size: 13px;
  font-weight: 600;
  color: #00796b;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: #e0f2f1;
  border-radius: 6px;
}

.expiry-rules-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}
</style>
