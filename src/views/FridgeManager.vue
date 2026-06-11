<template>
  <div class="fridge-manager">
    <header class="header">
      <h1>🧊 家庭冰箱管理</h1>
      <p class="subtitle">记录食材，合理规划，减少浪费</p>
    </header>

    <div class="main-content">
      <section class="left-section">
        <div class="add-form card">
          <h2>📝 添加食材</h2>
          <form @submit.prevent="handleAdd">
            <div class="form-group">
              <label>食材名称</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="如：西红柿、鸡蛋"
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
                <label>保质期</label>
                <input
                  v-model="form.expiryDate"
                  type="date"
                  required
                />
              </div>
              <div class="form-group">
                <label>分区位置</label>
                <select v-model="form.zone">
                  <option v-for="zone in fridgeStore.zones" :key="zone" :value="zone">
                    {{ zone }}
                  </option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">
              ➕ 添加食材
            </button>
          </form>
        </div>

        <div class="recipe-suggestions card">
          <h2>🍳 今日菜谱建议</h2>
          <div v-if="suggestions.length === 0" class="empty-tip">
            添加食材后为您推荐菜谱
          </div>
          <div v-else class="recipe-list">
            <div
              v-for="(recipe, index) in suggestions"
              :key="index"
              class="recipe-item"
            >
              <div class="recipe-header">
                <span class="recipe-name">{{ recipe.name }}</span>
                <span class="recipe-match" v-if="recipe.matchCount">
                  可用食材: {{ recipe.matchCount }}/{{ recipe.ingredients.length }}
                </span>
              </div>
              <p class="recipe-desc">{{ recipe.description }}</p>
              <div class="recipe-ingredients">
                <span
                  v-for="ing in recipe.ingredients"
                  :key="ing"
                  class="ingredient-tag"
                  :class="{ available: hasIngredient(ing) }"
                >
                  {{ ing }}
                </span>
              </div>
              <div class="recipe-steps">
                <p class="steps-title">做法：</p>
                <ol>
                  <li v-for="(step, i) in recipe.steps" :key="i">{{ step }}</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div class="shopping-list card">
          <h2>🛒 购物清单</h2>
          <div class="shopping-add-form">
            <div class="shopping-form-row">
              <input
                v-model="shoppingForm.name"
                type="text"
                placeholder="添加采购项"
                @keyup.enter="handleShoppingAdd"
              />
              <input
                v-model.number="shoppingForm.quantity"
                type="number"
                min="1"
                step="0.1"
                class="shopping-qty-input"
              />
              <select v-model="shoppingForm.unit" class="shopping-unit-select">
                <option value="个">个</option>
                <option value="斤">斤</option>
                <option value="克">克</option>
                <option value="袋">袋</option>
                <option value="盒">盒</option>
                <option value="瓶">瓶</option>
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
          <div v-if="displayShoppingItems.length === 0" class="empty-tip">
            {{ shoppingTab === 'pending' ? '购物清单为空' : '暂无已购项' }}
          </div>
          <div v-else class="shopping-items">
            <div
              v-for="item in displayShoppingItems"
              :key="item.id"
              class="shopping-item"
              :class="{ purchased: item.purchased, 'from-expiring': item.fromExpiring }"
            >
              <div class="shopping-item-left">
                <input
                  type="checkbox"
                  :checked="item.purchased"
                  class="shopping-checkbox"
                  @change="item.purchased ? undoPurchased(item) : handlePurchased(item)"
                />
                <span class="shopping-item-name">{{ item.name }}</span>
                <span v-if="item.fromExpiring" class="badge-from-expiring">临期</span>
              </div>
              <div class="shopping-item-right">
                <span class="shopping-item-qty">{{ item.quantity }} {{ item.unit }}</span>
                <button class="btn btn-small btn-danger" @click="shoppingStore.removeItem(item.id)">✕</button>
              </div>
            </div>
          </div>
          <div v-if="shoppingStore.purchasedItems.length > 0" class="shopping-footer">
            <button class="btn btn-small btn-clear-purchased" @click="clearPurchasedItems">
              🗑 清除已购
            </button>
          </div>
        </div>
      </section>

      <section class="right-section">
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-num">{{ fridgeStore.items.length }}</span>
            <span class="stat-label">总食材</span>
          </div>
          <div class="stat-item warning">
            <span class="stat-num">{{ fridgeStore.expiringSoonItems.length }}</span>
            <span class="stat-label">即将过期</span>
          </div>
          <div class="stat-item danger">
            <span class="stat-num">{{ fridgeStore.expiredItems.length }}</span>
            <span class="stat-label">已过期</span>
          </div>
          <div class="stat-item shopping">
            <span class="stat-num">{{ shoppingStore.pendingCount }}</span>
            <span class="stat-label">待采购</span>
          </div>
        </div>

        <div class="filter-bar">
          <button
            v-for="zone in ['全部', ...fridgeStore.zones]"
            :key="zone"
            class="filter-btn"
            :class="{ active: activeZone === zone }"
            @click="activeZone = zone"
          >
            {{ zone }}
          </button>
        </div>

        <div class="items-list card">
          <h2>📋 食材清单</h2>
          <div v-if="filteredItems.length === 0" class="empty-tip">
            暂无食材，快去添加吧～
          </div>
          <div v-else class="item-cards">
            <div
              v-for="item in filteredItems"
              :key="item.id"
              class="item-card"
              :class="{
                'expiring-soon': fridgeStore.isExpiringSoon(item.expiryDate) && !fridgeStore.isExpired(item.expiryDate),
                'expired': fridgeStore.isExpired(item.expiryDate)
              }"
            >
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-zone">{{ item.zone }}</span>
              </div>
              <div class="item-info">
                <span class="item-quantity">
                  {{ item.quantity }} {{ item.unit }}
                </span>
                <span class="item-expiry">
                  <span v-if="fridgeStore.isExpired(item.expiryDate)" class="badge expired">
                    已过期
                  </span>
                  <span v-else-if="fridgeStore.isExpiringSoon(item.expiryDate)" class="badge warning">
                    还剩 {{ fridgeStore.daysUntilExpiry(item.expiryDate) }} 天
                  </span>
                  <span v-else class="badge normal">
                    保质期: {{ formatDate(item.expiryDate) }}
                  </span>
                </span>
              </div>
              <div class="item-actions">
                <button
                  v-if="fridgeStore.isExpiringSoon(item.expiryDate) && !fridgeStore.isExpired(item.expiryDate)"
                  class="btn btn-small btn-shopping"
                  @click="addToShoppingList(item)"
                >
                  🛒 补货
                </button>
                <button class="btn btn-small" @click="useItem(item)">
                  消耗
                </button>
                <button class="btn btn-small btn-danger" @click="deleteItem(item.id)">
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { getRecipeSuggestions } from '@/utils/recipes'

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()

