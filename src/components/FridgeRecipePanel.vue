<template>
  <div class="shopping-list card">
    <div class="shopping-header">
      <h2>🛒 购物清单</h2>
      <div class="shopping-header-actions">
        <button
          v-if="fridgeStore.expiringSoonItems.length > 0"
          class="btn btn-small btn-batch-expiring"
          @click="handleBatchExpiring"
        >
          ⚡ 一键补货
        </button>
        <button class="btn btn-small btn-settings" @click="openSettings">
          ⚙ 设置
        </button>
      </div>
    </div>

    <div class="shopping-budget-summary" :class="{ 'over-budget': shoppingStore.isOverBudget }">
      <div class="budget-item">
        <span class="budget-label">预算上限</span>
        <span class="budget-value limit">¥{{ shoppingStore.budgetLimit.toFixed(2) }}</span>
      </div>
      <div class="budget-item">
        <span class="budget-label">已用</span>
        <span class="budget-value total" :class="{ danger: shoppingStore.isOverBudget }">
          ¥{{ shoppingStore.totalBudget.toFixed(2) }}
        </span>
      </div>
      <div class="budget-item">
        <span class="budget-label">剩余</span>
        <span class="budget-value" :class="shoppingStore.remainingBudget >= 0 ? 'remaining' : 'over'">
          {{ shoppingStore.remainingBudget >= 0 ? '' : '-' }}¥{{ Math.abs(shoppingStore.remainingBudget).toFixed(2) }}
        </span>
      </div>
    </div>

    <div class="budget-progress-bar">
      <div
        class="budget-progress-fill"
        :class="{ danger: shoppingStore.isOverBudget, warning: shoppingStore.budgetUsagePercent >= 80 && !shoppingStore.isOverBudget }"
        :style="{ width: Math.min(100, shoppingStore.budgetUsagePercent) + '%' }"
      ></div>
      <span class="budget-progress-text">{{ shoppingStore.budgetUsagePercent }}%</span>
    </div>

    <div v-if="shoppingStore.isOverBudget" class="budget-warning">
      ⚠️ 已超出预算 ¥{{ Math.abs(shoppingStore.remainingBudget).toFixed(2) }}
    </div>

    <div class="shopping-add-form">
      <div class="shopping-form-row">
        <input
          v-model="shoppingForm.name"
          type="text"
          placeholder="添加采购项"
          @keyup.enter="handleShoppingAdd"
        />
      </div>
      <div class="shopping-form-row">
        <input
          v-model.number="shoppingForm.quantity"
          type="number"
          min="1"
          step="0.1"
          class="shopping-qty-input"
          placeholder="数量"
        />
        <select v-model="shoppingForm.unit" class="shopping-unit-select">
          <option value="个">个</option>
          <option value="斤">斤</option>
          <option value="克">克</option>
          <option value="袋">袋</option>
          <option value="盒">盒</option>
          <option value="瓶">瓶</option>
        </select>
        <input
          v-model.number="shoppingForm.unitPrice"
          type="number"
          min="0"
          step="0.01"
          class="shopping-price-input"
          placeholder="单价(元)"
        />
        <select v-model="shoppingForm.store" class="shopping-store-select">
          <option value="">门店</option>
          <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-shopping-add" @click="handleShoppingAdd">➕</button>
      </div>
    </div>
    <div class="shopping-tabs">
      <button
        class="shopping-tab"
        :class="{ active: shoppingTab === 'pending' }"
        @click="shoppingTab = 'pending'"
      >
        待购 ({{ shoppingStore.pendingCount }})
      </button>
      <button
        class="shopping-tab"
        :class="{ active: shoppingTab === 'purchased' }"
        @click="shoppingTab = 'purchased'"
      >
        已购 ({{ shoppingStore.purchasedItems.length }})
      </button>
    </div>
    <div v-if="displayShoppingStoreKeys.length === 0" class="empty-tip">
      {{ shoppingTab === 'pending' ? '购物清单为空' : '暂无已购项' }}
    </div>
    <div v-else class="shopping-groups">
      <div
        v-for="store in displayShoppingStoreKeys"
        :key="store"
        class="shopping-store-group"
      >
        <div class="shopping-store-header">
          <span class="shopping-store-name">🏪 {{ store }}</span>
          <span class="shopping-store-budget">
            小计: ¥{{ getStoreBudget(store).toFixed(2) }}
            ({{ getStoreItems(store).length }}项)
          </span>
        </div>
        <div class="shopping-items">
          <div
            v-for="item in getStoreItems(store)"
            :key="item.id"
            class="shopping-item"
            :class="{ purchased: item.purchased, 'from-expiring': item.fromExpiring }"
          >
            <div class="shopping-item-left">
              <input
                type="checkbox"
                :checked="item.purchased"
                class="shopping-checkbox"
                @change="handleShoppingToggle(item.id)"
              />
              <div class="shopping-item-main">
                <div class="shopping-item-name-row">
                  <span class="shopping-item-name">{{ item.name }}</span>
                  <span v-if="item.fromExpiring" class="badge-from-expiring">临期</span>
                  <span v-if="item.fromMealPlan" class="badge-from-mealplan">周计划</span>
                </div>
                <div class="shopping-item-edit-row" v-if="!item.purchased">
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    class="shopping-inline-input qty"
                    @change="handleItemUpdate(item)"
                  />
                  <span class="shopping-inline-unit">{{ item.unit }}</span>
                  <span class="shopping-inline-sep">×</span>
                  <span class="shopping-inline-label">¥</span>
                  <input
                    v-model.number="item.unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    class="shopping-inline-input price"
                    @change="handleItemUpdate(item)"
                  />
                  <select
                    v-model="item.store"
                    class="shopping-inline-select"
                    @change="handleItemUpdate(item)"
                  >
                    <option value="">未指定</option>
                    <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
                <div class="shopping-item-readonly-row" v-else>
                  <span class="shopping-item-qty">{{ item.quantity }} {{ item.unit }}</span>
                  <span v-if="item.unitPrice > 0" class="shopping-item-price">
                    ¥{{ item.unitPrice }}/{{ item.unit }}
                  </span>
                </div>
              </div>
            </div>
            <div class="shopping-item-right">
              <div class="shopping-item-subtotal">
                ¥{{ shoppingStore.getItemSubtotal(item).toFixed(2) }}
              </div>
              <button class="btn btn-small btn-danger" @click="shoppingStore.removeItem(item.id)">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="shoppingStore.purchasedItems.length > 0" class="shopping-footer">
      <button class="btn btn-small btn-clear-purchased" @click="clearPurchasedItems">
        🗑 清除已购
      </button>
    </div>
  </div>

  <div v-if="showExpiringDialog" class="expiring-dialog-overlay" @click.self="cancelExpiringAdd">
    <div class="expiring-dialog">
      <div class="expiring-dialog-header">
        <h3>🛒 临期补货</h3>
        <button class="expiring-dialog-close" @click="cancelExpiringAdd">✕</button>
      </div>
      <div class="expiring-dialog-body" v-if="expiringDialogItem">
        <div class="expiring-dialog-info">
          <span class="expiring-dialog-name">{{ expiringDialogItem.name }}</span>
          <span class="expiring-dialog-badge">
            还剩 {{ fridgeStore.daysUntilExpiry(expiringDialogItem.expiryDate) }} 天
          </span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>补货数量</label>
            <input
              v-model.number="expiringDialogForm.quantity"
              type="number"
              min="0.1"
              step="0.1"
            />
          </div>
          <div class="form-group">
            <label>单位</label>
            <select v-model="expiringDialogForm.unit">
              <option value="个">个</option>
              <option value="斤">斤</option>
              <option value="克">克</option>
              <option value="袋">袋</option>
              <option value="盒">盒</option>
              <option value="瓶">瓶</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>单价 (元)</label>
            <input
              v-model.number="expiringDialogForm.unitPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="预估单价"
            />
          </div>
          <div class="form-group">
            <label>门店</label>
            <select v-model="expiringDialogForm.store">
              <option value="">未指定</option>
              <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
        <div class="expiring-dialog-summary">
          预计花费: ¥{{ (expiringDialogForm.quantity * (expiringDialogForm.unitPrice || 0)).toFixed(2) }}
        </div>
      </div>
      <div class="expiring-dialog-footer">
        <button class="btn btn-small" @click="cancelExpiringAdd">取消</button>
        <button class="btn btn-primary" @click="confirmExpiringAdd">加入购物清单</button>
      </div>
    </div>
  </div>

  <div v-if="showSettings" class="settings-dialog-overlay" @click.self="closeSettings">
    <div class="settings-dialog">
      <div class="settings-dialog-header">
        <h3>⚙ 购物清单设置</h3>
        <button class="settings-dialog-close" @click="closeSettings">✕</button>
      </div>
      <div class="settings-dialog-body">
        <div class="settings-section">
          <h4>💰 预算设置</h4>
          <div class="form-group">
            <label>预算上限 (元)</label>
            <input
              v-model.number="settingsForm.budgetLimit"
              type="number"
              min="0"
              step="10"
              @change="handleBudgetChange"
            />
          </div>
        </div>

        <div class="settings-section">
          <h4>⏰ 临期预警规则</h4>
          <div class="form-group">
            <label>临期预警天数配置</label>
            <div class="expiry-rules-entry">
              <span class="expiry-rules-summary">
                默认 {{ fridgeStore.expiringDays }} 天
                <span class="expiry-rules-detail">
                  （分区 {{ Object.keys(fridgeStore.expiryRules.zoneRules).length }} 项，
                  品类 {{ Object.keys(fridgeStore.expiryRules.categoryRules).length }} 项）
                </span>
              </span>
              <button class="btn btn-small btn-primary" @click="openExpiryRulesDialog">⚙️ 详细配置</button>
            </div>
          </div>
          <div class="form-group">
            <label>默认门店</label>
            <select v-model="settingsForm.defaultStore" @change="handleDefaultStoreChange">
              <option value="">未指定</option>
              <option v-for="s in shoppingStore.stores" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>补货数量倍率</label>
            <select v-model.number="settingsForm.quantityMultiplier" @change="handleQuantityMultiplierChange">
              <option :value="1">1 倍（原量）</option>
              <option :value="1.5">1.5 倍</option>
              <option :value="2">2 倍</option>
              <option :value="2.5">2.5 倍</option>
              <option :value="3">3 倍</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="settingsForm.autoAddToShopping"
                @change="handleAutoAddChange"
              />
              <span>临期自动加入购物清单</span>
            </label>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="settingsForm.useLastPrice"
                @change="handleUseLastPriceChange"
              />
              <span>自动填充历史单价</span>
            </label>
          </div>
          <p class="settings-desc">
            食材保质期不足设定天数时，将标记为临期并可一键补货。开启自动补货后，临期食材会自动加入购物清单。
          </p>
        </div>

        <div class="settings-section">
          <h4>🔔 临期浏览器通知</h4>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="settingsForm.notificationEnabled"
              @change="handleNotificationEnabledChange"
            />
            <span>启用浏览器通知</span>
          </label>
          </div>
          <div v-if="settingsForm.notificationEnabled" class="notification-subsection">
            <div class="form-group">
              <label>提前通知天数</label>
              <select v-model.number="settingsForm.notificationDays" @change="handleNotificationDaysChange">
                <option :value="1">1 天</option>
                <option :value="2">2 天</option>
                <option :value="3">3 天</option>
                <option :value="5">5 天</option>
                <option :value="7">7 天</option>
              </select>
            </div>
            <div class="form-group">
              <label>
                通知权限状态：
                <span :class="{
                  'status-granted': fridgeStore.notificationPermission === 'granted',
                  'status-denied': fridgeStore.notificationPermission === 'denied',
                  'status-default': fridgeStore.notificationPermission === 'default'
                }">
                  {{ getPermissionStatusText() }}
                </span>
              </label>
              <button
                v-if="fridgeStore.notificationPermission !== 'granted'"
                class="btn btn-small btn-primary"
                type="button"
                @click="handleRequestNotificationPermission"
              >
                {{ fridgeStore.notificationPermission === 'denied' ? '已被拒绝，请在浏览器设置中开启' : '请求通知权限' }}
              </button>
            </div>
            <div class="form-group">
              <button
                class="btn btn-small"
                type="button"
                @click="handleTestNotification"
                :disabled="fridgeStore.notificationPermission !== 'granted'"
              >
                发送测试通知
              </button>
            </div>
          </div>
          <p class="settings-desc">
            开启后，当食材在设定天数内即将过期时，浏览器会推送桌面通知提醒您。同一项食材只会在保质期内提醒一次，避免重复打扰。
          </p>
        </div>

        <div class="settings-section">
          <h4>🏪 门店管理</h4>
          <div class="store-manage-row">
            <input
              v-model="newStoreName"
              type="text"
              placeholder="输入新门店名称"
              @keyup.enter="addNewStore"
            />
            <button class="btn btn-small btn-primary" @click="addNewStore">添加</button>
          </div>
          <div class="store-list">
            <div
              v-for="store in shoppingStore.stores"
              :key="store"
              class="store-item"
            >
              <span class="store-name">{{ store }}</span>
              <button
                class="btn btn-small btn-danger btn-remove-store"
                @click="removeStore(store)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="settings-dialog-footer">
        <button class="btn btn-primary" @click="closeSettings">完成</button>
      </div>
    </div>
  </div>

  <div v-if="showExpiryRulesDialog" class="expiry-rules-dialog-overlay" @click.self="closeExpiryRulesDialog">
    <div class="expiry-rules-dialog">
      <div class="expiry-rules-dialog-header">
        <h3>⏰ 临期预警规则配置</h3>
        <button class="expiry-rules-dialog-close" @click="closeExpiryRulesDialog">✕</button>
      </div>
      <div class="expiry-rules-dialog-body">
        <div class="expiry-rules-section">
          <h4>📐 默认预警天数</h4>
          <p class="expiry-rules-hint">当食材没有匹配的分区或品类规则时，使用此默认值</p>
          <div class="expiry-rules-row">
            <label>默认天数</label>
            <select v-model.number="expiryRulesForm.defaultDays" @change="handleExpiryDefaultDaysChange">
              <option :value="1">1 天</option>
              <option :value="2">2 天</option>
              <option :value="3">3 天</option>
              <option :value="5">5 天</option>
              <option :value="7">7 天</option>
              <option :value="10">10 天</option>
              <option :value="14">14 天</option>
            </select>
          </div>
        </div>

        <div class="expiry-rules-section">
          <h4>📍 按分区配置</h4>
          <p class="expiry-rules-hint">不同冰箱分区的食材，临期预警天数可以不同（如冷冻区食材保质期较长，预警天数可更大）</p>
          <div
            v-for="zone in fridgeStore.zones"
            :key="zone"
            class="expiry-rules-row"
          >
            <label>{{ zone }}</label>
            <div class="expiry-rules-input-group">
              <input
                type="number"
                min="1"
                max="365"
                :value="fridgeStore.expiryRules.zoneRules[zone] || fridgeStore.expiryRules.defaultDays"
                @change="handleExpiryZoneRuleChange(zone, $event)"
              />
              <span class="expiry-rules-unit">天</span>
            </div>
          </div>
        </div>

        <div class="expiry-rules-section">
          <h4>📦 按品类配置</h4>
          <p class="expiry-rules-hint">不同品类的食材，临期预警天数可以不同（如叶菜类易坏预警天数可更小）</p>
          <div
            v-for="group in categories"
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
                  :value="fridgeStore.expiryRules.categoryRules[sub.id] || fridgeStore.expiryRules.defaultDays"
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
        <button class="btn btn-primary" @click="closeExpiryRulesDialog">完成</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import { sendNotification } from '@/utils/storage'
