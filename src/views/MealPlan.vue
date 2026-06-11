<template>
  <div class="meal-plan">
    <header class="header">
      <h1>📅 周餐计划</h1>
      <p class="subtitle">规划一周饮食，联动购物清单与库存管理</p>
    </header>

    <div class="main-content">
      <div class="plan-section card">
        <div class="week-nav">
          <button class="nav-btn" @click="mealPlanStore.previousWeek()">
            ◀ 上周
          </button>
          <div class="week-title">
            <span class="week-range">{{ weekRangeText }}</span>
            <button class="today-btn" @click="mealPlanStore.goToCurrentWeek()">
              本周
            </button>
          </div>
          <button class="nav-btn" @click="mealPlanStore.nextWeek()">
            下周 ▶
          </button>
        </div>

        <div class="week-summary">
          <span class="summary-item">
            🍽 本周共 <strong>{{ mealPlanStore.weekTotalMeals }}</strong> 道菜
          </span>
          <span class="summary-item">
            🥬 需 <strong>{{ mealPlanStore.weekTotalIngredients.length }}</strong> 种食材
          </span>
        </div>

        <div class="meal-grid">
          <div class="grid-header">
            <div class="time-col">餐次</div>
            <div
              v-for="day in mealPlanStore.weekDays"
              :key="day.date"
              class="day-col"
              :class="{ today: day.isToday }"
            >
              <div class="day-name">{{ day.dayName }}</div>
              <div class="day-date">{{ formatShortDate(day.date) }}</div>
            </div>
          </div>

          <div
            v-for="mealTime in mealPlanStore.mealTimes"
            :key="mealTime"
            class="grid-row"
          >
            <div class="time-col meal-time-label">
              <span class="meal-icon">{{ getMealIcon(mealTime) }}</span>
              {{ mealTime }}
            </div>
            <div
              v-for="day in mealPlanStore.weekDays"
              :key="day.date + mealTime"
              class="day-col meal-cell"
              :class="{ today: day.isToday }"
              @click="openAddMeal(day.date, mealTime)"
            >
              <div
                v-for="meal in mealPlanStore.getMeals(day.date, mealTime)"
                :key="meal.id"
                class="meal-item"
                @click.stop="showMealDetail(meal)"
              >
                <span class="meal-name">{{ meal.recipeName }}</span>
                <button
                  class="remove-meal-btn"
                  @click.stop="removeMeal(day.date, mealTime, meal.id)"
                >
                  ✕
                </button>
              </div>
              <div class="add-meal-hint">
                <span class="plus-icon">+</span>
                添加菜谱
              </div>
            </div>
          </div>
        </div>

        <div class="plan-actions">
          <button class="btn btn-secondary" @click="autoGenerate">
            🎲 智能生成周计划
          </button>
          <button class="btn btn-danger-outline" @click="clearWeek">
            🗑 清空本周
          </button>
        </div>
      </div>

      <div class="side-section">
        <div class="card ingredients-summary">
          <h2>🥗 本周食材汇总</h2>
          <div v-if="mealPlanStore.weekTotalIngredients.length === 0" class="empty-tip">
            添加菜谱后显示所需食材
          </div>
          <div v-else class="ingredient-list">
            <div
              v-for="ing in mealPlanStore.weekTotalIngredients"
              :key="ing.name + ing.unit"
              class="ingredient-item"
              :class="{ 'in-fridge': hasInFridge(ing.name) }"
            >
              <span class="ing-name">{{ ing.name }}</span>
              <span class="ing-qty">{{ ing.quantity }} {{ ing.unit }}</span>
              <span v-if="hasInFridge(ing.name)" class="ing-status in-fridge">
                ✓ 已有
              </span>
              <span v-else class="ing-status need-buy">
                需购买
              </span>
            </div>
          </div>
          <button
            v-if="mealPlanStore.weekTotalIngredients.length > 0"
            class="btn btn-primary full-width"
            @click="generateShoppingList"
          >
            🛒 生成购物清单
          </button>
        </div>

        <div class="card">
          <h2>📦 库存扣减</h2>
          <p class="tip-text">
            完成本周计划后，可一键从冰箱库存中扣除已使用的食材。
          </p>
          <button
            v-if="mealPlanStore.weekTotalIngredients.length > 0"
            class="btn btn-warning full-width"
            @click="deductFromFridge"
          >
            ➖ 从库存扣减
          </button>
          <div v-else class="empty-tip">
            暂无计划，无法扣减
          </div>
        </div>

        <div class="card recipe-suggestions">
          <h2>💡 推荐菜谱</h2>
          <div v-if="suggestions.length === 0" class="empty-tip">
            添加食材后为您推荐菜谱
          </div>
          <div v-else class="recipe-list">
            <div
              v-for="recipe in suggestions"
              :key="recipe.name"
              class="recipe-item"
              @click="showRecipeAddModal(recipe)"
            >
              <div class="recipe-header">
                <span class="recipe-name">{{ recipe.name }}</span>
                <span class="recipe-match" v-if="recipe.matchCount">
                  可用: {{ recipe.matchCount }}/{{ recipe.ingredients.length }}
                </span>
              </div>
              <p class="recipe-desc">{{ recipe.description }}</p>
              <div class="recipe-ingredients">
                <span
                  v-for="ing in recipe.ingredients"
                  :key="ing.name"
                  class="ingredient-tag"
                  :class="{ available: hasIngredient(ing.name) }"
                >
                  {{ ing.name }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click="closeAddMeal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加菜谱 - {{ currentAddDate }} {{ currentAddMealTime }}</h3>
          <button class="close-btn" @click="closeAddMeal">✕</button>
        </div>
        <div class="modal-body">
          <div class="recipe-select-list">
            <div
              v-for="recipe in allRecipes"
              :key="recipe.name"
              class="recipe-select-item"
              @click="addRecipeToPlan(recipe)"
            >
              <div class="recipe-select-info">
                <span class="recipe-select-name">{{ recipe.name }}</span>
                <span class="recipe-select-desc">{{ recipe.description }}</span>
              </div>
              <div class="recipe-select-ingredients">
                <span
                  v-for="ing in recipe.ingredients"
                  :key="ing.name"
                  class="ingredient-tag small"
                  :class="{ available: hasIngredient(ing.name) }"
                >
                  {{ ing.name }} {{ ing.quantity }}{{ ing.unit }}
                </span>
              </div>
              <button class="btn btn-small btn-primary">+ 添加</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="modal-overlay" @click="closeDetail">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ currentDetailMeal?.recipeName }}</h3>
          <button class="close-btn" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <p class="recipe-desc">{{ currentDetailMeal?.description }}</p>
          <h4>所需食材</h4>
          <div class="recipe-ingredients">
            <span
              v-for="ing in currentDetailMeal?.ingredients"
              :key="ing.name"
              class="ingredient-tag"
            >
              {{ ing.name }} {{ ing.quantity }}{{ ing.unit }}
            </span>
          </div>
          <h4>做法步骤</h4>
          <ol class="steps-list">
            <li v-for="(step, i) in currentDetailMeal?.steps" :key="i">
              {{ step }}
            </li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useMealPlanStore } from '@/stores/mealPlan'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { getAllRecipes, getRecipeSuggestions } from '@/utils/recipes'