const activeZone = ref('全部')
const shoppingTab = ref('pending')
const shoppingForm = ref({ name: '', quantity: 1, unit: '个' })

const form = ref({
  name: '',
  quantity: 1,
  unit: '个',
  expiryDate: getDefaultDate(),
  zone: '冷藏'
})

const suggestions = computed(() => {
  return getRecipeSuggestions(fridgeStore.items, 2)
})

const filteredItems = computed(() => {
  if (activeZone.value === '全部') {
    return fridgeStore.sortedItems
  }
  return fridgeStore.sortedItems.filter(item => item.zone === activeZone.value)
})

const displayShoppingItems = computed(() => {
  return shoppingTab.value === 'pending'
    ? shoppingStore.pendingItems
    : shoppingStore.purchasedItems
})

function getDefaultDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function handleAdd() {
  if (!form.value.name.trim()) return
  fridgeStore.addItem({
    name: form.value.name.trim(),
    quantity: form.value.quantity,
    unit: form.value.unit,
    expiryDate: form.value.expiryDate,
    zone: form.value.zone
  })
  form.value.name = ''
  form.value.quantity = 1
}

function deleteItem(id) {
  if (confirm('确定要删除这个食材吗？')) {
    fridgeStore.removeItem(id)
  }
}

function useItem(item) {
  const amount = parseFloat(prompt(`消耗多少 ${item.unit}？`, '1'))
  if (isNaN(amount) || amount <= 0) return
  const newQuantity = Math.max(0, item.quantity - amount)
  if (newQuantity === 0) {
    if (confirm('用量已归零，是否删除？')) {
      fridgeStore.removeItem(item.id)
    } else {
      fridgeStore.updateItem(item.id, { quantity: newQuantity })
    }
  } else {
    fridgeStore.updateItem(item.id, { quantity: newQuantity })
  }
}