import { categories } from '@/utils/categories'

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const orchestrator = useStockOrchestrator()

const shoppingTab = ref('pending')
const shoppingForm = ref({ name: '', quantity: 1, unit: '个', store: '', unitPrice: 0 })

const showExpiringDialog = ref(false)
const expiringDialogItem = ref(null)
const expiringDialogForm = ref({ quantity: 1, unit: '个', store: '', unitPrice: 0 })

const showSettings = ref(false)
const settingsForm = ref({
  budgetLimit: 0,
  defaultStore: '',
  quantityMultiplier: 1.5,
  autoAddToShopping: false,
  useLastPrice: true,
  notificationEnabled: false,
  notificationDays: 3
})
const newStoreName = ref('')

const showExpiryRulesDialog = ref(false)
const expiryRulesForm = ref({
  defaultDays: 3
})

const autoReplenishProcessed = ref(new Set())

const displayShoppingItemsByStore = computed(() => {
  return shoppingTab.value === 'pending'
    ? shoppingStore.pendingItemsByStore
    : shoppingStore.purchasedItemsByStore
})

const displayShoppingStoreKeys = computed(() => {
  return Object.keys(displayShoppingItemsByStore.value)
})

const displayBudgetByStore = computed(() => {
  return shoppingTab.value === 'pending'
    ? shoppingStore.pendingBudgetByStore
    : shoppingStore.purchasedBudgetByStore
})

