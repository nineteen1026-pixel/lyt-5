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
      <section class="left-section">
        <div class="add-form card">
          <h2>{{ editingItem ? '✏️ 编辑菜品' : '➕ 添加剩余菜品' }}</h2>
          <form @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>菜品名称</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="如：红烧肉、炒青菜"
                required
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>剩余量</label>
                <input
                  v-model.number="form.quantity"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                />
              </div>
              <div class="form-group">
                <label>单位</label>
                <select v-model="form.unit">
                  <option value="份">份</option>
                  <option value="盘">盘</option>
                  <option value="碗">碗</option>
                  <option value="盒">盒</option>
                  <option value="克">克</option>
                  <option value="斤">斤</option>
                  <option value="个">个</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>开封日期</label>
                <input
                  v-model="form.openDate"
                  type="date"
                  required
                />
              </div>
              <div class="form-group">
                <label>存效期 (天)</label>
                <input
                  v-model.number="form.storageDays"
                  type="number"
                  min="1"
                  max="30"
                  :placeholder="'建议: ' + suggestedStorageDays + ' 天'"
                  required
                />
              </div>
            </div>
            <div class="form-group">
              <label>预计到期日</label>
              <div class="expiry-preview">
                <span :class="getExpiryClass(calculatedExpiryDate)">
                  {{ formatDate(calculatedExpiryDate) }}
                  (还剩 {{ leftoverStore.daysUntilExpiry(calculatedExpiryDate) }} 天)
                </span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>存储位置</label>
                <select v-model="form.zone">
                  <option v-for="zone in leftoverStore.storageZones" :key="zone" :value="zone">
                    {{ zone }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>食材品类</label>
                <select v-model="form.categoryId" @change="onCategoryChange">
                  <option value="">请选择</option>
                  <option v-for="cat in allSubCategories" :key="cat.id" :value="cat.id">
                    {{ cat.icon }} {{ cat.name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>备注</label>
              <textarea
                v-model="form.notes"
                placeholder="加热方式、食用建议等..."
                rows="2"
              ></textarea>
            </div>
            <div class="form-actions">
              <button v-if="editingItem" type="button" class="btn btn-secondary" @click="cancelEdit">取消</button>
              <button type="submit" class="btn btn-primary">
                {{ editingItem ? '💾 保存修改' : '➕ 添加菜品' }}
              </button>
            </div>
          </form>
        </div>

        <div class="consumption-guide card" v-if="consumptionSuggestions.length > 0">
          <h2>💡 消耗引导建议</h2>
          <div class="guide-list">
            <div v-for="(suggestion, index) in consumptionSuggestions" :key="index" class="guide-item">
              <div class="guide-header">
                <span class="guide-priority" :class="suggestion.priority">
                  {{ suggestion.priority === 'urgent' ? '🔥 紧急' : '⏰ 建议' }}
                </span>
                <span class="guide-title">{{ suggestion.title }}</span>
              </div>
              <p class="guide-desc">{{ suggestion.description }}</p>
              <div class="guide-items">
                <span v-for="item in suggestion.items" :key="item.id" class="guide-item-tag">
                  {{ item.name }}
                </span>
              </div>
              <div class="guide-actions">
                <button class="btn btn-small btn-primary" @click="consumeItems(suggestion.items)">
                  ✅ 标记已食用
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card card">
          <div class="settings-header" @click="showSettings = !showSettings">
            <h2>⚙️ 设置</h2>
            <span class="toggle-icon">{{ showSettings ? '▼' : '▶' }}</span>
          </div>
          <div v-if="showSettings" class="settings-body">
            <div class="form-group">
              <label>临期提醒天数</label>
              <select v-model.number="localExpiringDays" @change="updateExpiringDays">
                <option :value="1">1 天</option>
                <option :value="2">2 天</option>
                <option :value="3">3 天</option>
                <option :value="5">5 天</option>
                <option :value="7">7 天</option>
              </select>
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
      </section>

      <section class="right-section">
        <div class="filter-bar">
          <button
            v-for="zone in ['全部', ...leftoverStore.storageZones]"
            :key="zone"
            class="filter-btn"
            :class="{ active: activeZone === zone }"
            @click="activeZone = zone"
          >
            {{ zone }}
          </button>
        </div>

        <div id="expired" class="items-list card" v-if="expiredItems.length > 0">
          <h2>⚠️ 已过期 ({{ expiredItems.length }})</h2>
          <div class="item-cards">
            <div
              v-for="item in expiredItems"
              :key="item.id"
              class="item-card expired"
            >
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-zone">{{ item.zone }}</span>
              </div>
              <div v-if="item.categoryName" class="item-category">
                <span class="item-category-label">{{ item.parentCategoryName }} · {{ item.categoryName }}</span>
              </div>
              <div class="item-info">
                <span class="item-quantity">{{ item.quantity }} {{ item.unit }}</span>
                <span class="badge expired">已过期 {{ Math.abs(leftoverStore.daysUntilExpiry(item.expiryDate)) }} 天</span>
              </div>
              <div class="item-dates">
                <span>开封: {{ formatDate(item.openDate) }}</span>
                <span>存效期: {{ item.storageDays }} 天</span>
              </div>
              <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
              <div class="item-actions">
                <button class="btn btn-small btn-danger" @click="discardItem(item)">
                  🗑️ 丢弃
                </button>
              </div>
            </div>
          </div>
        </div>

        <div id="expiring" class="items-list card" v-if="expiringItems.length > 0">
          <h2>⏰ 即将到期 ({{ expiringItems.length }})</h2>
          <div class="item-cards">
            <div
              v-for="item in expiringItems"
              :key="item.id"
              class="item-card expiring-soon"
            >
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-zone">{{ item.zone }}</span>
              </div>
              <div v-if="item.categoryName" class="item-category">
                <span class="item-category-label">{{ item.parentCategoryName }} · {{ item.categoryName }}</span>
              </div>
              <div class="item-info">
                <span class="item-quantity">{{ item.quantity }} {{ item.unit }}</span>
                <span class="badge warning">还剩 {{ leftoverStore.daysUntilExpiry(item.expiryDate) }} 天</span>
              </div>
              <div class="item-dates">
                <span>开封: {{ formatDate(item.openDate) }}</span>
                <span>存效期: {{ item.storageDays }} 天</span>
              </div>
              <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
              <div class="item-actions">
                <button class="btn btn-small btn-success" @click="consumeItem(item)">
                  ✅ 食用
                </button>
                <button class="btn btn-small" @click="extendItem(item)">
                  ⏳ 延长
                </button>
                <button class="btn btn-small btn-danger" @click="discardItem(item)">
                  🗑️ 丢弃
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="items-list card">
          <h2>📋 所有剩余菜品 ({{ filteredItems.length }})</h2>
          <div v-if="filteredItems.length === 0" class="empty-tip">
            暂无剩余菜品，快去添加吧～
          </div>
          <div v-else class="item-cards">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="item-card"
              :class="{
                'expiring-soon': leftoverStore.isExpiringSoonItem(item.expiryDate) && !leftoverStore.isExpired(item.expiryDate),
                'expired': leftoverStore.isExpired(item.expiryDate)
              }"
            >
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-zone">{{ item.zone }}</span>
              </div>
              <div v-if="item.categoryName" class="item-category">
                <span class="item-category-label">{{ item.parentCategoryName }} · {{ item.categoryName }}</span>
              </div>
              <div class="item-info">
                <span class="item-quantity">{{ item.quantity }} {{ item.unit }}</span>
                <span
                  v-if="leftoverStore.isExpired(item.expiryDate)"
                  class="badge expired"
                >
                  已过期
                </span>
                <span
                  v-else-if="leftoverStore.isExpiringSoonItem(item.expiryDate)"
                  class="badge warning"
                >
                  还剩 {{ leftoverStore.daysUntilExpiry(item.expiryDate) }} 天
                </span>
                <span v-else class="badge normal">
                  保质期: {{ formatDate(item.expiryDate) }}
                </span>
              </div>
              <div class="item-dates">
                <span>开封: {{ formatDate(item.openDate) }}</span>
                <span>存效期: {{ item.storageDays }} 天</span>
              </div>
              <div v-if="item.notes" class="item-notes">{{ item.notes }}</div>
              <div class="item-actions">
                <button class="btn btn-small btn-success" @click="consumeItem(item)">
                  ✅ 食用
                </button>
                <button class="btn btn-small" @click="editItem(item)">
                  ✏️ 编辑
                </button>
                <button class="btn btn-small" @click="extendItem(item)">
                  ⏳ 延长
                </button>
                <button class="btn btn-small btn-danger" @click="deleteItem(item)">
                  🗑️ 删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-if="showExtendDialog" class="dialog-overlay" @click.self="showExtendDialog = false">
      <div class="dialog">
        <div class="dialog-header">
          <h3>⏳ 延长存效期</h3>
          <button class="dialog-close" @click="showExtendDialog = false">✕</button>
        </div>
        <div class="dialog-body" v-if="extendDialogItem">
          <div class="dialog-info">
            <span class="dialog-name">{{ extendDialogItem.name }}</span>
            <span class="dialog-badge">当前存效期: {{ extendDialogItem.storageDays }} 天</span>
          </div>
          <div class="form-group">
            <label>延长天数</label>
            <select v-model.number="extendDays">
              <option :value="1">+ 1 天</option>
              <option :value="2">+ 2 天</option>
              <option :value="3">+ 3 天</option>
              <option :value="5">+ 5 天</option>
              <option :value="7">+ 7 天</option>
            </select>
          </div>
          <div class="dialog-summary">
            新到期日: {{ formatDate(calculatedExtendExpiry) }}
            (还剩 {{ leftoverStore.daysUntilExpiry(calculatedExtendExpiry) }} 天)
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-small" @click="showExtendDialog = false">取消</button>
          <button class="btn btn-primary" @click="confirmExtend">确认延长</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue'
import { useLeftoverStore } from '@/stores/leftover'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { sendNotification } from '@/utils/storage'
import { getAllSubCategories, getCategoryInfo } from '@/utils/categories'

const leftoverStore = useLeftoverStore()
const purchaseCostStore = usePurchaseCostStore()
const scrollTarget = inject('scrollTarget')

const activeZone = ref('全部')
const showSettings = ref(false)
const showExtendDialog = ref(false)
const extendDialogItem = ref(null)
const extendDays = ref(1)
const editingItem = ref(null)

const localExpiringDays = ref(leftoverStore.expiringDays)
const localNotificationEnabled = ref(leftoverStore.notificationEnabled)
const localNotificationDays = ref(leftoverStore.notificationDays)

const allSubCategories = getAllSubCategories()

const form = ref({
  name: '',
  quantity: 1,
  unit: '份',
  openDate: new Date().toISOString().split('T')[0],
  storageDays: 2,
  zone: '冷藏',
  categoryId: '',
  categoryName: '',
  parentCategoryId: '',
  parentCategoryName: '',
  notes: ''
})

const suggestedStorageDays = computed(() => {
  if (form.value.categoryName) {
    return leftoverStore.getDefaultStorageDays(form.value.categoryName)
  }
  const categoryInfo = getCategoryInfo(form.value.name)
  return leftoverStore.getDefaultStorageDays(categoryInfo.categoryName)
})

const calculatedExpiryDate = computed(() => {
  if (!form.value.openDate || !form.value.storageDays) return ''
  const date = new Date(form.value.openDate)
  date.setDate(date.getDate() + parseInt(form.value.storageDays, 10))
  return date.toISOString().split('T')[0]
})

const calculatedExtendExpiry = computed(() => {
  if (!extendDialogItem.value) return ''
  const date = new Date(extendDialogItem.value.openDate)
  date.setDate(date.getDate() + (extendDialogItem.value.storageDays + extendDays.value))
  return date.toISOString().split('T')[0]
})

const filteredItems = computed(() => {
  let items = leftoverStore.sortedItems
  if (activeZone.value !== '全部') {
    items = items.filter(item => item.zone === activeZone.value)
  }
  return items
})

const expiredItems = computed(() => {
  let items = leftoverStore.expiredItems
  if (activeZone.value !== '全部') {
    items = items.filter(item => item.zone === activeZone.value)
  }
  return items
})

const expiringItems = computed(() => {
  let items = leftoverStore.expiringSoonItems
  if (activeZone.value !== '全部') {
    items = items.filter(item => item.zone === activeZone.value)
  }
  return items
})

const freshItemsCount = computed(() => {
  return leftoverStore.items.filter(item =>
    !leftoverStore.isExpiringSoonItem(item.expiryDate) && !leftoverStore.isExpired(item.expiryDate)
  ).length
})

const consumptionSuggestions = computed(() => {
  const suggestions = []
  const expiring = leftoverStore.expiringSoonItems
  const expired = leftoverStore.expiredItems

  if (expired.length > 0) {
    suggestions.push({
      priority: 'urgent',
      title: '请立即处理过期菜品',
      description: '以下菜品已过期，为了食品安全请尽快丢弃处理。',
      items: expired
    })
  }

  if (expiring.length >= 2) {
    const today = expiring.filter(item => leftoverStore.daysUntilExpiry(item.expiryDate) === 0)
    if (today.length > 0) {
      suggestions.push({
        priority: 'urgent',
        title: '今日到期，请优先食用',
        description: '以下菜品今天到期，建议今天内食用完毕。',
        items: today
      })
    }

    const tomorrow = expiring.filter(item => leftoverStore.daysUntilExpiry(item.expiryDate) === 1)
    if (tomorrow.length > 0) {
      suggestions.push({
        priority: 'normal',
        title: '明日到期，请安排食用',
        description: '以下菜品明天到期，请尽快安排食用。',
        items: tomorrow
      })
    }

    if (expiring.length >= 3) {
      suggestions.push({
        priority: 'normal',
        title: '建议搭配食用',
        description: '剩余菜品较多，可以考虑搭配食用，避免浪费。',
        items: expiring.slice(0, 5)
      })
    }
  }

  return suggestions
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getExpiryClass(expiryDate) {
  if (leftoverStore.isExpired(expiryDate)) return 'expired'
  if (leftoverStore.isExpiringSoonItem(expiryDate)) return 'warning'
  return 'normal'
}

function onCategoryChange() {
  const catId = form.value.categoryId
  if (catId) {
    const cat = allSubCategories.find(c => c.id === catId)
    if (cat) {
      form.value.categoryId = cat.id
      form.value.categoryName = cat.name
      form.value.parentCategoryId = cat.parentId
      form.value.parentCategoryName = cat.parentName
      form.value.storageDays = leftoverStore.getDefaultStorageDays(cat.name)
    }
  }
}

function handleSubmit() {
  if (!form.value.name.trim()) return

  const categoryInfo = form.value.categoryId
    ? {
        categoryId: form.value.categoryId,
        categoryName: form.value.categoryName,
        parentCategoryId: form.value.parentCategoryId,
        parentCategoryName: form.value.parentCategoryName
      }
    : getCategoryInfo(form.value.name.trim())

  if (editingItem.value) {
    leftoverStore.updateItem(editingItem.value.id, {
      name: form.value.name.trim(),
      quantity: form.value.quantity,
      unit: form.value.unit,
      openDate: form.value.openDate,
      storageDays: form.value.storageDays,
      zone: form.value.zone,
      notes: form.value.notes,
      ...categoryInfo
    })
    editingItem.value = null
  } else {
    leftoverStore.addItem({
      name: form.value.name.trim(),
      quantity: form.value.quantity,
      unit: form.value.unit,
      openDate: form.value.openDate,
      storageDays: form.value.storageDays,
      zone: form.value.zone,
      notes: form.value.notes,
      ...categoryInfo
    })
  }

  resetForm()
}

function resetForm() {
  form.value = {
    name: '',
    quantity: 1,
    unit: '份',
    openDate: new Date().toISOString().split('T')[0],
    storageDays: 2,
    zone: '冷藏',
    categoryId: '',
    categoryName: '',
    parentCategoryId: '',
    parentCategoryName: '',
    notes: ''
  }
  editingItem.value = null
}

function cancelEdit() {
  editingItem.value = null
  resetForm()
}

function editItem(item) {
  editingItem.value = item
  form.value = {
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    openDate: item.openDate,
    storageDays: item.storageDays,
    zone: item.zone,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    parentCategoryId: item.parentCategoryId,
    parentCategoryName: item.parentCategoryName,
    notes: item.notes || ''
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function consumeItem(item) {
  const amount = parseFloat(prompt(`食用多少 ${item.unit}？`, item.quantity.toString()))
  if (isNaN(amount) || amount <= 0) return

  const result = leftoverStore.consumeItem(item.id, amount)
  if (result && result.fullyConsumed) {
    alert(`已记录食用 ${item.name} ${amount}${item.unit}`)
  } else if (result) {
    alert(`已记录食用 ${item.name} ${amount}${item.unit}，还剩 ${result.remainingQuantity}${item.unit}`)
  }
}

function consumeItems(items) {
  if (!confirm(`确定要将选中的 ${items.length} 项菜品标记为已食用吗？`)) return
  items.forEach(item => {
    leftoverStore.consumeItem(item.id)
  })
  alert(`已标记 ${items.length} 项菜品为已食用`)
}

function discardItem(item) {
  const reason = leftoverStore.isExpired(item.expiryDate) ? 'expired' : 'spoiled'
  const label = reason === 'expired' ? '过期丢弃' : '变质丢弃'
  if (confirm(`确定要${label}这个菜品吗？此操作将记录到浪费报表。`)) {
    leftoverStore.discardItem(item.id, reason)
  }
}

function deleteItem(item) {
  if (confirm('确定要删除这个菜品吗？')) {
    leftoverStore.removeItem(item.id)
  }
}

function extendItem(item) {
  extendDialogItem.value = item
  extendDays.value = 1
  showExtendDialog.value = true
}

function confirmExtend() {
  if (!extendDialogItem.value) return
  leftoverStore.extendStorage(extendDialogItem.value.id, extendDays.value)
  showExtendDialog.value = false
  extendDialogItem.value = null
  alert(`已延长 ${extendDays.value} 天存效期`)
}

function updateExpiringDays() {
  leftoverStore.setExpiringDays(localExpiringDays.value)
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

watch(() => form.value.name, (newName) => {
  if (!editingItem.value && newName && newName.trim()) {
    const categoryInfo = getCategoryInfo(newName.trim())
    form.value.categoryId = categoryInfo.categoryId
    form.value.categoryName = categoryInfo.categoryName
    form.value.parentCategoryId = categoryInfo.parentCategoryId
    form.value.parentCategoryName = categoryInfo.parentCategoryName
    form.value.storageDays = leftoverStore.getDefaultStorageDays(categoryInfo.categoryName)
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

.add-form .form-group {
  margin-bottom: 12px;
}

.add-form .form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.add-form label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.add-form input,
.add-form select,
.add-form textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
  font-family: inherit;
}

.add-form input:focus,
.add-form select:focus,
.add-form textarea:focus {
  outline: none;
  border-color: #ff9800;
}

.expiry-preview {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.expiry-preview .normal {
  color: #2e7d32;
}

.expiry-preview .warning {
  color: #e65100;
}

.expiry-preview .expired {
  color: #c62828;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
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

.consumption-guide .guide-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.guide-item:has(.guide-priority.urgent) {
  border-left-color: #f44336;
  background: linear-gradient(135deg, #fff5f5 0%, #fafafa 100%);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.guide-priority {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.guide-priority.urgent {
  background: #ffebee;
  color: #c62828;
}

.guide-priority.normal {
  background: #fff3e0;
  color: #e65100;
}

.guide-title {
  font-weight: 600;
  color: #e65100;
  font-size: 14px;
}

.guide-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: #5d4037;
}

.guide-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.guide-item-tag {
  font-size: 11px;
  padding: 2px 6px;
  background: #ffe0b2;
  color: #e65100;
  border-radius: 6px;
  font-weight: 500;
}

.guide-actions {
  text-align: right;
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

.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 6px 16px;
  border: 1px solid #cfd8dc;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  color: #546e7a;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #ff9800;
  color: #ff9800;
}

.filter-btn.active {
  background: #ff9800;
  color: white;
  border-color: #ff9800;
}

.items-list .item-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.item-card {
  padding: 14px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eceff1;
  transition: all 0.2s;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-card.expiring-soon {
  background: #fff3e0;
  border-color: #ffcc80;
  border-width: 2px;
  box-shadow: 0 0 0 1px rgba(255, 152, 0, 0.15);
}

.item-card.expired {
  background: #ffebee;
  border-color: #ef9a9a;
  opacity: 0.85;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-name {
  font-weight: 600;
  font-size: 16px;
  color: #263238;
}

.item-zone {
  font-size: 12px;
  padding: 2px 8px;
  background: #fff3e0;
  color: #e65100;
  border-radius: 10px;
}

.item-category {
  margin-bottom: 6px;
}

.item-category-label {
  font-size: 12px;
  color: #e65100;
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.item-quantity {
  font-size: 14px;
  color: #546e7a;
}

.badge {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.badge.normal {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge.warning {
  background: #fff3e0;
  color: #e65100;
  font-weight: 600;
  border: 1px solid #ffcc80;
}

.badge.expired {
  background: #ffebee;
  color: #c62828;
  font-weight: 600;
}

.item-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: #78909c;
  margin-bottom: 8px;
}

.item-notes {
  font-size: 12px;
  color: #5d4037;
  background: #fff8e1;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.item-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.dialog-body {
  padding: 20px;
}

.dialog-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 3px solid #ff9800;
}

.dialog-name {
  font-size: 16px;
  font-weight: 600;
  color: #e65100;
}

.dialog-badge {
  font-size: 12px;
  padding: 2px 10px;
  background: #fff3e0;
  color: #e65100;
  border-radius: 10px;
  font-weight: 500;
}

.dialog-body .form-group {
  margin-bottom: 16px;
}

.dialog-body label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.dialog-body select,
.dialog-body input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.dialog-summary {
  margin-top: 12px;
  padding: 10px 14px;
  background: #e8f5e9;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #2e7d32;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.dialog-footer .btn-primary {
  width: auto;
  padding: 8px 20px;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .add-form .form-row {
    grid-template-columns: 1fr;
  }
}

.todo-card.leftover {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.leftover:hover {
  border-color: #ff9800;
}
</style>
