<template>
  <div class="fridge-recipe-panel">
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
import { ref, computed } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { getRecipeSuggestions, runRecipeSuggestionTests } from '@/utils/recipes'
import { matchIngredientByCategory } from '@/utils/categories'

const fridgeStore = useFridgeStore()

const showRecipeTestDialog = ref(false)
const recipeTestResult = ref(null)

const suggestions = computed(() => getRecipeSuggestions(fridgeStore.items, 2))

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
.fridge-recipe-panel {
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

.empty-tip {
  text-align: center;
  color: #90a4ae;
  padding: 40px 20px;
  font-size: 14px;
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

.regression-summary-text {
  flex: 1;
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