function getStoreItems(store) {
  return displayShoppingItemsByStore.value[store] || []
}

function getStoreBudget(store) {
  return displayBudgetByStore.value[store] || 0
}

function handleItemUpdate(item) {
  shoppingStore.updateItem(item.id, {
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    store: item.store
  })
}

function handleShoppingAdd() {
  if (!shoppingForm.value.name.trim()) return
  shoppingStore.addItem({
    name: shoppingForm.value.name.trim(),
    quantity: shoppingForm.value.quantity,
    unit: shoppingForm.value.unit,
    store: shoppingForm.value.store,
    unitPrice: shoppingForm.value.unitPrice
  })
  shoppingForm.value.name = ''
  shoppingForm.value.quantity = 1
  shoppingForm.value.unitPrice = 0
  shoppingForm.value.store = ''
}

function handleShoppingToggle(itemId) {
  orchestrator.handleShoppingToggle(itemId)
}

function clearPurchasedItems() {
  if (confirm('确定清除所有已购项吗？')) {
    orchestrator.clearPurchasedFromShopping()
  }
}

function addToShoppingList(item) {
  expiringDialogItem.value = item

  const rules = shoppingStore.replenishRules
  let unitPrice = 0
  let store = rules.defaultStore || ''

  if (rules.useLastPrice) {
    unitPrice = shoppingStore.getLastPrice(item.name)
  }
  if (!store) {
    store = shoppingStore.getLastStore(item.name)
  }

  const quantity = item.quantity * (rules.quantityMultiplier || 1)

  expiringDialogForm.value = {
    quantity: Math.max(item.quantity, quantity),
    unit: item.unit,
    store,
    unitPrice
  }
  showExpiringDialog.value = true
}

