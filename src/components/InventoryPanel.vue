<template>
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
            <span :class="getExpiryClass(formItemForPreview)">
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
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useLeftoverStore } from '@/stores/leftover'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import { getAllSubCategories, getCategoryInfo } from '@/utils/categories'

const props = defineProps({
  editingItem: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:editingItem', 'consume-items'])

const leftoverStore = useLeftoverStore()
const orchestrator = useStockOrchestrator()

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

const formItemForPreview = computed(() => ({
  expiryDate: calculatedExpiryDate.value,
  zone: form.value.zone,
  categoryId: form.value.categoryId
}))

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

  if (expiring.length > 0) {
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

    const otherExpiring = expiring.filter(item => {
      const days = leftoverStore.daysUntilExpiry(item.expiryDate)
      return days > 1
    })
    if (otherExpiring.length > 0 && today.length === 0 && tomorrow.length === 0) {
      suggestions.push({
        priority: 'normal',
        title: '近期到期，请注意食用',
        description: `以下菜品将在 ${leftoverStore.expiringDays} 天内到期，请合理安排食用。`,
        items: otherExpiring
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

  if (props.editingItem) {
    leftoverStore.updateItem(props.editingItem.id, {
      name: form.value.name.trim(),
      quantity: form.value.quantity,
      unit: form.value.unit,
      openDate: form.value.openDate,
      storageDays: form.value.storageDays,
      zone: form.value.zone,
      notes: form.value.notes,
      ...categoryInfo
    })
    emit('update:editingItem', null)
  } else {
    orchestrator.stockInToLeftover({
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
}

function cancelEdit() {
  emit('update:editingItem', null)
  resetForm()
}

function consumeItems(items) {
  emit('consume-items', items)
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function getExpiryClass(item) {
  if (!item || !item.expiryDate) return 'normal'
  if (leftoverStore.isExpired(item.expiryDate)) return 'expired'
  if (leftoverStore.isExpiringSoonItem(item)) return 'warning'
  return 'normal'
}

watch(() => props.editingItem, (newItem) => {
  if (newItem) {
    form.value = {
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      openDate: newItem.openDate,
      storageDays: newItem.storageDays,
      zone: newItem.zone,
      categoryId: newItem.categoryId,
      categoryName: newItem.categoryName,
      parentCategoryId: newItem.parentCategoryId,
      parentCategoryName: newItem.parentCategoryName,
      notes: newItem.notes || ''
    }
  }
})

watch(() => form.value.name, (newName) => {
  if (!props.editingItem && newName && newName.trim()) {
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

.btn-secondary {
  background: #90a4ae;
  color: white;
}

.btn-secondary:hover {
  background: #78909c;
}

.btn-success {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
}

.btn-success:hover {
  background: linear-gradient(135deg, #388e3c, #2e7d32);
}

.btn-warning {
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
}

.btn-warning:hover {
  background: linear-gradient(135deg, #f57c00, #ef6c00);
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

@media (max-width: 900px) {
  .add-form .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
