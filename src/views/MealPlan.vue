<template>
  <div class="meal-plan">
    <header class="header">
      <h1>📅 周膳食日历</h1>
      <p class="subtitle">规划一周饮食，智能推荐菜谱，做完自动扣减库存</p>
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
          <span class="summary-item cooked">
            ✅ 已完成 <strong>{{ mealPlanStore.weekCookedMeals }}</strong> 道
          </span>
          <span class="summary-item">
            🥬 待采购 <strong>{{ mealPlanStore.weekTotalIngredients.length }}</strong> 种
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
                :class="{ 
                  cooked: meal.cooked, 
                  deducted: meal.ingredientsDeducted 
                }"
                @click.stop="showMealDetail(meal, day.date, mealTime)"
              >
                <div class="meal-item-header">
                  <span class="meal-status-icon">
                    {{ meal.ingredientsDeducted ? '✅' : (meal.cooked ? '👨‍🍳' : '') }}
                  </span>
                  <span class="meal-name">{{ meal.recipeName }}</span>
                </div>
                <div class="meal-item-actions">
                  <button
                    v-if="!meal.ingredientsDeducted"
                    class="action-btn cook-btn"
                    :title="meal.cooked ? '已标记已做' : '标记已做并扣减库存'"
                    @click.stop="confirmCook(day.date, mealTime, meal)"
                  >
                    🍳 完成
                  </button>
                  <button
                    v-else
                    class="action-btn cooked-btn"
                    disabled
                  >
                    ✓ 已扣减
                  </button>
                  <button
                    class="remove-meal-btn"
                    @click.stop="removeMeal(day.date, mealTime, meal.id)"
                  >
                    ✕
                  </button>
                </div>
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
          <h2>🥗 待采购食材</h2>
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
          <h2>📋 扣减说明</h2>
          <p class="tip-text">
            点击菜品上的"🍳 完成"按钮后：
          </p>
          <ul class="tip-list">
            <li>自动从冰箱扣减该菜谱所需食材</li>
            <li>库存不足时会有提示，剩余量清零</li>
            <li>未找到的食材将在结果中提示</li>
          </ul>
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
              :class="{ 'has-expiring': recipe.expiringMatchCount > 0 }"
              @click="showRecipeAddModal(recipe)"
            >
              <div class="recipe-header">
                <div class="recipe-title-row">
                  <span class="recipe-name">{{ recipe.name }}</span>
                  <span v-if="recipe.expiringMatchCount > 0" class="badge-expiring-priority">
                    ⚡ 优先
                  </span>
                  <span class="recipe-category">{{ recipe.category }}</span>
                </div>
                <div class="recipe-meta">
                  <span class="recipe-match" v-if="recipe.matchCount">
                    可用: {{ recipe.matchCount }}/{{ recipe.ingredients.length }}
                  </span>
                  <span v-if="recipe.expiringMatchCount > 0" class="recipe-expiring-match">
                    消耗临期: {{ recipe.expiringMatchCount }}
                  </span>
                </div>
              </div>
              <p class="recipe-desc">{{ recipe.description }}</p>
              <div v-if="recipe.expiringMatchCount > 0" class="expiring-tip">
                💡 可消耗临期食材：
                <span v-for="(exp, i) in recipe.matchedExpiringIngredients" :key="exp.name">
                  {{ exp.name }}(剩{{ exp.daysLeft }}天){{ i < recipe.matchedExpiringIngredients.length - 1 ? '、' : '' }}
                </span>
              </div>
              <div class="recipe-ingredients">
                <span
                  v-for="ing in recipe.ingredients"
                  :key="ing.name"
                  class="ingredient-tag"
                  :class="{
                    available: hasIngredient(ing.name),
                    expiring: isExpiringIngredient(ing.name, recipe)
                  }"
                >
                  {{ ing.name }}
                  <span v-if="isExpiringIngredient(ing.name, recipe)" class="expiring-dot">⚠</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click="closeAddMeal">
      <div class="modal-content large" @click.stop>
        <div class="modal-header">
          <h3>添加菜谱 - {{ currentAddDate }} {{ currentAddMealTime }}</h3>
          <button class="close-btn" @click="closeAddMeal">✕</button>
        </div>
        <div class="modal-body">
          <div class="filter-tabs">
            <button
              v-for="cat in recipeCategories"
              :key="cat"
              class="filter-tab"
              :class="{ active: currentCategory === cat }"
              @click="currentCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div class="recipe-select-list">
            <div
              v-for="recipe in filteredRecipes"
              :key="recipe.name"
              class="recipe-select-item"
              @click="addRecipeToPlan(recipe)"
            >
              <div class="recipe-select-info">
                <span class="recipe-select-name">{{ recipe.name }}</span>
                <span class="recipe-select-category">{{ recipe.category }}</span>
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
          <h3>
            <span v-if="currentDetailMeal?.ingredientsDeducted">✅ </span>
            <span v-else-if="currentDetailMeal?.cooked">👨‍🍳 </span>
            {{ currentDetailMeal?.recipeName }}
          </h3>
          <button class="close-btn" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-status-bar" v-if="currentDetailMeal?.ingredientsDeducted">
            <span class="status-tag success">已完成 · 库存已扣减</span>
            <span class="status-time">{{ formatCookedTime(currentDetailMeal?.cookedAt) }}</span>
          </div>
          <div class="detail-status-bar" v-else-if="currentDetailMeal?.cooked">
            <span class="status-tag warning">已标记完成</span>
            <span class="status-time">{{ formatCookedTime(currentDetailMeal?.cookedAt) }}</span>
          </div>

          <p class="recipe-desc">{{ currentDetailMeal?.description }}</p>
          
          <h4>所需食材</h4>
          <div class="recipe-ingredients">
            <span
              v-for="ing in currentDetailMeal?.ingredients"
              :key="ing.name"
              class="ingredient-tag"
              :class="{ available: hasIngredient(ing.name) }"
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

          <div class="detail-actions" v-if="currentDetailMeal && !currentDetailMeal.ingredientsDeducted">
            <button class="btn btn-primary full-width" @click="confirmCookFromDetail">
              🍳 确认做完并扣减库存
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showResultModal" class="modal-overlay" @click="closeResultModal">
      <div class="modal-content result-modal" @click.stop>
        <div class="modal-header">
          <h3>🍳 扣减结果</h3>
          <button class="close-btn" @click="closeResultModal">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="lastDeductResult" class="result-content">
            <div class="result-summary">
              <span class="recipe-name">{{ lastDeductResult.meal?.recipeName }}</span>
            </div>
            
            <div v-if="lastDeductResult.deducted.length > 0" class="result-section">
              <h4 class="result-title success">✅ 已成功扣减 ({{ lastDeductResult.deducted.length }})</h4>
              <div class="result-list">
                <div v-for="item in lastDeductResult.deducted" :key="item.name" class="result-item success">
                  <span class="result-name">{{ item.name }}</span>
                  <span class="result-qty">
                    -{{ item.quantity }}{{ item.unit }}，剩余 {{ item.remaining }}{{ item.unit }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="lastDeductResult.insufficient.length > 0" class="result-section">
              <h4 class="result-title warning">⚠️ 库存不足 ({{ lastDeductResult.insufficient.length }})</h4>
              <div class="result-list">
                <div v-for="item in lastDeductResult.insufficient" :key="item.name" class="result-item warning">
                  <span class="result-name">{{ item.name }}</span>
                  <span class="result-qty">
                    需{{ item.needed }}{{ item.unit }}，只有{{ item.available }}{{ item.unit }}（已清零）
                  </span>
                </div>
              </div>
            </div>

            <div v-if="lastDeductResult.notFound.length > 0" class="result-section">
              <h4 class="result-title danger">❌ 冰箱中未找到 ({{ lastDeductResult.notFound.length }})</h4>
              <div class="result-list">
                <div v-for="item in lastDeductResult.notFound" :key="item.name" class="result-item danger">
                  <span class="result-name">{{ item.name }}</span>
                  <span class="result-qty">需 {{ item.quantity }}{{ item.unit }}</span>
                </div>
              </div>
            </div>
          </div>
          <button class="btn btn-primary full-width" @click="closeResultModal">
            知道了
          </button>
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
const showResultModal = ref(false)
const currentAddDate = ref('')
const currentAddMealTime = ref('')
const currentDetailMeal = ref(null)
const currentDetailDate = ref('')
const currentDetailMealTime = ref('')
const lastDeductResult = ref(null)
const currentCategory = ref('全部')

const allRecipes = getAllRecipes()

const recipeCategories = computed(() => {
  const cats = ['全部']
  allRecipes.forEach(r => {
    if (r.category && !cats.includes(r.category)) {
      cats.push(r.category)
    }
  })
  return cats
})

const filteredRecipes = computed(() => {
  if (currentCategory.value === '全部') {
    return allRecipes
  }
  const filtered = allRecipes.filter(r => r.category === currentCategory.value)
  if (currentAddMealTime.value) {
    const mealTimeRecipes = allRecipes.filter(r => 
      r.tags?.includes(currentAddMealTime.value) && r.category === currentCategory.value
    )
    if (mealTimeRecipes.length > 0) return mealTimeRecipes
  }
  return filtered
})

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

function formatCookedTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
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

function isExpiringIngredient(ingredientName, recipe) {
  if (!recipe.matchedExpiringIngredients) return false
  return recipe.matchedExpiringIngredients.some(
    exp => exp.name === ingredientName ||
           exp.name.toLowerCase().includes(ingredientName.toLowerCase()) ||
           ingredientName.toLowerCase().includes(exp.name.toLowerCase())
  )
}

function hasInFridge(ingredientName) {
  return hasIngredient(ingredientName)
}

function openAddMeal(date, mealTime) {
  currentAddDate.value = date
  currentAddMealTime.value = mealTime
  currentCategory.value = mealTime === '早餐' ? '早餐' : '全部'
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

function showMealDetail(meal, date, mealTime) {
  currentDetailMeal.value = meal
  currentDetailDate.value = date
  currentDetailMealTime.value = mealTime
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  currentDetailMeal.value = null
}

function showRecipeAddModal(recipe) {
  currentAddDate.value = mealPlanStore.weekDays.find(d => d.isToday)?.date || mealPlanStore.weekDates[0]
  currentAddMealTime.value = recipe.tags?.includes('早餐') ? '早餐' : '晚餐'
  mealPlanStore.addMeal(currentAddDate.value, currentAddMealTime.value, recipe)
}

function confirmCook(date, mealTime, meal) {
  if (meal.ingredientsDeducted) {
    alert('该菜品已扣减过库存')
    return
  }
  
  if (!confirm(`确认完成「${meal.recipeName}」？\n将自动从冰箱扣减所需食材。`)) {
    return
  }
  
  const result = mealPlanStore.deductMealFromFridge(meal.id, fridgeStore)
  lastDeductResult.value = result
  showResultModal.value = true
  showDetailModal.value = false
}

function confirmCookFromDetail() {
  if (!currentDetailMeal.value) return
  confirmCook(currentDetailDate.value, currentDetailMealTime.value, currentDetailMeal.value)
}

function closeResultModal() {
  showResultModal.value = false
  lastDeductResult.value = null
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
  grid-template-columns: 1fr 340px;
  gap: 20px;
  max-width: 1500px;
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
  flex-wrap: wrap;
}

.summary-item {
  font-size: 14px;
  color: #6a1b9a;
}

.summary-item strong {
  color: #4a148c;
  font-size: 16px;
}

.summary-item.cooked strong {
  color: #2e7d32;
}

.meal-grid {
  border: 1px solid #e1bee7;
  border-radius: 8px;
  overflow: hidden;
}

.grid-header {
  display: grid;
  grid-template-columns: 90px repeat(7, 1fr);
  background: #f3e5f5;
}

.grid-row {
  display: grid;
  grid-template-columns: 90px repeat(7, 1fr);
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
  min-height: 110px;
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
  padding: 8px;
  background: #f3e5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #4a148c;
  text-align: left;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.meal-item:hover {
  background: #e1bee7;
}

.meal-item.cooked {
  background: #e8f5e9;
  border-color: #a5d6a7;
}

.meal-item.cooked:hover {
  background: #c8e6c9;
}

.meal-item.deducted {
  background: #e8f5e9;
  border-color: #66bb6a;
  opacity: 0.85;
}

.meal-item.deducted .meal-name {
  text-decoration: line-through;
  color: #388e3c;
}

.meal-item-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.meal-status-icon {
  font-size: 14px;
}

.meal-name {
  display: block;
  font-weight: 500;
  flex: 1;
}

.meal-item-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.action-btn {
  flex: 1;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.cook-btn {
  background: linear-gradient(135deg, #66bb6a, #4caf50);
  color: white;
}

.cook-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.cooked-btn {
  background: #c8e6c9;
  color: #2e7d32;
  cursor: not-allowed;
}

.remove-meal-btn {
  background: none;
  border: none;
  color: #ab47bc;
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 2px 4px;
}

.remove-meal-btn:hover {
  opacity: 1;
  color: #c62828;
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
  opacity: 0.6;
  transition: opacity 0.2s;
}

.meal-cell:hover .add-meal-hint {
  opacity: 1;
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
  margin: 0 0 8px;
  line-height: 1.5;
}

.tip-list {
  margin: 0;
  padding-left: 20px;
  color: #546e7a;
  font-size: 12px;
  line-height: 1.8;
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

.recipe-item.has-expiring {
  border-left-color: #f44336;
  background: linear-gradient(135deg, #fff5f5 0%, #f5f7fa 100%);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.1);
}

.recipe-item:hover {
  background: #f3e5f5;
}

.recipe-item.has-expiring:hover {
  background: linear-gradient(135deg, #ffebee 0%, #f3e5f5 100%);
}

.recipe-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.recipe-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.recipe-category {
  font-size: 10px;
  padding: 2px 6px;
  background: #e1bee7;
  color: #6a1b9a;
  border-radius: 8px;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-expiring-priority {
  font-size: 10px;
  padding: 2px 6px;
  background: linear-gradient(135deg, #ff7043, #f44336);
  color: white;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.recipe-expiring-match {
  font-size: 11px;
  color: #c62828;
  background: #ffebee;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.expiring-tip {
  font-size: 11px;
  color: #bf360c;
  background: #fbe9e7;
  padding: 5px 8px;
  border-radius: 6px;
  margin-bottom: 8px;
  line-height: 1.5;
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
  display: inline-flex;
  align-items: center;
}

.ingredient-tag.small {
  font-size: 10px;
  padding: 1px 6px;
}

.ingredient-tag.available {
  background: #c8e6c9;
  color: #2e7d32;
}

.ingredient-tag.expiring {
  background: linear-gradient(135deg, #ffccbc, #ffab91);
  color: #bf360c;
  font-weight: 500;
}

.expiring-dot {
  margin-left: 2px;
  font-size: 9px;
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
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}

.modal-content.large {
  max-width: 700px;
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

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 6px 14px;
  border: 1px solid #e1bee7;
  background: white;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
  color: #7b1fa2;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: #f3e5f5;
}

.filter-tab.active {
  background: #8e24aa;
  color: white;
  border-color: #8e24aa;
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

.recipe-select-category {
  display: inline-block;
  font-size: 10px;
  padding: 1px 6px;
  background: #e1bee7;
  color: #6a1b9a;
  border-radius: 8px;
  margin-left: 6px;
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

.detail-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.status-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.status-tag.success {
  background: #c8e6c9;
  color: #2e7d32;
}

.status-tag.warning {
  background: #fff3e0;
  color: #e65100;
}

.status-time {
  font-size: 12px;
  color: #78909c;
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

.detail-actions {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.result-modal {
  max-width: 480px;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-summary {
  padding: 12px 16px;
  background: #f3e5f5;
  border-radius: 8px;
  text-align: center;
}

.result-summary .recipe-name {
  font-size: 17px;
  color: #4a148c;
  font-weight: 600;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-title {
  margin: 0 !important;
  font-size: 14px;
  font-weight: 600;
}

.result-title.success {
  color: #2e7d32;
}

.result-title.warning {
  color: #e65100;
}

.result-title.danger {
  color: #c62828;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.result-item.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-item.warning {
  background: #fff3e0;
  color: #e65100;
}

.result-item.danger {
  background: #ffebee;
  color: #c62828;
}

.result-name {
  font-weight: 500;
}

.result-qty {
  font-size: 12px;
  opacity: 0.9;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .meal-grid {
    overflow-x: auto;
  }
  
  .grid-header,
  .grid-row {
    min-width: 800px;
  }
}
</style>