function confirmExpiringAdd() {
  if (!expiringDialogItem.value) return
  shoppingStore.addFromExpiring(expiringDialogItem.value, {
    store: expiringDialogForm.value.store,
    unitPrice: expiringDialogForm.value.unitPrice,
    quantity: expiringDialogForm.value.quantity
  })
  showExpiringDialog.value = false
  expiringDialogItem.value = null
}

function cancelExpiringAdd() {
  showExpiringDialog.value = false
  expiringDialogItem.value = null
}

function handleBatchExpiring() {
  const expiringItems = fridgeStore.expiringSoonItems
  if (expiringItems.length === 0) return

  const addedItems = shoppingStore.batchAddFromExpiring(expiringItems)
  const count = addedItems.length
  addedItems.forEach(item => {
    if (item.fridgeItemId) {
      autoReplenishProcessed.value.add(item.fridgeItemId)
    }
  })
  if (count > 0) {
    alert(`已将 ${count} 种临期食材加入购物清单！`)
  } else {
    alert('临期食材已全部在购物清单中。')
  }
}

function openSettings() {
  settingsForm.value.budgetLimit = shoppingStore.budgetLimit
  settingsForm.value.defaultStore = shoppingStore.replenishRules.defaultStore
  settingsForm.value.quantityMultiplier = shoppingStore.replenishRules.quantityMultiplier
  settingsForm.value.autoAddToShopping = shoppingStore.replenishRules.autoAddToShopping
  settingsForm.value.useLastPrice = shoppingStore.replenishRules.useLastPrice
  settingsForm.value.notificationEnabled = fridgeStore.notificationEnabled
  settingsForm.value.notificationDays = fridgeStore.notificationDays
  fridgeStore.checkNotificationPermission()
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
  newStoreName.value = ''
}

