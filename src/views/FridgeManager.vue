<template>
  <div class="fridge-manager">
    <header class="header">
      <h1>🧊 家庭冰箱管理</h1>
      <p class="subtitle">记录食材，合理规划，减少浪费</p>
    </header>

    <div class="todo-section card">
      <h2 class="todo-title">📋 今日待办</h2>
      <div class="todo-cards">
        <div class="todo-card expiring" @click="goToExpiringItems">
          <div class="todo-icon">⏰</div>
          <div class="todo-info">
            <span class="todo-count">{{ fridgeStore.expiringSoonItems.length }}</span>
            <span class="todo-label">快过期食材</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card missing" @click="goToMealPlan">
          <div class="todo-icon">🍳</div>
          <div class="todo-info">
            <span class="todo-count">{{ missingIngredientRecipesCount }}</span>
            <span class="todo-label">缺料菜谱</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
        <div class="todo-card shopping" @click="goToShoppingList">
          <div class="todo-icon">🛒</div>
          <div class="todo-info">
            <span class="todo-count">{{ shoppingStore.pendingCount }}</span>
            <span class="todo-label">未买采购</span>
          </div>
          <span class="todo-arrow">→</span>
        </div>
      </div>
    </div>

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
          <h2>🍳 今日菜谱建议</h2>
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
                      @change="item.purchased ? undoPurchased(item) : handlePurchased(item)"
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

        <div class="io-toolbar card">
          <div class="io-group">
            <span class="io-label">📤 导出</span>
            <button class="btn btn-small btn-io" @click="handleExportJSON">JSON</button>
            <button class="btn btn-small btn-io" @click="handleExportCSV">CSV</button>
          </div>
          <div class="io-divider"></div>
          <div class="io-group">
            <span class="io-label">📥 导入</span>
            <label class="btn btn-small btn-io btn-file-label">
              JSON
              <input
                type="file"
                accept=".json,application/json"
                style="display:none"
                @change="handleImportJSON"
              />
            </label>
            <label class="btn btn-small btn-io btn-file-label">
              CSV
              <input
                type="file"
                accept=".csv,text/csv"
                style="display:none"
                @change="handleImportCSV"
              />
            </label>
          </div>
        </div>

        <div v-if="selectedItemIds.size > 0" class="batch-toolbar card">
          <div class="batch-info">
            ✅ 已选中 <strong>{{ selectedItemIds.size }}</strong> 项
          </div>
          <div class="batch-actions">
            <button class="btn btn-small btn-batch" @click="selectAllItems">全选当前</button>
            <button class="btn btn-small btn-batch" @click="clearSelected">取消选择</button>
            <button class="btn btn-small btn-batch btn-batch-zone" @click="showBatchZoneDialog = true">
              🔀 改分区
            </button>
            <button class="btn btn-small btn-batch btn-batch-expiry" @click="showBatchExpiryDialog = true">
              ⏳ 延保质期
            </button>
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
                'expiring-soon': fridgeStore.isExpiringSoonItem(item.expiryDate) && !fridgeStore.isExpired(item.expiryDate),
                'expired': fridgeStore.isExpired(item.expiryDate),
                'selected': selectedItemIds.has(item.id)
              }"
            >
              <div class="item-select-row">
                <input
                  type="checkbox"
                  class="item-checkbox"
                  :checked="selectedItemIds.has(item.id)"
                  @change="toggleItemSelection(item.id)"
                />
                <div class="item-header">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-zone">{{ item.zone }}</span>
                </div>
              </div>
              <div v-if="item.categoryName" class="item-category">
                <span class="item-category-label">{{ item.parentCategoryName }} · {{ item.categoryName }}</span>
              </div>
              <div v-if="item.nutritionTags && item.nutritionTags.length > 0" class="item-nutrition-tags">
                <span
                  v-for="tagId in item.nutritionTags"
                  :key="tagId"
                  class="item-nutrition-tag"
                  :style="{ backgroundColor: getTagInfo(tagId)?.color + '20', color: getTagInfo(tagId)?.color }"
                >
                  {{ getTagInfo(tagId)?.name }}
                </span>
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
                  v-if="fridgeStore.isExpiringSoonItem(item.expiryDate) && !fridgeStore.isExpired(item.expiryDate)"
                  class="btn btn-small btn-shopping"
                  @click="addToShoppingList(item)"
                >
                  🛒 补货
                </button>
                <button class="btn btn-small" @click="useItem(item)">
                  消耗
                </button>
                <button class="btn btn-small btn-danger" @click="deleteItem(item.id)">
                  {{ fridgeStore.isExpired(item.expiryDate) ? '丢弃' : '删除' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
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
            <h4>⏰ 临期补货规则</h4>
            <div class="form-group">
              <label>临期提醒天数</label>
              <select v-model.number="settingsForm.expiringDays" @change="handleExpiringDaysChange">
                <option :value="1">1 天</option>
                <option :value="2">2 天</option>
                <option :value="3">3 天</option>
                <option :value="5">5 天</option>
                <option :value="7">7 天</option>
                <option :value="10">10 天</option>
              </select>
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

    <div v-if="showBatchZoneDialog" class="batch-dialog-overlay" @click.self="showBatchZoneDialog = false">
      <div class="batch-dialog">
        <div class="batch-dialog-header">
          <h3>🔀 批量修改分区</h3>
          <button class="batch-dialog-close" @click="showBatchZoneDialog = false">✕</button>
        </div>
        <div class="batch-dialog-body">
          <p class="batch-dialog-tip">将对选中的 <strong>{{ selectedItemIds.size }}</strong> 项食材修改分区</p>
          <div class="form-group">
            <label>选择目标分区</label>
            <select v-model="batchForm.zone">
              <option v-for="zone in fridgeStore.zones" :key="zone" :value="zone">{{ zone }}</option>
            </select>
          </div>
        </div>
        <div class="batch-dialog-footer">
          <button class="btn btn-small" @click="showBatchZoneDialog = false">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmBatchZone">确认修改</button>
        </div>
      </div>
    </div>

    <div v-if="showBatchExpiryDialog" class="batch-dialog-overlay" @click.self="showBatchExpiryDialog = false">
      <div class="batch-dialog">
        <div class="batch-dialog-header">
          <h3>⏳ 批量延长保质期</h3>
          <button class="batch-dialog-close" @click="showBatchExpiryDialog = false">✕</button>
        </div>
        <div class="batch-dialog-body">
          <p class="batch-dialog-tip">将对选中的 <strong>{{ selectedItemIds.size }}</strong> 项食材延长保质期</p>
          <div class="form-group">
            <label>延长天数</label>
            <select v-model.number="batchForm.expiryDays">
              <option :value="1">+ 1 天</option>
              <option :value="3">+ 3 天</option>
              <option :value="7">+ 7 天</option>
              <option :value="14">+ 14 天</option>
              <option :value="30">+ 30 天</option>
            </select>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="batchForm.negativeDaysAllowed" />
              <span>允许减少天数（负数）</span>
            </label>
          </div>
          <div v-if="batchForm.negativeDaysAllowed" class="form-group">
            <label>自定义天数（正数增加，负数减少）</label>
            <input v-model.number="batchForm.expiryDaysCustom" type="number" placeholder="如：-2 表示缩短2天" />
          </div>
        </div>
        <div class="batch-dialog-footer">
          <button class="btn btn-small" @click="showBatchExpiryDialog = false">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmBatchExpiry">确认延长</button>
        </div>
      </div>
    </div>

    <div v-if="showImportPreview" class="import-dialog-overlay" @click.self="cancelImport">
      <div class="import-dialog">
        <div class="import-dialog-header">
          <h3>📥 导入预览</h3>
          <button class="import-dialog-close" @click="cancelImport">✕</button>
        </div>
        <div class="import-dialog-body" v-if="importPreviewData">
          <div v-if="importPreviewData.version" class="import-version-row">
            <span class="import-version-label">数据版本</span>
            <span class="import-version-value">{{ importPreviewData.version }}</span>
          </div>
          <div v-if="importPreviewData.exportedAt" class="import-version-row">
            <span class="import-version-label">导出时间</span>
            <span class="import-version-value">{{ formatDateTime(importPreviewData.exportedAt) }}</span>
          </div>

          <div class="import-summary">
            <div class="import-summary-item">
              <span class="summary-icon">🧊</span>
              <div>
                <span class="summary-count">{{ importPreviewData.fridgeItems.length }}</span>
                <span class="summary-label">条冰箱食材</span>
              </div>
            </div>
            <div class="import-summary-item">
              <span class="summary-icon">🛒</span>
              <div>
                <span class="summary-count">{{ importPreviewData.shoppingItems.length }}</span>
                <span class="summary-label">条购物清单项</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>导入模式</label>
            <div class="import-mode-options">
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="merge" />
                <div class="import-mode-content">
                  <div class="import-mode-title">🧩 合并追加</div>
                  <div class="import-mode-desc">保留现有数据，将导入数据追加到末尾</div>
                </div>
              </label>
              <label class="import-mode-option">
                <input type="radio" v-model="importMode" value="replace" />
                <div class="import-mode-content">
                  <div class="import-mode-title">🔄 覆盖替换</div>
                  <div class="import-mode-desc">删除所有现有数据，用导入数据完全替换</div>
                </div>
              </label>
            </div>
          </div>

          <div v-if="importPreviewData.fridgeItems.length > 0" class="import-preview-section">
            <h4>🍎 冰箱食材预览（前5条）</h4>
            <table class="import-preview-table">
              <thead>
                <tr><th>名称</th><th>数量</th><th>保质期</th><th>分区</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in importPreviewData.fridgeItems.slice(0, 5)" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.quantity }}{{ item.unit }}</td>
                  <td>{{ item.expiryDate || '-' }}</td>
                  <td>{{ item.zone || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="importPreviewData.shoppingItems.length > 0" class="import-preview-section">
            <h4>🛒 购物清单预览（前5条）</h4>
            <table class="import-preview-table">
              <thead>
                <tr><th>名称</th><th>数量</th><th>单价</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in importPreviewData.shoppingItems.slice(0, 5)" :key="idx">
                  <td>{{ item.name }}</td>
                  <td>{{ item.quantity }}{{ item.unit }}</td>
                  <td>¥{{ item.unitPrice || 0 }}</td>
                  <td>{{ item.purchased ? '已购' : '待购' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="import-dialog-footer">
          <button class="btn btn-small" @click="cancelImport">取消</button>
          <button class="btn btn-primary btn-footer" @click="confirmImport">
            {{ importMode === 'replace' ? '⚠ 确认覆盖导入' : '确认合并导入' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, inject, nextTick } from 'vue'
import { useFridgeStore } from '@/stores/fridge'
import { useShoppingListStore } from '@/stores/shoppingList'
import { useMealPlanStore } from '@/stores/mealPlan'
import { usePurchaseCostStore } from '@/stores/purchaseCost'
import { useWasteRecordStore } from '@/stores/wasteRecord'
import { getRecipeSuggestions } from '@/utils/recipes'
import { sendNotification } from '@/utils/storage'
import { 
  categories, 
  nutritionTags, 
  getCategoryInfo, 
  getNutritionTagById,
  getAllSubCategories,
  matchIngredientByCategory,
  sanitizeNutritionTags,
  isFallbackCategory
} from '@/utils/categories'
import {
  exportToJSON,
  exportToCSV,
  parseJSONFile,
  parseCSVFile,
  addDaysToDate
} from '@/utils/dataIO'

const fridgeStore = useFridgeStore()
const shoppingStore = useShoppingListStore()
const mealPlanStore = useMealPlanStore()
const purchaseCostStore = usePurchaseCostStore()
const wasteRecordStore = useWasteRecordStore()
const switchView = inject('switchView')
const scrollTarget = inject('scrollTarget')

const missingIngredientRecipesCount = computed(() => {
  let count = 0
  for (const date of mealPlanStore.weekDates) {
    for (const mealTime of mealPlanStore.mealTimes) {
      const meals = mealPlanStore.getMeals(date, mealTime)
      for (const meal of meals) {
        if (meal.ingredientsDeducted) continue
        let hasMissing = false
        for (const ing of meal.ingredients) {
          const fridgeItem = fridgeStore.items.find(item =>
            matchIngredientByCategory(item.name, ing.name)
          )
          if (!fridgeItem || fridgeItem.quantity < ing.quantity) {
            hasMissing = true
            break
          }
        }
        if (hasMissing) count++
      }
    }
  }
  return count
})

const itemsListRef = ref(null)
const shoppingListRef = ref(null)

function goToExpiringItems() {
  activeZone.value = '全部'
  nextTick(() => {
    const itemsListEl = document.querySelector('.items-list')
    if (itemsListEl) {
      itemsListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

function goToMealPlan() {
  if (switchView) {
    switchView('mealplan')
  }
}

function goToShoppingList() {
  shoppingTab.value = 'pending'
  nextTick(() => {
    const shoppingListEl = document.querySelector('.shopping-list')
    if (shoppingListEl) {
      shoppingListEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

onMounted(() => {
  if (scrollTarget && scrollTarget.value) {
    nextTick(() => {
      const targetEl = document.querySelector(scrollTarget.value)
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      scrollTarget.value = null
    })
  }
})

const activeZone = ref('全部')
const shoppingTab = ref('pending')
const shoppingForm = ref({ name: '', quantity: 1, unit: '个', store: '', unitPrice: 0 })
const showExpiringDialog = ref(false)
const expiringDialogItem = ref(null)
const expiringDialogForm = ref({ quantity: 1, unit: '个', store: '', unitPrice: 0 })
const showSettings = ref(false)
const settingsForm = ref({ 
  budgetLimit: 0, 
  expiringDays: 3,
  defaultStore: '',
  quantityMultiplier: 1.5,
  autoAddToShopping: false,
  useLastPrice: true,
  notificationEnabled: false,
  notificationDays: 3
})
const newStoreName = ref('')

const selectedItemIds = ref(new Set())
const showBatchZoneDialog = ref(false)
const showBatchExpiryDialog = ref(false)
const batchForm = ref({
  zone: '冷藏',
  expiryDays: 7,
  negativeDaysAllowed: false,
  expiryDaysCustom: 0
})

const showImportPreview = ref(false)
const importPreviewData = ref(null)
const importMode = ref('merge')

const costMonth = ref(purchaseCostStore.allCostMonths.length > 0 ? purchaseCostStore.allCostMonths[0] : '')
const showCostDetail = ref(false)

const costMonthOptions = computed(() => {
  return purchaseCostStore.allCostMonths
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

function formatCostMonth(month) {
  const [y, m] = month.split('-')
  return `${y}年${parseInt(m)}月`
}

function toggleItemSelection(id) {
  const next = new Set(selectedItemIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  selectedItemIds.value = next
}

function selectAllItems() {
  const next = new Set(filteredItems.value.map(i => i.id))
  selectedItemIds.value = next
}

function clearSelected() {
  selectedItemIds.value = new Set()
}

function confirmBatchZone() {
  if (selectedItemIds.value.size === 0 || !batchForm.value.zone) return
  const ids = Array.from(selectedItemIds.value)
  const count = fridgeStore.batchUpdateZone(ids, batchForm.value.zone)
  showBatchZoneDialog.value = false
  clearSelected()
  alert(`已成功修改 ${count} 项食材的分区为「${batchForm.value.zone}」`)
}

function confirmBatchExpiry() {
  if (selectedItemIds.value.size === 0) return
  let days = batchForm.value.expiryDays
  if (batchForm.value.negativeDaysAllowed && !isNaN(batchForm.value.expiryDaysCustom)) {
    days = batchForm.value.expiryDaysCustom
  }
  if (isNaN(days)) {
    alert('请输入有效的天数')
    return
  }
  const ids = Array.from(selectedItemIds.value)
  const count = fridgeStore.batchExtendExpiry(ids, days)
  showBatchExpiryDialog.value = false
  clearSelected()
  const action = days >= 0 ? '延长' : '缩短'
  alert(`已成功${action} ${count} 项食材的保质期 ${Math.abs(days)} 天`)
}

function formatDateTime(isoStr) {
  if (!isoStr) return '-'
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return isoStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function handleExportJSON() {
  exportToJSON(fridgeStore.items, shoppingStore.list)
  alert('JSON 数据已导出！')
}

function handleExportCSV() {
  exportToCSV(fridgeStore.items, shoppingStore.list)
  alert('CSV 数据已导出！')
}

async function handleImportJSON(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const data = await parseJSONFile(file)
    importPreviewData.value = data
    importMode.value = 'merge'
    showImportPreview.value = true
  } catch (err) {
    alert('导入失败：' + err.message)
  }
}

async function handleImportCSV(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const data = await parseCSVFile(file)
    importPreviewData.value = data
    importMode.value = 'merge'
    showImportPreview.value = true
  } catch (err) {
    alert('导入失败：' + err.message)
  }
}

function cancelImport() {
  showImportPreview.value = false
  importPreviewData.value = null
}

function confirmImport() {
  if (!importPreviewData.value) return
  const { fridgeItems, shoppingItems } = importPreviewData.value
  const isReplace = importMode.value === 'replace'
  const totalItems = fridgeItems.length + shoppingItems.length

  if (isReplace) {
    const confirmText = `确认要覆盖现有数据吗？\n\n将删除 ${fridgeStore.items.length} 条食材和 ${shoppingStore.list.length} 条购物项，替换为导入的 ${fridgeItems.length} 条食材和 ${shoppingItems.length} 条购物项。\n\n此操作不可恢复！`
    if (!confirm(confirmText)) return
  }

  try {
    if (isReplace) {
      fridgeStore.replaceAllItems(fridgeItems)
      shoppingStore.replaceAllItems(shoppingItems)
    } else {
      if (fridgeItems.length > 0) fridgeStore.addItemsBulk(fridgeItems)
      if (shoppingItems.length > 0) shoppingStore.addItemsBulk(shoppingItems)
    }
    cancelImport()
    const action = isReplace ? '覆盖替换' : '合并追加'
    alert(`导入成功！\n模式：${action}\n冰箱食材：${fridgeItems.length} 条\n购物清单：${shoppingItems.length} 条`)
  } catch (err) {
    alert('导入出错：' + err.message)
  }
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

const autoReplenishProcessed = ref(new Set())

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

const suggestions = computed(() => {
  return getRecipeSuggestions(fridgeStore.items, 2)
})

const filteredItems = computed(() => {
  if (activeZone.value === '全部') {
    return fridgeStore.sortedItems
  }
  return fridgeStore.sortedItems.filter(item => item.zone === activeZone.value)
})

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
  const cleanedTags = sanitizeNutritionTags(form.value.nutritionTags)
  const newItem = fridgeStore.addItem({
    name: form.value.name.trim(),
    quantity: form.value.quantity,
    unit: form.value.unit,
    expiryDate: form.value.expiryDate,
    zone: form.value.zone,
    categoryId: form.value.categoryId,
    categoryName: form.value.categoryName,
    parentCategoryId: form.value.parentCategoryId,
    parentCategoryName: form.value.parentCategoryName,
    nutritionTags: cleanedTags
  })
  if (form.value.unitPrice > 0) {
    purchaseCostStore.addCostRecord({
      name: form.value.name.trim(),
      quantity: form.value.quantity,
      unit: form.value.unit,
      unitPrice: form.value.unitPrice,
      categoryId: newItem.categoryId,
      categoryName: newItem.categoryName,
      parentCategoryId: newItem.parentCategoryId,
      parentCategoryName: newItem.parentCategoryName
    })
  }
  form.value.name = ''
  form.value.quantity = 1
  form.value.categoryId = ''
  form.value.categoryName = ''
  form.value.parentCategoryId = ''
  form.value.parentCategoryName = ''
  form.value.nutritionTags = []
  form.value.unitPrice = 0
}

function deleteItem(id) {
  const item = fridgeStore.getItemById(id)
  if (!item) return
  const reason = fridgeStore.isExpired(item.expiryDate) ? 'expired' : 'discarded'
  const label = reason === 'expired' ? '过期丢弃' : '手动丢弃'
  if (confirm(`确定要${label}这个食材吗？此操作将记录到浪费报表。`)) {
    fridgeStore.discardItem(id, reason)
  }
}

function useItem(item) {
  const amount = parseFloat(prompt(`消耗多少 ${item.unit}？`, '1'))
  if (isNaN(amount) || amount <= 0) return
  purchaseCostStore.addConsumptionRecord({
    name: item.name,
    quantity: amount,
    unit: item.unit,
    type: 'consumed',
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    parentCategoryId: item.parentCategoryId,
    parentCategoryName: item.parentCategoryName
  })
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
    matchIngredientByCategory(item.name, ingredientName)
  )
}

function isExpiringIngredient(ingredientName, recipe) {
  if (!recipe.matchedExpiringIngredients) return false
  return recipe.matchedExpiringIngredients.some(
    exp => matchIngredientByCategory(exp.name, ingredientName)
  )
}

const allSubCategories = getAllSubCategories()

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

function getTagInfo(tagId) {
  return getNutritionTagById(tagId)
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

function handlePurchased(item) {
  let linkedFridgeItemId = null
  let originalQuantity = null
  let originalExpiryDate = null

  if (item.fromExpiring && item.fridgeItemId) {
    const originalItem = fridgeStore.getItemById(item.fridgeItemId)
    if (originalItem) {
      originalQuantity = originalItem.quantity
      originalExpiryDate = originalItem.expiryDate
      fridgeStore.updateItem(item.fridgeItemId, {
        quantity: originalItem.quantity + item.quantity,
        expiryDate: getDefaultDate()
      })
      linkedFridgeItemId = item.fridgeItemId
    }
  }

  if (linkedFridgeItemId === null) {
    const newFridgeItem = fridgeStore.addItem({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: getDefaultDate(),
      zone: '冷藏'
    })
    linkedFridgeItemId = newFridgeItem.id
  }

  if (item.unitPrice > 0) {
    purchaseCostStore.addCostRecord({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      store: item.store || '',
      categoryId: fridgeStore.getItemById(linkedFridgeItemId)?.categoryId || '',
      categoryName: fridgeStore.getItemById(linkedFridgeItemId)?.categoryName || '',
      parentCategoryId: fridgeStore.getItemById(linkedFridgeItemId)?.parentCategoryId || '',
      parentCategoryName: fridgeStore.getItemById(linkedFridgeItemId)?.parentCategoryName || ''
    })
  }

  shoppingStore.setPurchased(item.id, true, {
    linkedFridgeItemId,
    originalQuantity,
    originalExpiryDate
  })
}

function undoPurchased(item) {
  if (item.fromExpiring && item.fridgeItemId && item.originalQuantity !== null) {
    const originalItem = fridgeStore.getItemById(item.fridgeItemId)
    if (originalItem) {
      fridgeStore.updateItem(item.fridgeItemId, {
        quantity: item.originalQuantity,
        expiryDate: item.originalExpiryDate
      })
    }
  } else if (item.linkedFridgeItemId) {
    fridgeStore.removeItem(item.linkedFridgeItemId)
  }

  shoppingStore.setPurchased(item.id, false, {
    linkedFridgeItemId: null,
    originalQuantity: null,
    originalExpiryDate: null
  })
}

function clearPurchasedItems() {
  if (confirm('确定清除所有已购项吗？')) {
    shoppingStore.clearPurchased()
  }
}

function openSettings() {
  settingsForm.value.budgetLimit = shoppingStore.budgetLimit
  settingsForm.value.expiringDays = fridgeStore.expiringDays
  settingsForm.value.defaultStore = shoppingStore.replenishRules.defaultStore
  settingsForm.value.quantityMultiplier = shoppingStore.replenishRules.quantityMultiplier
  settingsForm.value.autoAddToShopping = shoppingStore.replenishRules.autoAddToShopping
  settingsForm.value.useLastPrice = shoppingStore.replenishRules.useLastPrice
  settingsForm.value.notificationEnabled = fridgeStore.notificationEnabled
  settingsForm.value.notificationDays = fridgeStore.notificationDays
  fridgeStore.checkNotificationPermission()
  showSettings.value = true
}

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

function closeSettings() {
  showSettings.value = false
  newStoreName.value = ''
}

function handleBudgetChange() {
  shoppingStore.setBudgetLimit(settingsForm.value.budgetLimit)
}

function handleExpiringDaysChange() {
  shoppingStore.setExpiringDays(settingsForm.value.expiringDays)
  fridgeStore.setExpiringDays(settingsForm.value.expiringDays)
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

let notificationCheckTimer = null

function startNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
  }
  
  fridgeStore.sendExpiringNotifications()
  
  notificationCheckTimer = setInterval(() => {
    fridgeStore.sendExpiringNotifications()
  }, 60 * 1000)
}

function stopNotificationCheck() {
  if (notificationCheckTimer) {
    clearInterval(notificationCheckTimer)
    notificationCheckTimer = null
  }
}

onMounted(() => {
  fridgeStore.checkNotificationPermission()
  startNotificationCheck()
})

onUnmounted(() => {
  stopNotificationCheck()
})

watch(() => fridgeStore.notificationEnabled, (enabled) => {
  if (enabled) {
    startNotificationCheck()
  } else {
    stopNotificationCheck()
  }
})
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

.todo-section {
  max-width: 1200px;
  margin: 0 auto 20px;
}

.todo-title {
  margin: 0 0 16px;
  font-size: 18px;
  color: #37474f;
}

.todo-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.todo-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.todo-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.todo-card.expiring {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-color: #ffcc80;
}

.todo-card.expiring:hover {
  border-color: #ff9800;
}

.todo-card.missing {
  background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
  border-color: #f48fb1;
}

.todo-card.missing:hover {
  border-color: #e91e63;
}

.todo-card.shopping {
  background: linear-gradient(135deg, #e0f2f1 0%, #b2dfdb 100%);
  border-color: #80cbc4;
}

.todo-card.shopping:hover {
  border-color: #00897b;
}

.todo-icon {
  font-size: 36px;
  flex-shrink: 0;
}

.todo-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.todo-count {
  font-size: 28px;
  font-weight: 700;
  color: #37474f;
}

.todo-label {
  font-size: 14px;
  color: #546e7a;
  font-weight: 500;
}

.todo-arrow {
  font-size: 20px;
  color: #90a4ae;
  font-weight: 600;
  transition: transform 0.2s;
}

.todo-card:hover .todo-arrow {
  transform: translateX(4px);
  color: #546e7a;
}

@media (max-width: 768px) {
  .todo-cards {
    grid-template-columns: 1fr;
  }
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

.recipe-meta {
  display: flex;
  align-items: center;
  gap: 8px;
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

.badge-from-mealplan {
  font-size: 11px;
  padding: 1px 6px;
  background: #f3e5f5;
  color: #7b1fa2;
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

.budget-value.pending {
  color: #ef6c00;
}

.budget-value.purchased {
  color: #1976d2;
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

.item-category {
  margin-bottom: 6px;
}

.item-category-label {
  font-size: 12px;
  color: #00897b;
  background: #e0f2f1;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-nutrition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.item-nutrition-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 500;
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

.io-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.io-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.io-label {
  font-size: 13px;
  font-weight: 600;
  color: #37474f;
}

.io-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
}

.btn-io {
  background: linear-gradient(135deg, #e3f2fd, #bbdefb);
  color: #1565c0;
  border: 1px solid #90caf9;
  font-weight: 500;
}

.btn-io:hover {
  background: linear-gradient(135deg, #bbdefb, #90caf9);
  color: #0d47a1;
}

.btn-file-label {
  display: inline-block;
  cursor: pointer;
}

.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
  border: 1px solid #ffd54f;
}

.batch-info {
  font-size: 14px;
  color: #e65100;
  font-weight: 500;
}

.batch-info strong {
  font-size: 16px;
  color: #bf360c;
}

.batch-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-batch {
  background: white;
  color: #5d4037;
  border: 1px solid #d7ccc8;
}

.btn-batch:hover {
  background: #fff3e0;
  color: #e65100;
  border-color: #ffab91;
}

.btn-batch-zone {
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  color: #2e7d32;
  border-color: #81c784;
}

.btn-batch-zone:hover {
  background: linear-gradient(135deg, #c8e6c9, #a5d6a7);
  color: #1b5e20;
}

.btn-batch-expiry {
  background: linear-gradient(135deg, #f3e5f5, #e1bee7);
  color: #6a1b9a;
  border-color: #ba68c8;
}

.btn-batch-expiry:hover {
  background: linear-gradient(135deg, #e1bee7, #ce93d8);
  color: #4a148c;
}

.item-select-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.item-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  cursor: pointer;
  margin-top: 2px;
  flex-shrink: 0;
}

.item-card.selected {
  border: 2px solid #00897b;
  background: linear-gradient(135deg, #e0f2f1 0%, #ffffff 100%);
  box-shadow: 0 2px 8px rgba(0, 137, 123, 0.15);
}

.item-card.selected .item-header {
  width: 100%;
}

.batch-dialog-overlay,
.import-dialog-overlay {
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

.batch-dialog,
.import-dialog {
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

.import-dialog {
  max-width: 620px;
}

.batch-dialog-header,
.import-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-bottom: 1px solid #ffcc80;
}

.import-dialog-header {
  background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%);
  border-bottom-color: #9fa8da;
}

.batch-dialog-header h3,
.import-dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #e65100;
}

.import-dialog-header h3 {
  color: #283593;
}

.batch-dialog-close,
.import-dialog-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #e65100;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.import-dialog-close {
  color: #283593;
}

.batch-dialog-close:hover {
  background: rgba(230, 81, 0, 0.1);
}

.import-dialog-close:hover {
  background: rgba(40, 53, 147, 0.1);
}

.batch-dialog-body,
.import-dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.batch-dialog-tip {
  margin: 0 0 16px;
  padding: 10px 14px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 3px solid #ffb300;
  font-size: 14px;
  color: #5d4037;
}

.batch-dialog-body .form-group,
.import-dialog-body .form-group {
  margin-bottom: 16px;
}

.batch-dialog-body label,
.import-dialog-body label {
  display: block;
  font-size: 14px;
  color: #546e7a;
  margin-bottom: 6px;
}

.batch-dialog-body select,
.batch-dialog-body input,
.import-dialog-body select,
.import-dialog-body input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cfd8dc;
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
}

.batch-dialog-footer,
.import-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
}

.btn-footer {
  width: auto;
  padding: 8px 20px;
}

.import-version-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px dashed #e0e0e0;
}

.import-version-label {
  color: #78909c;
}

.import-version-value {
  color: #283593;
  font-weight: 600;
}

.import-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 16px 0;
}

.import-summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: linear-gradient(135deg, #f5f5f5, #eeeeee);
  border-radius: 12px;
  border: 1px solid #e0e0e0;
}

.summary-icon {
  font-size: 32px;
}

.summary-count {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #37474f;
}

.summary-label {
  font-size: 13px;
  color: #78909c;
}

.import-mode-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.import-mode-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.import-mode-option:hover {
  border-color: #90a4ae;
  background: #fafafa;
}

.import-mode-option input[type="radio"] {
  width: 18px;
  height: 18px;
  accent-color: #00897b;
  margin-top: 2px;
}

.import-mode-option:has(input:checked) {
  border-color: #00897b;
  background: linear-gradient(135deg, #e0f2f1, #ffffff);
}

.import-mode-title {
  font-size: 15px;
  font-weight: 600;
  color: #263238;
  margin-bottom: 2px;
}

.import-mode-desc {
  font-size: 12px;
  color: #78909c;
  line-height: 1.5;
}

.import-preview-section {
  margin-top: 18px;
  padding: 12px;
  background: #fafafa;
  border-radius: 10px;
  border: 1px solid #eceff1;
}

.import-preview-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #37474f;
}

.import-preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.import-preview-table th,
.import-preview-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.import-preview-table th {
  background: #eceff1;
  color: #546e7a;
  font-weight: 600;
}

.import-preview-table tr:last-child td {
  border-bottom: none;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }

  .stats-bar {
    grid-template-columns: repeat(2, 1fr);
  }

  .shopping-form-row {
    flex-wrap: wrap;
  }

  .shopping-price-input,
  .shopping-store-select {
    width: calc(50% - 4px);
  }
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
</style>