function hasIngredient(ingredientName) {
  return fridgeStore.items.some(item =>
    item.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
    ingredientName.toLowerCase().includes(item.name.toLowerCase())
  )
}

function addToShoppingList(item) {
  shoppingStore.addFromExpiring(item)
}

function handleShoppingAdd() {
  if (!shoppingForm.value.name.trim()) return
  shoppingStore.addItem({
    name: shoppingForm.value.name.trim(),
    quantity: shoppingForm.value.quantity,
    unit: shoppingForm.value.unit
  })
  shoppingForm.value.name = ''
  shoppingForm.value.quantity = 1
}

function handlePurchased(item) {
  shoppingStore.togglePurchased(item.id)
  if (!item.purchased) {
    fridgeStore.addItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: getDefaultDate(),
      zone: '冷藏'
    })
  }
}

function undoPurchased(item) {
  shoppingStore.togglePurchased(item.id)
  const match = fridgeStore.items.find(
    f => f.name === item.name && fridgeStore.daysUntilExpiry(f.expiryDate) >= 0
  )
  if (match) {
    fridgeStore.removeItem(match.id)
  }
}

function clearPurchasedItems() {
  if (confirm('确定清除所有已购项吗？')) {
    shoppingStore.clearPurchased()
  }
}
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
  gap: 20px;
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
.add-form select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.add-form input:focus,
.add-form select:focus {
  outline: none;
  border-color: #00897b;
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

.recipe-suggestions .recipe-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.recipe-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.recipe-name {
  font-weight: 600;
  color: #e65100;
  font-size: 16px;
}

.recipe-match {
  font-size: 12px;
  color: #f57c00;
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 10px;
}

.recipe-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: #607d8b;
}

.recipe-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.ingredient-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #e0e0e0;
  color: #757575;
  border-radius: 10px;
}

.ingredient-tag.available {
  background: #c8e6c9;
  color: #2e7d32;
}

.recipe-steps {
  font-size: 13px;
  color: #546e7a;
}

.steps-title {
  margin: 0 0 4px;
  font-weight: 500;
}

.recipe-steps ol {
  margin: 0;
  padding-left: 20px;
}

.recipe-steps li {
  margin-bottom: 2px;
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  background: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-item.warning {
  border-top: 3px solid #f44336;
}

.stat-item.warning .stat-num {
  color: #d32f2f;
}

.stat-item.warning .stat-label {
  color: #e53935;
}

.stat-item.danger {
  border-top: 3px solid #f44336;
}

.stat-item.shopping {
  border-top: 3px solid #00897b;
}

.stat-item.shopping .stat-num {
  color: #00897b;
}

.stat-item.shopping .stat-label {
  color: #00796b;
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
  border-color: #00897b;
  color: #00897b;
}

.filter-btn.active {
  background: #00897b;
  color: white;
  border-color: #00897b;
}

.items-list .item-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
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
  background: #ffebee;
  border-color: #ef5350;
  border-width: 2px;
  box-shadow: 0 0 0 1px rgba(244, 67, 54, 0.15);
}

.item-card.expired {
  background: #ffebee;
  border-color: #ef9a9a;
  opacity: 0.8;
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
  background: #e0f2f1;
  color: #00695c;
  border-radius: 10px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
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
}

.badge.normal {
  background: #e8f5e9;
  color: #2e7d32;
}

.badge.warning {
  background: #fdecea;
  color: #c62828;
  font-weight: 600;
  border: 1px solid #ef9a9a;
}

.badge.expired {
  background: #ffebee;
  color: #c62828;
  font-weight: 500;
}

.item-actions {
  display: flex;
  gap: 8px;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.btn-shopping {
  background: #e0f2f1;
  color: #00695c;
}

.btn-shopping:hover {
  background: #b2dfdb;
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

.shopping-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.shopping-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f5f7fa;
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
  align-items: center;
  gap: 8px;
}

.shopping-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
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

.shopping-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shopping-item-qty {
  font-size: 13px;
  color: #78909c;
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

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