function handleBudgetChange() {
  shoppingStore.setBudgetLimit(settingsForm.value.budgetLimit)
}

function openExpiryRulesDialog() {
  expiryRulesForm.value.defaultDays = fridgeStore.expiringDays
  showExpiryRulesDialog.value = true
}

function closeExpiryRulesDialog() {
  showExpiryRulesDialog.value = false
}

function handleExpiryDefaultDaysChange() {
  fridgeStore.setExpiringDays(expiryRulesForm.value.defaultDays)
  shoppingStore.setExpiringDays(expiryRulesForm.value.defaultDays)
}

function handleExpiryZoneRuleChange(zone, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    fridgeStore.setZoneExpiringDays(zone, value)
  }
}

function handleExpiryCategoryRuleChange(categoryId, event) {
  const value = parseInt(event.target.value, 10)
  if (!isNaN(value) && value >= 1) {
    fridgeStore.setCategoryExpiringDays(categoryId, value)
  }
}

function handleResetExpiryRules() {
  if (confirm('确定要恢复临期预警规则为默认值吗？所有自定义配置将丢失。')) {
    fridgeStore.resetExpiryRules()
    expiryRulesForm.value.defaultDays = fridgeStore.expiringDays
  }
}

function handleDefaultStoreChange() {
  shoppingStore.updateReplenishRules({
    defaultStore: settingsForm.value.defaultStore
  })
}