const mealPlanStore = useMealPlanStore()
const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()

const showAddModal = ref(false)
const showDetailModal = ref(false)
const currentAddDate = ref('')
const currentAddMealTime = ref('')
const currentDetailMeal = ref(null)

const allRecipes = getAllRecipes()

const suggestions = computed(() => {
  return getRecipeSuggestions(fridgeStore.items, 4)
})

const weekRangeText = computed(() => {
  const dates = mealPlanStore.weekDates
  if (dates.length === 0) return ''
  const start = dates[0]
  const end = dates[dates.length - 1]
  return `${formatShortDate(start)} - ${formatShortDate(end)}`
})

function formatShortDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getMealIcon(mealTime) {
  switch (mealTime) {
    case '早餐': return '🌅'
    case '午餐': return '☀️'
    case '晚餐': return '🌙'
    default: return '🍽'
  }
}

function hasIngredient(ingredientName) {
  return fridgeStore.items.some(item =>
    item.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
    ingredientName.toLowerCase().includes(item.name.toLowerCase())
  )
}

function hasInFridge(ingredientName) {
  return hasIngredient(ingredientName)
}

function openAddMeal(date, mealTime) {
  currentAddDate.value = date
  currentAddMealTime.value = mealTime
  showAddModal.value = true
}

function closeAddMeal() {
  showAddModal.value = false
}

function addRecipeToPlan(recipe) {
  mealPlanStore.addMeal(currentAddDate.value, currentAddMealTime.value, recipe)
  showAddModal.value = false
}

