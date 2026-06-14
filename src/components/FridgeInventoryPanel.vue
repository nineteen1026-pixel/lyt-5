<template>
  <div class="fridge-inventory-panel">
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
        <div class="form-row">
          <div class="form-group">
            <label>采购单价 (元)</label>
            <input
              v-model.number="form.unitPrice"
              type="number"
              min="0"
              step="0.01"
              placeholder="选填"
            />
          </div>
          <div class="form-group cost-preview-group">
            <label>小计</label>
            <div class="cost-preview-value">
              ¥{{ (form.quantity * (form.unitPrice || 0)).toFixed(2) }}
            </div>
          </div>
        </div>
        <div class="form-group">
          <div class="category-header">
            <label>食材品类</label>
            <label class="auto-detect-label">
              <input type="checkbox" v-model="autoDetectCategory" />
              <span>自动识别</span>
            </label>
          </div>
          <div v-if="form.categoryName" class="selected-category">
            已选：{{ form.parentCategoryName }} / {{ form.categoryName }}
          </div>
          <div class="category-selector">
            <div v-for="group in categories" :key="group.id" class="category-group">
              <div class="category-group-title">{{ group.name }}</div>
              <div class="category-items">
                <button
                  v-for="sub in group.children"
                  :key="sub.id"
                  type="button"
                  class="category-item"
                  :class="{ active: form.categoryId === sub.id }"
                  @click="handleCategorySelect(sub.id)"
                >
                  <span class="category-icon">{{ sub.icon }}</span>
                  <span class="category-name">{{ sub.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>营养标签</label>
          <div class="nutrition-tags">
            <button
              v-for="tag in nutritionTags"
              :key="tag.id"
              type="button"
              class="nutrition-tag-btn"
              :class="{ active: form.nutritionTags.includes(tag.id) }"
              :style="{ borderColor: tag.color, color: form.nutritionTags.includes(tag.id) ? 'white' : tag.color, background: form.nutritionTags.includes(tag.id) ? tag.color : 'transparent' }"
              @click="toggleNutritionTag(tag.id)"
            >
              {{ tag.name }}
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          ➕ 添加食材
        </button>
      </form>
    </div>

    <div class="recipe-suggestions card">
      <div class="recipe-suggestions-header">
        <h2>🍳 今日菜谱建议</h2>
        <button class="btn btn-small btn-regression" @click="handleRunRecipeTests" title="运行菜谱推荐回归测试">
          🧪 验证推荐
        </button>
      </div>
      <div v-if="suggestions.length === 0" class="empty-tip">
        添加食材后为您推荐菜谱
      </div>
      <div v-else class="recipe-list">
        <div
          v-for="(recipe, index) in suggestions"
          :key="index"
          class="recipe-item"
          :class="{ 'has-expiring': recipe.expiringMatchCount > 0 }"
        >
          <div class="recipe-header">
            <div class="recipe-title-row">
              <span class="recipe-name">{{ recipe.name }}</span>
              <span v-if="recipe.expiringMatchCount > 0" class="badge-expiring-priority">
                ⚡ 优先推荐
              </span>
            </div>
            <div class="recipe-meta">
              <span class="recipe-match" v-if="recipe.matchCount">
                可用食材: {{ recipe.matchCount }}/{{ recipe.ingredients.length }}
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
              {{ ing.name }} {{ ing.quantity }}{{ ing.unit }}
              <span v-if="isExpiringIngredient(ing.name, recipe)" class="expiring-dot">⚠</span>
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

    <div class="cost-analysis card">
      <div class="cost-analysis-header">
        <h2>💰 采购成本分析</h2>
        <select v-model="costMonth" class="cost-month-select">
          <option v-for="month in costMonthOptions" :key="month" :value="month">
            {{ formatCostMonth(month) }}
          </option>
        </select>
      </div>

      <div v-if="!costMonth" class="empty-tip">
        暂无采购记录
      </div>
      <template v-else>
        <div class="cost-summary-row">
          <div class="cost-summary-item total">
            <span class="cost-summary-num">¥{{ currentCostSummary.totalCost.toFixed(2) }}</span>
            <span class="cost-summary-label">本月采购总计</span>
          </div>
          <div class="cost-summary-item count">
            <span class="cost-summary-num">{{ currentCostSummary.totalCount }}</span>
            <span class="cost-summary-label">采购笔数</span>
          </div>
        </div>

        <div v-if="currentCostSummary.categorySummary.length > 0" class="cost-category-bars">
          <h3 class="cost-subtitle">📊 品类支出分布</h3>
          <div
            v-for="cat in currentCostSummary.categorySummary"
            :key="cat.name"
            class="cost-category-row"
          >
            <span class="cost-cat-name">{{ cat.name }}</span>
            <div class="cost-cat-bar-track">
              <div
                class="cost-cat-bar-fill"
                :style="{ width: cat.percent + '%' }"
              ></div>
            </div>
            <span class="cost-cat-amount">¥{{ cat.totalCost.toFixed(0) }}</span>
            <span class="cost-cat-percent">{{ cat.percent }}%</span>
          </div>
        </div>

        <div v-if="correlationData.length > 0" class="cost-correlation">
          <h3 class="cost-subtitle">🔗 成本-消耗-浪费关联分析</h3>
          <div class="correlation-table">
            <div class="correlation-header-row">
              <span class="corr-col">品类</span>
              <span class="corr-col">采购额</span>
              <span class="corr-col">消耗</span>
              <span class="corr-col">浪费</span>
              <span class="corr-col">浪费率</span>
              <span class="corr-col">利用率</span>
            </div>
            <div
              v-for="item in correlationData"
              :key="item.category"
              class="correlation-data-row"
            >
              <span class="corr-col corr-name">{{ item.category }}</span>
              <span class="corr-col">¥{{ item.totalCost.toFixed(0) }}</span>
              <span class="corr-col">{{ item.consumedQty }}</span>
              <span class="corr-col" :class="{ 'corr-waste-high': item.wastedQty > 0 }">
                {{ item.wastedQty > 0 ? item.wastedQty : '-' }}
              </span>
              <span class="corr-col">
                <span
                  class="waste-rate-badge"
                  :class="item.efficiencyLevel"
                >
                  {{ item.wasteRate }}%
                </span>
              </span>
              <span class="corr-col">
                <span class="efficiency-badge" :class="item.efficiencyLevel">
                  {{ item.costEfficiency }}%
                </span>
              </span>
            </div>
          </div>
          <div v-if="highWasteCategories.length > 0" class="correlation-insight">
            <div class="insight-icon">💡</div>
            <div class="insight-text">
              <strong>浪费预警：</strong>
              <span v-for="(cat, i) in highWasteCategories" :key="cat.category">
                {{ cat.category }}(浪费率{{ cat.wasteRate }}%){{ i < highWasteCategories.length - 1 ? '、' : '' }}
              </span>
              建议减少采购量或优化存储方式
            </div>
          </div>
        </div>

        <div v-if="currentCostSummary.details.length > 0" class="cost-detail-list">
          <h3 class="cost-subtitle" @click="showCostDetail = !showCostDetail" style="cursor:pointer">
            📋 采购明细 {{ showCostDetail ? '▼' : '▶' }}
          </h3>
          <div v-if="showCostDetail" class="cost-detail-items">
            <div
              v-for="record in currentCostSummary.details"
              :key="record.id"
              class="cost-detail-item"
            >
              <div class="cost-detail-left">
                <span class="cost-detail-name">{{ record.name }}</span>
                <span class="cost-detail-cat">{{ record.parentCategoryName }}</span>
              </div>
              <div class="cost-detail-right">
                <span class="cost-detail-qty">{{ record.quantity }}{{ record.unit }}×¥{{ record.unitPrice }}</span>
                <span class="cost-detail-total">¥{{ record.totalCost.toFixed(2) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="showRecipeTestDialog" class="regression-dialog-overlay" @click.self="closeRecipeTestDialog">
      <div class="regression-dialog" :class="recipeTestResult?.allPassed ? 'all-passed' : 'has-failed'">
        <div class="regression-dialog-header">
          <h3>🍳 菜谱推荐回归测试报告</h3>
          <button class="regression-dialog-close" @click="closeRecipeTestDialog">✕</button>
        </div>
        <div class="regression-dialog-body" v-if="recipeTestResult">
          <div class="regression-summary" :class="recipeTestResult.allPassed ? 'success' : 'fail'">
            <div class="regression-summary-icon">
              {{ recipeTestResult.allPassed ? '✅' : '⚠️' }}
            </div>
            <div class="regression-summary-text">
              <div class="regression-summary-title">
                {{ recipeTestResult.allPassed ? '全部通过！' : '存在失败用例' }}
              </div>
              <div class="regression-summary-stats">
                <span class="stat pass">通过 {{ recipeTestResult.passed }}/{{ recipeTestResult.total }}</span>
                <span v-if="recipeTestResult.failed > 0" class="stat fail">失败 {{ recipeTestResult.failed }}</span>
              </div>
            </div>
          </div>
          <div class="regression-cases-title">详细用例</div>
          <div class="regression-cases-list">
            <div
              v-for="(c, idx) in recipeTestResult.cases"
              :key="idx"
              class="regression-case"
              :class="c.passed ? 'case-pass' : 'case-fail'"
            >
              <div class="case-header">
                <span class="case-status">{{ c.passed ? '✅' : '❌' }}</span>
                <span class="case-name">{{ c.name }}</span>
              </div>
              <div v-if="!c.passed" class="case-detail">
                <div class="case-row">
                  <span class="case-row-label">期望：</span>
                  <span class="case-value">{{ c.expected }}</span>
                </div>
                <div class="case-row">
                  <span class="case-row-label">实际：</span>
                  <span class="case-value">{{ c.actual }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="regression-dialog-footer">
          <button class="btn btn-primary" @click="closeRecipeTestDialog">
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useStockOrchestrator } from '@/composables/useStockOrchestrator'
import { getRecipeSuggestions, runRecipeSuggestionTests } from '@/utils/recipes'
import { categories, nutritionTags, getCategoryInfo, getAllSubCategories, sanitizeNutritionTags, matchIngredientByCategory } from '@/utils/categories'

const emit = defineEmits(['run-recipe-tests'])

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const purchaseCostStore = usePurchaseCostStore()
const orchestrator = useStockOrchestrator()

function getDefaultDate() {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString().split('T')[0]
}

function getCurrentCostMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const form = ref({
  name: '',
  quantity: 1,
  unit: '个',
  expiryDate: getDefaultDate(),
  zone: '冷藏',
  categoryId: '',
  categoryName: '',
  parentCategoryId: '',
  parentCategoryName: '',
  nutritionTags: [],
  unitPrice: 0
})

const autoDetectCategory = ref(true)
const costMonth = ref(purchaseCostStore.allCostMonths.length > 0 ? purchaseCostStore.allCostMonths[0] : getCurrentCostMonth())
const showCostDetail = ref(false)
const showRecipeTestDialog = ref(false)
const recipeTestResult = ref(null)

watch(() => form.value.name, (newName) => {
  if (autoDetectCategory.value && newName && newName.trim()) {
    const categoryInfo = getCategoryInfo(newName.trim())
    form.value.categoryId = categoryInfo.categoryId
    form.value.categoryName = categoryInfo.categoryName
    form.value.parentCategoryId = categoryInfo.parentCategoryId
    form.value.parentCategoryName = categoryInfo.parentCategoryName
    form.value.nutritionTags = [...categoryInfo.nutritionTags]
  }
})

watch(() => purchaseCostStore.allCostMonths, (newMonths, oldMonths) => {
  if (newMonths.length > 0) {
    const latestMonth = newMonths[0]
    const prevLatest = (oldMonths && oldMonths.length > 0) ? oldMonths[0] : null
    const latestMonthChanged = prevLatest !== null && latestMonth !== prevLatest
    const currentInvalid = !costMonth.value || !newMonths.includes(costMonth.value)
    if (latestMonthChanged || currentInvalid) {
      costMonth.value = latestMonth
    }
  } else {
    costMonth.value = getCurrentCostMonth()
  }
}, { immediate: true })

const suggestions = computed(() => {
  return getRecipeSuggestions(fridgeStore.items, 2)
})

const allSubCategories = getAllSubCategories()

const costMonthOptions = computed(() => {
  const months = [...purchaseCostStore.allCostMonths]
  if (months.length === 0) {
    months.push(getCurrentCostMonth())
  }
  return months
})

const currentCostSummary = computed(() => {
  if (!costMonth.value) {
    return { month: '', totalCost: 0, totalCount: 0, categorySummary: [], details: [] }
  }
  return purchaseCostStore.getMonthlyCostSummary(costMonth.value)
})

const correlationData = computed(() => {
  if (!costMonth.value) return []
  return purchaseCostStore.getCorrelationAnalysis(costMonth.value)
})

const highWasteCategories = computed(() => {
  return correlationData.value.filter(item => item.wasteRate > 15)
})

function handleAdd() {
  if (!form.value.name.trim()) return
  const cleanedTags = sanitizeNutritionTags(form.value.nutritionTags)
  orchestrator.stockInToFridge({
    name: form.value.name.trim(),
    quantity: form.value.quantity,
    unit: form.value.unit,
    expiryDate: form.value.expiryDate,
    zone: form.value.zone,
    categoryId: form.value.categoryId,
    categoryName: form.value.categoryName,
    parentCategoryId: form.value.parentCategoryId,
    parentCategoryName: form.value.parentCategoryName,
    nutritionTags: cleanedTags,
    unitPrice: form.value.unitPrice
  })
  form.value.name = ''
  form.value.quantity = 1
  form.value.categoryId = ''
  form.value.categoryName = ''
  form.value.parentCategoryId = ''
  form.value.parentCategoryName = ''
  form.value.nutritionTags = []
  form.value.unitPrice = 0
}

function handleCategorySelect(categoryId) {
  autoDetectCategory.value = false
  const subCategory = allSubCategories.find(c => c.id === categoryId)
  if (subCategory) {
    form.value.categoryId = subCategory.id
    form.value.categoryName = subCategory.name
    form.value.parentCategoryId = subCategory.parentId
    form.value.parentCategoryName = subCategory.parentName
  }
}

function toggleNutritionTag(tagId) {
  autoDetectCategory.value = false
  const index = form.value.nutritionTags.indexOf(tagId)
  if (index > -1) {
    form.value.nutritionTags.splice(index, 1)
  } else {
    form.value.nutritionTags.push(tagId)
  }
}

function formatCostMonth(month) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

function hasIngredient(ingredientName) {
  return fridgeStore.items.some(item =>
    matchIngredientByCategory(item.name, ingredientName)
  )
}

function isExpiringIngredient(ingredientName, recipe) {
  if (!recipe.matchedExpiringIngredients) return false
  return recipe.matchedExpiringIngredients.some(
    exp => matchIngredientByCategory(exp.name, ingredientName)
  )
}

function handleRunRecipeTests() {
  try {
    const result = runRecipeSuggestionTests()
    recipeTestResult.value = result
    showRecipeTestDialog.value = true
    console.log('[菜谱推荐回归测试]', result.summary, result.cases)
    emit('run-recipe-tests', result)
  } catch (err) {
    console.error('[菜谱推荐回归测试] 执行出错：', err)
    alert('菜谱推荐回归测试执行出错：' + err.message)
  }
}

function closeRecipeTestDialog() {
  showRecipeTestDialog.value = false
  recipeTestResult.value = null
}
</script>

<style scoped>
.fridge-inventory-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.btn-regression {
  background: linear-gradient(135deg, #ede7f6, #e1bee7);
  color: #6a1b9a;
  font-weight: 500;
  border: 1px solid #ce93d8;
}

.btn-regression:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(106, 27, 154, 0.2);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.category-header label {
  margin-bottom: 0;
}

.auto-detect-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #546e7a;
  cursor: pointer;
}

.auto-detect-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  accent-color: #00897b;
}

.selected-category {
  font-size: 13px;
  color: #00897b;
  background: #e0f2f1;
  padding: 4px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.category-selector {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px;
}

.category-group {
  margin-bottom: 10px;
}

.category-group:last-child {
  margin-bottom: 0;
}

.category-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #546e7a;
  margin-bottom: 6px;
}

.category-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid #cfd8dc;
  background: white;
  border-radius: 16px;
  font-size: 12px;
  color: #546e7a;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  border-color: #00897b;
  color: #00897b;
}

.category-item.active {
  background: #00897b;
  color: white;
  border-color: #00897b;
}

.category-icon {
  font-size: 14px;
}

.nutrition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.nutrition-tag-btn {
  padding: 4px 10px;
  border: 1.5px solid;
  background: transparent;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.nutrition-tag-btn:hover {
  transform: translateY(-1px);
}

.nutrition-tag-btn.active {
  color: white;
}

.cost-preview-group {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.cost-preview-value {
  font-size: 18px;
  font-weight: 700;
  color: #00796b;
  padding: 8px 0;
}

.recipe-suggestions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.recipe-suggestions-header h2 {
  margin: 0;
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
  transition: all 0.2s;
}

.recipe-item.has-expiring {
  border-left-color: #f44336;
  background: linear-gradient(135deg, #fff5f5 0%, #f5f7fa 100%);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.1);
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
}

.recipe-name {
  font-weight: 600;
  color: #e65100;
  font-size: 16px;
}

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.recipe-match {
  font-size: 12px;
  color: #f57c00;
  background: #fff3e0;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge-expiring-priority {
  font-size: 11px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #ff7043, #f44336);
  color: white;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.recipe-expiring-match {
  font-size: 12px;
  color: #c62828;
  background: #ffebee;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.expiring-tip {
  font-size: 12px;
  color: #bf360c;
  background: #fbe9e7;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 8px;
  line-height: 1.5;
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

.ingredient-tag.expiring {
  background: linear-gradient(135deg, #ffccbc, #ffab91);
  color: #bf360c;
  font-weight: 500;
  position: relative;
}

.expiring-dot {
  margin-left: 2px;
  font-size: 10px;
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

.cost-analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.cost-analysis-header h2 {
  margin: 0;
}

.cost-month-select {
  padding: 6px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 13px;
  color: #37474f;
  background: white;
  cursor: pointer;
}

.cost-month-select:focus {
  outline: none;
  border-color: #00897b;
}

.cost-summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.cost-summary-item {
  padding: 14px;
  border-radius: 10px;
  text-align: center;
}

.cost-summary-item.total {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border: 1px solid #80cbc4;
}

.cost-summary-item.count {
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border: 1px solid #a5d6a7;
}

.cost-summary-num {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #00695c;
}

.cost-summary-item.count .cost-summary-num {
  font-size: 26px;
  color: #2e7d32;
}

.cost-summary-label {
  display: block;
  font-size: 12px;
  color: #546e7a;
  margin-top: 4px;
}

.cost-subtitle {
  margin: 0 0 12px;
  font-size: 15px;
  color: #37474f;
  font-weight: 600;
}

.cost-category-bars {
  margin-bottom: 18px;
  padding: 14px;
  background: #f8faf9;
  border-radius: 10px;
}

.cost-category-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.cost-category-row:last-child {
  margin-bottom: 0;
}

.cost-cat-name {
  width: 72px;
  font-size: 12px;
  color: #546e7a;
  font-weight: 500;
  flex-shrink: 0;
  text-align: right;
}

.cost-cat-bar-track {
  flex: 1;
  height: 18px;
  background: #eceff1;
  border-radius: 9px;
  overflow: hidden;
}

.cost-cat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #26a69a, #00897b);
  border-radius: 9px;
  transition: width 0.3s ease;
  min-width: 4px;
}

.cost-cat-amount {
  width: 56px;
  font-size: 12px;
  font-weight: 600;
  color: #00796b;
  flex-shrink: 0;
}

.cost-cat-percent {
  width: 36px;
  font-size: 11px;
  color: #78909c;
  flex-shrink: 0;
}

.cost-correlation {
  margin-bottom: 18px;
  padding: 14px;
  background: #f5f7fa;
  border-radius: 10px;
}

.correlation-table {
  font-size: 12px;
}

.correlation-header-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr;
  gap: 6px;
  padding: 8px 10px;
  background: #eceff1;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  color: #546e7a;
}

.correlation-data-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.6fr 0.6fr 0.7fr 0.7fr;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid #eceff1;
  align-items: center;
}

.correlation-data-row:last-child {
  border-bottom: none;
}

.corr-col {
  text-align: center;
  color: #455a64;
}

.corr-name {
  text-align: left;
  font-weight: 500;
  color: #37474f;
}

.corr-waste-high {
  color: #c62828;
  font-weight: 600;
}

.waste-rate-badge,
.efficiency-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.waste-rate-badge.good,
.efficiency-badge.good {
  background: #e8f5e9;
  color: #2e7d32;
}

.waste-rate-badge.fair,
.efficiency-badge.fair {
  background: #fff3e0;
  color: #e65100;
}

.waste-rate-badge.poor,
.efficiency-badge.poor {
  background: #ffebee;
  color: #c62828;
}

.correlation-insight {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff8e1, #ffecb3);
  border-radius: 8px;
  border: 1px solid #ffd54f;
  border-left: 4px solid #ff9800;
}

.insight-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.insight-text {
  font-size: 13px;
  color: #5d4037;
  line-height: 1.5;
}

.cost-detail-list {
  margin-top: 4px;
}

.cost-detail-items {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cost-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8faf9;
  border-radius: 8px;
  border: 1px solid #eceff1;
}

.cost-detail-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cost-detail-name {
  font-size: 13px;
  font-weight: 500;
  color: #37474f;
}

.cost-detail-cat {
  font-size: 11px;
  padding: 1px 6px;
  background: #e0f2f1;
  color: #00695c;
  border-radius: 8px;
}

.cost-detail-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cost-detail-qty {
  font-size: 12px;
  color: #78909c;
}

.cost-detail-total {
  font-size: 14px;
  font-weight: 600;
  color: #00796b;
}

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
}

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.regression-dialog-overlay {
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

.regression-dialog {
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.regression-dialog.all-passed {
  border: 2px solid #4caf50;
}

.regression-dialog.has-failed {
  border: 2px solid #f44336;
}

.regression-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.regression-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #37474f;
}

.regression-dialog-close {
  background: none;
  border: none;
  font-size: 20px;
  color: #78909c;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.regression-dialog-close:hover {
  background: #f5f5f5;
  color: #37474f;
}

.regression-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.regression-summary.success {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  border: 1px solid #81c784;
}

.regression-summary.fail {
  background: linear-gradient(135deg, #ffebee, #ffcdd2);
  border: 1px solid #ef9a9a;
}

.regression-summary-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.regression-summary-title {
  font-size: 16px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 4px;
}

.regression-summary-stats {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.regression-summary-stats .stat.pass {
  color: #2e7d32;
}

.regression-summary-stats .stat.fail {
  color: #c62828;
  font-weight: 600;
}

.regression-cases-title {
  font-size: 15px;
  font-weight: 600;
  color: #37474f;
  margin-bottom: 12px;
}

.regression-cases-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.regression-case {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.regression-case.case-pass {
  background: #f1f8e9;
  border-color: #aed581;
}

.regression-case.case-fail {
  background: #fff3e0;
  border-color: #ffcc80;
}

.case-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.case-status {
  font-size: 16px;
}

.case-name {
  font-size: 14px;
  font-weight: 500;
  color: #37474f;
}

.case-detail {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fff8e1;
  border-radius: 6px;
  font-size: 12px;
}

.case-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.case-row:last-child {
  margin-bottom: 0;
}

.case-row-label {
  color: #78909c;
  font-weight: 500;
  flex-shrink: 0;
}

.case-value {
  color: #37474f;
}

.regression-dialog-footer {
  text-align: right;
}

.regression-dialog-footer .btn-primary {
  width: auto;
  padding: 10px 32px;
}
</style>