function handleQuantityMultiplierChange() {
  const value = parseFloat(settingsForm.value.quantityMultiplier)
  if (!isNaN(value) && value >= 1) {
    shoppingStore.updateReplenishRules({
      quantityMultiplier: value
    })
  }
}

function handleAutoAddChange() {
  shoppingStore.updateReplenishRules({
    autoAddToShopping: settingsForm.value.autoAddToShopping
  })
}

function handleUseLastPriceChange() {
  shoppingStore.updateReplenishRules({
    useLastPrice: settingsForm.value.useLastPrice
  })
}

function addNewStore() {
  const name = newStoreName.value.trim()
  if (name) {
    shoppingStore.addStore(name)
    newStoreName.value = ''
  }
}

function removeStore(storeName) {
  if (confirm(`确定要删除门店"${storeName}"吗？相关购物项的门店将变为"未指定"。`)) {
    shoppingStore.removeStore(storeName)
  }
}

function getPermissionStatusText() {
  switch (fridgeStore.notificationPermission) {
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
  const granted = await fridgeStore.enableNotification()
  if (granted) {
    settingsForm.value.notificationEnabled = true
    fridgeStore.checkNotificationPermission()
  }
}

function handleNotificationEnabledChange() {
  if (settingsForm.value.notificationEnabled) {
    fridgeStore.enableNotification()
  } else {
    fridgeStore.disableNotification()
  }
}

function handleNotificationDaysChange() {
  fridgeStore.setNotificationDays(settingsForm.value.notificationDays)
}

function handleTestNotification() {
  if (fridgeStore.notificationPermission !== 'granted') {
    alert('请先允许浏览器通知权限')
    return
  }
  sendNotification('🧊 冰箱管理 - 测试通知', {
    body: '浏览器通知功能已正常启用！当有食材即将过期时，您将收到提醒。',
    tag: 'test-notification'
  })
}

watch(() => shoppingForm.value.name, (newName) => {
  if (newName && newName.trim()) {
    const lastPrice = shoppingStore.getLastPrice(newName)
    const lastStore = shoppingStore.getLastStore(newName)
    if (lastPrice > 0 && shoppingForm.value.unitPrice === 0) {
      shoppingForm.value.unitPrice = lastPrice
    }
    if (lastStore && !shoppingForm.value.store) {
      shoppingForm.value.store = lastStore
    }
  }
})

watch(() => fridgeStore.expiringSoonItems, (newExpiringItems) => {
  if (!shoppingStore.replenishRules.autoAddToShopping) return

  const newItems = newExpiringItems.filter(item => !autoReplenishProcessed.value.has(item.id))
  if (newItems.length > 0) {
    const added = shoppingStore.processAutoReplenish(newItems)
    added.forEach(item => {
      if (item.fridgeItemId) {
        autoReplenishProcessed.value.add(item.fridgeItemId)
      }
    })
  }
}, { deep: true, immediate: true })

watch(() => shoppingStore.replenishRules.autoAddToShopping, (enabled) => {
  if (enabled) {
    autoReplenishProcessed.value.clear()
    const added = shoppingStore.processAutoReplenish(fridgeStore.expiringSoonItems)
    added.forEach(item => {
      if (item.fridgeItemId) {
        autoReplenishProcessed.value.add(item.fridgeItemId)
      }
    })
  }
})

watch(() => fridgeStore.expiringDays, (newDays) => {
  if (shoppingStore.expiringDays !== newDays) {
    shoppingStore.setExpiringDays(newDays)
  }
})

watch(() => shoppingStore.expiringDays, (newDays) => {
  if (fridgeStore.expiringDays !== newDays) {
    fridgeStore.setExpiringDays(newDays)
  }
})

defineExpose({ addToShoppingList })
</script>

<style scoped>
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
  width: 100%;
  background: linear-gradient(135deg, #00897b, #26a69a);
  color: white;
  font-weight: 500;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3);
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

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #00897b;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.shopping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.shopping-header h2 {
  margin: 0;
}