function removeMeal(date, mealTime, mealId) {
  if (confirm('确定要移除这道菜吗？')) {
    mealPlanStore.removeMeal(date, mealTime, mealId)
  }
}

function showMealDetail(meal) {
  currentDetailMeal.value = meal
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  currentDetailMeal.value = null
}

function showRecipeAddModal(recipe) {
  currentAddDate.value = mealPlanStore.weekDays.find(d => d.isToday)?.date || mealPlanStore.weekDates[0]
  currentAddMealTime.value = '晚餐'
  mealPlanStore.addMeal(currentAddDate.value, currentAddMealTime.value, recipe)
}

function autoGenerate() {
  if (mealPlanStore.weekTotalMeals > 0 && !confirm('当前已有计划，是否覆盖？')) {
    return
  }
  mealPlanStore.autoGenerateWeekPlan(fridgeStore.items)
}

function clearWeek() {
  if (confirm('确定要清空本周所有计划吗？')) {
    mealPlanStore.clearWeek()
  }
}

function generateShoppingList() {
  const ingredients = mealPlanStore.weekTotalIngredients
  let addedCount = 0
  
  ingredients.forEach(ing => {
    if (!hasInFridge(ing.name)) {
      shoppingStore.addItem({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        fromMealPlan: true
      })
      addedCount++
    }
  })
  
  if (addedCount > 0) {
    alert(`已添加 ${addedCount} 项食材到购物清单！`)
  } else {
    alert('所有食材都已有库存，无需采购！')
  }
}

function deductFromFridge() {
  if (!confirm('确定要从冰箱库存中扣减本周计划所需的食材吗？')) {
    return
  }
  
  const ingredients = mealPlanStore.weekTotalIngredients
  let deductedCount = 0
  let notFoundItems = []
  
  ingredients.forEach(ing => {
    const fridgeItem = fridgeStore.items.find(item =>
      item.name.toLowerCase().includes(ing.name.toLowerCase()) ||
      ing.name.toLowerCase().includes(item.name.toLowerCase())
    )
    
    if (fridgeItem) {
      const newQty = Math.max(0, fridgeItem.quantity - ing.quantity)
      if (newQty === 0) {
        fridgeStore.removeItem(fridgeItem.id)
      } else {
        fridgeStore.updateItem(fridgeItem.id, { quantity: newQty })
      }
      deductedCount++
    } else {
      notFoundItems.push(ing.name)
    }
  })
  
  let message = `已扣减 ${deductedCount} 种食材。`
  if (notFoundItems.length > 0) {
    message += `\n以下食材未找到：${notFoundItems.join('、')}`
  }
  alert(message)
}
</script>

<style scoped>
.meal-plan {
  min-height: 100vh;
  background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%);
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.header h1 {
  margin: 0;
  font-size: 32px;
  color: #7b1fa2;
}

.subtitle {
  margin: 8px 0 0;
  color: #7e57c2;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  max-width: 1400px;
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
  color: #4a148c;
}

.plan-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.week-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.nav-btn {
  padding: 8px 16px;
  border: 1px solid #e1bee7;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  color: #7b1fa2;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f3e5f5;
  border-color: #ce93d8;
}

.week-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.week-range {
  font-size: 18px;
  font-weight: 600;
  color: #4a148c;
}

.today-btn {
  padding: 4px 12px;
  font-size: 12px;
  background: #f3e5f5;
  border: 1px solid #ce93d8;
  border-radius: 12px;
  color: #7b1fa2;
  cursor: pointer;
}

.today-btn:hover {
  background: #e1bee7;
}

.week-summary {
  display: flex;
  gap: 20px;
  padding: 12px 16px;
  background: #f3e5f5;
  border-radius: 8px;
}

.summary-item {
  font-size: 14px;
  color: #6a1b9a;
}

.summary-item strong {
  color: #4a148c;
  font-size: 16px;
}

.meal-grid {
  border: 1px solid #e1bee7;
  border-radius: 8px;
  overflow: hidden;
}

.grid-header {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  background: #f3e5f5;
}

.grid-row {
  display: grid;
  grid-template-columns: 80px repeat(7, 1fr);
  border-top: 1px solid #e1bee7;
}

.time-col {
  padding: 12px 8px;
  text-align: center;
  font-weight: 500;
  color: #6a1b9a;
}

.meal-time-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
  background: #fafafa;
}

.meal-icon {
  font-size: 20px;
}

.day-col {
  padding: 8px;
  border-left: 1px solid #e1bee7;
  text-align: center;
}

