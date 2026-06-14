<template>
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
            'expiring-soon': leftoverStore.isExpiringSoonItem(item) && !leftoverStore.isExpired(item.expiryDate),
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
              v-else-if="leftoverStore.isExpiringSoonItem(item)"
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
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useLeftoverStore } from '@/stores/leftover'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'

const emit = defineEmits(['edit-item', 'consume-items'])

const leftoverStore = useLeftoverStore()
const stockOrchestrator = useStockOrchestrator()

const activeZone = ref('全部')
const showExtendDialog = ref(false)
const extendDialogItem = ref(null)
const extendDays = ref(1)

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

const calculatedExtendExpiry = computed(() => {
  if (!extendDialogItem.value) return ''
  const date = new Date(extendDialogItem.value.openDate)
  date.setDate(date.getDate() + (extendDialogItem.value.storageDays + extendDays.value))
  return date.toISOString().split('T')[0]
})

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function consumeItem(item) {
  const amount = parseFloat(prompt(`食用多少 ${item.unit}？`, item.quantity.toString()))
  if (isNaN(amount) || amount <= 0) return
  stockOrchestrator.consumeFromLeftover(item.id, amount)
}

function consumeItems(items) {
  emit('consume-items', items)
}

function discardItem(item) {
  const reason = leftoverStore.isExpired(item.expiryDate) ? 'expired' : 'spoiled'
  const label = reason === 'expired' ? '过期丢弃' : '变质丢弃'
  if (confirm(`确定要${label}这个菜品吗？此操作将记录到浪费报表。`)) {
    stockOrchestrator.discardFromLeftover(item.id, reason)
  }
}

function deleteItem(item) {
  if (confirm('确定要删除这个菜品吗？')) {
    leftoverStore.removeItem(item.id)
  }
}

function editItem(item) {
  emit('edit-item', item)
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
</script>

<style scoped>
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

.btn-success {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #388e3c, #2e7d32);
}
</style>