.shopping-header-actions {
  display: flex;
  gap: 8px;
}

.btn-batch-expiring {
  background: linear-gradient(135deg, #fff3e0, #ffe0b2);
  color: #e65100;
  border: 1px solid #ffcc80;
  font-weight: 500;
}

.btn-batch-expiring:hover {
  background: linear-gradient(135deg, #ffe0b2, #ffcc80);
  color: #bf360c;
}

.btn-settings {
  background: #eceff1;
  color: #546e7a;
}

.btn-settings:hover {
  background: #cfd8dc;
}

.shopping-budget-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #f1f8e9 0%, #e8f5e9 100%);
  border-radius: 10px;
  border: 1px solid #c5e1a5;
}

.budget-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.budget-label {
  font-size: 12px;
  color: #689f38;
}

.budget-value {
  font-size: 18px;
  font-weight: 700;
}

.budget-value.total {
  color: #2e7d32;
}

.budget-value.limit {
  color: #546e7a;
}

.budget-value.remaining {
  color: #1976d2;
}

.budget-value.over {
  color: #c62828;
}

.budget-value.danger {
  color: #c62828;
}

.budget-progress-bar {
  position: relative;
  height: 22px;
  background: #eceff1;
  border-radius: 11px;
  overflow: hidden;
  margin-bottom: 12px;
}

.budget-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #66bb6a, #43a047);
  border-radius: 11px;
  transition: width 0.3s ease;
}

.budget-progress-fill.warning {
  background: linear-gradient(90deg, #ffa726, #fb8c00);
}

.budget-progress-fill.danger {
  background: linear-gradient(90deg, #ef5350, #c62828);
}

.budget-progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  font-weight: 600;
  color: #37474f;
}

.budget-warning {
  padding: 10px 14px;
  background: #ffebee;
  border: 1px solid #ef9a9a;
  border-radius: 8px;
  color: #c62828;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
}

.shopping-list .shopping-add-form {
  margin-bottom: 12px;
}

.shopping-form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.shopping-form-row input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-form-row input[type="text"]:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-qty-input {
  width: 60px;
  padding: 8px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}

.shopping-qty-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-unit-select {
  width: 56px;
  padding: 8px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-unit-select:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-price-input {
  width: 80px;
  padding: 8px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-price-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-store-select {
  width: 80px;
  padding: 8px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.shopping-store-select:focus {
  outline: none;
  border-color: #00897b;
}

.btn-shopping-add {
  padding: 8px 14px;
  background: linear-gradient(135deg, #00897b, #26a69a);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-shopping-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 137, 123, 0.3);
}

.shopping-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-bottom: 2px solid #eceff1;
}

.shopping-tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  font-size: 14px;
  color: #78909c;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: all 0.2s;
}

.shopping-tab:hover {
  color: #00897b;
}

.shopping-tab.active {
  color: #00897b;
  border-bottom-color: #00897b;
  font-weight: 600;
}

.shopping-groups {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 480px;
  overflow-y: auto;
}

.shopping-store-group {
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.shopping-store-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border-bottom: 1px solid #90caf9;
}

.shopping-store-name {
  font-weight: 600;
  font-size: 14px;
  color: #1565c0;
}

.shopping-store-budget {
  font-size: 12px;
  color: #1976d2;
  font-weight: 500;
}

.shopping-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
}

.shopping-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #eceff1;
  transition: all 0.2s;
}

.shopping-item:hover {
  background: #eef5f4;
}

.shopping-item.purchased {
  background: #e8f5e9;
  border-color: #c8e6c9;
}

.shopping-item.purchased .shopping-item-name {
  text-decoration: line-through;
  color: #81c784;
}

.shopping-item.from-expiring {
  border-left: 3px solid #ff9800;
}

.shopping-item-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.shopping-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
  margin-top: 2px;
}