.day-col.today {
  background: #fce4ec;
}

.grid-header .day-col {
  padding: 10px 8px;
}

.day-name {
  font-size: 13px;
  font-weight: 600;
  color: #6a1b9a;
}

.day-date {
  font-size: 12px;
  color: #9575cd;
}

.meal-cell {
  min-height: 80px;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.meal-cell:hover {
  background: #f8bbd020;
}

.meal-item {
  position: relative;
  padding: 6px 8px;
  background: #f3e5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #4a148c;
  text-align: left;
  transition: all 0.2s;
}

.meal-item:hover {
  background: #e1bee7;
}

.meal-name {
  display: block;
  font-weight: 500;
}

.remove-meal-btn {
  position: absolute;
  top: 2px;
  right: 4px;
  background: none;
  border: none;
  color: #ab47bc;
  cursor: pointer;
  font-size: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.meal-item:hover .remove-meal-btn {
  opacity: 1;
}

.add-meal-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ce93d8;
  font-size: 11px;
  margin-top: auto;
  padding: 4px;
}

.plus-icon {
  font-size: 18px;
  color: #ba68c8;
}

.plan-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #8e24aa, #ab47bc);
  color: white;
  font-weight: 500;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(142, 36, 170, 0.3);
}

.btn-secondary {
  background: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #ce93d8;
}

.btn-secondary:hover {
  background: #e1bee7;
}

.btn-danger-outline {
  background: white;
  color: #c62828;
  border: 1px solid #ef9a9a;
}

.btn-danger-outline:hover {
  background: #ffebee;
}

.btn-warning {
  background: linear-gradient(135deg, #ff9800, #ffa726);
  color: white;
  font-weight: 500;
}

.btn-warning:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.full-width {
  width: 100%;
}

.side-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ingredients-summary {
  max-height: 400px;
  overflow-y: auto;
}

.ingredient-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.ingredient-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
}

.ingredient-item.in-fridge {
  background: #e8f5e9;
}

.ing-name {
  flex: 1;
  color: #424242;
}

.ing-qty {
  color: #757575;
  font-size: 12px;
}

.ing-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.ing-status.in-fridge {
  background: #c8e6c9;
  color: #2e7d32;
}

.ing-status.need-buy {
  background: #ffccbc;
  color: #d84315;
}

.tip-text {
  font-size: 13px;
  color: #78909c;
  margin: 0 0 12px;
  line-height: 1.5;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 20px;
  font-size: 13px;
}

.recipe-suggestions .recipe-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.recipe-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  border-left: 4px solid #ab47bc;
  cursor: pointer;
  transition: all 0.2s;
}

.recipe-item:hover {
  background: #f3e5f5;
}

.recipe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.recipe-name {
  font-weight: 600;
  color: #6a1b9a;
  font-size: 15px;
}

.recipe-match {
  font-size: 11px;
  color: #8e24aa;
  background: #f3e5f5;
  padding: 2px 8px;
  border-radius: 10px;
}

.recipe-desc {
  margin: 0 0 8px;
  font-size: 12px;
  color: #78909c;
}

.recipe-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.ingredient-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: #e0e0e0;
  color: #757575;
  border-radius: 10px;
}

.ingredient-tag.small {
  font-size: 10px;
  padding: 1px 6px;
}

.ingredient-tag.available {
  background: #c8e6c9;
  color: #2e7d32;
}

.modal-overlay {
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

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #4a148c;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

.recipe-select-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recipe-select-item {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 6px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.recipe-select-item:hover {
  background: #f3e5f5;
  border-color: #ce93d8;
}

.recipe-select-info {
  grid-column: 1;
}

.recipe-select-name {
  display: block;
  font-weight: 600;
  color: #4a148c;
  font-size: 15px;
}

.recipe-select-desc {
  font-size: 12px;
  color: #78909c;
}

.recipe-select-ingredients {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.recipe-select-item .btn-small {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
}

.steps-list {
  font-size: 13px;
  color: #546e7a;
  padding-left: 20px;
  line-height: 1.6;
}

.steps-list li {
  margin-bottom: 4px;
}

.modal-body h4 {
  margin: 16px 0 8px;
  color: #4a148c;
  font-size: 14px;
}

@media (max-width: 1100px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .meal-grid {
    overflow-x: auto;
  }
  
  .grid-header,
  .grid-row {
    min-width: 700px;
  }
}
</style>