.shopping-item-main {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.shopping-item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.shopping-item-name {
  font-size: 14px;
  color: #263238;
  font-weight: 500;
}

.badge-from-expiring {
  font-size: 11px;
  padding: 1px 6px;
  background: #fff3e0;
  color: #e65100;
  border-radius: 8px;
  font-weight: 500;
}

.badge-from-mealplan {
  font-size: 11px;
  padding: 1px 6px;
  background: #f3e5f5;
  color: #7b1fa2;
  border-radius: 8px;
  font-weight: 500;
}

.shopping-item-edit-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.shopping-inline-input {
  padding: 4px 6px;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  width: 50px;
}

.shopping-inline-input.qty {
  width: 50px;
}

.shopping-inline-input.price {
  width: 60px;
}

.shopping-inline-input:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-inline-unit {
  font-size: 12px;
  color: #78909c;
}

.shopping-inline-sep {
  font-size: 12px;
  color: #90a4ae;
}

.shopping-inline-label {
  font-size: 12px;
  color: #78909c;
}

.shopping-inline-select {
  padding: 4px 4px;
  border: 1px solid #cfd8dc;
  border-radius: 4px;
  font-size: 12px;
  max-width: 80px;
}

.shopping-inline-select:focus {
  outline: none;
  border-color: #00897b;
}

.shopping-item-readonly-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.shopping-item-qty {
  font-size: 13px;
  color: #78909c;
}

.shopping-item-price {
  font-size: 12px;
  color: #00897b;
  background: #e0f2f1;
  padding: 2px 6px;
  border-radius: 4px;
}

.shopping-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
}

.shopping-item-subtotal {
  font-size: 14px;
  font-weight: 600;
  color: #00796b;
  white-space: nowrap;
}

.btn-clear-purchased {
  background: #eceff1;
  color: #78909c;
}

.btn-clear-purchased:hover {
  background: #cfd8dc;
  color: #455a64;
}

.shopping-footer {
  margin-top: 12px;
  text-align: right;
}

.expiring-dialog-overlay {
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

.expiring-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.expiring-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.expiring-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.expiring-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.expiring-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.expiring-dialog-body {
  padding: 20px;
}

.expiring-dialog-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 3px solid #ff9800;
}

.expiring-dialog-name {
  font-size: 16px;
  font-weight: 600;
  color: #e65100;
}

.expiring-dialog-badge {
  font-size: 12px;
  padding: 2px 10px;
  background: linear-gradient(135deg, #ff7043, #f44336);
  color: white;
  border-radius: 10px;
  font-weight: 600;
}

.expiring-dialog-summary {
  margin-top: 12px;
  padding: 10px 14px;
  background: #e8f5e9;
  border-radius: 8px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: #2e7d32;
}

.expiring-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.expiring-dialog-footer .btn-primary {
  width: auto;
  padding: 8px 20px;
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
  accent-color: #00897b;
  cursor: pointer;
}

.settings-desc {
  font-size: 12px;
  color: #90a4ae;
  margin: 8px 0 0;
  line-height: 1.5;
}

.settings-dialog-overlay {
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

.settings-dialog {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 520px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.settings-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border-bottom: 1px solid #80cbc4;
}

.settings-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #00695c;
}

.settings-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #00695c;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.settings-dialog-close:hover {
  background: rgba(0, 105, 92, 0.1);
}

.settings-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.settings-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.settings-section h4 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #37474f;
}

.settings-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.settings-dialog-footer .btn-primary {
  width: auto;
  padding: 8px 20px;
}

.store-manage-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.store-manage-row input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
}

.store-manage-row input:focus {
  outline: none;
  border-color: #00897b;
}

.store-manage-row .btn-primary {
  width: auto;
  padding: 8px 16px;
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.store-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border: 1px solid #eceff1;
}

.store-name {
  font-size: 14px;
  color: #37474f;
  font-weight: 500;
}

.btn-remove-store {
  font-size: 11px;
  padding: 4px 8px;
}

.notification-subsection {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #00897b;
}

.notification-subsection .form-group {
  margin-bottom: 14px;
}

.notification-subsection .form-group:last-child {
  margin-bottom: 0;
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

@media (max-width: 900px) {
  .shopping-form-row {
    flex-wrap: wrap;
  }

  .shopping-price-input,
  .shopping-store-select {
    width: calc(50% - 4px);
  }
}
</style>
